import { createClient } from "@/lib/supabase/server"
import {
  scoreMeddpicc,
  computeDelta,
  extractSuccessCriteria,
  assessPovCriteria,
  identifyRisks,
  updateQuestions,
  draftPovCallEmail,
  generateNextActions,
  extractStakeholders,
  detectCompletedTasks,
  extractCallDate,
} from "@/lib/analysis"
import { upsertStakeholders } from "@/lib/stakeholders"
import type { ProductContext, MeddpiccScore, Brief, SuccessCriterion, PovCallType } from "@/types"

type Supabase = Awaited<ReturnType<typeof createClient>>

// Runs one POV call's full analysis and saves it as a brief. Fully self-contained
// -- fetches its own deal/criteria/prior-brief/open-tasks state fresh from the DB
// rather than accepting them as parameters, so it stays correct whether it's
// called once (the single-call route) or in a loop (the batch route): each call
// in a batch needs to see the criteria and tasks left behind by the call before
// it, not a stale snapshot taken before the batch started.
export async function runSinglePovAnalysis({
  supabase,
  dealId,
  userId,
  product,
  scName,
  transcript,
  recording_url,
  call_type,
  call_date,
  emit,
}: {
  supabase: Supabase
  dealId: string
  userId: string
  product: ProductContext
  scName: string
  transcript: string
  recording_url: string | null
  call_type: PovCallType
  call_date: string | null
  emit: (event: object) => void
}): Promise<{ briefId: string }> {
  const { data: dealRow } = await supabase
    .from("deals")
    .select("prospect_name, prospect_company, success_criteria")
    .eq("id", dealId)
    .eq("user_id", userId)
    .single()

  if (!dealRow) throw new Error("Deal not found")

  let criteriaToUse: SuccessCriterion[] = (dealRow.success_criteria as SuccessCriterion[]) ?? []
  const needsExtraction = criteriaToUse.length === 0

  // Most recent brief on the deal (any stage) for delta + question continuity +
  // case study inheritance + cumulative scoring.
  const { data: recentBriefs } = await supabase
    .from("briefs")
    .select("stage, meddpicc, matched_case_studies, risks")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false })
    .limit(5)

  const prevBrief =
    (recentBriefs as Pick<Brief, "stage" | "meddpicc" | "matched_case_studies" | "risks">[] | null)?.[0] ?? null
  const inheritedCaseStudies =
    (recentBriefs as Pick<Brief, "matched_case_studies">[] | null)?.find(
      (b) => (b.matched_case_studies as unknown[])?.length > 0
    )?.matched_case_studies ?? []

  const { data: openTasks } = await supabase
    .from("deal_tasks")
    .select("id, description")
    .eq("deal_id", dealId)
    .eq("status", "open")

  const [meddpicc, extractionResult] = await Promise.all([
    scoreMeddpicc(transcript, product, dealRow.prospect_company, prevBrief?.meddpicc).then((r) => {
      emit({ type: "meddpicc", data: r })
      return r
    }),
    needsExtraction
      ? extractSuccessCriteria(transcript, product, dealRow.prospect_company).then((r) => {
          emit({ type: "criteria", data: r.criteria })
          return r
        })
      : Promise.resolve({ criteria: criteriaToUse, total_agreed: criteriaToUse.length }),
  ])

  if (needsExtraction && extractionResult.criteria.length > 0) {
    criteriaToUse = extractionResult.criteria
    await supabase
      .from("deals")
      .update({
        success_criteria: extractionResult.criteria,
        success_criteria_total_agreed: extractionResult.total_agreed,
      })
      .eq("id", dealId)
  }

  if (!criteriaToUse.length) {
    throw new Error(
      "No success criteria could be extracted from the transcript. Add them manually on the deal page."
    )
  }

  const delta = prevBrief ? computeDelta(prevBrief.meddpicc, meddpicc) : null
  if (delta) emit({ type: "delta", data: delta })

  const today = new Date().toISOString().split("T")[0]

  const [povAssessment, risks, questionsResult, email, actions, stakeholders, completedCandidates, resolvedCallDate] =
    await Promise.all([
      assessPovCriteria(transcript, criteriaToUse, product, dealRow.prospect_company).then((r) => {
        emit({ type: "pov_assessment", data: r })
        return r
      }),
      identifyRisks(transcript, meddpicc, product, dealRow.prospect_company, prevBrief?.risks).then((r) => {
        emit({ type: "risks", data: r })
        return r
      }),
      updateQuestions(transcript, meddpicc, prevBrief?.meddpicc?.suggested_questions, product).then((r) => {
        emit({ type: "questions", data: r })
        return r
      }),
      draftPovCallEmail({
        prospect_name: dealRow.prospect_name,
        prospect_company: dealRow.prospect_company,
        transcript,
        product,
        success_criteria: criteriaToUse,
        pov_assessment: [], // populated after parallel resolve; email drafted without it
        call_type,
        sc_name: scName,
      }).then((r) => {
        emit({ type: "email", data: r })
        return r
      }),
      generateNextActions(transcript, dealRow.prospect_company, today).then((r) => {
        emit({ type: "actions", data: r })
        return r
      }),
      extractStakeholders(transcript, dealRow.prospect_company),
      detectCompletedTasks(openTasks ?? [], transcript),
      call_date ? Promise.resolve(call_date) : extractCallDate(transcript),
    ])

  const meddpiccFull: MeddpiccScore = {
    ...meddpicc,
    suggested_questions: questionsResult.open,
    answered_questions: questionsResult.answered,
  }

  const { data: brief, error: briefError } = await supabase
    .from("briefs")
    .insert({
      user_id: userId,
      deal_id: dealId,
      stage: "pov",
      prospect_name: dealRow.prospect_name,
      prospect_company: dealRow.prospect_company,
      discovery_notes: transcript,
      meddpicc: meddpiccFull,
      matched_case_studies: inheritedCaseStudies,
      follow_up_email: email,
      delta,
      risks,
      pov_assessment: povAssessment,
      recording_url: recording_url ?? null,
      call_date: resolvedCallDate,
    })
    .select("id")
    .single()

  if (briefError || !brief) {
    throw new Error(briefError?.message ?? "Failed to save brief.")
  }

  await upsertStakeholders(supabase, dealId, brief.id, stakeholders)

  // Flag tasks this call's transcript confirms are already done -- surfaced to
  // the SC to confirm, never auto-completed.
  const openTaskIds = new Set((openTasks ?? []).map((t) => t.id))
  for (const candidate of completedCandidates) {
    if (!openTaskIds.has(candidate.task_id)) continue
    await supabase
      .from("deal_tasks")
      .update({ suggested_done_evidence: candidate.evidence })
      .eq("id", candidate.task_id)
  }

  if (actions.length > 0) {
    const source = `pov_${today}`
    await supabase.from("deal_tasks").insert(
      actions.map((a) => ({
        deal_id: dealId,
        description: a.action,
        status: "open",
        source,
        owner: a.owner,
        reminder_at: a.suggested_reminder_date
          ? new Date(a.suggested_reminder_date + "T09:00:00").toISOString()
          : null,
      }))
    )
  }

  await supabase.from("deals").update({ stage: "pov" }).eq("id", dealId)

  return { briefId: brief.id }
}
