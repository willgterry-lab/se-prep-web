import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { SuccessCriterion, PovAssessment, PovCriterionStatus, MatchedCaseStudy, DealTask, VeProposal, VeConfidence } from "@/types"

type SalesroomBrief = {
  id: string
  stage: string
  meddpicc: { identify_pain: { evidence: string }; summary: string; overall_score: number } | null
  matched_case_studies: MatchedCaseStudy[] | null
  pov_assessment: PovAssessment[] | null
  recording_url: string | null
  created_at: string
}

function SalesroomConfidenceBadge({ confidence }: { confidence: VeConfidence }) {
  const styles: Record<VeConfidence, string> = {
    high: "bg-[#1ED760]/15 text-[#0A6630] border-[#1ED760]/30",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-gray-100 text-gray-500 border-gray-200",
  }
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shrink-0 ${styles[confidence]}`}
    >
      {confidence} confidence
    </span>
  )
}

function StatusBadge({ status }: { status: PovCriterionStatus }) {
  const styles = {
    met: "bg-[#1ED760]/15 text-[#0A6630] border-[#1ED760]/30",
    in_progress: "bg-amber-100 text-amber-700 border-amber-200",
    not_met: "bg-gray-100 text-gray-500 border-gray-200",
  }
  const labels = { met: "Met", in_progress: "In progress", not_met: "Not yet" }
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shrink-0 ${styles[status]}`}
    >
      {labels[status]}
    </span>
  )
}

