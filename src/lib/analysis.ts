import { anthropic, MODEL } from "@/lib/anthropic"
import type {
  ProductContext,
  MeddpiccScore,
  MeddpiccDelta,
  MatchedCaseStudy,
  SuggestedQuestions,
  RiskItem,
  NextAction,
  SuccessCriterion,
  PovAssessment,
  PovCallType,
  VeBaselineInput,
  VeSliderInputs,
  VeProposal,
  ExtractedStakeholder,
  ValueDriverSection,
  DiscoveryQuestionsSection,
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

// AGENTS.md bans em-dashes everywhere, but models reintroduce them despite prompt
// instructions -- strip them at the one place every AI JSON response passes through,
// rather than patching each of the ~8 prompts that ask for it.
export function stripEmDashes<T>(value: T): T {
  if (typeof value === "string") {
    return value.replace(/—/g, "-") as unknown as T
  }
  if (Array.isArray(value)) {
    return value.map(stripEmDashes) as unknown as T
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = stripEmDashes(val)
    }
    return result as T
  }
  return value
}

export function parseJson<T>(raw: string): T {
  const trimmed = raw.trim()

  // 1. Raw JSON
  try {
    return stripEmDashes(JSON.parse(trimmed))
  } catch {}

  // 2. Fenced code block -- slice from after the opening fence line to just before the
  //    closing fence marker. Using indexOf("\n```") rather than endsWith so that any
  //    prose Claude adds after the closing fence is excluded.
  if (trimmed.startsWith("```")) {
    const afterOpenFence = trimmed.indexOf("\n")
    if (afterOpenFence !== -1) {
      let inner = trimmed.slice(afterOpenFence + 1)
      const closingFence = inner.indexOf("\n```")
      if (closingFence !== -1) inner = inner.slice(0, closingFence)
      try {
        return stripEmDashes(JSON.parse(inner.trim()))
      } catch {}
    }
  }

  // 3. Extract between outermost [ ] or { } that appear before any closing fence
  //    so trailing prose doesn't push lastIndexOf past the real JSON boundary.
  const fenceEnd = trimmed.indexOf("\n```")
  const searchIn = fenceEnd !== -1 ? trimmed.slice(0, fenceEnd) : trimmed
  const start = searchIn.search(/[\[{]/)
  const lastBrace = searchIn.lastIndexOf("}")
  const lastBracket = searchIn.lastIndexOf("]")
  const end = Math.max(lastBrace, lastBracket)
  if (start !== -1 && end > start) {
    try {
      return stripEmDashes(JSON.parse(searchIn.slice(start, end + 1)))
    } catch {}
  }

  throw new Error(
    `Failed to parse JSON from Claude response (${trimmed.length} chars): ` +
    `START: ${trimmed.slice(0, 300)} END: ${trimmed.slice(-200)}`
  )
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

function formatPriorMeddpicc(prior: MeddpiccScore): string {
  return MEDDPICC_ELEMENTS
    .map((key) => {
      const el = prior[key]
      return `${key}: score ${el.score}/3 -- evidence: "${el.evidence}"`
    })
    .join("\n")
}

export async function scoreMeddpicc(
  notes: string,
  product: ProductContext,
  prospect_company: string,
  priorMeddpicc?: MeddpiccScore | null,
  researchDrivers?: ValueDriverSection | null
): Promise<MeddpiccScore> {
  const priorSection = priorMeddpicc
    ? `

Prior evidence from earlier calls on this deal (still valid unless this transcript actively contradicts it):
${formatPriorMeddpicc(priorMeddpicc)}

Rule: if this transcript does not re-mention an element, carry forward its prior score and evidence rather than treating it as unknown -- absence of re-mention is not regression. Only score an element lower than its prior score if something in THIS transcript actively contradicts or undermines the prior evidence (e.g. a champion has left, a competitor was just chosen, budget was pulled). If this transcript adds stronger evidence for an element, you may raise its score.`
    : ""

  // Prospect research hypotheses pre-seed Identified Pain and Metrics -- but
  // only as candidates to corroborate, never as a substitute for the notes.
  // Scoring purely off a web-sourced hypothesis with no notes support would
  // fabricate confidence the transcript doesn't back.
  const researchSection = researchDrivers?.hypotheses.length
    ? `

Prospect research hypotheses (from web research, not yet confirmed on a call):
${researchDrivers.hypotheses.map((h) => `- ${h.driver_statement} (confidence: ${h.confidence})`).join("\n")}

Rule: if the discovery notes independently corroborate one of these hypotheses, factor it into Identified Pain and/or Metrics -- use the verbatim notes quote as evidence, not the research text. If the notes are silent on it, do not score it in; it stays a research hypothesis, not a scored fact.`
    : ""

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
${notes}${priorSection}${researchSection}

Score each MEDDPICC element from 0-3:
0 = Not mentioned / no evidence
1 = Weak signal / implied
2 = Clear evidence
3 = Explicitly confirmed and strong

Return ONLY valid JSON with no code fences or preamble, in this exact shape:
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
- Evidence must be verbatim quotes from the notes, not paraphrases. If carrying forward prior evidence unchanged, keep the prior verbatim quote.
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
  product: ProductContext,
  researchDrivers?: ValueDriverSection | null
): Promise<MatchedCaseStudy[]> {
  if (!product.case_studies?.length) return []

  // Research's value driver hypotheses are evidenced pain, not just an industry
  // label -- matching against them (in addition to the notes) surfaces the case
  // study whose outcome addresses the same pain, not just the same vertical.
  const researchSection = researchDrivers?.hypotheses.length
    ? `

Prospect research value driver hypotheses (evidenced pain found via web research, not yet confirmed on a call):
${researchDrivers.hypotheses.map((h) => `- ${h.driver_statement}`).join("\n")}

Match on this evidenced pain where it's stronger or more specific than what the vertical alone would suggest -- prefer a case study whose outcome addresses the same underlying pain over one that merely shares an industry.`
    : ""

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are an expert at matching customer case studies to prospect situations.

Discovery notes from a prospect call:
${notes}${researchSection}

Available case studies:
${JSON.stringify(product.case_studies, null, 2)}

Select the top 3 most relevant case studies and explain why each is relevant.

Return ONLY valid JSON with no code fences or preamble:
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
  product: ProductContext,
  researchQuestions?: DiscoveryQuestionsSection | null
): Promise<SuggestedQuestions> {
  const gaps = MEDDPICC_ELEMENTS
    .map((key) => {
      const el = meddpicc[key]
      return el.gap ? `${key} (score ${el.score}/3): ${el.gap}` : null
    })
    .filter(Boolean)
    .join("\n")

  // Prospect research already generated a discovery question list from its own
  // gaps and unknowns (section 8) -- when available, build from that instead of
  // cold-starting discovery/technical questions from nothing.
  const researchSection = researchQuestions?.questions.length
    ? `

Prospect research already surfaced these candidate questions from its own gaps and unknowns:
${researchQuestions.questions.map((q) => `- [${q.meddpicc_element}] ${q.question}`).join("\n")}

Draw on these first for the discovery/technical categories below -- rephrase or select from them rather than starting from a blank slate, adding new ones only where they leave a category thin.`
    : ""

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are an expert Solutions Consultant preparing for a first call with a prospect.

Product: ${product.company} -- ${product.one_line_value}
Discovery notes from the AE call:
${discovery_notes}

MEDDPICC gaps identified:
${gaps || "None significant"}${researchSection}

Generate 9 questions in three categories. Return ONLY valid JSON with no code fences or preamble:
{
  "sc_intro": ["q1", "q2", "q3"],
  "discovery": ["q1", "q2", "q3"],
  "technical": ["q1", "q2", "q3"]
}

sc_intro: 3 questions to open the first SC call -- build rapport, confirm understanding of their situation, and set the agenda.
discovery: 3 questions to go deeper on the MEDDPICC gaps identified above -- uncover what the AE didn't get to.
technical: 3 questions to understand the technical landscape, existing stack, and integration requirements relevant to ${product.company}.

Rules:
- Each question must be under 20 words.
- Questions should be specific to this prospect's situation, not generic.
- No em-dashes.`,
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
    max_tokens: 2048,
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

Return ONLY valid JSON with no code fences or preamble:
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
- sc_intro in "open" should help open the NEXT call, not this one.
- Each question must be under 20 words. No em-dashes.`,
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
  prospect_company: string,
  priorRisks?: RiskItem[] | null
): Promise<RiskItem[]> {
  const meddpiccSummary = MEDDPICC_ELEMENTS
    .map((key) => {
      const el = meddpicc[key]
      return `${key}: ${el.score}/3${el.gap ? ` -- gap: ${el.gap}` : ""}`
    })
    .join("\n")

  const priorSection = priorRisks?.length
    ? `

Risks previously identified on this deal (from an earlier call), with their stable key:
${priorRisks.map((r) => `- [${r.key ?? "unknown"}] [${r.severity}] ${r.risk} -- evidence: "${r.evidence}"`).join("\n")}

Rule: carry a previous risk forward (possibly re-worded or re-severity-rated) unless THIS transcript resolves or contradicts it -- e.g. a stakeholder previously described as unengaged is now actively participating, or a competitor concern was directly addressed. Do not silently drop a still-relevant risk just because it was not re-mentioned. When you carry a risk forward, reuse its exact same "key" value even if you reword the risk text -- this is how the product tracks a risk across calls. Only invent a new key for a genuinely new risk.`
    : ""

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
Overall: ${meddpicc.overall_score}/24${priorSection}

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
    "key": "short-kebab-case-slug identifying this risk, e.g. \"single-threaded\" or \"eb-not-engaged\"",
    "risk": "one sentence describing the risk",
    "evidence": "verbatim quote from the transcript, or description of what was absent",
    "severity": "low" | "medium" | "high",
    "suggested_action": "one concrete next step the SC could take to mitigate this specific risk"
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

export interface CompletedTaskCandidate {
  task_id: string
  evidence: string
}

// Checks the deal's currently-open tasks against a new call's transcript to see
// if any of them were actually completed. Returns candidates with evidence for
// the SC to confirm -- never marks anything done itself. This is what stops the
// Actions tab from showing a task as "overdue" when a later call already
// confirmed it happened.
export async function detectCompletedTasks(
  openTasks: { id: string; description: string }[],
  transcript: string
): Promise<CompletedTaskCandidate[]> {
  if (!openTasks.length) return []

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are an expert Solutions Consultant reviewing a customer call transcript to check on previously agreed next actions.

Open tasks from earlier calls on this deal:
${openTasks.map((t) => `- [${t.id}] ${t.description}`).join("\n")}

New call transcript:
${transcript}

For each open task above, check whether this transcript gives clear evidence that it has actually been completed (e.g. someone confirms it happened, references the outcome, or thanks the other side for having done it).

Return ONLY a valid JSON array containing only the tasks you have clear evidence for -- do not include a task if the transcript is silent on it or only ambiguously touches on it:
[
  {
    "task_id": "the exact [id] from the list above",
    "evidence": "verbatim quote from the transcript showing this was completed"
  }
]

Rules:
- Only include a task if the transcript explicitly confirms it is done. Silence about a task is not evidence it was completed.
- evidence must be a verbatim quote from the transcript.
- Never invent completions. Return an empty array [] if none are clearly confirmed.`,
      },
    ],
  })

  return parseJson<CompletedTaskCandidate[]>(
    message.content[0].type === "text" ? message.content[0].text : "[]"
  )
}

// Best-effort extraction of the actual call date from the transcript itself
// (e.g. a stated date at the top of a recording transcript, or someone saying
// "today is the 12th of May"). Used as a fallback pre-fill when the SC doesn't
// set a call date manually -- never guesses if no explicit date is present.
export async function extractCallDate(transcript: string): Promise<string | null> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 100,
    messages: [
      {
        role: "user",
        content: `Look at this call transcript and find the actual date the call took place, if it is explicitly stated anywhere (e.g. a header, timestamp, or someone saying what today's date is).

Transcript:
${transcript}

Return ONLY valid JSON with no code fences or preamble:
{ "call_date": "YYYY-MM-DD" }

If no explicit date is stated anywhere in the transcript, return:
{ "call_date": null }

Never infer or guess a date from context alone (e.g. do not assume a date from mentions of future deadlines). Only return a date that is explicitly stated as the current/today's date for this call.`,
      },
    ],
  })

  const result = parseJson<{ call_date: string | null }>(
    message.content[0].type === "text" ? message.content[0].text : '{"call_date":null}'
  )
  return result.call_date ?? null
}

export interface PovCallClassification {
  index: number
  call_type: "setup" | "checkin" | "review"
  reasoning: string
}

// Given several POV call transcripts uploaded together, works out which stage
// each one represents and the correct chronological order -- comparing them
// side by side is far more reliable than classifying each in isolation, since
// "check-in" and "final review" can look similar out of context but the
// progression across all of them usually isn't. This determines which
// transcript gets processed first, which matters: the first-processed call is
// the one that triggers extracting the (immutable) success criteria.
export async function classifyPovCallSequence(
  transcripts: string[]
): Promise<PovCallClassification[]> {
  if (transcripts.length < 2) {
    return transcripts.map((_, index) => ({
      index,
      call_type: "setup",
      reasoning: "Only one call provided -- nothing to compare it against.",
    }))
  }

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are an expert Solutions Consultant organising a set of Proof of Value (POV) call transcripts into their correct chronological order.

A POV typically has three stages:
- Setup / kickoff: the prospect and SC agree the success criteria for the trial. Usually the first call -- listen for language actively agreeing what will be measured, not just referencing it.
- Check-in: a mid-trial call reviewing progress against criteria already agreed in an earlier call.
- Final review: the concluding call assessing whether criteria were met and discussing next steps (renewal, purchase decision, expansion).

You are given ${transcripts.length} transcripts, labelled by index below. Determine which stage each one represents and the correct chronological order, using evidence from the transcripts themselves: explicit dates, references to a previous call, criteria being newly agreed vs already-agreed and being reviewed, or a concluding/decision tone.

${transcripts.map((t, i) => `--- Transcript ${i} ---\n${t}`).join("\n\n")}

Return ONLY a valid JSON array, one entry per transcript, ORDERED CHRONOLOGICALLY (earliest call first, regardless of the order the transcripts were given to you above):
[
  {
    "index": 0,
    "call_type": "setup" | "checkin" | "review",
    "reasoning": "one sentence, referencing a verbatim quote from the transcript that supports this classification"
  }
]

Rules:
- Every transcript index must appear exactly once.
- Base your ordering and classification only on evidence in the transcripts. Never guess based on the order they were given to you.
- More than one transcript can be the same stage (e.g. several check-ins across a longer POV) -- label them all "checkin" except whichever is clearly the concluding call.
- reasoning must reference a verbatim quote from that transcript.`,
      },
    ],
  })

  return parseJson<PovCallClassification[]>(
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
Include actions the SC committed to (owner: "SC"), actions the prospect committed to (owner: "Prospect"), actions that require both sides working together (owner: "Joint"), and any unowned items.

If the transcript implies a timeline or deadline for a specific action, suggest a reminder date in YYYY-MM-DD format relative to today.
If no date is implied, set suggested_reminder_date to null.

Return ONLY valid JSON array:
[
  {
    "action": "description of the action",
    "owner": "SC" | "Prospect" | "Joint" | null,
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

export async function extractSuccessCriteria(
  transcript: string,
  product: ProductContext,
  prospect_company: string
): Promise<{ total_agreed: number; criteria: SuccessCriterion[] }> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `You are an expert Solutions Consultant reviewing a POV (Proof of Value) kickoff call.

Product: ${product.company} -- ${product.one_line_value}
Prospect company: ${prospect_company}

Call transcript:
${transcript}

Extract the specific, measurable success criteria that were agreed on this call for the POV trial. These are the outcomes the prospect expects the product to demonstrate during the evaluation period.

First, identify every distinct, specific, measurable criterion actually agreed on the call, however many that is. Then select at most the 5 most distinct and clearly measurable of those to return as "criteria" -- if there are more than 5, prioritise the ones stated with the clearest numeric threshold or concrete outcome, since near-duplicates or vaguer restatements of the same point are not worth a separate slot.

Return ONLY valid JSON object with no code fences or preamble:
{
  "total_agreed": 7,
  "criteria": [
    { "id": 1, "description": "..." },
    { "id": 2, "description": "..." }
  ]
}

Rules:
- Extract only criteria that were explicitly agreed or confirmed on the call.
- Each criterion should be specific and measurable -- use the prospect's own words where possible.
- "total_agreed" is the full count of distinct criteria you identified before narrowing down to 5 -- if there were only 3 distinct criteria, total_agreed is 3 and criteria has 3 entries (not padded or invented to reach 5).
- "criteria" contains at most 5 entries. If fewer than 2 clear criteria were agreed, return only those that were explicitly confirmed.
- IDs must be sequential integers starting at 1.
- Return { "total_agreed": 0, "criteria": [] } only if no clear criteria were discussed.
- No code fences or preamble.`,
      },
    ],
  })

  return parseJson<{ total_agreed: number; criteria: SuccessCriterion[] }>(
    message.content[0].type === "text" ? message.content[0].text : '{"total_agreed":0,"criteria":[]}'
  )
}

export async function extractStakeholders(
  transcript: string,
  prospect_company: string
): Promise<ExtractedStakeholder[]> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `You are an expert Solutions Consultant reviewing a customer call transcript.

Prospect company: ${prospect_company}

Call transcript:
${transcript}

Extract every named person from the prospect side (${prospect_company}) who is mentioned in this transcript, along with their job title or role if stated.

Return ONLY valid JSON array with no code fences or preamble:
[
  { "name": "Full Name", "role": "Job title, or null if not stated" }
]

Rules:
- Only include people explicitly named in the transcript on the prospect side. Do not include the SC, SC's colleagues, or people from the vendor's own company.
- Use the exact name as it appears (or the fullest form used, e.g. prefer "Rachel Adams" over just "Rachel" if both appear).
- Use "role" verbatim from the transcript if a title or role is stated (e.g. "VP of Engineering"). Set to null if no role is mentioned.
- Do not fabricate names or roles.
- Return an empty array [] if no prospect-side names are mentioned.`,
      },
    ],
  })

  return parseJson<ExtractedStakeholder[]>(
    message.content[0].type === "text" ? message.content[0].text : "[]"
  )
}

export async function assessPovCriteria(
  transcript: string,
  success_criteria: SuccessCriterion[],
  product: ProductContext,
  prospect_company: string
): Promise<PovAssessment[]> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are an expert Solutions Consultant reviewing a POV (Proof of Value) call.

Product: ${product.company} -- ${product.one_line_value}
Prospect company: ${prospect_company}

Success criteria agreed for this POV:
${success_criteria.map((c) => `${c.id}. ${c.description}`).join("\n")}

Call transcript:
${transcript}

For each success criterion, assess whether this call provided evidence of it being met, in progress, or not yet addressed.

Return ONLY valid JSON array with no code fences or preamble:
[
  {
    "criterion_id": 1,
    "status": "met",
    "evidence": "verbatim quote from the transcript, or 'Not evidenced on this call'",
    "notes": null
  }
]

Status values: "met" | "in_progress" | "not_met"

Rules:
- Evidence must be a verbatim quote from the transcript where possible.
- "met": clear evidence in this transcript that the criterion was demonstrated or achieved.
- "in_progress": partial evidence -- some progress but not fully demonstrated yet.
- "not_met": no evidence this criterion was addressed on this call.
- Return exactly one object per criterion, in the same order as the criteria list.
- Never fabricate evidence.`,
      },
    ],
  })

  return parseJson<PovAssessment[]>(
    message.content[0].type === "text" ? message.content[0].text : "[]"
  )
}

