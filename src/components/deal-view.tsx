"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { computeRiskScore } from "@/lib/risk-score"
import { TASK_STAGE_ORDER, stageFromSource } from "@/lib/task-stage"
import { DeleteDealButton } from "@/components/delete-deal-button"
import { cn } from "@/lib/utils"
import {
  MEDDPICC_LABELS,
  MEDDPICC_ELEMENTS,
  toDisplayScore,
  ScorePip,
  RiskCard,
  riskScoreColor,
} from "@/components/score-display"
import { ResearchBriefFullView } from "@/components/research-brief-view"
import type { Deal, Brief, DealTask, MeddpiccScore, TaskStatus, SuccessCriterion, PovAssessment, PovCriterionStatus, VeBaselineInput, VeSliderInputs, VeProposal, VeConfidence, DealStakeholder, SuggestedQuestions, ResearchBrief } from "@/types"

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<Deal["stage"], string> = {
  prep: "Prep",
  post_call: "Post-call",
  pov: "POV",
  value_engineering: "Value Engineering",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── MEDDPICC grid card ───────────────────────────────────────────────────────

function MeddpiccGridCard({ meddpicc }: { meddpicc: MeddpiccScore }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>MEDDPICC breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-y-1">
          {MEDDPICC_ELEMENTS.map((key) => {
            const el = meddpicc[key as keyof MeddpiccScore] as { score: number; evidence: string; gap: string }
            const isExpanded = expanded === key
            return (
              <div key={key} className="contents">
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : key)}
                  className="text-sm text-gray-700 py-2 border-t first:border-t-0 flex items-center text-left hover:text-gray-900"
                >
                  {MEDDPICC_LABELS[key]}
                </button>
                <div className="flex items-center gap-2 py-2 border-t first:border-t-0 justify-end">
                  <ScorePip score={el.score} />
                  <span className="text-xs text-gray-400 w-8 text-right">{el.score}/3</span>
                </div>
                {isExpanded && (
                  <div className="col-span-2 pb-3 -mt-1 text-xs text-gray-500 space-y-1">
                    {el.evidence && el.evidence !== "none" && (
                      <p>&ldquo;{el.evidence}&rdquo;</p>
                    )}
                    {el.gap && <p className="text-amber-600">Gap: {el.gap}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Risk card ────────────────────────────────────────────────────────────────

// ─── Score history table ─────────────────────────────────────────────────────

function stageColumnLabel(brief: Brief, allBriefs: Brief[]): string {
  if (brief.stage === "prep") return "Prep"
  if (brief.stage === "post_call") return "Post-call"
  if (brief.stage === "pov") {
    const povBriefs = allBriefs.filter((b) => b.stage === "pov")
    const idx = povBriefs.findIndex((b) => b.id === brief.id)
    const labels = ["POV: Setup", "POV: Check-in", "POV: Review"]
    return labels[idx] ?? `POV: Call ${idx + 1}`
  }
  const veBriefs = allBriefs.filter((b) => b.stage === "value_engineering")
  const idx = veBriefs.findIndex((b) => b.id === brief.id)
  return `VE: Workshop ${idx + 1}`
}

function ScoreHistoryTable({ briefs }: { briefs: Brief[] }) {
  const [riskExplainerOpen, setRiskExplainerOpen] = useState(false)
  const scored = briefs.filter((b) => b.meddpicc)
  if (!scored.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Score history</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-3 sticky left-0 bg-card">
                  Stage
                </th>
                {scored.map((b) => (
                  <th
                    key={b.id}
                    className="text-right text-xs font-medium text-gray-500 pb-2 pl-4 whitespace-nowrap align-bottom"
                  >
                    <div>{stageColumnLabel(b, briefs)}</div>
                    <div className="text-gray-400 font-normal">
                      {new Date(b.call_date ? `${b.call_date}T00:00:00` : b.created_at).toLocaleDateString("en-GB")}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="py-2 pr-3 text-gray-700 sticky left-0 bg-card whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setRiskExplainerOpen((v) => !v)}
                    className="flex items-center gap-1 hover:text-gray-900"
                  >
                    Risk score
                    <span className="text-gray-400">(?)</span>
                  </button>
                </td>
                {scored.map((b) => {
                  const rs = computeRiskScore(b.risks ?? [])
                  return (
                    <td key={b.id} className="py-2 pl-4 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${riskScoreColor(rs)}`}
                      >
                        {rs}
                      </span>
                    </td>
                  )
                })}
              </tr>
              {riskExplainerOpen && (
                <tr>
                  <td colSpan={scored.length + 1} className="pb-3 pt-1 text-xs text-gray-500">
                    Weighted sum of currently open risks (high = 3, medium = 2, low = 1) as a
                    percentage of the maximum possible (5 high-severity risks = 15). Only risks
                    still present in the latest call count -- a risk that&apos;s resolved or
                    contradicted by a later transcript drops off and pulls the score down; a new or
                    upgraded risk pushes it up.
                  </td>
                </tr>
              )}
              <tr className="border-t">
                <td className="py-2 pr-3 font-medium text-gray-800 sticky left-0 bg-card whitespace-nowrap">
                  Overall
                </td>
                {scored.map((b) => {
                  const display = toDisplayScore(b.meddpicc.overall_score)
                  return (
                    <td
                      key={b.id}
                      className={`py-2 pl-4 text-right font-semibold ${b.meddpicc.overall_score >= 16 ? "text-[#1ED760]" : b.meddpicc.overall_score >= 8 ? "text-amber-500" : "text-red-500"}`}
                    >
                      {display}
                    </td>
                  )
                })}
              </tr>
              {MEDDPICC_ELEMENTS.map((key) => (
                <tr key={key} className="border-t">
                  <td className="py-2 pr-3 text-gray-700 sticky left-0 bg-card whitespace-nowrap">
                    {MEDDPICC_LABELS[key]}
                  </td>
                  {scored.map((b) => {
                    const el = b.meddpicc[key as keyof MeddpiccScore] as { score: number }
                    return (
                      <td key={b.id} className="py-2 pl-4">
                        <div className="flex items-center justify-end gap-2">
                          <ScorePip score={el.score} />
                          <span className="text-gray-500 w-3 text-right">{el.score}</span>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Managed risks card ───────────────────────────────────────────────────────

function computeManagedRisks(briefs: Brief[]): { key: string; risk: string; lastSeenLabel: string }[] {
  const scored = briefs.filter((b) => b.risks && b.risks.length > 0)
  if (scored.length < 2) return []
  const latest = scored[scored.length - 1]
  const latestIdentities = new Set((latest.risks ?? []).map((r) => r.key ?? r.risk))

  const lastSeen = new Map<string, { risk: string; briefIndex: number }>()
  for (let i = 0; i < scored.length - 1; i++) {
    for (const r of scored[i].risks ?? []) {
      lastSeen.set(r.key ?? r.risk, { risk: r.risk, briefIndex: i })
    }
  }

  return [...lastSeen.entries()]
    .filter(([identity]) => !latestIdentities.has(identity))
    .map(([identity, info]) => ({
      key: identity,
      risk: info.risk,
      lastSeenLabel: stageColumnLabel(scored[info.briefIndex], briefs),
    }))
}

function ManagedRisksCard({ briefs }: { briefs: Brief[] }) {
  const managed = computeManagedRisks(briefs)
  if (!managed.length) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resolved risks</CardTitle>
        <CardDescription>No longer flagged as of the latest call.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {managed.map((r) => (
          <div key={r.key}>
            <p className="text-sm text-gray-500 line-through">{r.risk}</p>
            <p className="text-xs text-gray-400">Last flagged at {r.lastSeenLabel}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Prospect research card ───────────────────────────────────────────────────

// Same shape as computeManagedRisks: a lightweight, honest summary of what
// changed between runs (counts + headline), not a full structural diff --
// consistent with how "Resolved risks" already summarises change here.
function computeResearchDiff(previous: ResearchBrief | null, latest: ResearchBrief): string[] {
  if (!previous) return []
  const changes: string[] = []

  if (previous.sections.value_drivers.most_visible_pain_headline !== latest.sections.value_drivers.most_visible_pain_headline) {
    changes.push("Most visible pain headline changed")
  }
  const compareCounts = (label: string, prev: number, curr: number) => {
    if (prev !== curr) changes.push(`${label}: ${prev} → ${curr}`)
  }
  compareCounts("Value driver hypotheses", previous.sections.value_drivers.hypotheses.length, latest.sections.value_drivers.hypotheses.length)
  compareCounts("Risks identified", previous.sections.risks.risks.length, latest.sections.risks.risks.length)
  compareCounts("Stakeholders found", previous.sections.stakeholders.entries.length, latest.sections.stakeholders.entries.length)
  compareCounts("Buying signals", previous.sections.buying_signals.signals.length, latest.sections.buying_signals.signals.length)
  compareCounts("Sources", previous.source_log.length, latest.source_log.length)

  return changes
}

function ProspectResearchSection({ dealId, researchBriefs }: { dealId: string; researchBriefs: ResearchBrief[] }) {
  const latest = researchBriefs.length ? researchBriefs[researchBriefs.length - 1] : null
  const previous = researchBriefs.length > 1 ? researchBriefs[researchBriefs.length - 2] : null

  if (!latest) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-gray-600">No prospect research yet for this deal.</p>
          <Link href={`/deal/${dealId}/research/new`} className={cn(buttonVariants())}>
            Run prospect research
          </Link>
        </CardContent>
      </Card>
    )
  }

  const diff = computeResearchDiff(previous, latest)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Prospect research</h2>
        <Link href={`/deal/${dealId}/research/new`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Re-run research
        </Link>
      </div>
      {diff.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-3">
            <p className="text-xs font-medium text-amber-800 mb-1">Changed since last run</p>
            <ul className="text-xs text-amber-700 list-disc list-inside space-y-0.5">
              {diff.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}
      <ResearchBriefFullView brief={latest} />
    </div>
  )
}

// ─── Questions card ───────────────────────────────────────────────────────────

const QUESTION_BUCKET_LABELS: Record<keyof SuggestedQuestions, string> = {
  sc_intro: "Intro / rapport",
  discovery: "Discovery",
  technical: "Technical",
}

function QuestionsCard({
  suggested,
  answered,
}: {
  suggested?: SuggestedQuestions
  answered?: SuggestedQuestions
}) {
  const buckets = (Object.keys(QUESTION_BUCKET_LABELS) as Array<keyof SuggestedQuestions>).filter(
    (key) => (suggested?.[key]?.length ?? 0) > 0 || (answered?.[key]?.length ?? 0) > 0
  )

  if (!buckets.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggested questions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {buckets.map((key) => (
          <div key={key} className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              {QUESTION_BUCKET_LABELS[key]}
            </p>
            <ul className="space-y-1">
              {(suggested?.[key] ?? []).map((q, i) => (
                <li key={`open-${i}`} className="text-sm text-gray-800 leading-snug">
                  {q}
                </li>
              ))}
              {(answered?.[key] ?? []).map((q, i) => (
                <li key={`answered-${i}`} className="text-sm text-gray-400 line-through leading-snug">
                  {q}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Task list ────────────────────────────────────────────────────────────────

const TASK_TABS = ["All", "SC", "Prospect", "Joint"] as const
type TaskTab = (typeof TASK_TABS)[number]

function reminderToDateInputValue(reminder_at: string | null) {
  return reminder_at ? new Date(reminder_at).toISOString().slice(0, 10) : ""
}

function TaskList({ dealId, initialTasks }: { dealId: string; initialTasks: DealTask[] }) {
  const [tasks, setTasks] = useState(initialTasks)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<TaskTab>("All")
  const [adding, setAdding] = useState(false)
  const [newDescription, setNewDescription] = useState("")
  const [newOwner, setNewOwner] = useState<"SC" | "Prospect" | "Joint" | "">("")
  const [newDate, setNewDate] = useState("")
  const [saving, setSaving] = useState(false)

  const toggle = useCallback(
    async (taskId: string, current: TaskStatus) => {
      const next: TaskStatus = current === "open" ? "done" : "open"
      setPending((p) => new Set(p).add(taskId))
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: next, suggested_done_evidence: next === "done" ? null : t.suggested_done_evidence }
            : t
        )
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

  const changeDueDate = useCallback(
    async (taskId: string, dateValue: string) => {
      const reminder_at = dateValue ? new Date(dateValue + "T09:00:00").toISOString() : null
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, reminder_at } : t))
      )
      await fetch(`/api/deals/${dealId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminder_at }),
      })
    },
    [dealId]
  )

  const dismissSuggestion = useCallback(
    async (taskId: string) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, suggested_done_evidence: null } : t))
      )
      await fetch(`/api/deals/${dealId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismiss_suggestion: true }),
      })
    },
    [dealId]
  )

  async function addTask() {
    if (!newDescription.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/deals/${dealId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: newDescription,
          owner: newOwner || null,
          reminder_at: newDate ? new Date(newDate + "T09:00:00").toISOString() : null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setTasks((prev) => [...prev, data.task])
        setNewDescription("")
        setNewOwner("")
        setNewDate("")
        setAdding(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const now = new Date()
  const filtered = tab === "All" ? tasks : tasks.filter((t) => t.owner === tab)
  const open = filtered.filter((t) => t.status === "open")
  const done = filtered.filter((t) => t.status === "done")

  const openByStage = new Map<string, DealTask[]>()
  for (const task of open) {
    const stage = stageFromSource(task.source)
    openByStage.set(stage, [...(openByStage.get(stage) ?? []), task])
  }
  const orderedStages = TASK_STAGE_ORDER.filter((s) => openByStage.has(s))

  if (!tasks.length && !adding) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TaskTab)}>
          <TabsList>
            {TASK_TABS.map((t) => (
              <TabsTrigger key={t} value={t}>
                {t}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={tab} className="space-y-1 mt-3">
            {orderedStages.map((stage) => (
              <div key={stage} className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 pt-1">
                  {stage}
                </p>
                {openByStage.get(stage)!.map((task) => {
                  const overdue = task.reminder_at && new Date(task.reminder_at) < now
                  return (
                    <TaskRow
                      key={task.id}
                      task={task}
                      overdue={!!overdue}
                      isPending={pending.has(task.id)}
                      onToggle={toggle}
                      onDateChange={changeDueDate}
                      onDismissSuggestion={dismissSuggestion}
                    />
                  )
                })}
              </div>
            ))}

            {done.length > 0 && (
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
                onDateChange={changeDueDate}
              />
            ))}

            {!open.length && !done.length && (
              <p className="text-sm text-gray-400 py-2">No actions in this view.</p>
            )}
          </TabsContent>
        </Tabs>

        {adding ? (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
            <Input
              placeholder="Action description"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="flex-1 min-w-[160px]"
            />
            <select
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value as "SC" | "Prospect" | "Joint" | "")}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            >
              <option value="">No owner</option>
              <option value="SC">SC</option>
              <option value="Prospect">Prospect</option>
              <option value="Joint">Joint</option>
            </select>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            />
            <Button size="sm" onClick={addTask} disabled={saving || !newDescription.trim()}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
          >
            + Add action
          </button>
        )}
      </CardContent>
    </Card>
  )
}

function TaskRow({
  task,
  overdue,
  isPending,
  onToggle,
  onDateChange,
  onDismissSuggestion,
}: {
  task: DealTask
  overdue: boolean
  isPending: boolean
  onToggle: (id: string, status: TaskStatus) => void
  onDateChange: (id: string, dateValue: string) => void
  onDismissSuggestion?: (id: string) => void
}) {
  const [pickingDate, setPickingDate] = useState(false)
  return (
    <div
      className={`flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-gray-50 ${isPending ? "opacity-50" : ""}`}
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
          {task.status === "open" && (task.reminder_at || pickingDate ? (
            <input
              type="date"
              value={reminderToDateInputValue(task.reminder_at)}
              onChange={(e) => onDateChange(task.id, e.target.value)}
              className="text-[11px] text-gray-500 border-none bg-transparent px-0 h-5 focus:ring-0 focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setPickingDate(true)}
              className="text-[11px] text-gray-400 hover:text-gray-600 underline underline-offset-2"
            >
              + Set date
            </button>
          ))}
        </div>
        {task.status === "open" && task.suggested_done_evidence && onDismissSuggestion && (
          <div className="mt-1.5 rounded-md bg-[#F0FDF4] border border-[#1ED760]/20 px-2 py-1.5 space-y-1">
            <p className="text-xs text-gray-700">
              A later call suggests this is already done: &ldquo;{task.suggested_done_evidence}&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onToggle(task.id, task.status)}
                className="text-xs font-medium text-[#0A6630] hover:underline"
              >
                Confirm done
              </button>
              <button
                type="button"
                onClick={() => onDismissSuggestion(task.id)}
                className="text-xs text-gray-500 hover:underline"
              >
                Not yet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Lifecycle progress bar ──────────────────────────────────────────────────

const DEAL_STAGES: Array<Deal["stage"]> = ["prep", "post_call", "pov", "value_engineering"]

function DealProgressBar({ stage }: { stage: Deal["stage"] }) {
  const currentIndex = DEAL_STAGES.indexOf(stage)

  return (
    <div className="flex items-start">
      {DEAL_STAGES.flatMap((s, i) => {
        const isDone = i < currentIndex
        const isCurrent = i === currentIndex
        const items = [
          <div key={s} className="flex flex-col items-center gap-1.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                isDone
                  ? "bg-[#1ED760] border-[#1ED760]"
                  : isCurrent
                  ? "border-[#1ED760] bg-white"
                  : "border-gray-200 bg-white"
              }`}
            >
              {isDone ? (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className={`w-2 h-2 rounded-full ${isCurrent ? "bg-[#1ED760]" : "bg-gray-200"}`} />
              )}
            </div>
            <span
              className={`text-xs text-center leading-tight max-w-[72px] ${
                isDone ? "font-medium text-gray-800" : isCurrent ? "font-medium text-[#0A192F]" : "text-gray-300"
              }`}
            >
              {STAGE_LABELS[s]}
            </span>
          </div>,
        ]
        if (i < DEAL_STAGES.length - 1) {
          items.push(
            <div
              key={`c${i}`}
              className={`flex-1 h-px mt-4 mx-1 ${i < currentIndex ? "bg-[#1ED760]" : "bg-gray-200"}`}
            />
          )
        }
        return items
      })}
    </div>
  )
}

// ─── POV stage card ──────────────────────────────────────────────────────────

const POV_STAGES = ["Setup", "Check-in", "Final review"]

function nextPovCall(povBriefCount: number): { label: string; callType: string } | null {
  if (povBriefCount === 1) return { label: "Log check-in call", callType: "checkin" }
  if (povBriefCount === 2) return { label: "Log final review", callType: "review" }
  return null
}

function PovStageCard({ povBriefCount }: { povBriefCount: number }) {
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
      </CardContent>
    </Card>
  )
}

// ─── POV progress card ────────────────────────────────────────────────────────

const POV_STATUS_OPTIONS: PovCriterionStatus[] = ["met", "in_progress", "not_met"]

function PovProgressCard({
  dealId,
  briefId,
  criteria,
  totalAgreed,
  assessment: initialAssessment,
}: {
  dealId: string
  briefId: string
  criteria: SuccessCriterion[]
  totalAgreed: number | null
  assessment: PovAssessment[]
}) {
  const [assessment, setAssessment] = useState(initialAssessment)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draftStatus, setDraftStatus] = useState<PovCriterionStatus>("not_met")
  const [draftNote, setDraftNote] = useState("")
  const [saving, setSaving] = useState(false)

  const assessmentMap = new Map(assessment.map((a) => [a.criterion_id, a]))
  const metCount = assessment.filter((a) => a.status === "met").length

  function startEdit(criterionId: number, current: PovAssessment | undefined) {
    setEditingId(criterionId)
    setDraftStatus(current?.status ?? "not_met")
    setDraftNote(current?.notes ?? "")
  }

  async function saveEdit(criterionId: number) {
    setSaving(true)
    try {
      const res = await fetch(`/api/deals/${dealId}/pov-assessment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief_id: briefId,
          criterion_id: criterionId,
          status: draftStatus,
          note: draftNote || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setAssessment(data.pov_assessment)
        setEditingId(null)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>POV progress</CardTitle>
          <span className="text-sm text-gray-500">
            {metCount} of {criteria.length} met
          </span>
        </div>
        {totalAgreed !== null && totalAgreed > criteria.length && (
          <CardDescription className="text-amber-700">
            {totalAgreed} criteria were agreed on the kickoff call -- only the {criteria.length} most
            specific and measurable are tracked here.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="divide-y">
        {criteria.map((c) => {
          const a = assessmentMap.get(c.id)
          const status: PovCriterionStatus = a?.status ?? "not_met"
          const isEditing = editingId === c.id
          return (
            <div key={c.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-gray-800 leading-snug">{c.description}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <PovStatusBadge status={status} />
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => startEdit(c.id, a)}
                      className="text-xs text-gray-400 hover:text-gray-700"
                      aria-label={`Edit status for ${c.description}`}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
              {a?.evidence && a.evidence !== "Not evidenced on this call" && (
                <p className="text-xs text-gray-500 italic">
                  &ldquo;{a.evidence}&rdquo;
                </p>
              )}
              {a?.notes && !isEditing && (
                <p className="text-xs text-gray-500">Note: {a.notes}</p>
              )}
              {isEditing && (
                <div className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    {POV_STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setDraftStatus(opt)}
                        className={`text-xs px-2 py-1 rounded-full border ${
                          draftStatus === opt
                            ? "border-[#1ED760] bg-[#1ED760]/10 text-[#0A6630] font-medium"
                            : "border-gray-200 text-gray-500"
                        }`}
                      >
                        {opt.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={draftNote}
                    onChange={(e) => setDraftNote(e.target.value)}
                    placeholder="Add a note explaining this manual status..."
                    className="w-full text-sm border rounded-md px-2 py-1.5 text-gray-700"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(c.id)} disabled={saving}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ─── Stakeholders card ────────────────────────────────────────────────────────

function StakeholdersCard({
  dealId,
  initialStakeholders,
}: {
  dealId: string
  initialStakeholders: DealStakeholder[]
}) {
  const [stakeholders, setStakeholders] = useState(initialStakeholders)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newRole, setNewRole] = useState("")
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editRole, setEditRole] = useState("")

  function startEdit(s: DealStakeholder) {
    setEditingId(s.id)
    setEditName(s.name)
    setEditRole(s.role ?? "")
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/deals/${dealId}/stakeholders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, role: editRole || null }),
      })
      const data = await res.json()
      if (res.ok) {
        setStakeholders((prev) => prev.map((s) => (s.id === id ? data.stakeholder : s)))
        setEditingId(null)
      }
    } finally {
      setSaving(false)
    }
  }

  async function addStakeholder() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/deals/${dealId}/stakeholders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, role: newRole || null }),
      })
      const data = await res.json()
      if (res.ok) {
        setStakeholders((prev) => [...prev, data.stakeholder])
        setNewName("")
        setNewRole("")
        setAdding(false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function removeStakeholder(id: string) {
    setStakeholders((prev) => prev.filter((s) => s.id !== id))
    await fetch(`/api/deals/${dealId}/stakeholders/${id}`, { method: "DELETE" })
  }

  if (!stakeholders.length && !adding) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stakeholders</CardTitle>
          <CardDescription className="mt-1">
            No stakeholders identified yet -- they&apos;ll be picked up automatically from call transcripts, or add one manually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            + Add stakeholder
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stakeholders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stakeholders.map((s) =>
          editingId === s.id ? (
            <div key={s.id} className="flex items-center gap-2 text-sm">
              <Input
                placeholder="Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="max-w-[160px]"
              />
              <Input
                placeholder="Role (optional)"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="max-w-[180px]"
              />
              <Button size="sm" onClick={() => saveEdit(s.id)} disabled={saving || !editName.trim()}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div key={s.id} className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => startEdit(s)}
                className="text-left hover:text-gray-900"
                aria-label={`Edit ${s.name}`}
              >
                <span className="font-medium">{s.name}</span>
                {s.role && <span className="text-gray-500"> -- {s.role}</span>}
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => startEdit(s)}
                  className="text-xs text-gray-400 hover:text-gray-700"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => removeStakeholder(s.id)}
                  className="text-xs text-gray-400 hover:text-red-500"
                  aria-label={`Remove ${s.name}`}
                >
                  Remove
                </button>
              </div>
            </div>
          )
        )}

        {adding ? (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Input
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="max-w-[160px]"
            />
            <Input
              placeholder="Role (optional)"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="max-w-[180px]"
            />
            <Button size="sm" onClick={addStakeholder} disabled={saving || !newName.trim()}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
          >
            + Add stakeholder
          </button>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Share section ────────────────────────────────────────────────────────────

function ShareSection({
  dealId,
  token,
  onTokenChange,
}: {
  dealId: string
  token: string | null
  onTokenChange: (token: string | null) => void
}) {
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
      if (res.ok) onTokenChange(data.share_token)
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
      if (res.ok) onTokenChange(null)
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
            <div className="flex items-center gap-3">
              <a
                href={shareUrl || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  !shareUrl && "pointer-events-none opacity-50"
                )}
              >
                Preview as prospect
              </a>
              <button
                type="button"
                onClick={revoke}
                disabled={loading}
                className="text-xs text-red-500 hover:text-red-700 underline underline-offset-2 disabled:opacity-50"
              >
                Revoke link
              </button>
            </div>
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

const CURRENCY_SYMBOLS: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" }

// Some extractions bake the currency code into the unit itself (e.g. "GBP/year")
// instead of using the separate `currency` field -- handle both, and always apply
// thousand separators with at most one decimal place (never a bare toFixed(1)).
function formatBaselineValue(value: number, unit: string, currency?: string | null): string {
  const rounded = Math.round(value * 10) / 10
  const numberText = rounded.toLocaleString("en-GB", {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  })

  const unitMatch = unit.match(/^(GBP|USD|EUR)\s*\/?\s*(.*)$/i)
  const code = (currency || unitMatch?.[1])?.toUpperCase()
  const symbol = code ? CURRENCY_SYMBOLS[code] : null

  if (symbol) {
    if (unitMatch) return `${symbol}${numberText}${unitMatch[2] ? `/${unitMatch[2]}` : ""}`
    return `${symbol}${numberText}${unit ? ` ${unit}` : ""}`
  }
  return `${numberText} ${unit}`
}

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
  // "context" baselines (headcount, order volume) describe scale, not something
  // to slide an "improvement" assumption onto -- undefined category (legacy data
  // extracted before this field existed) is treated as slider-eligible, same as
  // the old behaviour, rather than silently hiding data the SC could already see.
  const sliderEligible = baselines.filter((b) => b.category !== "context")
  const contextOnly = baselines.filter((b) => b.category === "context")

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
              {sliderEligible.map((b) => {
                const pct = sliders[b.key] ?? 40
                const isIncrease = b.direction === "increase"
                const improved = formatBaselineValue((b.numeric_value * pct) / 100, b.unit, b.currency)
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
                        {pct}% {isIncrease ? "increase" : "improvement"}
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
                      {improved} {isIncrease ? "increase" : "improvement"} estimated
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
            {contextOnly.length > 0 && (
              <div className="rounded-md bg-gray-50 border px-3 py-2 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Context figures (scale, not an improvement assumption)
                </p>
                {contextOnly.map((b) => (
                  <p key={b.key} className="text-xs text-gray-500">
                    {b.label}: {b.raw_value}
                  </p>
                ))}
              </div>
            )}
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
  onTokenChange,
}: {
  dealId: string
  initialPublished: boolean
  hasProposal: boolean
  onTokenChange: (token: string) => void
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
      const data = await res.json()
      if (res.ok) {
        setPublished(!published)
        // Publishing auto-generates a share_token if the deal didn't already have
        // one -- a proposal marked "live" with nowhere to view it was the bug.
        if (data.share_token) onTokenChange(data.share_token)
      }
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
  stakeholders,
  researchBriefs,
}: {
  deal: Deal
  briefs: Brief[]
  tasks: DealTask[]
  stakeholders: DealStakeholder[]
  researchBriefs: ResearchBrief[]
}) {
  const latestBrief = briefs.length ? briefs[briefs.length - 1] : null
  const postCallBrief = briefs.find((b) => b.stage === "post_call") ?? null
  const povBriefs = briefs.filter((b) => b.stage === "pov")
  const povBriefCount = povBriefs.length
  const latestPovBrief = povBriefs.length > 0 ? povBriefs[povBriefs.length - 1] : null
  const hasPostCall = !!postCallBrief
  const hasPov = povBriefCount > 0
  const nextPov = nextPovCall(povBriefCount)

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
  const [shareToken, setShareToken] = useState<string | null>(deal.share_token)
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
  const headerRiskScore = computeRiskScore(latestBrief?.risks ?? [])

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{deal.prospect_company}</h1>
            <Badge variant="outline" className="text-xs">
              {STAGE_LABELS[deal.stage]}
            </Badge>
          </div>
          <p className="text-gray-500">{deal.prospect_name}</p>
          <p className="text-xs text-gray-400 mt-1">
            Started {new Date(deal.created_at).toLocaleDateString("en-GB")}
          </p>
        </div>
        <div className="flex items-start gap-6">
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
          {latestBrief?.risks && latestBrief.risks.length > 0 && (
            <div className="text-right">
              <div
                className={`text-3xl font-bold ${headerRiskScore >= 60 ? "text-red-500" : headerRiskScore >= 30 ? "text-amber-500" : "text-[#1ED760]"}`}
              >
                {headerRiskScore}
                <span className="text-lg font-normal text-gray-400">/100</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Risk score (higher = riskier)</p>
            </div>
          )}
        </div>
      </div>

      {/* Lifecycle progress */}
      <DealProgressBar stage={deal.stage} />

      {/* Prospect research */}
      <ProspectResearchSection dealId={deal.id} researchBriefs={researchBriefs} />

      {/* Stakeholders */}
      <StakeholdersCard dealId={deal.id} initialStakeholders={stakeholders} />

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

      {/* POV + VE call CTAs, side by side */}
      {hasPov && !hasVe && (
        <Card className="border-dashed">
          <CardContent className="py-6 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-gray-600">Log the next call for this deal</p>
            <div className="flex items-center gap-3">
              {nextPov && (
                <Link
                  href={`/deal/${deal.id}/pov/new?call_type=${nextPov.callType}`}
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  {nextPov.label}
                </Link>
              )}
              <Link
                href={`/deal/${deal.id}/value-engineering/new`}
                className={cn(buttonVariants())}
              >
                Log VE workshop
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="pov">POV</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="ve">VE</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {latestBrief?.meddpicc && <MeddpiccGridCard meddpicc={latestBrief.meddpicc} />}
          <ScoreHistoryTable briefs={briefs} />
          {latestBrief?.meddpicc && (
            <QuestionsCard
              suggested={latestBrief.meddpicc.suggested_questions}
              answered={latestBrief.meddpicc.answered_questions}
            />
          )}

          {briefs.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Briefs</CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                {[...briefs].reverse().map((brief) => (
                  <Link key={brief.id} href={`/brief/${brief.id}`} className="block">
                    <div className="py-3 first:pt-0 last:pb-0 flex items-center justify-between hover:bg-gray-50 -mx-2 px-2 rounded transition-colors">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">
                          {STAGE_LABELS[brief.stage]}
                        </Badge>
                        <p className="text-sm text-gray-700">
                          {new Date(brief.call_date ? `${brief.call_date}T00:00:00` : brief.created_at).toLocaleDateString("en-GB")}
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
          ) : (
            <p className="text-sm text-gray-400 py-4">No briefs yet.</p>
          )}
        </TabsContent>

        <TabsContent value="risks" className="space-y-6 mt-4">
          {latestBrief?.risks && latestBrief.risks.length > 0 ? (
            <RiskCard risks={latestBrief.risks} riskScore={headerRiskScore} />
          ) : (
            <p className="text-sm text-gray-400 py-4">No risks identified yet.</p>
          )}
          <ManagedRisksCard briefs={briefs} />
        </TabsContent>

        <TabsContent value="pov" className="space-y-6 mt-4">
          {hasPov ? (
            <>
              <PovStageCard povBriefCount={povBriefCount} />
              {latestPovBrief && deal.success_criteria?.length > 0 && (
                <PovProgressCard
                  dealId={deal.id}
                  briefId={latestPovBrief.id}
                  criteria={deal.success_criteria}
                  totalAgreed={deal.success_criteria_total_agreed}
                  assessment={latestPovBrief.pov_assessment ?? []}
                />
              )}
              <ShareSection dealId={deal.id} token={shareToken} onTokenChange={setShareToken} />
            </>
          ) : (
            <p className="text-sm text-gray-400 py-4">POV has not started yet.</p>
          )}
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          {tasks.length > 0 ? (
            <TaskList dealId={deal.id} initialTasks={tasks} />
          ) : (
            <p className="text-sm text-gray-400 py-4">No next actions yet.</p>
          )}
        </TabsContent>

        <TabsContent value="ve" className="space-y-6 mt-4">
          {hasVe ? (
            <>
              <VeBaselineCard
                dealId={deal.id}
                baselines={aggregatedBaselines}
                sliders={sliders}
                onSlidersChange={handleSliderChange}
                onGenerate={handleGenerateProposal}
                generating={generating}
                hasProposal={!!veProposal}
              />
              {generateError && <p className="text-sm text-red-600">{generateError}</p>}
              {veProposal && <VeProposalCard proposal={veProposal} />}
              <VePublishSection
                dealId={deal.id}
                initialPublished={deal.ve_published}
                hasProposal={!!veProposal}
                onTokenChange={setShareToken}
              />
            </>
          ) : (
            <p className="text-sm text-gray-400 py-4">Value Engineering has not started yet.</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="pb-8">
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to dashboard
        </Link>
      </div>

      {/* Danger zone */}
      <Card className="border-red-100">
        <CardHeader>
          <CardTitle className="text-base text-red-700">Danger zone</CardTitle>
          <CardDescription>
            Permanently delete this deal and all briefs, tasks, and stakeholders attached to it.
            This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteDealButton dealId={deal.id} prospectCompany={deal.prospect_company} />
        </CardContent>
      </Card>
    </div>
  )
}