export default async function SalesroomPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const { data: deal } = await supabaseAdmin
    .from("deals")
    .select("id, prospect_name, prospect_company, success_criteria, ve_proposal, ve_published")
    .eq("share_token", token)
    .single()

  if (!deal) notFound()

  const criteria = (deal.success_criteria as SuccessCriterion[]) ?? []

  const [{ data: briefs }, { data: tasks }] = await Promise.all([
    supabaseAdmin
      .from("briefs")
      .select(
        "id, stage, meddpicc, matched_case_studies, pov_assessment, recording_url, created_at"
      )
      .eq("deal_id", deal.id)
      .in("stage", ["prep", "post_call", "pov"])
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("deal_tasks")
      .select("id, description, owner, reminder_at, status")
      .eq("deal_id", deal.id)
      .eq("status", "open")
      .order("created_at", { ascending: true }),
  ])

  const allBriefs = (briefs as SalesroomBrief[]) ?? []
  const povBriefs = allBriefs.filter((b) => b.stage === "pov")
  const latestPovBrief = povBriefs.length > 0 ? povBriefs[povBriefs.length - 1] : null
  const latestBrief = allBriefs.length > 0 ? allBriefs[allBriefs.length - 1] : null

  // Aggregate case studies across all briefs (dedup by url)
  const caseStudyMap = new Map<string, MatchedCaseStudy>()
  for (const b of allBriefs) {
    for (const cs of b.matched_case_studies ?? []) {
      if (!caseStudyMap.has(cs.url)) caseStudyMap.set(cs.url, cs)
    }
  }
  const caseStudies = [...caseStudyMap.values()].slice(0, 3)

  // Map latest pov assessment by criterion id
  const assessmentMap = new Map<number, PovAssessment>()
  for (const a of latestPovBrief?.pov_assessment ?? []) {
    assessmentMap.set(a.criterion_id, a)
  }

  const metCount = [...assessmentMap.values()].filter((a) => a.status === "met").length
  const totalCount = criteria.length

  // Pain quote: prefer pov brief, fall back to latest brief
  const painEvidence =
    latestPovBrief?.meddpicc?.identify_pain?.evidence ||
    latestBrief?.meddpicc?.identify_pain?.evidence ||
    null

  // Recordings: pov briefs that have a recording_url
  const recordings = povBriefs
    .filter((b) => b.recording_url)
    .map((b, i) => ({
      label:
        i === 0
          ? "Setup call"
          : i === povBriefs.findIndex((pb) => pb.recording_url) + 1
          ? "Check-in"
          : `Call ${i + 1}`,
      url: b.recording_url!,
      date: b.created_at,
    }))

  const openTasks = (tasks as Pick<DealTask, "id" | "description" | "owner" | "reminder_at">[]) ?? []

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-12">

        {/* Header */}
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#1ED760]">
            Proof of Value
          </p>
          <h1 className="text-3xl font-bold text-gray-900">{deal.prospect_company}</h1>
          {totalCount > 0 && latestPovBrief && (
            <p className="text-gray-500 text-sm">
              {metCount} of {totalCount} success {totalCount === 1 ? "criterion" : "criteria"} met
            </p>
          )}
        </div>

        {/* Success criteria */}
        {criteria.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide text-xs">
              Success Criteria
            </h2>
            <div className="divide-y border rounded-lg overflow-hidden">
              {criteria.map((c) => {
                const a = assessmentMap.get(c.id)
                const status: PovCriterionStatus = a?.status ?? "not_met"
                return (
                  <div key={c.id} className="px-4 py-4 space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-gray-800 leading-snug">{c.description}</p>
                      <StatusBadge status={status} />
                    </div>
                    {a?.evidence && a.evidence !== "Not evidenced on this call" && (
                      <p className="text-xs text-gray-500 italic">
                        &ldquo;{a.evidence}&rdquo;
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Why run this POV */}
        {painEvidence && painEvidence !== "none" && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Why {deal.prospect_company} is evaluating this
            </h2>
            <blockquote className="border-l-2 border-[#1ED760] pl-4 text-sm text-gray-700 leading-relaxed italic">
              {painEvidence}
            </blockquote>
          </section>
        )}

        {/* Case studies */}
        {caseStudies.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Relevant customer stories
            </h2>
            <div className="space-y-4">
              {caseStudies.map((cs) => (
                <div key={cs.url} className="rounded-lg border p-4 space-y-2">
                  <p className="text-sm font-medium text-gray-900">{cs.customer}</p>
                  <p className="text-xs text-gray-500">{cs.headline_pain}</p>
                  {cs.relevance_reason && (
                    <p className="text-xs text-gray-600 border-t pt-2">
                      {cs.relevance_reason}
                    </p>
                  )}
                  <a
                    href={cs.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#1ED760] font-medium hover:underline inline-flex items-center gap-1"
                  >
                    Read full story
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recordings */}
        {recordings.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Call recordings
            </h2>
            <div className="space-y-2">
              {recordings.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.label}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(r.date).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#1ED760] font-medium hover:underline inline-flex items-center gap-1"
                  >
                    Watch
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Next steps */}
        {openTasks.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Next steps
            </h2>
            <div className="space-y-2">
              {openTasks.map((task) => (
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
          </section>
        )}

        {/* Value proposal (shown only when published) */}
        {deal.ve_published && deal.ve_proposal && (() => {
          const proposal = deal.ve_proposal as VeProposal
          return (
            <section className="space-y-6 pt-4 border-t">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#1ED760]">
                  Value Proposal
                </p>
                <p className="text-xl font-bold text-gray-900">{proposal.headline}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{proposal.executive_summary}</p>
              </div>

              <div className="space-y-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Value Drivers
                </h2>
                {proposal.value_drivers.map((driver, i) => (
                  <div key={i} className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-900">{driver.name}</p>
                      <SalesroomConfidenceBadge confidence={driver.confidence} />
                    </div>
                    <p className="text-xs text-gray-500 italic">{driver.pain_addressed}</p>
                    <p className="text-lg font-bold text-[#1ED760]">{driver.calculated_value}</p>
                    <p className="text-xs text-gray-400">{driver.calculation}</p>
                    <p className="text-xs text-gray-500 border-l-2 border-[#1ED760] pl-3 italic">
                      {driver.evidence}
                    </p>
                  </div>
                ))}
              </div>

              {proposal.investment_notes && (
                <div className="space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Investment</h2>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-md px-4 py-3">{proposal.investment_notes}</p>
                </div>
              )}

              {proposal.risks_and_sensitivities.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Sensitivities</h2>
                  <ul className="space-y-1">
                    {proposal.risks_and_sensitivities.map((r, i) => (
                      <li key={i} className="text-xs text-gray-500 flex gap-2">
                        <span className="shrink-0">-</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-md bg-[#F0FDF4] border border-[#1ED760]/20 px-4 py-3 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0A6630]">Suggested Next Step</p>
                <p className="text-sm text-gray-800">{proposal.recommended_next_step}</p>
              </div>

              <p className="text-[10px] text-gray-400">
                Improvement percentages shown are estimates set by the solutions team, not guaranteed outcomes. All baseline figures are verbatim from discovery calls.
              </p>
            </section>
          )
        })()}

      </div>
    </div>
  )
}
