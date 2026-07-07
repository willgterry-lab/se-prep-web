import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import mammoth from "mammoth"
import { createRequire } from "module"

export const maxDuration = 30

// pdfjs-dist's Node build looks for these on globalThis for its canvas-rendering
// path (via the optional, native @napi-rs/canvas dependency). We only ever call
// getTextContent, never render, so empty stubs are enough and avoid depending on
// a native binary being available for whatever platform this runs on.
type GlobalWithDomStubs = { DOMMatrix?: unknown; Path2D?: unknown }

async function extractPdfText(buffer: Buffer): Promise<string> {
  const g = globalThis as unknown as GlobalWithDomStubs
  if (typeof g.DOMMatrix === "undefined") g.DOMMatrix = class DOMMatrix {}
  if (typeof g.Path2D === "undefined") g.Path2D = class Path2D {}

  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist/legacy/build/pdf.mjs")
  // pdfjs-dist resolves its worker via a dynamic path internally, which Turbopack's
  // file tracer doesn't pick up for the deployed function. Resolving it ourselves
  // with a literal specifier makes it a traceable reference.
  GlobalWorkerOptions.workerSrc = createRequire(import.meta.url).resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")

  const pdf = await getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    disableFontFace: true,
  }).promise

  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "))
  }
  return pages.join("\n\n")
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

  const name = file.name.toLowerCase()
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  try {
    let text = ""

    if (name.endsWith(".txt")) {
      text = new TextDecoder().decode(bytes)
    } else if (name.endsWith(".pdf")) {
      text = await extractPdfText(buffer)
    } else if (name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else {
      return NextResponse.json({ error: "Unsupported file type. Use PDF, DOCX, or TXT." }, { status: 400 })
    }

    return NextResponse.json({ text: text.trim(), filename: file.name })
  } catch (err) {
    console.error(`extract-text failed for ${file.name}:`, err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Could not extract text from ${file.name}: ${detail}` }, { status: 500 })
  }
}
