export interface PricingTier {
  name: string
  summary: string
}

export interface CaseStudy {
  title: string
  url: string
  customer: string
  industry: string
  headline_pain: string
  summary: string
}

export interface ProductContext {
  id: string
  user_id: string
  company: string
  homepage: string
  one_line_value: string
  icp: string[]
  pricing_tiers: PricingTier[]
  named_customers: string[]
  case_studies: CaseStudy[]
  competitor_mentions: string[]
  crawled_at: string
  created_at: string
  updated_at: string
}

export interface SuggestedQuestions {
  sc_intro: string[]
  discovery: string[]
  technical: string[]
}

export interface MeddpiccScore {
  metrics: { score: number; evidence: string; gap: string }
  economic_buyer: { score: number; evidence: string; gap: string }
  decision_criteria: { score: number; evidence: string; gap: string }
  decision_process: { score: number; evidence: string; gap: string }
  paper_process: { score: number; evidence: string; gap: string }
  identify_pain: { score: number; evidence: string; gap: string }
  champion: { score: number; evidence: string; gap: string }
  competition: { score: number; evidence: string; gap: string }
  overall_score: number
  summary: string
  suggested_questions?: SuggestedQuestions
  answered_questions?: SuggestedQuestions
}

export interface MeddpiccElementDelta {
  prev: number
  curr: number
  change: number
}

export interface MeddpiccDelta {
  metrics: MeddpiccElementDelta
  economic_buyer: MeddpiccElementDelta
  decision_criteria: MeddpiccElementDelta
  decision_process: MeddpiccElementDelta
  paper_process: MeddpiccElementDelta
  identify_pain: MeddpiccElementDelta
  champion: MeddpiccElementDelta
  competition: MeddpiccElementDelta
  overall_prev: number
  overall_curr: number
  overall_change: number
}

export interface RiskItem {
  key?: string
  risk: string
  evidence: string
  severity: "low" | "medium" | "high"
  suggested_action?: string
}

export interface NextAction {
  action: string
  owner: string | null
  suggested_reminder_date: string | null
}

export type PovCallType = "setup" | "checkin" | "review"

export type VeBaselineCategory = "time" | "cost" | "error_rate" | "kpi" | "context"

export interface VeBaselineInput {
  key: string
  label: string
  raw_value: string
  numeric_value: number
  unit: string
  currency?: string | null
  evidence: string
  // "context" baselines (headcount, order/transaction volume) describe scale, not
  // a pain to improve -- they're kept for reference and for maths elsewhere (e.g.
  // converting an order count into hours via a time-per-order baseline) but are
  // never slider-eligible. Legacy rows extracted before this field existed will
  // have it undefined; treat that as slider-eligible (old behaviour) rather than
  // silently hiding data the SC could already see.
  category?: VeBaselineCategory
  // Only meaningful for slider-eligible categories. "increase" for baselines
  // where more is the improvement (e.g. average order value); "decrease" for
  // ones where less is the improvement (time, cost, error rate). Undefined/legacy
  // rows default to "decrease" in the UI, matching the old slider's only framing.
  direction?: "increase" | "decrease"
}

export type VeSliderInputs = Record<string, number>

export type VeConfidence = "high" | "medium" | "low"

export interface VeDriver {
  name: string
  pain_addressed: string
  pct_improvement: number
  calculated_value: string
  calculation: string
  evidence: string
  confidence: VeConfidence
}

export interface VeProposal {
  headline: string
  executive_summary: string
  value_drivers: VeDriver[]
  investment_notes: string
  risks_and_sensitivities: string[]
  recommended_next_step: string
  generated_at: string
}

export interface SuccessCriterion {
  id: number
  description: string
}

export type PovCriterionStatus = "met" | "in_progress" | "not_met"

export interface PovAssessment {
  criterion_id: number
  status: PovCriterionStatus
  evidence: string
  notes?: string | null
}

export interface MatchedCaseStudy extends CaseStudy {
  relevance_reason: string
  relevance_score: number
  one_liner?: string
}

