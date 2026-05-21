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
}

export interface MatchedCaseStudy extends CaseStudy {
  relevance_reason: string
  relevance_score: number
  one_liner?: string
}

export interface Brief {
  id: string
  user_id: string
  prospect_name: string
  prospect_company: string
  discovery_notes: string
  meddpicc: MeddpiccScore
  matched_case_studies: MatchedCaseStudy[]
  follow_up_email: string
  created_at: string
  updated_at: string
}