export async function draftPovCallEmail({
  prospect_name,
  prospect_company,
  transcript,
  product,
  success_criteria,
  pov_assessment,
  call_type,
  sc_name,
}: {
  prospect_name: string
  prospect_company: string
  transcript: string
  product: ProductContext
  success_criteria: SuccessCriterion[]
  pov_assessment: PovAssessment[]
  call_type: PovCallType
  sc_name: string
}): Promise<string> {
  const callTypeLabel =
    call_type === "setup"
      ? "POV setup / kickoff call"
      : call_type === "checkin"
      ? "POV check-in call"
      : "POV final review call"

  const criteriaProgress = pov_assessment
    .map((a) => {
      const c = success_criteria.find((sc) => sc.id === a.criterion_id)
      const statusLabel =
        a.status === "met" ? "MET" : a.status === "in_progress" ? "IN PROGRESS" : "NOT YET EVIDENCED"
      return `- ${c?.description ?? `Criterion ${a.criterion_id}`}: ${statusLabel} -- ${a.evidence}`
    })
    .join("\n")

  const callTypeInstructions =
    call_type === "setup"
      ? "- Confirm the success criteria agreed and what the trial will demonstrate.\n- Confirm what each party needs to do to get the POV underway."
      : call_type === "checkin"
      ? "- Highlight which criteria are showing clear progress.\n- Flag any criteria that need attention before the review.\n- Confirm what is needed from each side before the final review."
      : "- Summarise the outcome against each success criterion clearly.\n- Be direct about what the evidence shows.\n- Close with a clear recommended next step."

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are an expert B2B sales writer. Draft a follow-up email from a Solutions Consultant (SC) to a prospect after a ${callTypeLabel}.

SC name: ${sc_name || "[SC Name]"}
Product: ${product.company} -- ${product.one_line_value}
Prospect name: ${prospect_name}
Prospect company: ${prospect_company}

Success criteria for this POV:
${success_criteria.map((c) => `${c.id}. ${c.description}`).join("\n")}

Progress against each criterion on this call:
${criteriaProgress}

Call transcript:
${transcript}

Rules:
- Open directly on substance. Do NOT use: "thanks for the time", "great speaking", "as discussed", "following up on our call".
- Reference specific things from the call using the prospect's own words.
${callTypeInstructions}
- Keep to 3 short paragraphs.
- Sign off with the SC's name.
- Plain, specific, no marketing clichés. Under 200 words.
- UK English. No em-dashes.
- Format: Subject line on first line, blank line, then body.`,
      },
    ],
  })

  return message.content[0].type === "text" ? stripEmDashes(message.content[0].text) : ""
}

// Picks the strongest web-cited fact from the top-ranked value driver hypothesis
// to ground the prep email in something verifiable beyond the notes -- prefers
// web evidence (has a url the prospect could recognise) over notes evidence
// (which the email already draws on via identified pain).
function pickCitedResearchFact(researchDrivers?: ValueDriverSection | null): { text: string; url?: string } | null {
  const top = researchDrivers?.hypotheses[0]
  if (!top) return null
  const webEvidence = top.evidence.find((e) => e.origin === "web")
  return webEvidence ? { text: webEvidence.text, url: webEvidence.url } : null
}

export async function draftPrepEmail({
  prospect_name,
  prospect_company,
  discovery_notes,
  product,
  meddpicc,
  matched_case_studies,
  sc_name,
  research_drivers,
}: {
  prospect_name: string
  prospect_company: string
  discovery_notes: string
  product: ProductContext
  meddpicc: MeddpiccScore
  matched_case_studies: MatchedCaseStudy[]
  sc_name: string
  research_drivers?: ValueDriverSection | null
}): Promise<string> {
  const citedFact = pickCitedResearchFact(research_drivers)
  const researchLine = citedFact
    ? `\nResearch finding to ground the email in (cite this fact naturally, don't just paste it): ${citedFact.text}`
    : ""

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
Identified pain: ${meddpicc.identify_pain.evidence}${researchLine}

AE discovery notes (background context only -- the SC was not on this call):
${discovery_notes}

Rules:
- Open by introducing the SC by name and role, and reference being brought in by the AE ahead of their upcoming call.
- Show the SC has done their homework: reference the prospect's specific situation and pain points using their own words, to demonstrate they are already across the detail before they've spoken.${citedFact ? " Where it fits naturally, work in the research finding above as a further sign of preparation -- state it as something you noticed, not as a quote or citation." : ""}
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

  return message.content[0].type === "text" ? stripEmDashes(message.content[0].text) : ""
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

  return message.content[0].type === "text" ? stripEmDashes(message.content[0].text) : ""
}

export async function generateVeWorkshopQuestions(
  aggregated_metrics_evidence: string,
  aggregated_pain_evidence: string,
  product: ProductContext,
  candidate_drivers?: string
): Promise<string[]> {
  // Prospect research's value driver hypotheses and cost-of-doing-nothing seeds
  // carry across as candidates awaiting verbatim baselines -- not evidenced
  // numbers yet, so they shape which questions to prioritise rather than being
  // treated as already-captured evidence above.
  const candidateSection = candidate_drivers
    ? `

Candidate value drivers from prospect research (hypotheses awaiting verbatim baselines -- prioritise questions that would confirm or quantify these):
${candidate_drivers}`
    : ""

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `You are an expert Solutions Consultant preparing for a Value Engineering workshop with a prospect.

Product: ${product.company} -- ${product.one_line_value}

Evidence already captured across previous calls:

Metrics evidence:
${aggregated_metrics_evidence || "None captured yet."}

Pain evidence:
${aggregated_pain_evidence || "None captured yet."}${candidateSection}

Generate 8 to 12 focused questions to ask in the VE workshop that will surface the specific quantified inputs needed to build a credible business case. Target genuine gaps -- do not ask for information already evidenced above.

Each question should aim to uncover one of these types of input:
- Time spent on the painful task (hours per week, days per month, number of people involved)
- Cost per person or per hour involved in the task
- Frequency and volume (how many times per week/month, how many records/reports/decisions)
- Current error or failure rates and their consequences
- Baseline KPI values that the product would improve
- Financial impact of the current problem (cost of errors, rework cost, missed revenue)

Return ONLY a valid JSON array of question strings with no code fences or preamble:
["question one", "question two", ...]

Rules:
- Each question must be under 20 words.
- No em-dashes. UK English.
- Do not ask questions where the answer is already evidenced above.
- Questions should be specific to the pains and gaps visible in the evidence above.`,
      },
    ],
  })

  return parseJson<string[]>(
    message.content[0].type === "text" ? message.content[0].text : "[]"
  )
}

