import { anthropic, MODEL } from "@/lib/anthropic"
import type {
  ProductContext,
  MeddpiccScore,
  MeddpiccDelta,
  MatchedCaseStudy,
  SuggestedQuestions,
  RiskItem,
  NextAction,
} from "@/types"

const MEDDPICC_ELEMENTS = [
  "metrics",
  "economic_buyer",
  "decision_criteria",
  "decision_process",
  "paper_process",
  "identify_pain",
  "champion",
  "competition",
] as const

export function parseJson<T>(raw: string): T {
  // 1. Raw JSON
  try {
    return JSON.parse(raw)
  } catch {}

  // 2. Fenced code block
  const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)```/)
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim())
    } catch {}
  }

  // 3. Extract between outermost { } or [ ] -- handles preamble and trailing text
  const start = raw.search(/[\[{]/)
  const lastBrace = raw.lastIndexOf("}")
  const lastBracket = raw.lastIndexOf("]")
  const end = Math.max(lastBrace, lastBracket)
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1))
    } catch {}
  }

  throw new Error(`Failed to parse JSON from Claude response: ${raw.slice(0, 200)}`)
}

export function computeDelta(prev: MeddpiccScore, curr: MeddpiccScore): MeddpiccDelta {
  const delta = {} as MeddpiccDelta
  for (const el of MEDDPICC_ELEMENTS) {
    delta[el] = {
      prev: prev[el].score,
      curr: curr[el].score,
      change: curr[el].score - prev[el].score,
    }
  }
  delta.overall_prev = prev.overall_score
  delta.overall_curr = curr.overall_score
  delta.overall_change = curr.overall_score - prev.overall_score
  return delta
}

export async function scoreMeddpicc(
  notes: string,
  product: ProductContext,
  prospect_company: string
): Promise<MeddpiccScore> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `You are an expert sales coach scoring a discovery call using the MEDDPICC framework.

Product being sold: ${product.company} -- ${product.one_line_value}
Prospect company: ${prospect_company}

Discovery notes:
${notes}

Score each MEDDPICC element from 0-3:
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

export async function matchCaseStudies(
  notes: string,
  product: ProductContext
): Promise<MatchedCaseStudy[]> {
  if (!product.case_studies?.length) return []

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
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
    "relevance_reason": "one sentence -- why this resonates with this specific prospect",
    "one_liner": "one polished, email-ready sentence an SE would drop into a follow-up email referencing this case study -- name the customer, the outcome achieved, and tie it to the prospect's situation. Under 30 words.",
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

export async function generateQuestions(
  discovery_notes: string,
  meddpicc: MeddpiccScore,
  product: ProductContext
): Promise<SuggestedQuestions> {
  const gaps = MEDDPICC_ELEMENTS
    .map((key) => {
      const el = meddpicc[key]
      return el.gap ? `${key} (score ${el.score}/3): ${el.gap}` : null
    })
    .filter(Boolean)
    .join("\n")

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are an expert Solutions Consultant preparing for a first call with a prospect.

Product: ${product.company} -- ${product.one_line_value}
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

sc_intro: 3 questions to open the first SC call -- build rapport, confirm understanding of their situation, and set the agenda.
discovery: 3 questions to go deeper on the MEDDPICC gaps identified above -- uncover what the AE didn't get to.
technical: 3 questions to understand the technical landscape, existing stack, and integration requirements relevant to ${product.company}.

Questions should be specific to this prospect's situation, not generic.`,
      },
    ],
  })

  return parseJson<SuggestedQuestions>(
    message.content[0].type === "text" ? message.content[0].text : "{}"
  )
}

