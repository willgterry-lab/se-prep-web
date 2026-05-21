"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { MeddpiccScore, MatchedCaseStudy } from "@/types"

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = "form" | "streaming" | "done"

type StreamState = {
  phase: Phase
  meddpicc: MeddpiccScore | null
  caseStudies: MatchedCaseStudy[] | null
  email: string | null
  error: string | null
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepRow({
  label,
  status,
}: {
  label: string
  status: "pending" | "active" | "done"
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-4 flex justify-center">
        {status === "done" && (
          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {status === "active" && (
          <svg className="w-4 h-4 text-gray-700 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
        {status === "pending" && (
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
        )}
      </span>
      <span
        className={`text-sm ${
          status === "done"
            ? "text-gray-500 line-through"
            : status === "active"
            ? "font-medium text-gray-900"
            : "text-gray-400"
        }`}
      >
        {label}
      </span>
    </div>
  )
}

// ─── Preview cards ────────────────────────────────────────────────────────────

const MEDDPICC_LABELS: Record<string, string> = {
  metrics: "Metrics",
  economic_buyer: "Economic Buyer",
  decision_criteria: "Decision Criteria",
  decision_process: "Decision Process",
  paper_process: "Paper Process",
  identify_pain: "Identify Pain",
  champion: "Champion",
  competition: "Competition",
}

function ScorePip({ score }: { score: number }) {
  const colors = ["bg-gray-200", "bg-red-400", "bg-yellow-400", "bg-green-500"]
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map((i) => (
        <span key={i} className={`w-2 h-2 rounded-full ${i <= score ? colors[score] : "bg-gray-200"}`} />
      ))}
    </div>
  )
}

function MeddpiccPreview({ score }: { score: MeddpiccScore }) {
  const keys = Object.keys(MEDDPICC_LABELS) as Array<keyof typeof MEDDPICC_LABELS>
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>MEDDPICC</CardTitle>
          <div className="text-2xl font-bold">
            {score.overall_score}
            <span className="text-sm font-normal text-gray-400">/24</span>
          </div>
        </div>
        <CardDescription>{score.summary}</CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {keys.map((key) => {
          const el = score[key as keyof MeddpiccScore] as { score: number; evidence: string; gap: string }
          if (!el || typeof el !== "object") return null
          return (
            <div key={key} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{MEDDPICC_LABELS[key]}</span>
                <ScorePip score={el.score} />
              </div>
              {el.evidence && el.evidence !== "none" && (
                <p className="text-xs text-gray-600 mb-0.5">&ldquo;{el.evidence}&rdquo;</p>
              )}
              {el.gap && (
                <p className="text-xs text-gray-400">Gap: {el.gap}</p>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function CaseStudiesPreview({ studies }: { studies: MatchedCaseStudy[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Case studies</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {studies.map((cs, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{cs.industry}</Badge>
              <a
                href={cs.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline"
              >
                {cs.customer}
              </a>
            </div>
            <p className="text-xs text-blue-600 italic">{cs.relevance_reason}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function EmailPreview({ email }: { email: string }) {
  const lines = email.split("\n")
  const subject = lines[0]
  const body = lines.slice(2).join("\n")
  return (
    <Card>
      <CardHeader>
        <CardTitle>Follow-up email</CardTitle>
        <CardDescription className="font-medium text-gray-700">{subject}</CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">{body}</pre>
      </CardContent>
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NewBriefPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    prospect_name: "",
    prospect_company: "",
    discovery_notes: "",
  })
  const [stream, setStream] = useState<StreamState>({
    phase: "form",
    meddpicc: null,
    caseStudies: null,
    email: null,
    error: null,
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function stepStatus(
    key: "meddpicc" | "case_studies" | "email",
    state: StreamState
  ): "pending" | "active" | "done" {
    if (key === "meddpicc") {
      if (state.meddpicc) return "done"
      if (state.phase === "streaming") return "active"
    }
    if (key === "case_studies") {
      if (state.caseStudies) return "done"
      if (state.phase === "streaming") return "active"
    }
    if (key === "email") {
      if (state.email) return "done"
      if (state.meddpicc && state.caseStudies) return "active"
    }
    return "pending"
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStream({ phase: "streaming", meddpicc: null, caseStudies: null, email: null, error: null })

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok || !res.body) {
        const text = await res.text()
        throw new Error(text || "Request failed")
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.trim()) continue
          const event = JSON.parse(line)

          if (event.type === "meddpicc") {
            setStream((s) => ({ ...s, meddpicc: event.data }))
          } else if (event.type === "case_studies") {
            setStream((s) => ({ ...s, caseStudies: event.data }))
          } else if (event.type === "email") {
            setStream((s) => ({ ...s, email: event.data }))
          } else if (event.type === "done") {
            setStream((s) => ({ ...s, phase: "done" }))
            router.push(`/brief/${event.data.brief_id}`)
          } else if (event.type === "error") {
            throw new Error(event.message)
          }
        }
      }
    } catch (err) {
      setStream((s) => ({
        ...s,
        phase: "form",
        error: err instanceof Error ? err.message : "Something went wrong.",
      }))
    }
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  if (stream.phase === "form") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">New prep brief</h1>
          <p className="text-gray-500 mt-1">
            Paste your discovery notes and we&apos;ll generate MEDDPICC scoring, case study
            matches, and a follow-up email.
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
                Paste raw notes from your call — transcripts, bullet points, anything. The more
                detail, the better the MEDDPICC score.
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

          {stream.error && <p className="text-sm text-red-600">{stream.error}</p>}

          <Button type="submit" className="w-full" size="lg">
            Generate prep brief
          </Button>
        </form>
      </div>
    )
  }

  // ── Streaming / done ──────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {form.prospect_name} · {form.prospect_company}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Generating your prep brief…</p>
      </div>

      {/* Progress steps */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <StepRow label="Scoring MEDDPICC" status={stepStatus("meddpicc", stream)} />
          <StepRow label="Matching case studies" status={stepStatus("case_studies", stream)} />
          <StepRow label="Drafting follow-up email" status={stepStatus("email", stream)} />
        </CardContent>
      </Card>

      {/* Results appear as they arrive */}
      {stream.meddpicc && <MeddpiccPreview score={stream.meddpicc} />}
      {stream.caseStudies && <CaseStudiesPreview studies={stream.caseStudies} />}
      {stream.email && <EmailPreview email={stream.email} />}
    </div>
  )
}
