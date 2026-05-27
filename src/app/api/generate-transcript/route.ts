import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { anthropic, MODEL } from "@/lib/anthropic"
import type { ProductContext } from "@/types"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  // prospect_name and prospect_company are optional — if absent, Claude generates fictional ones
  let { prospect_name, prospect_company } = body as {
    prospect_name?: string
    prospect_company?: string
  }

  const { data: ctx } = await supabase
    .from("product_contexts")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!ctx) {
    return NextResponse.json(
      { error: "No product context found. Please complete setup first." },
      { status: 400 }
    )
  }

  const product = ctx as ProductContext

  const icpSummary = product.icp?.length ? product.icp.slice(0, 4).join(", ") : "mid-market B2B companies"
  const competitorList = product.competitor_mentions?.length
    ? product.competitor_mentions.slice(0, 4).join(", ")
    : "existing tools"
  const caseStudyHint =
    product.case_studies?.length
      ? `The prospect's situation should loosely echo one of these customer outcomes: ${product.case_studies
          .slice(0, 2)
          .map((cs) => cs.headline_pain)
          .join("; ")}.`
      : ""

  // Generate fictional prospect identity if not supplied
  const needsIdentity = !prospect_name || !prospect_company
  const identityInstruction = needsIdentity
    ? `Invent a realistic prospect: a plausible full name and a fictional but believable company name that fits the ICP (${icpSummary}). Use these consistently throughout the transcript. On the very first line, before the transcript, output a JSON line in this exact format and nothing else before the AE line:
PROSPECT_META: {"prospect_name": "First Last", "prospect_company": "Company Name"}
`
    : `Prospect contact: ${prospect_name}, ${prospect_company}\n`

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1400,
    messages: [
      {
        role: "user",
        content: `Generate a realistic B2B SaaS discovery call transcript between an Account Executive (AE) and a prospect.

Product being sold: ${product.company} — ${product.one_line_value}
Typical buyers (ICP): ${icpSummary}
Known competitors in this space: ${competitorList}
${identityInstruction}${caseStudyHint}

FORMAT — use exactly this pattern, speaker labels in caps followed by a colon:
AE: [text]
PROSPECT: [text]

RULES:
- 16–20 exchanges total (AE + PROSPECT lines each count as one exchange).
- The AE should run a structured but conversational discovery. Open with agenda-setting, then probe current state, pain, metrics, decision process, and next steps.
- The prospect should be engaged but not a pushover — they have real constraints and ask clarifying questions.
- Surface strong evidence for 4–5 MEDDPICC elements (Metrics, Identify Pain, Champion, Decision Criteria, Competition) with specific numbers or quotes the prospect says out loud.
- Leave Economic Buyer and Paper Process vague or unmentioned — the AE should try but the prospect deflects or doesn't know.
- Include at least one competitor name the prospect mentions by name.
- Include one specific metric the prospect states (e.g. "we're spending about 12 hours a week on this").
- Keep the language natural and specific to ${product.company}'s domain. No marketing clichés.
- Do not add any preamble, headings, or notes outside the PROSPECT_META line (if present) and the transcript lines.`,
      },
    ],
  })

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : ""

  // Parse the optional PROSPECT_META header line
  let transcript = raw
  if (needsIdentity) {
    const metaMatch = raw.match(/^PROSPECT_META:\s*(\{[^\n]+\})\n/)
    if (metaMatch) {
      try {
        const meta = JSON.parse(metaMatch[1])
        prospect_name = meta.prospect_name ?? prospect_name
        prospect_company = meta.prospect_company ?? prospect_company
      } catch {
        // leave names undefined — client will handle gracefully
      }
      transcript = raw.slice(metaMatch[0].length).trim()
    }
  }

  return NextResponse.json({ transcript, prospect_name: prospect_name ?? null, prospect_company: prospect_company ?? null })
}
