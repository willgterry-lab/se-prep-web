import Anthropic from "@anthropic-ai/sdk"
import { anthropic, MODEL } from "@/lib/anthropic"
import { parseJson, stripEmDashes, extractStakeholders } from "@/lib/analysis"
import {
  KITWAVE_COMPANY,
  KITWAVE_SECTIONS,
  KITWAVE_SOURCE_LOG,
  KITWAVE_MEDDPICC,
  KITWAVE_CASE_STUDIES,
  KITWAVE_EMAIL,
  KITWAVE_NOTES_STAKEHOLDERS,
} from "@/lib/demo-fixtures/kitwave-group"
import type {
  CompanyResolution,
  ResolvedCompany,
  ProductContext,
  ResearchSections,
  CompanySnapshotSection,
  StrategicContextSection,
  OperatingModelSection,
  ValueDriverSection,
  RisksSection,
  StakeholderMapSection,
  BuyingSignalsSection,
  DiscoveryQuestionsSection,
  SourceLogEntry,
  EvidenceItem,
  MeddpiccScore,
  MatchedCaseStudy,
  ExtractedStakeholder,
} from "@/types"

// Server-side web search -- the only source of evidence beyond the SC's own
// pasted notes and the tier-1 site-crawl reused from /api/scrape. Capped at a
// handful of uses per call so a single Prep submission can't run away on cost.
const WEB_SEARCH_TOOL: Anthropic.WebSearchTool20250305 = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 5,
}

// Research calls cover more ground per call than company resolution (multiple
// sub-questions each), so they're allowed more searches.
const WEB_SEARCH_TOOL_RESEARCH: Anthropic.WebSearchTool20250305 = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 8,
}

// Vendor-configurable defaults (Choco's own, per spec). Swap these for another
// vendor's lens/taxonomy without touching the research prompts themselves.
export const CHOCO_VALUE_DRIVER_TAXONOMY = [
  { key: "lower_cost", label: "run the business at lower cost" },
  { key: "acquire_customers", label: "acquire new customers more efficiently" },
  { key: "retain_and_grow", label: "retain and grow the current book" },
] as const

export const CHOCO_OPERATING_MODEL_LENS =
  "How they take and process orders (phone, email, WhatsApp, EDI, portal); ERP and tech stack hints " +
  "inferred from job postings, integration/partner pages, or press; catalogue and pricing complexity " +
  "(number of price lists, SKU counts, regional variance); evidence of manual process such as job ads " +
  "for order-entry, customer service, or data-entry roles."

const SEARCH_TIER_GUIDANCE = `Research source priority, in order -- degrade gracefully down this chain, most prospects are private companies with no filings:
1. Company website and investor pages ("company_site")
2. Regulatory filings, if public ("filings")
3. News and trade press ("news")
4. Job postings ("job_postings")
5. Executive LinkedIn presence, public info only ("linkedin")
6. Review sites ("reviews")

If a field or section finds nothing after searching, say so honestly (null value, empty evidence array) -- never pad or invent to fill a gap.`

const EVIDENCE_ITEM_SHAPE = `Each web evidence item: {"text": "verbatim quote from the source", "origin": "web", "source_tier": "company_site" | "filings" | "news" | "job_postings" | "linkedin" | "reviews", "url": "exact source URL", "retrieved_at": "ISO date the source article/page itself was published or last updated, if stated -- omit this field entirely if you cannot find one, never guess a date"}
Notes-derived evidence items (only where notes are given): {"text": "verbatim quote from the notes", "origin": "notes"} -- no source_tier/url/retrieved_at.`

// Well-documented public companies can otherwise produce unbounded output --
// pick the strongest evidence over exhaustive coverage so responses stay
// within a reasonable token budget regardless of how much is publicly written
// about the prospect.
const CONCISION_GUIDANCE = `Be concise. Per field or list, include at most the 2 strongest evidence items, not everything you found.

Your final message must consist of NOTHING but the JSON object -- no lead-in sentence of any kind (e.g. never write something like "I now have sufficient data, let me compile it" or "Here is the JSON"), no markdown fence, no trailing commentary. The very first character of your final message must be "{".`

