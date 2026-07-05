import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DeleteAccountButton } from "@/components/delete-account-button"
import { cn } from "@/lib/utils"
import type { ProductContext } from "@/types"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: productCtx } = await supabase
    .from("product_contexts")
    .select("*")
    .eq("user_id", user!.id)
    .single()

  const product = productCtx as ProductContext | null

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

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
                Last crawled {new Date(product.crawled_at).toLocaleDateString("en-GB")}
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
