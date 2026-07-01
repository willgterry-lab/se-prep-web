import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DeleteAccountButton } from "@/components/delete-account-button"
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
    supabase.from("briefs").select("id, deal_id, stage, meddpicc, created_at").eq("user_id", user!.id),
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
      {/* Product context card */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Product</h2>
          <Link
            href="/setup"
            className={cn(buttonVariants({ variant: product ? "outline" : "default" }))}
          >
            {product ? "Refresh" : "Set up product"}
          </Link>
        </div>

        {product ? (
          <Card>
            <CardHeader>
              <CardTitle>{product.company}</CardTitle>
              <CardDescription>{product.one_line_value}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Competitors</p>
                <div className="flex flex-wrap gap-2">
                  {product.competitor_mentions.map((c) => (
                    <Badge key={c} variant="secondary">{c}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Case studies</p>
                <p className="text-sm text-gray-600">{product.case_studies.length} loaded</p>
              </div>
              <p className="text-xs text-gray-400">
                Last crawled {new Date(product.crawled_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-gray-500">
              <p className="text-sm">No product set up yet.</p>
              <p className="text-sm">Add your product URL to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>

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
              {product && <p className="text-sm">Create your first one above.</p>}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {dealList.map((deal) => {
              const latest = latestBriefByDeal.get(deal.id)
              const score = latest?.meddpicc?.overall_score ?? null
              const displayScore = score !== null ? Math.round((score / 24) * 100) : null

              return (
                <Link key={deal.id} href={`/deal/${deal.id}`}>
                  <Card className="hover:border-[#1ED760] transition-colors cursor-pointer">
                    <CardContent className="py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{deal.prospect_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-sm text-gray-500">{deal.prospect_company}</p>
                          <Badge variant="outline" className="text-[10px] py-0">
                            {STAGE_LABELS[deal.stage]}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
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
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(deal.updated_at).toLocaleDateString()}
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

      {/* Danger zone */}
      <div>
        <Card className="border-red-100">
          <CardHeader>
            <CardTitle className="text-base text-red-700">Danger zone</CardTitle>
            <CardDescription>
              Permanently delete your account and all data -- briefs, deals, tasks, and product
              context. This cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteAccountButton />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