export async function extractVeBaseline(
  transcript: string,
  product: ProductContext,
  prospect_company: string
): Promise<VeBaselineInput[]> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are an expert Solutions Consultant reviewing a Value Engineering workshop transcript.

Product: ${product.company} -- ${product.one_line_value}
Prospect company: ${prospect_company}

Workshop transcript:
${transcript}

Extract every quantifiable baseline input that could underpin a value calculation. Look for:
- Time figures (hours per week, days per month spent on a task)
- Headcount involved in a process (number of people, FTE count)
- Cost figures (hourly rates, loaded FTE costs, outsourcing costs, tooling costs)
- Volume or frequency metrics (number of reports, transactions, decisions per period)
- Error or failure rates and their financial consequences
- KPI baselines (current conversion rate, current ROAS, current throughput)
- Any other quantified statement about the current state

Return ONLY a valid JSON array with no code fences or preamble:
[
  {
    "key": "slug_style_identifier",
    "label": "Short human label for this metric",
    "raw_value": "exactly as stated in the transcript",
    "numeric_value": 12,
    "unit": "hours/week",
    "currency": null,
    "evidence": "verbatim quote from the transcript",
    "category": "time" | "cost" | "error_rate" | "kpi" | "context",
    "direction": "increase" | "decrease"
  }
]

