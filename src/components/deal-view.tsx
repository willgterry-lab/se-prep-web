"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Deal, Brief, DealTask, MeddpiccDelta, RiskItem, TaskStatus, SuccessCriterion, PovAssessment, PovCriterionStatus, VeBaselineInput, VeSliderInputs, VeProposal, VeConfidence } from "@/types"

// ─── Constants ────────────────────────────────────────────────────────────────

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

const MEDDPICC_ELEMENTS = Object.keys(MEDDPICC_LABELS) as Array<keyof typeof MEDDPICC_LABELS>

const STAGE_LABELS: Record<Deal["stage"], string> = {
  prep: "Prep",
  post_call: "Post-call",
  pov: "POV",
  value_engineering: "Value Engineering",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDisplayScore(raw: number) {
  return Math.round((raw / 24) * 100)
}

function ScorePip({ score }: { score: number }) {
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

function ChangeChip({ change }: { change: number }) {
  if (change === 0) return <span className="text-xs text-gray-400">no change</span>
  const positive = change > 0
  return (
    <span
      className={`text-xs font-semibold ${positive ? "text-[#1ED760]" : "text-red-500"}`}
    >
      {positive ? "+" : ""}{change}
    </span>
  )
}

function PovStatusBadge({ status }: { status: PovCriterionStatus }) {
  const classes = {
    met: "bg-[#1ED760]/15 text-[#0A6630] border-[#1ED760]/30",
    in_progress: "bg-amber-100 text-amber-700 border-amber-200",
    not_met: "bg-gray-100 text-gray-500 border-gray-200",
  }
  const labels = { met: "Met", in_progress: "In progress", not_met: "Not yet" }
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shrink-0 ${classes[status]}`}
    >
      {labels[status]}
    </span>
  )
}

function SeverityBadge({ severity }: { severity: RiskItem["severity"] }) {
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

// ─── Delta card ───────────────────────────────────────────────────────────────

function DeltaCard({ delta }: { delta: MeddpiccDelta }) {
  const prevDisplay = toDisplayScore(delta.overall_prev)
  const currDisplay = toDisplayScore(delta.overall_curr)
  const overallChange = currDisplay - prevDisplay

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Score movement</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">{prevDisplay}/100</span>
            <span className="text-gray-400">to</span>
            <span
              className={`font-bold ${delta.overall_curr >= 16 ? "text-[#1ED760]" : delta.overall_curr >= 8 ? "text-amber-500" : "text-red-500"}`}
            >
              {currDisplay}/100
            </span>
            <ChangeChip change={overallChange} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="divide-y">
        {MEDDPICC_ELEMENTS.map((key) => {
          const el = delta[key as keyof MeddpiccDelta] as { prev: number; curr: number; change: number } | undefined
          if (!el || typeof el !== "object" || !("prev" in el)) return null
          return (
            <div key={key} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
              <span className="text-sm text-gray-700 w-36 shrink-0">{MEDDPICC_LABELS[key]}</span>
              <div className="flex items-center gap-3">
                <ScorePip score={el.prev} />
                <span className="text-gray-300 text-xs">to</span>
                <ScorePip score={el.curr} />
                <ChangeChip change={el.change} />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ─── Risk card ────────────────────────────────────────────────────────────────

function RiskCard({ risks }: { risks: RiskItem[] }) {
  if (!risks.length) return null
  const sorted = [...risks].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.severity] - order[b.severity]
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk areas</CardTitle>
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
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Task list ────────────────────────────────────────────────────────────────

function TaskList({ dealId, initialTasks }: { dealId: string; initialTasks: DealTask[] }) {
  const [tasks, setTasks] = useState(initialTasks)
  const [pending, setPending] = useState<Set<string>>(new Set())

  const toggle = useCallback(
    async (taskId: string, current: TaskStatus) => {
      const next: TaskStatus = current === "open" ? "done" : "open"
      setPending((p) => new Set(p).add(taskId))
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: next } : t))
      )

      try {
        await fetch(`/api/deals/${dealId}/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        })
      } catch {
        // Revert on failure
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: current } : t))
        )
      } finally {
        setPending((p) => {
          const next = new Set(p)
          next.delete(taskId)
          return next
        })
      }
    },
    [dealId]
  )

  const now = new Date()
  const open = tasks.filter((t) => t.status === "open")
  const done = tasks.filter((t) => t.status === "done")

  if (!tasks.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {open.map((task) => {
          const overdue = task.reminder_at && new Date(task.reminder_at) < now
          return (
            <TaskRow
              key={task.id}
              task={task}
              overdue={!!overdue}
              isPending={pending.has(task.id)}
              onToggle={toggle}
            />
          )
        })}
        {done.length > 0 && open.length > 0 && (
          <div className="pt-2 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Completed</p>
          </div>
        )}
        {done.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            overdue={false}
            isPending={pending.has(task.id)}
            onToggle={toggle}
          />
        ))}
      </CardContent>
    </Card>
  )
}

