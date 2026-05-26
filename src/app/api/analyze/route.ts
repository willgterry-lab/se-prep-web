import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { anthropic, MODEL } from "@/lib/anthropic"
import type { ProductContext, MeddpiccScore, MatchedCaseStudy, SuggestedQuestions } from "@/types"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const scName = (user.user_metadata?.full_name as string | undefined) ?? ""

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

        const [email, questions] = await Promise.all([
          draftEmail({
            prospect_name,
            prospect_company,
            discovery_notes,
            product,
            meddpicc,
            matched_case_studies: caseStudies,
            sc_name: scName,
          }),
          generateQuestions(discovery_notes, meddpicc, product),
        ])
        emit({ type: "email", data: email })

        const meddpiccWithQuestions: MeddpiccScore = { ...meddpicc, suggested_questions: questions }

        const { data: brief, error } = await supabase
          .from("briefs")
          .insert({
            user_id: user.id,
            prospect_name,
            prospect_company,
            discovery_notes,
            meddpicc: meddpiccWithQuestions,
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
  sc_name,
}: {
  prospect_name: string
  prospect_company: string
  discovery_notes: string
  product: ProductContext
  meddpicc: MeddpiccScore
  matched_case_studies: MatchedCaseStudy[]
  sc_name: string
}): Promise<string> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are an expert B2B sales writer. Draft a pre-call introduction email from a Solutions Consultant (SC) to a prospect.

Situation: The SC has NEVER spoken to the prospect. The AE ran an initial discovery call. The SC has been briefed by the AE and is now emailing the prospect ahead of their first call together to introduce themselves and show they are already across the prospect's situation.

SC name: ${sc_name || "[SC Name]"}
Product: ${product.company} — ${product.one_line_value}
Prospect name: ${prospect_name}
Prospect company: ${prospect_company}
Deal summary: ${meddpicc.summary}
Identified pain: ${meddpicc.identify_pain.evidence}

AE discovery notes (background context only — the SC was not on this call):
${discovery_notes}

Rules:
- Open by introducing the SC by name and role, and reference being brought in by the AE ahead of their upcoming call.
- Show the SC has done their homework: reference the prospect's specific situation and pain points using their own words, to demonstrate they are already across the detail before they've spoken.
- Frame the email as preparation for the call, not a summary of one.
- Do NOT use any of these phrases or anything similar: "thanks for the time today", "great speaking with you", "following up on our conversation", "as we discussed", "from our call", "taking away from today".
- Do NOT include any case study references or examples — those are added separately.
- Close with what the SC intends to cover or demonstrate on the upcoming call.
- Sign off with the SC's name.
- Plain, specific, no marketing clichés. Under 200 words.
- Format: Subject line on first line, blank line, then body.
- Immediately before the closing sentence, output a line containing only the text: [NEXT_STEPS]`,
      },
    ],
  })

  return message.content[0].type === "text" ? message.content[0].text : ""
}

async function generateQuestions(
  discovery_notes: string,
  meddpicc: MeddpiccScore,
  product: ProductContext
): Promise<SuggestedQuestions> {
  const gaps = Object.entries(meddpicc)
    .filter(([key]) => !["overall_score", "summary", "suggested_questions"].includes(key))
    .map(([key, val]) => {
      const el = val as { score: number; gap: string }
      return el.gap ? `${key} (score ${el.score}/3): ${el.gap}` : null
    })
    .filter(Boolean)
    .join("\n")

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are an expert Solutions Consultant preparing for a first call with a prospect.

Product: ${product.company} — ${product.one_line_value}
Discovery notes from the AE call:
${discovery_notes}

MEDDPICC gaps identified:
${gaps || "None significant"}

Generate 9 questions in three categories. Return ONLY valid JSON:
{
  "sc_intro": ["q1", "q2", "q3"],
  "discovery": ["q1", "q2", "q3"],
  "technical": ["q1", "q2", "q3"]
}

sc_intro: 3 questions to open the first SC call — build rapport, confirm understanding of their situation, and set the agenda.
discovery: 3 questions to go deeper on the MEDDPICC gaps identified above — uncover what the AE didn't get to.
technical: 3 questions to understand the technical landscape, existing stack, and integration requirements relevant to ${product.company}.

Questions should be specific to this prospect's situation, not generic.`,
      },
    ],
  })

  return parseJson<SuggestedQuestions>(
    message.content[0].type === "text" ? message.content[0].text : "{}"
  )
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
