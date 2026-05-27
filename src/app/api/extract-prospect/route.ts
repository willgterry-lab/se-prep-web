import { NextRequest, NextResponse } from "next/server"
import { anthropic, MODEL } from "@/lib/anthropic"

export async function POST(req: NextRequest) {
  const { text } = await req.json()
  if (!text || typeof text !== "string") {
    return NextResponse.json({ prospect_name: null, prospect_company: null })
  }

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 80,
    messages: [
      {
        role: "user",
        content: `Extract the prospect's full name and company from this text. The prospect is the person being sold to, not the seller.

Text:
${text.slice(0, 3000)}

Return ONLY valid JSON — no prose, no markdown:
{"prospect_name": "First Last or null", "prospect_company": "Company Name or null"}

If you cannot identify a clear name or company with reasonable confidence, use null for that field.`,
      },
    ],
  })

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : ""

  try {
    const parsed = JSON.parse(raw)
    return NextResponse.json({
      prospect_name: parsed.prospect_name ?? null,
      prospect_company: parsed.prospect_company ?? null,
    })
  } catch {
    return NextResponse.json({ prospect_name: null, prospect_company: null })
  }
}