function lastText(message: Anthropic.Message): string {
  const blocks = message.content.filter(
    (b): b is Anthropic.TextBlock => b.type === "text"
  )
  return blocks.length ? blocks[blocks.length - 1].text : ""
}

// Web-search-backed calls sometimes reason in prose before their final JSON
// block (e.g. weighing ambiguous candidates) even when told not to -- unlike
// the rest of the app's prompts, which don't interleave tool use with the
// answer and so don't hit this. The shared parseJson (analysis.ts) assumes a
// fenced block starts at the top of the response, so prose before it breaks
// its fence detection. Prefer the last fenced block in the response if one
// exists, falling back to parseJson's own extraction for the common no-fence,
// no-prose case.
function parseResearchJson<T>(raw: string): T {
  const fenceMatches = [...raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)]
  if (fenceMatches.length) {
    try {
      return stripEmDashes(JSON.parse(fenceMatches[fenceMatches.length - 1][1].trim()))
    } catch {}
  }
  return parseJson<T>(raw)
}

// The model occasionally still breaks the "no prose" instruction non-
// deterministically (confirmed by replaying an identical failing request and
// getting a clean response the second time) -- a plain retry is the correct
// fix for a probabilistic failure, cheaper and more robust than more string-
// parsing gymnastics. Only re-issues the request (full cost) when parsing
// actually failed, never speculatively.
async function createAndParse<T>(
  params: Anthropic.MessageCreateParamsNonStreaming,
  attempts = 2
): Promise<T> {
  let lastError: unknown
  for (let i = 0; i < attempts; i++) {
    const message = await anthropic.messages.create(params)
    try {
      return parseResearchJson<T>(lastText(message))
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}

// Demo-day cache: a live demo can't be gated on real generation time. Matches
// on company name only -- deliberately simple since this exists for one known
// demo scenario, not a general caching layer. Every field was generated for
// real (see src/lib/demo-fixtures/kitwave-group.ts) against the actual product
// context and discovery transcript used in the demo, so it's genuine output,
// just pre-computed. The downstream MEDDPICC/case-study/email/questions/
// stakeholder fields are cached too, not just research -- timed at ~25s of
// unavoidable real generation on top of research alone once the notes are
// fixed and known in advance, which blew the "brief in under 20s" target on
// its own.
interface DemoCacheEntry {
  pattern: RegExp
  company: ResolvedCompany
  sections: ResearchSections
  sourceLog: SourceLogEntry[]
  meddpicc: MeddpiccScore
  caseStudies: MatchedCaseStudy[]
  email: string
  notesStakeholders: ExtractedStakeholder[]
}

const DEMO_CACHE: DemoCacheEntry[] = [
  {
    pattern: /kitwave/i,
    company: KITWAVE_COMPANY,
    sections: KITWAVE_SECTIONS,
    sourceLog: KITWAVE_SOURCE_LOG,
    meddpicc: KITWAVE_MEDDPICC,
    caseStudies: KITWAVE_CASE_STUDIES,
    email: KITWAVE_EMAIL,
    notesStakeholders: KITWAVE_NOTES_STAKEHOLDERS,
  },
]

export function getDemoCache(nameOrText: string): DemoCacheEntry | null {
  return DEMO_CACHE.find((entry) => entry.pattern.test(nameOrText)) ?? null
}

// Emits the same nine research_* events the real pipeline does, in the same
// order, paced with a small delay between each so the existing step-by-step
// streaming UI still reads as progress rather than an instant dump -- the
// cache exists to avoid a multi-minute wait, not to remove the "it's
// researching" moment entirely. Used standalone by the manual "run research
// only" deal-page path.
export async function emitCachedResearch(
  cache: DemoCacheEntry,
  emit: (event: object) => void,
  delayMs = 500
): Promise<void> {
  const steps: Array<() => void> = [
    () => emit({ type: "research_snapshot", data: cache.sections.snapshot }),
    () => emit({ type: "research_strategic_context", data: cache.sections.strategic_context }),
    () => emit({ type: "research_operating_model", data: cache.sections.operating_model }),
    () => emit({ type: "research_stakeholders", data: cache.sections.stakeholders }),
    () => emit({ type: "research_buying_signals", data: cache.sections.buying_signals }),
    () => emit({ type: "research_value_drivers", data: cache.sections.value_drivers }),
    () => emit({ type: "research_risks", data: cache.sections.risks }),
    () => emit({ type: "research_discovery_questions", data: cache.sections.discovery_questions }),
    () => emit({ type: "research_source_log", data: cache.sourceLog }),
  ]
  for (const step of steps) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    step()
  }
}

// Full Prep pipeline from cache: research pacing, then the MEDDPICC/case-study
// and email steps paced the same way -- used by the automatic Prep path,
// which (unlike the manual research-only path) also needs those downstream
// events to land under the demo's time budget.
export async function emitCachedBrief(
  cache: DemoCacheEntry,
  emit: (event: object) => void,
  delayMs = 500
): Promise<void> {
  await emitCachedResearch(cache, emit, delayMs)
  await new Promise((resolve) => setTimeout(resolve, delayMs))
  emit({ type: "meddpicc", data: cache.meddpicc })
  emit({ type: "case_studies", data: cache.caseStudies })
  await new Promise((resolve) => setTimeout(resolve, delayMs))
  emit({ type: "email", data: cache.email })
}

// Research-only pipeline (no MEDDPICC/case-study/email) -- shared by the two
// callers that need research without a full Prep brief: the manual "Run
// research" deal-page action and the research-first "New deal" entry point.
// Streams the same nine research_* events either way; DB writes stay with the
// caller since they need the caller's own dealId/supabase context.
export async function runResearchOnlyPipeline(params: {
  company: ResolvedCompany
  discoveryNotes: string
  product: ProductContext
  emit: (event: object) => void
}): Promise<{ sections: ResearchSections; sourceLog: SourceLogEntry[]; notesStakeholders: ExtractedStakeholder[] }> {
  const { company, discoveryNotes, product, emit } = params
  const demoCache = getDemoCache(company.name)

  const [research, notesStakeholders] = await Promise.all([
    demoCache
      ? emitCachedResearch(demoCache, emit).then(() => ({ sections: demoCache.sections, sourceLog: demoCache.sourceLog }))
      : (async (): Promise<{ sections: ResearchSections; sourceLog: SourceLogEntry[] }> => {
          const [snapshotAndContext, operatingModel, stakeholdersAndSignals, driversAndRisks] = await Promise.all([
            researchSnapshotAndContext(company).then((r) => {
              emit({ type: "research_snapshot", data: r.snapshot })
              emit({ type: "research_strategic_context", data: r.strategic_context })
              return r
            }),
            researchOperatingModel(company, CHOCO_OPERATING_MODEL_LENS).then((r) => {
              emit({ type: "research_operating_model", data: r })
              return r
            }),
            researchStakeholdersAndSignals(company).then((r) => {
              emit({ type: "research_stakeholders", data: r.stakeholders })
              emit({ type: "research_buying_signals", data: r.buying_signals })
              return r
            }),
            researchValueDriversAndRisks({
              company,
              discovery_notes: discoveryNotes,
              product,
              taxonomy: CHOCO_VALUE_DRIVER_TAXONOMY,
            }).then((r) => {
              emit({ type: "research_value_drivers", data: r.value_drivers })
              emit({ type: "research_risks", data: r.risks })
              return r
            }),
          ])

          const sectionsWithoutQuestions = {
            snapshot: snapshotAndContext.snapshot,
            strategic_context: snapshotAndContext.strategic_context,
            operating_model: operatingModel,
            value_drivers: driversAndRisks.value_drivers,
            stakeholders: stakeholdersAndSignals.stakeholders,
            buying_signals: stakeholdersAndSignals.buying_signals,
            risks: driversAndRisks.risks,
          }

          const discoveryQuestions = await researchDiscoveryQuestions({
            discovery_notes: discoveryNotes,
            sections: sectionsWithoutQuestions,
          })
          emit({ type: "research_discovery_questions", data: discoveryQuestions })

          const sections: ResearchSections = { ...sectionsWithoutQuestions, discovery_questions: discoveryQuestions }
          const sourceLog = buildSourceLog(sections)
          emit({ type: "research_source_log", data: sourceLog })
          return { sections, sourceLog }
        })(),
    discoveryNotes ? extractStakeholders(discoveryNotes, company.name) : Promise.resolve([]),
  ])

  return { sections: research.sections, sourceLog: research.sourceLog, notesStakeholders }
}

// Identifies the prospect company either from pasted notes/transcript (automatic
// path) or a name/URL typed on the deal page (manual fallback). Never guesses
// silently -- returns "ambiguous" with candidates, or "not_found", rather than
// picking a company on a low-confidence match.
export async function resolveCompany(
  input: { text: string } | { name_or_url: string }
): Promise<CompanyResolution> {
  const probeText = "name_or_url" in input ? input.name_or_url : input.text
  const cached = getDemoCache(probeText)
  if (cached) {
    return { status: "resolved", confidence: "high", company: cached.company }
  }

  const context =
    "name_or_url" in input
      ? `The user entered this company name or URL directly: "${input.name_or_url}"`
      : `Identify the prospect company mentioned in this sales call text (the company being sold to, not the seller):\n\n${input.text.slice(0, 4000)}`

  return createAndParse<CompanyResolution>({
    model: MODEL,
    max_tokens: 1024,
    tools: [WEB_SEARCH_TOOL],
    messages: [
      {
        role: "user",
        content: `${context}

Resolve this to a single real company. Use web search to confirm the company exists, and find its official domain, headquarters, and a one-line description of what it does.

Confidence rules:
- "high": a clear, uniquely identifiable company was named, or its domain/URL was directly stated.
- "low": the name is generic, shared by multiple real companies, or under-specified (no industry/location clue) such that you cannot confidently pick one over another.

If you found 2 or more plausible distinct companies and cannot tell which one is meant, return status "ambiguous" with up to 4 candidates instead of guessing. If no company name or identifying detail is present at all, return status "not_found".

Return ONLY valid JSON, no prose, no markdown fences, in exactly one of these shapes:
{"status": "resolved", "confidence": "high", "company": {"name": "...", "domain": "...", "hq": "...", "description": "one line, what they do"}}
{"status": "ambiguous", "candidates": [{"name": "...", "domain": "...", "hq": "...", "description": "..."}]}
{"status": "not_found"}`,
      },
    ],
  })
}

function companyContextLine(company: ResolvedCompany): string {
  return `${company.name}${company.domain ? ` (${company.domain})` : ""}${company.hq ? `, headquartered in ${company.hq}` : ""}`
}

// Sections 1-2: company snapshot + strategic context. Grouped in one call since
// both are "facts about the company" research with the same source mix.
export async function researchSnapshotAndContext(
  company: ResolvedCompany
): Promise<{ snapshot: CompanySnapshotSection; strategic_context: StrategicContextSection }> {
  return createAndParse<{ snapshot: CompanySnapshotSection; strategic_context: StrategicContextSection }>({
    model: MODEL,
    max_tokens: 7000,
    tools: [WEB_SEARCH_TOOL_RESEARCH],
    messages: [
      {
        role: "user",
        content: `Research the company ${companyContextLine(company)}.

${SEARCH_TIER_GUIDANCE}

Produce two things:

1. A company snapshot: one-line description of what they do, headquarters, geographies they operate in (at most 5), size (revenue if reported, else headcount band), ownership type (public / PE-owned / family-owned / founder-owned), key business lines (at most 5), customer segments (at most 4), and direct competitors (at most 5).

2. Strategic context: stated initiatives, funding or M&A activity, leadership changes in the last 12 months, expansion or restructuring moves. At most 6 items total, the most significant. Tag each item as exactly one of: "initiative", "leadership_change", "hiring_signal", "expansion_move", "risk".

${EVIDENCE_ITEM_SHAPE}
${CONCISION_GUIDANCE}

Return ONLY valid JSON, no prose, no markdown fences:
{
  "snapshot": {
    "description": {"value": "... or null", "evidence": []},
    "hq": {"value": "... or null", "evidence": []},
    "geographies": {"value": ["..."] , "evidence": []},
    "size": {"value": "... or null", "evidence": []},
    "ownership_type": {"value": "... or null", "evidence": []},
    "business_lines": {"value": ["..."], "evidence": []},
    "customer_segments": {"value": ["..."], "evidence": []},
    "competitors": {"value": ["..."], "evidence": []}
  },
  "strategic_context": {
    "items": [{"text": "...", "tag": "initiative", "evidence": {"text": "...", "origin": "web", "source_tier": "news", "url": "...", "retrieved_at": "..."}}]
  }
}

Every snapshot field's "evidence" array holds every EvidenceItem backing that field's value (empty if value is null).`,
      },
    ],
  })
}

// Section 3: operating model, through the vendor's configurable lens.
export async function researchOperatingModel(
  company: ResolvedCompany,
  operatingModelLens: string = CHOCO_OPERATING_MODEL_LENS
): Promise<OperatingModelSection> {
  return createAndParse<OperatingModelSection>({
    model: MODEL,
    max_tokens: 6000,
    tools: [WEB_SEARCH_TOOL_RESEARCH],
    messages: [
      {
        role: "user",
        content: `Research the operating model of ${companyContextLine(company)} through this lens:

${operatingModelLens}

${SEARCH_TIER_GUIDANCE}

For each tech stack hint (at most 5), rate your confidence (high/medium/low) based on how directly it's evidenced -- a job posting or integration page explicitly naming a system is high; an indirect inference is low. At most 4 manual-process evidence items.

${EVIDENCE_ITEM_SHAPE}
${CONCISION_GUIDANCE}

Return ONLY valid JSON, no prose, no markdown fences:
{
  "order_process": {"value": "... or null", "evidence": []},
  "tech_stack": [{"item": "...", "confidence": "high", "evidence": {"text": "...", "origin": "web", "source_tier": "job_postings", "url": "...", "retrieved_at": "..."}}],
  "catalogue_pricing_complexity": {"value": "... or null", "evidence": []},
  "manual_process_evidence": []
}`,
      },
    ],
  })
}

// Sections 5-6: preliminary stakeholder map + buying signals. Grouped since
// both are "people and timing" research with the same source mix.
export async function researchStakeholdersAndSignals(
  company: ResolvedCompany
): Promise<{ stakeholders: StakeholderMapSection; buying_signals: BuyingSignalsSection }> {
  return createAndParse<{ stakeholders: StakeholderMapSection; buying_signals: BuyingSignalsSection }>({
    model: MODEL,
    max_tokens: 7000,
    tools: [WEB_SEARCH_TOOL_RESEARCH],
    messages: [
      {
        role: "user",
        content: `Research ${companyContextLine(company)} for two things:

1. A preliminary stakeholder map: named executives found publicly (at most 6), each with role and a source link. Where a relevant role exists but no name can be found, add a persona-level placeholder (name: null, is_placeholder: true, evidence: null). Identify the likely economic buyer, a likely champion profile, and a "who is missing" note.

2. Buying signals and timing: hiring surges, relevant job postings, new tooling adoption, seasonal or regulatory pressure. At most 5 signals, the strongest. Rate each signal's strength (high/medium/low). If none found, say so explicitly (empty signals array, none_found: true).

${SEARCH_TIER_GUIDANCE}

${EVIDENCE_ITEM_SHAPE}
${CONCISION_GUIDANCE}

Return ONLY valid JSON, no prose, no markdown fences:
{
  "stakeholders": {
    "entries": [{"name": "... or null", "role": "...", "is_placeholder": false, "evidence": {"text": "...", "origin": "web", "source_tier": "linkedin", "url": "...", "retrieved_at": "..."} }],
    "likely_economic_buyer": "... or null",
    "likely_champion_profile": "... or null",
    "who_is_missing": "... or null"
  },
  "buying_signals": {
    "signals": [{"text": "...", "strength": "high", "evidence": {"text": "...", "origin": "web", "source_tier": "job_postings", "url": "...", "retrieved_at": "..."}}],
    "none_found": false
  }
}`,
      },
    ],
  })
}

// Sections 4 and 7 -- the core section (value driver hypotheses) plus risks and
// landmines. Grouped because both need the same notes + case study context and
// risks (competitor-in-account, no-compelling-event) are naturally discovered
// alongside value-driver evidence in the same research pass.
export async function researchValueDriversAndRisks(params: {
  company: ResolvedCompany
  discovery_notes: string
  product: ProductContext
  taxonomy?: readonly { key: string; label: string }[]
}): Promise<{ value_drivers: ValueDriverSection; risks: RisksSection }> {
  const taxonomy = params.taxonomy ?? CHOCO_VALUE_DRIVER_TAXONOMY
  const taxonomyText = taxonomy.map((t) => `"${t.key}" (${t.label})`).join(", ")

  return createAndParse<{ value_drivers: ValueDriverSection; risks: RisksSection }>({
    model: MODEL,
    max_tokens: 9000,
    tools: [WEB_SEARCH_TOOL_RESEARCH],
    messages: [
      {
        role: "user",
        content: `You are researching ${companyContextLine(params.company)} to build value-driver hypotheses for an SE ahead of a first call.

Discovery notes from the SC (first-party -- treat as strong evidence):
${params.discovery_notes}

Value driver taxonomy to classify each hypothesis against: ${taxonomyText}

${SEARCH_TIER_GUIDANCE}

Available case studies to match against (pick the closest genuine fit per hypothesis, else null -- never force a weak match):
${JSON.stringify(params.product.case_studies ?? [], null, 2)}

Produce:

1. Value driver hypotheses. Open with a "most visible pain" headline and a suggested demo angle. Then 3-5 ranked hypothesis cards (no more than 5). Each card: a driver statement in business-outcome language, one taxonomy key, evidence (from notes and/or web, at most 3 items -- tag origin per item), an explicit split of facts vs inferences (at most 3 each), a one-line product mapping (no feature dump -- ground it in what this product actually does: "${params.product.one_line_value}"), confidence ("high" only when backed by 2+ independent sources), the closest matching case study or null, and one validation question that would confirm or kill the hypothesis on call one.

2. Risks and landmines -- distinct from a knowledge gap, this is "something likely to stall or lose the deal". Check for exactly these three patterns and include only the ones you find real evidence for (at most 2 evidence items each):
   - "build_vs_buy": large in-house engineering team, internal tooling job ads, home-grown systems history -- flags a possible fact-finding/build cycle.
   - "competitor_in_account": evidence of a competitor already engaged (their case studies, integration listings, review mentions).
   - "no_compelling_event": state plainly if you find no urgency driver. Where possible, seed a cost-of-doing-nothing hypothesis (e.g. headcount growth in manual roles) as a candidate for a later Value Engineering stage -- never invent one with no evidence behind it, omit cost_of_doing_nothing_seed if you can't.

${EVIDENCE_ITEM_SHAPE}
${CONCISION_GUIDANCE}

Return ONLY valid JSON, no prose, no markdown fences:
{
  "value_drivers": {
    "most_visible_pain_headline": "...",
    "suggested_demo_angle": "...",
    "hypotheses": [
      {
        "driver_statement": "...",
        "taxonomy": "lower_cost",
        "evidence": [],
        "facts": ["..."],
        "inferences": ["..."],
        "product_mapping": "...",
        "confidence": "medium",
        "matched_case_study": null,
        "validation_question": "..."
      }
    ]
  },
  "risks": {
    "risks": [
      {"pattern": "no_compelling_event", "text": "...", "evidence": [], "cost_of_doing_nothing_seed": "... or omit"}
    ]
  }
}

If matched_case_study is not null, reproduce the exact fields from the case study list above plus "relevance_reason" (one sentence), "relevance_score" (1-10), and optional "one_liner": {"title":"...","url":"...","customer":"...","industry":"...","headline_pain":"...","summary":"...","relevance_reason":"...","relevance_score":8}`,
      },
    ],
  })
}

// Section 8 -- generated from the gaps and unknowns in the sections already
// researched, not from a fresh web search. Pure reasoning, same as the existing
// generateQuestions/updateQuestions functions in analysis.ts.
export async function researchDiscoveryQuestions(params: {
  discovery_notes: string
  sections: Omit<ResearchSections, "discovery_questions">
}): Promise<DiscoveryQuestionsSection> {
  return createAndParse<DiscoveryQuestionsSection>({
    model: MODEL,
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `Based on the gaps and unknowns in this prospect research brief, generate a discovery question list for the SC's first call.

Research so far:
${JSON.stringify(params.sections, null, 2)}

Discovery notes already gathered:
${params.discovery_notes}

For each question, note which MEDDPICC element it would help fill (exactly one of: metrics, economic_buyer, decision_criteria, decision_process, paper_process, identify_pain, champion, competition) and, where the question would help validate a specific value driver hypothesis, its exact driver_statement as hypothesis_ref (omit if none applies).

Return ONLY valid JSON, no prose, no markdown fences:
{"questions": [{"question": "...", "meddpicc_element": "identify_pain", "hypothesis_ref": "exact driver_statement or omit this field"}]}`,
      },
    ],
  })
}