export async function updateQuestions(
  transcript: string,
  meddpicc: MeddpiccScore,
  prevQuestions: SuggestedQuestions | undefined,
  product: ProductContext
): Promise<{ open: SuggestedQuestions; answered: SuggestedQuestions }> {
  if (!prevQuestions) {
    const fresh = await generateQuestions(transcript, meddpicc, product)
    return {
      open: fresh,
      answered: { sc_intro: [], discovery: [], technical: [] },
    }
  }

  const remainingGaps = MEDDPICC_ELEMENTS
    .filter((key) => meddpicc[key].score < 3 && meddpicc[key].gap)
    .map((key) => `${key} (score ${meddpicc[key].score}/3): ${meddpicc[key].gap}`)
    .join("\n")

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are an expert Solutions Consultant reviewing how a call went and updating your question bank.

Product: ${product.company} -- ${product.one_line_value}

Call transcript:
${transcript}

Questions prepared before this call:
${JSON.stringify(prevQuestions, null, 2)}

MEDDPICC gaps still open after this call:
${remainingGaps || "None -- all elements scored 3"}

Review each prepared question. Determine whether it was effectively answered on this call.
Then generate any new questions needed for gaps that are still open or newly identified.

Return ONLY valid JSON:
{
  "open": {
    "sc_intro": ["questions for the next call -- advance the relationship and agenda"],
    "discovery": ["questions for remaining MEDDPICC gaps"],
    "technical": ["outstanding technical questions"]
  },
  "answered": {
    "sc_intro": ["prepared questions that were addressed on this call"],
    "discovery": ["prepared questions that were addressed on this call"],
    "technical": ["prepared questions that were addressed on this call"]
  }
}

Rules:
- "answered" must contain verbatim questions from the prepared list that were clearly addressed.
- "open" contains: (a) prepared questions not yet answered, and (b) new questions for still-open gaps.
- Do not include the same question in both categories.
- New questions must be specific to this prospect's situation, grounded in the transcript.
- sc_intro in "open" should help open the NEXT call, not this one.`,
      },
    ],
  })

  const raw = parseJson<{ open: SuggestedQuestions; answered: SuggestedQuestions }>(
    message.content[0].type === "text" ? message.content[0].text : "{}"
  )

  return {
    open: raw.open ?? { sc_intro: [], discovery: [], technical: [] },
    answered: raw.answered ?? { sc_intro: [], discovery: [], technical: [] },
  }
}

export async function identifyRisks(
  transcript: string,
  meddpicc: MeddpiccScore,
  product: ProductContext,
  prospect_company: string
): Promise<RiskItem[]> {
  const meddpiccSummary = MEDDPICC_ELEMENTS
    .map((key) => {
      const el = meddpicc[key]
      return `${key}: ${el.score}/3${el.gap ? ` -- gap: ${el.gap}` : ""}`
    })
    .join("\n")

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are an expert B2B sales coach identifying deal risks after a discovery or demo call.

Product: ${product.company} -- ${product.one_line_value}
Prospect company: ${prospect_company}

Call transcript:
${transcript}

Current MEDDPICC state:
${meddpiccSummary}
Overall: ${meddpicc.overall_score}/24

Identify 3-5 genuine deal risks -- things that are likely to stall or lose this deal.

A risk is different from a gap:
- Gap: "we do not know X yet"
- Risk: "something about this deal is likely to stall or lose it"

Common risk patterns (only flag if evidence in transcript supports them):
- Economic buyer not engaged or unreachable through the champion
- Deal is single-threaded (one internal contact, no broader stakeholder visibility)
- A named competitor is already entrenched and the prospect is satisfied
- Timeline is vague, shifting, or driven by an external factor outside prospect control
- No paper or legal process visibility at this stage
- The champion lacks authority or budget ownership to drive a decision
- Multiple stakeholders with conflicting requirements or priorities
- Strong status quo bias or low urgency
- Unaddressed technical concerns that could become blockers

Return ONLY valid JSON array:
[
  {
    "risk": "one sentence describing the risk",
    "evidence": "verbatim quote from the transcript, or description of what was absent",
    "severity": "low" | "medium" | "high"
  }
]

Severity guide:
- high: likely to kill or significantly delay the deal without action
- medium: could become a blocker if not addressed in the next 1-2 interactions
- low: worth monitoring; not immediately dangerous

Rules:
- Evidence must be a verbatim quote from the transcript where possible.
- If the risk is inferred from something NOT said, write: "Not mentioned in the transcript."
- Never fabricate evidence or invent statements the prospect did not make.
- If fewer than 3 genuine risks exist, return only those that are real.
- Maximum 5 risks.`,
      },
    ],
  })

  return parseJson<RiskItem[]>(
    message.content[0].type === "text" ? message.content[0].text : "[]"
  )
}

