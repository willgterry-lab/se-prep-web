"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ProductContext } from "@/types"

type Step = "url" | "competitors" | "review"

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("url")
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [extracted, setExtracted] = useState<Partial<ProductContext> | null>(null)
  const [competitorInput, setCompetitorInput] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setExtracted(data.extracted)
      setStep("competitors")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scrape failed. Check the URL and try again.")
    } finally {
      setLoading(false)
    }
  }

  function handleAddCompetitor(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      const val = competitorInput.trim().replace(/,$/, "")
      if (val && !extracted?.competitor_mentions?.includes(val)) {
        setExtracted((prev) => ({
          ...prev,
          competitor_mentions: [...(prev?.competitor_mentions ?? []), val],
        }))
      }
      setCompetitorInput("")
    }
  }

  function removeCompetitor(name: string) {
    setExtracted((prev) => ({
      ...prev,
      competitor_mentions: prev?.competitor_mentions?.filter((c) => c !== name) ?? [],
    }))
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch("/api/product-context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(extracted),
    })
    if (res.ok) {
      router.push("/dashboard")
    } else {
      const data = await res.json()
      setError(data.error)
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Set up your product</h1>
        <p className="text-gray-500 mt-1">
          We&apos;ll crawl your product site and extract everything needed for prep briefs.
        </p>
      </div>

      {/* Step 1 — URL */}
      {step === "url" && (
        <Card>
          <CardHeader>
            <CardTitle>Product URL</CardTitle>
            <CardDescription>Enter the homepage of the SaaS product you sell.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleScrape} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Homepage URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Crawling site… this takes ~30 seconds" : "Crawl and extract"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Competitors */}
      {step === "competitors" && extracted && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm competitors</CardTitle>
            <CardDescription>
              Which of these do you actually compete against in deals? Remove irrelevant ones and add any missing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 min-h-10">
              {(extracted.competitor_mentions ?? []).map((c) => (
                <Badge key={c} variant="secondary" className="cursor-pointer hover:bg-red-100" onClick={() => removeCompetitor(c)}>
                  {c} ×
                </Badge>
              ))}
              {(extracted.competitor_mentions ?? []).length === 0 && (
                <p className="text-sm text-gray-400">No competitors found — add them below.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="competitor">Add competitor</Label>
              <Input
                id="competitor"
                placeholder="Type a name and press Enter"
                value={competitorInput}
                onChange={(e) => setCompetitorInput(e.target.value)}
                onKeyDown={handleAddCompetitor}
              />
            </div>
            <Button onClick={() => setStep("review")} className="w-full">
              Continue to review
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3 — Review */}
      {step === "review" && extracted && (
        <Card>
          <CardHeader>
            <CardTitle>Review before saving</CardTitle>
            <CardDescription>
              Confirm this is correct. You can refresh at any time from the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Row label="Company" value={extracted.company} />
            <Row label="Value prop" value={extracted.one_line_value} />
            <Row label="ICP signals" value={extracted.icp?.join(", ")} />
            <Row label="Pricing tiers" value={extracted.pricing_tiers?.map((t) => t.name).join(", ")} />
            <Row
              label="Named customers"
              value={extracted.named_customers?.slice(0, 6).join(", ") + (extracted.named_customers && extracted.named_customers.length > 6 ? "…" : "")}
            />
            <Row label="Case studies" value={`${extracted.case_studies?.length ?? 0} found`} />
            <Row label="Competitors" value={extracted.competitor_mentions?.join(", ")} />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep("competitors")}>
                Back
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? "Saving…" : "Save and continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-4">
      <span className="font-medium w-36 shrink-0 text-gray-500">{label}</span>
      <span className="text-gray-800">{value || "—"}</span>
    </div>
  )
}
