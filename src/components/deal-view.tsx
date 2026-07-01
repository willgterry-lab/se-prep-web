"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Deal, Brief, DealTask, MeddpiccDelta, RiskItem, TaskStatus } from "@/types"

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
  const hasPostCall = !!postCallBrief

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
