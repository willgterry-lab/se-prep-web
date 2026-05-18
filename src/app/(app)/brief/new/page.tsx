"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewBriefPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    prospect_name: "",
    prospect_company: "",
    discovery_notes: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/brief/${data.brief.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New prep brief</h1>
        <p className="text-gray-500 mt-1">
          Paste your discovery notes and we&apos;ll generate MEDDPICC scoring, case study matches, and a follow-up email.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Prospect details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Contact name</Label>
              <Input
                id="name"
                placeholder="Jane Smith"
                value={form.prospect_name}
                onChange={(e) => set("prospect_name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                placeholder="Acme Corp"
                value={form.prospect_company}
                onChange={(e) => set("prospect_company", e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Discovery notes</CardTitle>
            <CardDescription>
              Paste raw notes from your call — transcripts, bullet points, anything. The more detail, the better the MEDDPICC score.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Spoke with Jane (VP Marketing). They're currently using Supermetrics but frustrated with the refresh lag — 'we're making budget decisions on yesterday's data'. CFO is the economic buyer. Evaluation wraps end of Q3..."
              value={form.discovery_notes}
              onChange={(e) => set("discovery_notes", e.target.value)}
              rows={12}
              required
            />
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? "Generating brief… ~30 seconds" : "Generate prep brief"}
        </Button>
      </form>
    </div>
  )
}