Rules:
- Every item must have a verbatim evidence quote from the transcript.
- Never invent or infer a number that was not stated.
- numeric_value must be the primary number (e.g. for "12 hours per week", numeric_value is 12).
- unit must describe what numeric_value measures (e.g. "hours/week", "FTE", "GBP/month", "error rate %"). Never bake a currency code into unit -- use the separate "currency" field for that, and keep unit to the non-monetary part (e.g. "/person", "/year").
- currency should be null for non-monetary metrics (time, headcount, rates).
- category classifies what kind of baseline this is:
  - "time": a duration figure (hours/days spent on a task).
  - "cost": a monetary rate or spend figure.
  - "error_rate": a failure/error rate and its consequence.
  - "kpi": a current-state performance metric that a value driver could move (e.g. conversion rate, average order value, throughput).
  - "context": headcount/FTE counts, or volume/frequency counts (orders, transactions, reports per period) -- these describe the scale of the operation, not something to "improve" by a percentage. A prospect wanting to grow order volume, or a deal with an explicit no-headcount-reduction constraint, are both reasons a raw count is context, not a driver.
- direction only applies to non-"context" categories: "increase" if a bigger number is the improvement (e.g. average order value, conversion rate), "decrease" if a smaller number is the improvement (time, cost, error rate). Omit direction for "context" items.
- key must be lowercase, underscores only, unique within the array.
- Return at most 12 inputs. Prioritise the most specific and evidenced figures over inferred or implied ones.
- Return an empty array [] if no quantifiable inputs were discussed.`,
      },
    ],
  })

  return parseJson<VeBaselineInput[]>(
    message.content[0].type === "text" ? message.content[0].text : "[]"
  )
}

export async function generateValueProposal({
  aggregated_baselines,
  ve_slider_inputs,
  matched_case_studies,
  aggregated_pain_evidence,
  product,
  prospect_company,
}: {
  aggregated_baselines: VeBaselineInput[]
  ve_slider_inputs: VeSliderInputs
  matched_case_studies: MatchedCaseStudy[]
  aggregated_pain_evidence: string
  product: ProductContext
  prospect_company: string
}): Promise<VeProposal> {
  const baselineText = aggregated_baselines.length
    ? aggregated_baselines
        .map((b) => {
          // "context" baselines (headcount, order volume) describe scale, not a pain
          // to improve -- no SC assumption applies to them, but they're still listed
          // as reference figures (e.g. for converting a volume into a time figure).
          if (b.category === "context") {
            return `- ${b.label}: ${b.raw_value} (context figure -- not an improvement assumption)\n  Evidence: "${b.evidence}"`
          }
          const sliderPct = ve_slider_inputs[b.key] ?? 40
          const directionText = b.direction === "increase" ? "increase" : "improvement"
          return `- ${b.label}: ${b.raw_value} (SC assumption: ${sliderPct}% ${directionText})\n  Evidence: "${b.evidence}"`
        })
        .join("\n")
    : "No quantified baseline inputs captured."

  const caseStudyText = matched_case_studies.length
    ? matched_case_studies
        .map((cs) => `- ${cs.customer}: ${cs.summary}\n  Relevance: ${cs.relevance_reason}`)
        .join("\n")
    : "No matched case studies available."

  const pricingText = product.pricing_tiers?.length
    ? product.pricing_tiers.map((t) => `- ${t.name}: ${t.summary}`).join("\n")
    : "Pricing not specified."

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are an expert Solutions Consultant building a structured value proposition for a prospect.

Product: ${product.company} -- ${product.one_line_value}
Prospect company: ${prospect_company}

Identified pains (verbatim from calls):
${aggregated_pain_evidence || "None captured."}

Quantified baseline inputs (from VE workshop transcript + SC improvement assumptions):
${baselineText}

Matched case studies (reference outcomes from real customers):
${caseStudyText}

Product pricing tiers:
${pricingText}

Build a structured value proposition following these rules:

RULES:
1. Select exactly 2 to 3 value drivers based on what pains and quantified baselines are actually present. Do not invent drivers for which there is no baseline evidence.
2. For each driver, include a one-sentence calculation showing the maths transparently, using only the baseline numbers and SC assumption percentages provided above -- do not invent percentages. The unit in the driver's "name" and in "calculated_value" must be the exact same unit the calculation arrives at. If the calculation converts between units (for example, a volume of orders per week into a time figure like staff-hours per week), you must use another baseline listed above that gives the per-unit conversion rate (for example, minutes per order) and show that conversion step explicitly in the "calculation" text. Never state a headline in one unit (hours) while the maths underneath only multiplies a different unit (order count) by a percentage.
3. The "calculated_value" field must express a genuine low-to-high range (e.g. "12,000 to 18,000 per year"), never the same number repeated as both ends. Derive the range using one of: (a) the low end applies the SC's assumption conservatively (e.g. to only the most firmly evidenced part of the baseline) and the high end applies it to the full evidenced baseline, (b) if a matched case study reports a different realised outcome than the SC's assumption, use the SC assumption as one bound and the case study's outcome as the other, or (c) another approach grounded in the evidence above -- state which approach you used within the "calculation" text. If you genuinely cannot construct two different, evidence-grounded bounds for a driver, "calculated_value" MUST be written as a single figure with no "to" in it at all (e.g. "12,000 per year", not "12,000 to 12,000 per year") -- the string "X to X" with the same number on both sides is never acceptable output, even when your reasoning correctly concludes only one figure is supportable. Use whatever currency appears in the baseline inputs. If no monetary currency is present for a driver, express value as time or volume saved rather than a monetary figure.
4. "pct_improvement" must equal the SC assumption percentage used for that driver (taken from the baseline inputs above).
5. Confidence: "high" = evidenced baseline number AND a matching case study outcome; "medium" = one of those two; "low" = neither.
6. "evidence" must be a specific outcome from one of the matched case studies above. Do not invent case study references.
7. "investment_notes" must reference the product pricing tiers above. Express as a band, not a single figure. Note what would push it up or down.
8. Include 1 to 3 risks or sensitivities that could reduce the value estimate.
9. "recommended_next_step" must be a specific, concrete action -- not a generic placeholder.
10. No buzzwords: no "leveraged", "seamless", "robust", "cutting-edge", "synergy". UK English. No em-dashes.
11. "executive_summary" must be 2 to 3 sentences, neutral framing, specific to this prospect.
12. "headline" must be one sentence summarising the anticipated value.

Return ONLY valid JSON matching this schema exactly:
{
  "headline": "string",
  "executive_summary": "string",
  "value_drivers": [
    {
      "name": "string",
      "pain_addressed": "verbatim pain from the evidence above",
      "pct_improvement": number,
      "calculated_value": "string (value range with currency/unit)",
      "calculation": "one-sentence transparent maths",
      "evidence": "specific outcome from a matched case study",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "investment_notes": "string",
  "risks_and_sensitivities": ["string"],
  "recommended_next_step": "string",
  "generated_at": "${new Date().toISOString()}"
}`,
      },
    ],
  })

  return parseJson<VeProposal>(
    message.content[0].type === "text" ? message.content[0].text : "{}"
  )
}