function TaskRow({
  task,
  overdue,
  isPending,
  onToggle,
}: {
  task: DealTask
  overdue: boolean
  isPending: boolean
  onToggle: (id: string, status: TaskStatus) => void
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-md px-2 py-2 cursor-pointer transition-colors hover:bg-gray-50 ${isPending ? "opacity-50" : ""}`}
    >
      <input
        type="checkbox"
        checked={task.status === "done"}
        onChange={() => onToggle(task.id, task.status)}
        disabled={isPending}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#1ED760] cursor-pointer shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-snug ${task.status === "done" ? "line-through text-gray-400" : "text-gray-800"}`}
        >
          {task.description}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.owner && (
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{task.owner}</span>
          )}
          {overdue && task.status === "open" && (
            <span className="inline-flex items-center rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 uppercase tracking-wide">
              Overdue
            </span>
          )}
          {task.reminder_at && !overdue && task.status === "open" && (
            <span className="text-[10px] text-gray-400">
              Due {new Date(task.reminder_at).toLocaleDateString("en-GB")}
            </span>
          )}
        </div>
      </div>
    </label>
  )
}

// ─── POV stage card ──────────────────────────────────────────────────────────

const POV_STAGES = ["Setup", "Check-in", "Final review"]

function PovStageCard({ dealId, povBriefCount }: { dealId: string; povBriefCount: number }) {
  const nextLabel =
    povBriefCount === 1
      ? "Log check-in call"
      : povBriefCount === 2
      ? "Log final review"
      : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>POV stage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-start">
          {POV_STAGES.flatMap((label, i) => {
            const isDone = i < povBriefCount
            const isNext = i === povBriefCount
            const items = [
              <div key={label} className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    isDone
                      ? "bg-[#1ED760] border-[#1ED760]"
                      : isNext
                      ? "border-gray-400 bg-white"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  {isDone ? (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className={`w-2 h-2 rounded-full ${isNext ? "bg-gray-400" : "bg-gray-200"}`} />
                  )}
                </div>
                <span
                  className={`text-xs text-center leading-tight max-w-[56px] ${
                    isDone ? "font-medium text-gray-800" : isNext ? "text-gray-600" : "text-gray-300"
                  }`}
                >
                  {label}
                </span>
              </div>,
            ]
            if (i < POV_STAGES.length - 1) {
              items.push(
                <div
                  key={`c${i}`}
                  className={`flex-1 h-px mt-4 mx-1 ${i < povBriefCount - 1 ? "bg-[#1ED760]" : "bg-gray-200"}`}
                />
              )
            }
            return items
          })}
        </div>

        {nextLabel && (
          <Link
            href={`/deal/${dealId}/pov/new`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {nextLabel}
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

// ─── POV progress card ────────────────────────────────────────────────────────

function PovProgressCard({
  criteria,
  assessment,
}: {
  criteria: SuccessCriterion[]
  assessment: PovAssessment[]
}) {
  const assessmentMap = new Map(assessment.map((a) => [a.criterion_id, a]))
  const metCount = assessment.filter((a) => a.status === "met").length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>POV progress</CardTitle>
          <span className="text-sm text-gray-500">
            {metCount} of {criteria.length} met
          </span>
        </div>
      </CardHeader>
      <CardContent className="divide-y">
        {criteria.map((c) => {
          const a = assessmentMap.get(c.id)
          const status: PovCriterionStatus = a?.status ?? "not_met"
          return (
            <div key={c.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-gray-800 leading-snug">{c.description}</p>
                <PovStatusBadge status={status} />
              </div>
              {a?.evidence && a.evidence !== "Not evidenced on this call" && (
                <p className="text-xs text-gray-500 italic">
                  &ldquo;{a.evidence}&rdquo;
                </p>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ─── Share section ────────────────────────────────────────────────────────────

function ShareSection({ dealId, initialToken }: { dealId: string; initialToken: string | null }) {
  const [token, setToken] = useState<string | null>(initialToken)
  const [shareUrl, setShareUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (token) setShareUrl(`${window.location.origin}/s/${token}`)
    else setShareUrl("")
  }, [token])

  async function generate() {
    setLoading(true)
    try {
      const res = await fetch(`/api/deals/${dealId}/share`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      })
      const data = await res.json()
      if (res.ok) setToken(data.share_token)
    } finally {
      setLoading(false)
    }
  }

  async function revoke() {
    setLoading(true)
    try {
      const res = await fetch(`/api/deals/${dealId}/share`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      })
      if (res.ok) setToken(null)
    } finally {
      setLoading(false)
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prospect salesroom</CardTitle>
        <CardDescription className="mt-1">
          Share a live POV progress page with your prospect.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {token ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 text-sm bg-gray-50 border rounded-md px-3 py-2 text-gray-700 font-mono truncate"
              />
              <Button variant="outline" size="sm" onClick={copy} disabled={!shareUrl}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <button
              type="button"
              onClick={revoke}
              disabled={loading}
              className="text-xs text-red-500 hover:text-red-700 underline underline-offset-2 disabled:opacity-50"
            >
              Revoke link
            </button>
          </div>
        ) : (
          <Button onClick={generate} disabled={loading}>
            {loading ? "Generating..." : "Generate salesroom link"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// ─── VE confidence badge ──────────────────────────────────────────────────────

function VeConfidenceBadge({ confidence }: { confidence: VeConfidence }) {
  const classes: Record<VeConfidence, string> = {
    high: "bg-[#1ED760]/15 text-[#0A6630] border-[#1ED760]/30",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-gray-100 text-gray-500 border-gray-200",
  }
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shrink-0 ${classes[confidence]}`}
    >
      {confidence} confidence
    </span>
  )
}

// ─── VE baseline + sliders card ───────────────────────────────────────────────

function VeBaselineCard({
  dealId,
  baselines,
  sliders,
  onSlidersChange,
  onGenerate,
  generating,
  hasProposal,
}: {
  dealId: string
  baselines: VeBaselineInput[]
  sliders: VeSliderInputs
  onSlidersChange: (key: string, value: number) => void
  onGenerate: () => void
  generating: boolean
  hasProposal: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Baseline inputs</CardTitle>
            <CardDescription className="mt-1">
              Quantified inputs extracted from the VE workshop. Adjust the sliders to set your improvement assumptions before generating the value proposal.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {baselines.length === 0 ? (
          <p className="text-sm text-gray-500">No baseline inputs captured yet. Log a VE workshop call to extract them.</p>
        ) : (
          <>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Slider values are your assumptions, not evidenced outcomes. They will be clearly labelled as such in the value proposal.
            </p>
            <div className="divide-y">
              {baselines.map((b) => {
                const pct = sliders[b.key] ?? 40
                const improved = (b.numeric_value * pct / 100).toFixed(1)
                return (
                  <div key={b.key} className="py-4 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{b.label}</p>
                        <p className="text-xs text-gray-500">
                          {b.raw_value}
                          {b.currency && ` (${b.currency})`}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-[#1ED760] shrink-0">
                        {pct}% improvement
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={90}
                      step={5}
                      value={pct}
                      onChange={(e) => onSlidersChange(b.key, Number(e.target.value))}
                      className="w-full accent-[#1ED760]"
                    />
                    <p className="text-xs text-gray-400">
                      {improved} {b.unit} improvement estimated
                    </p>
                    {b.evidence && (
                      <p className="text-xs text-gray-400 italic border-l-2 border-gray-200 pl-2">
                        &ldquo;{b.evidence}&rdquo;
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
            <Button onClick={onGenerate} disabled={generating} className="w-full">
              {generating
                ? "Generating..."
                : hasProposal
                ? "Regenerate value proposal"
                : "Generate value proposal"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── VE proposal card ─────────────────────────────────────────────────────────

function VeProposalCard({ proposal }: { proposal: VeProposal }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Value proposal</CardTitle>
        <CardDescription className="mt-1">{proposal.headline}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-gray-700 leading-relaxed">{proposal.executive_summary}</p>

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Value Drivers</p>
          {proposal.value_drivers.map((driver, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">{driver.name}</p>
                <VeConfidenceBadge confidence={driver.confidence} />
              </div>
              <p className="text-xs text-gray-500 italic">{driver.pain_addressed}</p>
              <p className="text-lg font-bold text-[#1ED760]">{driver.calculated_value}</p>

              {/* Improvement bar */}
              <div className="space-y-1">
                <p className="text-[10px] text-amber-600 font-medium">SC assumption: {driver.pct_improvement}% improvement</p>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-[#1ED760]"
                    style={{ width: `${driver.pct_improvement}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500">{driver.calculation}</p>
              <p className="text-xs text-gray-500 border-l-2 border-[#1ED760] pl-3 italic">{driver.evidence}</p>
            </div>
          ))}
        </div>

        {proposal.investment_notes && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Investment</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-md px-4 py-3">{proposal.investment_notes}</p>
          </div>
        )}

        {proposal.risks_and_sensitivities.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Risks and Sensitivities</p>
            <ul className="space-y-1">
              {proposal.risks_and_sensitivities.map((r, i) => (
                <li key={i} className="text-xs text-gray-600 flex gap-2">
                  <span className="text-gray-400 shrink-0">-</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-md bg-[#F0FDF4] border border-[#1ED760]/20 px-4 py-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0A6630]">Recommended Next Step</p>
          <p className="text-sm text-gray-800">{proposal.recommended_next_step}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── VE publish section ───────────────────────────────────────────────────────

function VePublishSection({
  dealId,
  initialPublished,
  hasProposal,
}: {
  dealId: string
  initialPublished: boolean
  hasProposal: boolean
}) {
  const [published, setPublished] = useState(initialPublished)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      const action = published ? "unpublish" : "publish"
      const res = await fetch(`/api/deals/${dealId}/ve-proposal`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (res.ok) setPublished(!published)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Value proposal - salesroom</CardTitle>
        <CardDescription className="mt-1">
          Publish the value proposal to the prospect salesroom, or download a PDF copy.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <Button
          variant={published ? "outline" : "default"}
          onClick={toggle}
          disabled={loading || !hasProposal}
        >
          {loading
            ? "Updating..."
            : published
            ? "Unpublish from salesroom"
            : "Publish to salesroom"}
        </Button>
        {hasProposal && (
          <a
            href={`/api/deals/${dealId}/ve-proposal.pdf`}
            className="text-sm text-gray-600 underline underline-offset-2 hover:text-gray-900"
          >
            Download PDF
          </a>
        )}
        {published && (
          <span className="text-xs text-[#1ED760] font-medium">Live on salesroom</span>
        )}
        {!hasProposal && (
          <p className="text-xs text-gray-400">Generate a value proposal above first.</p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DealView({
  deal,
  briefs,
  tasks,
}: {
  deal: Deal
  briefs: Brief[]
  tasks: DealTask[]
}) {
  const latestBrief = briefs.length ? briefs[briefs.length - 1] : null
  const postCallBrief = briefs.find((b) => b.stage === "post_call") ?? null
  const povBriefs = briefs.filter((b) => b.stage === "pov")
  const povBriefCount = povBriefs.length
  const latestPovBrief = povBriefs.length > 0 ? povBriefs[povBriefs.length - 1] : null
  const hasPostCall = !!postCallBrief
  const hasPov = povBriefCount > 0

  // VE computed values
  const veBriefs = briefs.filter((b) => b.stage === "value_engineering")
  const hasVe = veBriefs.length > 0

  // Aggregate baseline inputs across VE briefs (dedup by key, last-write-wins)
  const baselineMap = new Map<string, VeBaselineInput>()
  for (const b of veBriefs) {
    for (const inp of (b.ve_baseline_inputs as VeBaselineInput[]) ?? []) {
      baselineMap.set(inp.key, inp)
    }
  }
  const aggregatedBaselines = [...baselineMap.values()]

  // Slider state: initialise from saved ve_slider_inputs, defaulting to 40
  const [sliders, setSliders] = useState<VeSliderInputs>(() => {
    const saved = deal.ve_slider_inputs ?? {}
    return aggregatedBaselines.reduce<VeSliderInputs>((acc, b) => {
      acc[b.key] = saved[b.key] ?? 40
      return acc
    }, {})
  })

  const [veProposal, setVeProposal] = useState<VeProposal | null>(deal.ve_proposal)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  function handleSliderChange(key: string, value: number) {
    setSliders((prev) => ({ ...prev, [key]: value }))
  }

  async function handleGenerateProposal() {
    setGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch(`/api/deals/${deal.id}/ve-proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ve_slider_inputs: sliders }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to generate proposal.")
      setVeProposal(data.proposal)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setGenerating(false)
    }
  }

  const m = latestBrief?.meddpicc ?? null
  const displayScore = m ? toDisplayScore(m.overall_score) : null

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{deal.prospect_name}</h1>
            <Badge variant="outline" className="text-xs">
              {STAGE_LABELS[deal.stage]}
            </Badge>
          </div>
          <p className="text-gray-500">{deal.prospect_company}</p>
          <p className="text-xs text-gray-400 mt-1">
            Started {new Date(deal.created_at).toLocaleDateString("en-GB")}
          </p>
        </div>
        {displayScore !== null && m && (
          <div className="text-right">
            <div
              className={`text-3xl font-bold ${m.overall_score >= 16 ? "text-[#1ED760]" : m.overall_score >= 8 ? "text-amber-500" : "text-red-500"}`}
            >
              {displayScore}
              <span className="text-lg font-normal text-gray-400">/100</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">MEDDPICC score</p>
          </div>
        )}
      </div>

      {/* Score delta */}
      {postCallBrief?.delta && <DeltaCard delta={postCallBrief.delta} />}

      {/* Risk areas */}
      {postCallBrief?.risks && postCallBrief.risks.length > 0 && (
        <RiskCard risks={postCallBrief.risks} />
      )}

      {/* POV stage progress */}
      {hasPov && (
        <PovStageCard dealId={deal.id} povBriefCount={povBriefCount} />
      )}

      {/* POV criteria progress */}
      {hasPov && latestPovBrief && deal.success_criteria?.length > 0 && (
        <PovProgressCard
          criteria={deal.success_criteria}
          assessment={latestPovBrief.pov_assessment ?? []}
        />
      )}

      {/* Salesroom share */}
      {hasPov && (
        <ShareSection dealId={deal.id} initialToken={deal.share_token} />
      )}

      {/* VE baseline + sliders */}
      {hasVe && (
        <VeBaselineCard
          dealId={deal.id}
          baselines={aggregatedBaselines}
          sliders={sliders}
          onSlidersChange={handleSliderChange}
          onGenerate={handleGenerateProposal}
          generating={generating}
          hasProposal={!!veProposal}
        />
      )}

      {generateError && (
        <p className="text-sm text-red-600">{generateError}</p>
      )}

      {/* VE proposal */}
      {veProposal && <VeProposalCard proposal={veProposal} />}

      {/* VE publish */}
      {hasVe && (
        <VePublishSection
          dealId={deal.id}
          initialPublished={deal.ve_published}
          hasProposal={!!veProposal}
        />
      )}

      {/* Task list */}
      {tasks.length > 0 && <TaskList dealId={deal.id} initialTasks={tasks} />}

      {/* Post-call CTA */}
      {!hasPostCall && briefs.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="py-6 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-gray-600">Ready to analyse your first call?</p>
            <Link
              href={`/deal/${deal.id}/post-call/new`}
              className={cn(buttonVariants())}
            >
              Run post-call analysis
            </Link>
          </CardContent>
        </Card>
      )}

      {/* POV CTA */}
      {hasPostCall && !hasPov && (
        <Card className="border-dashed">
          <CardContent className="py-6 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-gray-600">Ready to start your Proof of Value?</p>
            <Link
              href={`/deal/${deal.id}/pov/new`}
              className={cn(buttonVariants())}
            >
              Start POV
            </Link>
          </CardContent>
        </Card>
      )}

      {/* VE CTA */}
      {hasPov && !hasVe && (
        <Card className="border-dashed">
          <CardContent className="py-6 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-gray-600">Ready to run a Value Engineering workshop?</p>
            <Link
              href={`/deal/${deal.id}/value-engineering/new`}
              className={cn(buttonVariants())}
            >
              Log VE workshop
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Briefs timeline */}
      {briefs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Briefs</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {[...briefs].reverse().map((brief) => (
              <Link key={brief.id} href={`/brief/${brief.id}`} className="block">
                <div className="py-3 first:pt-0 last:pb-0 flex items-center justify-between hover:bg-gray-50 -mx-2 px-2 rounded transition-colors">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs capitalize">
                      {brief.stage.replace("_", " ")}
                    </Badge>
                    <p className="text-sm text-gray-700">
                      {new Date(brief.created_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  {brief.meddpicc && (
                    <span
                      className={`text-xs font-semibold ${brief.meddpicc.overall_score >= 16 ? "text-[#1ED760]" : brief.meddpicc.overall_score >= 8 ? "text-amber-500" : "text-red-500"}`}
                    >
                      {toDisplayScore(brief.meddpicc.overall_score)}/100
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="pb-8">
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
