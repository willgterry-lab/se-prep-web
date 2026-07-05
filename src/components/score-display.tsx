import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { MeddpiccScore, RiskItem } from "@/types"

// Shared between brief-view.tsx (a single brief) and deal-view.tsx (a whole deal's
// history) -- kept in one place after a numeric-score display drifted between the
// two copies of this UI (one got a fix, the other didn't).

export const MEDDPICC_LABELS: Record<
  keyof Omit<MeddpiccScore, "overall_score" | "summary" | "suggested_questions" | "answered_questions">,
  string
> = {
  metrics: "Metrics",
  economic_buyer: "Economic Buyer",
  decision_criteria: "Decision Criteria",
  decision_process: "Decision Process",
  paper_process: "Paper Process",
  identify_pain: "Identify Pain",
  champion: "Champion",
  competition: "Competition",
}

export const MEDDPICC_ELEMENTS = Object.keys(MEDDPICC_LABELS) as Array<keyof typeof MEDDPICC_LABELS>

export function toDisplayScore(raw: number) {
  return Math.round((raw / 24) * 100)
}

export function ScorePip({ score }: { score: number }) {
  const colors = ["bg-gray-200", "bg-red-400", "bg-amber-400", "bg-[#1ED760]"]
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${i <= score ? colors[score] : "bg-gray-200"}`}
        />
      ))}
    </div>
  )
}

export function ChangeChip({ change }: { change: number }) {
  if (change === 0) return <span className="text-xs text-gray-400">no change</span>
  const positive = change > 0
  return (
    <span className={`text-xs font-semibold ${positive ? "text-[#1ED760]" : "text-red-500"}`}>
      {positive ? "+" : ""}{change}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: RiskItem["severity"] }) {
  const classes = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-gray-100 text-gray-600 border-gray-200",
  }
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${classes[severity]}`}
    >
      {severity}
    </span>
  )
}

export function riskScoreColor(score: number) {
  if (score >= 60) return "bg-red-100 text-red-600"
  if (score >= 30) return "bg-amber-100 text-amber-700"
  return "bg-[#1ED760]/15 text-[#0A6630]"
}

export function RiskCard({
  risks,
  riskScore,
}: {
  risks: RiskItem[]
  riskScore?: number
}) {
  if (!risks.length) return null
  const sorted = [...risks].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.severity] - order[b.severity]
  })
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Risk areas</CardTitle>
          {riskScore !== undefined && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${riskScoreColor(riskScore)}`}
            >
              Risk score: {riskScore}/100
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sorted.map((risk, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-start gap-2">
              <SeverityBadge severity={risk.severity} />
              <p className="text-sm font-medium text-gray-800 leading-snug">{risk.risk}</p>
            </div>
            {risk.evidence && risk.evidence !== "none" && (
              <p className="text-xs text-gray-500 pl-1">
                &ldquo;{risk.evidence}&rdquo;
              </p>
            )}
            {risk.suggested_action && (
              <p className="text-xs text-gray-600 pl-1">
                <span className="font-medium">Suggested action: </span>
                {risk.suggested_action}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