export type BriefStage = "prep" | "post_call" | "pov" | "value_engineering"
export type DealStage = "prep" | "post_call" | "pov" | "value_engineering"

export interface Brief {
  id: string
  user_id: string
  deal_id: string | null
  stage: BriefStage
  prospect_name: string
  prospect_company: string
  discovery_notes: string
  meddpicc: MeddpiccScore
  matched_case_studies: MatchedCaseStudy[]
  follow_up_email: string
  delta: MeddpiccDelta | null
  risks: RiskItem[]
  pov_assessment: PovAssessment[]
  recording_url: string | null
  ve_baseline_inputs: VeBaselineInput[]
  // The actual date the call happened (SC-set or best-effort extracted from the
  // transcript), distinct from created_at (when the brief was logged into the
  // app). Null on older briefs or when neither source found a date -- fall back
  // to created_at for display.
  call_date: string | null
  // The prospect research run this brief was grounded in, if any (prep briefs
  // only -- post_call/pov/ve briefs don't re-run research). Null on briefs
  // created before research existed, or when research wasn't available.
  research_brief_id: string | null
  created_at: string
  updated_at: string
}

export interface Deal {
  id: string
  user_id: string
  prospect_name: string
  prospect_company: string
  stage: DealStage
  success_criteria: SuccessCriterion[]
  // Full count of distinct criteria the AI identified as agreed on the kickoff
  // call, before narrowing to the 5 stored in success_criteria. Null on deals
  // created before this field existed, or when it never exceeded 5.
  success_criteria_total_agreed: number | null
  share_token: string | null
  ve_proposal: VeProposal | null
  ve_slider_inputs: VeSliderInputs | null
  ve_published: boolean
  // Set when an SC has replaced the generated VE proposal DOCX with an
  // offline-edited version. Null means downloads should generate on the fly.
  ve_document_uploaded_at: string | null
  created_at: string
  updated_at: string
}

export type TaskStatus = "open" | "done"

export interface DealTask {
  id: string
  deal_id: string
  description: string
  status: TaskStatus
  source: string
  owner: string | null
  reminder_at: string | null
  created_at: string
  completed_at: string | null
  // Set when a later call's transcript indicates this open task is already done.
  // Surfaced to the SC as a suggestion to confirm -- never auto-completed.
  suggested_done_evidence: string | null
}

export interface DealWithBriefs extends Deal {
  briefs: Brief[]
}

export interface DealStakeholder {
  id: string
  deal_id: string
  name: string
  role: string | null
  source: "ai" | "manual"
  first_mentioned_brief_id: string | null
  created_at: string
  updated_at: string
}

export interface ExtractedStakeholder {
  name: string
  role: string | null
}

// ─── Prospect research ──────────────────────────────────────────────────────

// A single piece of evidence backing a claim. Notes evidence is first-party
// (from the pasted transcript) and has no url/retrieved_at; web evidence always
// carries both so every claim in the UI can link to and date its source.
export interface EvidenceItem {
  text: string
  origin: "notes" | "web"
  source_tier?: ResearchSourceTier
  url?: string
  retrieved_at?: string
}

// Fallback order the research pipeline degrades through per spec.
export type ResearchSourceTier =
  | "company_site"
  | "filings"
  | "news"
  | "job_postings"
  | "linkedin"
  | "reviews"

export type ResearchConfidence = "high" | "medium" | "low"

// A field whose value must be individually sourced (company snapshot). Null
// value + empty evidence means an honest "not found", never padding.
export interface SourcedField<T> {
  value: T | null
  evidence: EvidenceItem[]
}

export interface CompanySnapshotSection {
  description: SourcedField<string>
  hq: SourcedField<string>
  geographies: SourcedField<string[]>
  size: SourcedField<string> // revenue if reported, else headcount band
  ownership_type: SourcedField<string> // public | PE | family | founder
  business_lines: SourcedField<string[]>
  customer_segments: SourcedField<string[]>
  competitors: SourcedField<string[]>
}

export type StrategicContextTag = "initiative" | "leadership_change" | "hiring_signal" | "expansion_move" | "risk"