export async function generateNextActions(
  transcript: string,
  prospect_company: string,
  today: string
): Promise<NextAction[]> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are an expert Solutions Consultant extracting next actions from a customer call.

Prospect company: ${prospect_company}
Today's date: ${today}

Call transcript:
${transcript}

Extract all explicit commitments, follow-up items, and next steps mentioned in the call.
Include actions the SC committed to (owner: "SC"), actions the prospect committed to (owner: "Prospect"), and any unowned items.

If the transcript implies a timeline or deadline for a specific action, suggest a reminder date in YYYY-MM-DD format relative to today.
If no date is implied, set suggested_reminder_date to null.

Return ONLY valid JSON array:
[
  {
    "action": "description of the action",
    "owner": "SC" | "Prospect" | null,
    "suggested_reminder_date": "YYYY-MM-DD" | null
  }
]

Rules:
- Only include actions explicitly mentioned or clearly implied in the transcript.
- Do not invent actions that were not discussed.
- Keep action descriptions concise (under 15 words).
- Return an empty array [] if no clear next actions were identified.`,
      },
    ],
  })

  return parseJson<NextAction[]>(
    message.content[0].type === "text" ? message.content[0].text : "[]"
  )
}

export async function draftPrepEmail({
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
Product: ${product.company} -- ${product.one_line_value}
Prospect name: ${prospect_name}
Prospect company: ${prospect_company}
Deal summary: ${meddpicc.summary}
Identified pain: ${meddpicc.identify_pain.evidence}

AE discovery notes (background context only -- the SC was not on this call):
${discovery_notes}

Rules:
- Open by introducing the SC by name and role, and reference being brought in by the AE ahead of their upcoming call.
- Show the SC has done their homework: reference the prospect's specific situation and pain points using their own words, to demonstrate they are already across the detail before they've spoken.
- Frame the email as preparation for the call, not a summary of one.
- Do NOT use any of these phrases or anything similar: "thanks for the time today", "great speaking with you", "following up on our conversation", "as we discussed", "from our call", "taking away from today".
- Do NOT include any case study references or examples -- those are added separately.
- Close with what the SC intends to cover or demonstrate on the upcoming call.
- Sign off with the SC's name.
- Plain, specific, no marketing clichés. Under 200 words.
- UK English. No em-dashes.
- Format: Subject line on first line, blank line, then body.
- Immediately before the closing sentence, output a line containing only the text: [NEXT_STEPS]`,
      },
    ],
  })

  return message.content[0].type === "text" ? message.content[0].text : ""
}

export async function draftPostCallEmail({
  prospect_name,
  prospect_company,
  transcript,
  product,
  meddpicc,
  sc_name,
}: {
  prospect_name: string
  prospect_company: string
  transcript: string
  product: ProductContext
  meddpicc: MeddpiccScore
  sc_name: string
}): Promise<string> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are an expert B2B sales writer. Draft a follow-up email from a Solutions Consultant (SC) to a prospect after their first call together.

SC name: ${sc_name || "[SC Name]"}
Product: ${product.company} -- ${product.one_line_value}
Prospect name: ${prospect_name}
Prospect company: ${prospect_company}
Deal summary: ${meddpicc.summary}
Key pain identified: ${meddpicc.identify_pain.evidence}

Call transcript:
${transcript}

Rules:
- Open directly on the substance -- do NOT use any of these phrases or anything similar: "thanks for the time today", "great speaking with you", "as discussed", "following up on our call", "it was great to meet you", "as we discussed".
- Reference specific things the prospect said using their own words, to show you were listening.
- Keep it to 3 short paragraphs maximum.
- Confirm the agreed next steps in the final paragraph.
- Sign off with the SC's name.
- Plain, specific, no marketing clichés.
- No em-dashes.
- UK English.
- Under 180 words.
- Format: Subject line on first line, blank line, then body.`,
      },
    ],
  })

  return message.content[0].type === "text" ? message.content[0].text : ""
}
