import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ProductContext, Brief } from "@/types"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: productCtx }, { data: briefs }] = await Promise.all([
    supabase.from("product_contexts").select("*").eq("user_id", user!.id).single(),
    supabase.from("briefs").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
  ])

  const product = productCtx as ProductContext | null
  const briefList = (briefs ?? []) as Brief[]

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

      {/* Briefs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Prep briefs</h2>
          {product && (
            <Link href="/brief/new" className={cn(buttonVariants())}>
              New brief
            </Link>
          )}
        </div>

        {briefList.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-gray-500">
              <p className="text-sm">No briefs yet.</p>
              {product && <p className="text-sm">Create your first one above.</p>}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {briefList.map((brief) => (
              <Link key={brief.id} href={`/brief/${brief.id}`}>
                <Card className="hover:border-gray-400 transition-colors cursor-pointer">
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{brief.prospect_name}</p>
                      <p className="text-sm text-gray-500">{brief.prospect_company}</p>
                    </div>
                    <div className="text-right">
                      {brief.meddpicc && (
                        <Badge
                          variant={brief.meddpicc.overall_score >= 16 ? "default" : brief.meddpicc.overall_score >= 8 ? "secondary" : "outline"}
                        >
                          {brief.meddpicc.overall_score}/24
                        </Badge>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(brief.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
