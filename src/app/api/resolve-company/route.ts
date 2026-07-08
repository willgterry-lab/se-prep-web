import { NextRequest, NextResponse } from "next/server"
import { resolveCompany } from "@/lib/research"

export async function POST(req: NextRequest) {
  const body = await req.json()

  const input =
    typeof body.name_or_url === "string" && body.name_or_url.trim()
      ? { name_or_url: body.name_or_url.trim() }
      : typeof body.text === "string" && body.text.trim()
        ? { text: body.text }
        : null

  if (!input) {
    return NextResponse.json({ status: "not_found" })
  }

  try {
    const resolution = await resolveCompany(input)
    return NextResponse.json(resolution)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Company resolution failed." },
      { status: 500 }
    )
  }
}
