import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import mammoth from "mammoth"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"

export const maxDuration = 30

async function extractPdfText(buffer: Buffer): Promise<string> {
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
