import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { anthropic, MODEL } from "@/lib/anthropic"
import type { ProductContext, MeddpiccScore, MatchedCaseStudy } from "@/types"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const { discovery_notes, prospect_name, prospect_company } = await req.json()

  const { data: ctx } = await supabase
    .from("product_contexts")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!ctx) {
    return new Response(
      JSON.stringify({ type: "error", message: "No product context found. Please complete setup first." }),
      { status: 400 }
    )
  }

  const product = ctx as ProductContext

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) =>
        controller.enqueue(new TextEncoder().encode(JSON.stringify(event) + "\n"))

      try {
        const [meddpicc, caseStudies] = await Promise.all([
          scoreMeddpicc(discovery_notes, product, prospect_company).then((result) => {
            emit({ type: "meddpicc", data: result })
            return result
          }),
          matchCaseStudies(discovery_notes, product).then((result) => {
            emit({ type: "case_studies", data: result })
            return result
          }),
        ])

        const email = await draftEmail({
          prospect_name,
          prospect_company,
          discovery_notes,
          product,
          meddpicc,
          matched_case_studies: caseStudies,
        })
        emit({ type: "email", data: email })

        const { data: brief, error } = await supabase
          .from("briefs")
          .insert({
            user_id: user.id,
            prospect_name,
            prospect_company,
            discovery_notes,
            meddpicc,
            matched_case_studies: caseStudies,
            follow_up_email: email,
          })
          .select()
          .single()

        if (error) {
          emit({ type: "error", message: error.message })
        } else {
          emit({ type: "done", data: { brief_id: brief.id } })
        }
      } catch (e) {
        emit({ type: "error", message: e instanceof Error ? e.message : "Something went wrong." })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "X-Content-Type-Options": "nosniff",
    },
  })
}

async function scoreMeddpicc(
  notes: string,
  product: ProductContext,
  prospect_company: string
): Promise<MeddpiccScore> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are an expert sales coach scoring a discovery call using the MEDDPICC framework.

Product being sold: ${product.company} — ${product.one_line_value}
Prospect company: ${prospect_company}

Discovery notes:
${notes}

Score each MEDDPICC element from 0–3:
0 = Not mentioned / no evidence
1 = Weak signal / implied
2 = Clear evidence
3 = Explicitly confirmed and strong

Return ONLY valid JSON in this exact shape:
{
  "metrics": { "score": 0-3, "evidence": "verbatim quote or 'none'", "gap": "what is missing" },
  "economic_buyer": { "score": 0-3, "evidence": "verbatim quote or 'none'", "gap": "what is missing" },
  "decision_criteria": { "score": 0-3, "evidence": "verbatim quote or 'none'", "gap": "what is missing" },
  "decision_process": { "score": 0-3, "evidence": "verbatim quote or 'none'", "gap": "what is missing" },
  "paper_process": { "score": 0-3, "evidence": "verbatim quote or 'none'", "gap": "what is missing" },
  "identify_pain": { "score": 0-3, "evidence": "verbatim quote or 'none'", "gap": "what is missing" },
  "champion": { "score": 0-3, "evidence": "verbatim quote or 'none'", "gap": "what is missing" },
  "competition": { "score": 0-3, "evidence": "verbatim quote or 'none'", "gap": "what is missing" },
  "overall_score": 0-24,
  "summary": "2-3 sentence plain-English deal assessment"
}

Rules:
- Evidence must be verbatim quotes from the notes, not paraphrases.
- Gaps should be specific questions the SE should ask next.
- Never fabricate evidence.`,
      },
    ],
  })

  return parseJson<MeddpiccScore>(
    message.content[0].type === "text" ? message.content[0].text : "{}"
  )
}

async function matchCaseStudies(
  notes: string,
  product: ProductContext
): Promise<MatchedCaseStudy[]> {
  if (!product.case_studies?.length) return []

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are an expert at matching customer case studies to prospect situations.

Discovery notes from a prospect call:
${notes}

Available case studies:
${JSON.stringify(product.case_studies, null, 2)}

Select the top 3 most relevant case studies and explain why each is relevant.

Return ONLY valid JSON array:
[
  {
    "title": "exact title from case studies",
    "url": "exact url",
    "customer": "exact customer name",
    "industry": "exact industry",
    "headline_pain": "exact headline_pain",
    "summary": "exact summary",
    "relevance_reason": "one sentence — why this resonates with this specific prospect",
    "one_liner": "one polished, email-ready sentence an SE would drop into a follow-up email referencing this case study — name the customer, the outcome achieved, and tie it to the prospect's situation. Under 30 words.",
    "relevance_score": 1-10
  }
]

Order by relevance_score descending. Only include case studies from the provided list.`,
      },
    ],
  })

  return parseJson<MatchedCaseStudy[]>(
    message.content[0].type === "text" ? message.content[0].text : "[]"
  )
}

async function draftEmail({
  prospect_name,
  prospect_company,
  discovery_notes,
  product,
  meddpicc,
  matched_case_studies,
}: {
  prospect_name: string
  prospect_company: string
  discovery_notes: string
  product: ProductContext
  meddpicc: MeddpiccScore
  matched_case_studies: MatchedCaseStudy[]
}): Promise<string> {
  const topCase = matched_case_studies[0]

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are an expert B2B sales writer. Draft a follow-up email from the SE to the prospect after a discovery call.

Product: ${product.company} — ${product.one_line_value}
Prospect name: ${prospect_name}
Prospect company: ${prospect_company}
Deal summary: ${meddpicc.summary}
Identified pain: ${meddpicc.identify_pain.evidence}
${topCase ? `Most relevant case study: ${topCase.customer} (${topCase.industry}) — ${topCase.summary}` : ""}

Discovery notes:
${discovery_notes}

Rules:
- Plain, specific, no marketing clichés.
- Reference their specific pain using their own words from the discovery notes.
- Include one case study reference if available — one sentence, outcome + metric.
- Clear next step as the CTA.
- Under 200 words.
- Format: Subject line on first line, blank line, then body.`,
      },
    ],
  })

  return message.content[0].type === "text" ? message.content[0].text : ""
}

function parseJson<T>(raw: string): T {
  try {
    return JSON.parse(raw)
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)```/)
    if (fenced) return JSON.parse(fenced[1])
    throw new Error("Failed to parse JSON from Claude response")
  }
}
