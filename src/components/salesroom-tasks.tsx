"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { TASK_STAGE_ORDER, stageFromSource } from "@/lib/task-stage"
import type { DealTask } from "@/types"

// No "SC" tab here: the salesroom only ever receives Prospect/Joint-owned
// tasks (see the data-exposure rule on the query in src/app/s/[token]/page.tsx).
// SC-owned tasks (internal coaching notes, admin) must never reach this page.
const SALESROOM_TASK_TABS = ["All", "Prospect", "Joint"] as const
type SalesroomTaskTab = (typeof SALESROOM_TASK_TABS)[number]

type SalesroomTask = Pick<DealTask, "id" | "description" | "owner" | "reminder_at" | "source">

export function SalesroomTasks({ tasks }: { tasks: SalesroomTask[] }) {
  const [tab, setTab] = useState<SalesroomTaskTab>("All")

  if (!tasks.length) return null

  const filtered = tab === "All" ? tasks : tasks.filter((t) => t.owner === tab)

  const tasksByStage = new Map<string, SalesroomTask[]>()
  for (const task of filtered) {
    const stage = stageFromSource(task.source)
    tasksByStage.set(stage, [...(tasksByStage.get(stage) ?? []), task])
  }
  const orderedStages = TASK_STAGE_ORDER.filter((s) => tasksByStage.has(s))

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Next steps</h2>
      <Tabs value={tab} onValueChange={(v) => setTab(v as SalesroomTaskTab)}>
        <TabsList>
          {SALESROOM_TASK_TABS.map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="space-y-3 mt-3">
          {orderedStages.map((stage) => (
            <div key={stage} className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 pt-1">{stage}</p>
              <div className="space-y-2">
                {tasksByStage.get(stage)!.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-2 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">{task.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.owner && (
                          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                            {task.owner}
                          </span>
                        )}
                        {task.reminder_at && (
                          <span className="text-[10px] text-gray-400">
                            By {new Date(task.reminder_at).toLocaleDateString("en-GB")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!filtered.length && <p className="text-sm text-gray-400 py-2">No tasks for this filter.</p>}
        </TabsContent>
      </Tabs>
    </section>
  )
}