export interface StrategicContextItem {
  text: string
  tag: StrategicContextTag
  evidence: EvidenceItem
}

export interface StrategicContextSection {
  items: StrategicContextItem[]
}

export interface TechStackHint {
  item: string
  confidence: ResearchConfidence
  evidence: EvidenceItem
}

export interface OperatingModelSection {
  order_process: SourcedField<string>
  tech_stack: TechStackHint[]
  catalogue_pricing_complexity: SourcedField<string>
  manual_process_evidence: EvidenceItem[]
}

export interface ValueDriverHypothesis {
  driver_statement: string
  taxonomy: string // configurable per vendor -- default Choco taxonomy key
  evidence: EvidenceItem[] // notes evidence sorted first
  facts: string[]
  inferences: string[]
  product_mapping: string
  confidence: ResearchConfidence // "high" only asserted with 2+ independent source tiers
  matched_case_study: MatchedCaseStudy | null
  validation_question: string
}

export interface ValueDriverSection {
  most_visible_pain_headline: string
  suggested_demo_angle: string
  hypotheses: ValueDriverHypothesis[] // 3-5, ranked
}

export interface StakeholderMapEntry {
  name: string | null // null when only a persona-level placeholder is known
  role: string
  is_placeholder: boolean
  evidence: EvidenceItem | null
}

export interface StakeholderMapSection {
  entries: StakeholderMapEntry[]
  likely_economic_buyer: string | null
  likely_champion_profile: string | null
  who_is_missing: string | null
}

export type BuyingSignalStrength = "high" | "medium" | "low"

export interface BuyingSignal {
  text: string
  strength: BuyingSignalStrength
  evidence: EvidenceItem
}

export interface BuyingSignalsSection {
  signals: BuyingSignal[]
  none_found: boolean
}

export type RiskLandminePattern = "build_vs_buy" | "competitor_in_account" | "no_compelling_event"

export interface RiskLandmine {
  pattern: RiskLandminePattern
  text: string
  evidence: EvidenceItem[]
  // Only present for no_compelling_event, when a candidate cost-of-doing-nothing
  // hypothesis could be seeded from hiring/manual-process evidence -- carried
  // through to the VE stage as a candidate driver, never invented from nothing.
  cost_of_doing_nothing_seed?: string
}

export interface RisksSection {
  risks: RiskLandmine[]
}

export interface ResearchDiscoveryQuestion {
  question: string
  meddpicc_element: keyof Omit<MeddpiccScore, "overall_score" | "summary" | "suggested_questions" | "answered_questions">
  hypothesis_ref?: string // driver_statement of the ValueDriverHypothesis this question would validate
}

export interface DiscoveryQuestionsSection {
  questions: ResearchDiscoveryQuestion[]
}

export interface SourceLogEntry {
  url: string
  retrieved_at: string
  sections: string[] // section ids this source fed
  tier: ResearchSourceTier
  stale: boolean // true when retrieved_at is older than 12 months
}

export interface ResearchSections {
  snapshot: CompanySnapshotSection
  strategic_context: StrategicContextSection
  operating_model: OperatingModelSection
  value_drivers: ValueDriverSection
  stakeholders: StakeholderMapSection
  buying_signals: BuyingSignalsSection
  risks: RisksSection
  discovery_questions: DiscoveryQuestionsSection
}

export interface ResearchBrief {
  id: string
  deal_id: string
  user_id: string
  company_name: string
  company_domain: string | null
  company_hq: string | null
  company_description: string | null
  resolution_confidence: "high" | "low" | null
  sections: ResearchSections
  source_log: SourceLogEntry[]
  created_at: string
}

export interface ResolvedCompany {
  name: string
  domain: string | null
  hq: string | null
  description: string | null
}

export type CompanyResolutionStatus = "resolved" | "ambiguous" | "not_found"

export interface CompanyResolution {
  status: CompanyResolutionStatus
  confidence?: "high" | "low"
  company?: ResolvedCompany
  candidates?: ResolvedCompany[]
}