export async function draftVeCallEmail({
  prospect_name,
  prospect_company,
  transcript,
  product,
  baseline_inputs,
  sc_name,
}: {
  prospect_name: string
  prospect_company: string
  transcript: string
  product: ProductContext
  baseline_inputs: VeBaselineInput[]
  sc_name: string
}): Promise<string> {
  const baselineSummary = baseline_inputs.length
    ? baseline_inputs.map((b) => `- ${b.label}: ${b.raw_value}`).join("\n")
    : "No specific figures captured."

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are an expert B2B sales writer. Draft a follow-up email from a Solutions Consultant (SC) to a prospect after a Value Engineering workshop.

SC name: ${sc_name || "[SC Name]"}
Product: ${product.company} -- ${product.one_line_value}
Prospect name: ${prospect_name}
Prospect company: ${prospect_company}

Key baseline inputs captured in this workshop:
${baselineSummary}

Workshop transcript:
${transcript}

Rules:
- Open directly on substance. Do NOT use: "thanks for the time", "great speaking", "as discussed", "following up on our call".
- Reference specific figures or facts from the workshop using the prospect's own words.
- Second paragraph: confirm what the SC will now build (the value model) and what inputs or sign-off are still needed from the prospect's side.
- Third paragraph: confirm the next meeting or handoff point to review the value proposition.
- Keep to 3 short paragraphs.
- Sign off with the SC's name.
- Plain, specific, no marketing clichés. Under 200 words.
- UK English. No em-dashes.
- Format: Subject line on first line, blank line, then body.`,
      },
    ],
  })

  return message.content[0].type === "text" ? stripEmDashes(message.content[0].text) : ""
}
