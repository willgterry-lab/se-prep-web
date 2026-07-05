import type { RiskItem } from "@/types"

// Weighted count of open risks, normalised to 0-100 (higher = riskier).
// Caps at 5 high-severity risks (the max identifyRisks ever returns) so the
// scale stays meaningful regardless of how many risks are flagged.
// Deliberately kept in its own file (not analysis.ts) since analysis.ts pulls
// in the Anthropic SDK at module scope -- this needs to be safe to import from
// client components.
const RISK_SEVERITY_WEIGHT: Record<RiskItem["severity"], number> = {
  high: 3,
  medium: 2,
  low: 1,
}
const MAX_RISK_SCORE = 5 * RISK_SEVERITY_WEIGHT.high

export function computeRiskScore(risks: RiskItem[]): number {
  if (!risks.length) return 0
  const weighted = risks.reduce((sum, r) => sum + RISK_SEVERITY_WEIGHT[r.severity], 0)
  return Math.min(100, Math.round((weighted / MAX_RISK_SCORE) * 100))
}
