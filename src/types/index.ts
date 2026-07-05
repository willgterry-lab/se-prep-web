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