// Section 9 -- computed, not generated. Every web-origin EvidenceItem across
// every section is deduplicated by URL into one source log row, tagging which
// sections it fed and whether it's stale (source content older than 12 months).
// Kept as a pure function (like computeDelta in analysis.ts) rather than an AI
// call -- the source log is a mechanical rollup of data the model already gave
// us, not something that benefits from being regenerated by another prompt.
export function buildSourceLog(sections: ResearchSections): SourceLogEntry[] {
  const byUrl = new Map<string, SourceLogEntry>()

  function record(item: EvidenceItem | null | undefined, sectionId: string) {
    if (!item || item.origin !== "web" || !item.url) return
    const existing = byUrl.get(item.url)
    if (existing) {
      if (!existing.sections.includes(sectionId)) existing.sections.push(sectionId)
      return
    }
    const stale = item.retrieved_at
      ? Date.now() - new Date(item.retrieved_at).getTime() > 365 * 24 * 60 * 60 * 1000
      : false
    byUrl.set(item.url, {
      url: item.url,
      retrieved_at: item.retrieved_at ?? new Date().toISOString(),
      sections: [sectionId],
      tier: item.source_tier ?? "company_site",
      stale,
    })
  }

  const snap = sections.snapshot
  for (const field of [
    snap.description, snap.hq, snap.geographies, snap.size,
    snap.ownership_type, snap.business_lines, snap.customer_segments, snap.competitors,
  ]) {
    field.evidence.forEach((e) => record(e, "snapshot"))
  }

  sections.strategic_context.items.forEach((i) => record(i.evidence, "strategic_context"))

  const om = sections.operating_model
  om.order_process.evidence.forEach((e) => record(e, "operating_model"))
  om.tech_stack.forEach((t) => record(t.evidence, "operating_model"))
  om.catalogue_pricing_complexity.evidence.forEach((e) => record(e, "operating_model"))
  om.manual_process_evidence.forEach((e) => record(e, "operating_model"))

  sections.value_drivers.hypotheses.forEach((h) => h.evidence.forEach((e) => record(e, "value_drivers")))

  sections.stakeholders.entries.forEach((s) => record(s.evidence, "stakeholders"))

  sections.buying_signals.signals.forEach((s) => record(s.evidence, "buying_signals"))

  sections.risks.risks.forEach((r) => r.evidence.forEach((e) => record(e, "risks")))

  return [...byUrl.values()]
}
