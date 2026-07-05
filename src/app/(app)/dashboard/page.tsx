import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { computeRiskScore } from "@/lib/risk-score"
import { riskScoreColor } from "@/components/score-display"
import { cn } from "@/lib/utils"
import type { ProductContext, Deal, Brief } from "@/types"

const STAGE_LABELS: Record<Deal["stage"], string> = {
  prep: "Prep",
  post_call: "Post-call",
  pov: "POV",
  value_engineering: "Value Engineering",
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: productCtx }, { data: deals }, { data: briefs }] = await Promise.all([
    supabase.from("product_contexts").select("*").eq("user_id", user!.id).single(),
    supabase.from("deals").select("*").eq("user_id", user!.id).order("updated_at", { ascending: false }),
    supabase.from("briefs").select("id, deal_id, stage, meddpicc, risks, created_at").eq("user_id", user!.id),
  ])

  const product = productCtx as ProductContext | null
  const dealList = (deals ?? []) as Deal[]

  // Map deal_id -> most recent brief for score display.
  const latestBriefByDeal = new Map<string, Brief>()
  for (const brief of ((briefs ?? []) as Brief[])) {
    if (!brief.deal_id) continue
    const existing = latestBriefByDeal.get(brief.deal_id)
    if (!existing || new Date(brief.created_at) > new Date(existing.created_at)) {
      latestBriefByDeal.set(brief.deal_id, brief)
    }
  }

  return (
    <div className="space-y-8">
      {/* Deals */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Deals</h2>
          {product && (
            <Link href="/brief/new" className={cn(buttonVariants())}>
              New deal
            </Link>
          )}
        </div>

        {dealList.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-gray-500">
              <p className="text-sm">No deals yet.</p>
              {product ? (
                <p className="text-sm">Create your first one above.</p>
              ) : (
                <p className="text-sm">
                  Set up your product in{" "}
                  <Link href="/settings" className="underline">
                    Settings
                  </Link>{" "}
                  first.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {dealList.map((deal) => {
              const latest = latestBriefByDeal.get(deal.id)
              const score = latest?.meddpicc?.overall_score ?? null
              const displayScore = score !== null ? Math.round((score / 24) * 100) : null
              const risks = latest?.risks ?? []
              const riskScore = risks.length > 0 ? computeRiskScore(risks) : null

              return (
                <Link key={deal.id} href={`/deal/${deal.id}`}>
                  <Card className="hover:border-[#1ED760] transition-colors cursor-pointer">
                    <CardContent className="py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{deal.prospect_company}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-sm text-gray-500">{deal.prospect_name}</p>
                          <Badge variant="outline" className="text-[10px] py-0">
                            {STAGE_LABELS[deal.stage]}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {displayScore !== null && score !== null && (
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                score >= 16
                                  ? "bg-[#1ED760]/15 text-[#0A6630]"
                                  : score >= 8
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-600"
                              }`}
                            >
                              {displayScore}/100
                            </span>
                          )}
                          {riskScore !== null && (
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${riskScoreColor(riskScore)}`}
                            >
                              Risk {riskScore}/100
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(deal.updated_at).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
