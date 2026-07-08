import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  scoreMeddpicc,
  matchCaseStudies,
  computeDelta,
  extractVeBaseline,
  identifyRisks,
  updateQuestions,
  draftVeCallEmail,
  generateNextActions,
  extractStakeholders,
  detectCompletedTasks,
  extractCallDate,
} from "@/lib/analysis"
import { upsertStakeholders } from "@/lib/stakeholders"
import type { ProductContext, MeddpiccScore, Brief, VeBaselineInput } from "@/types"

// Chains an even longer sequence than post-call (adds matchCaseStudies and
// extractVeBaseline). See the comment on post-call's maxDuration for why 60s
// was raised here too.
export const maxDuration = 120

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dealId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const scName = (user.user_metadata?.full_name as string | undefined) ?? ""

  const { transcript, recording_url, call_date } = await req.json()

  const [{ data: deal }, { data: ctx }] = await Promise.all([
    supabase.from("deals").select("*").eq("id", dealId).eq("user_id", user.id).single(),
    supabase.from("product_contexts").select("*").eq("user_id", user.id).single(),
  ])

  if (!deal) return new Response("Deal not found", { status: 404 })
  if (!ctx) return new Response("No product context found", { status: 400 })

  const product = ctx as ProductContext

  const { data: recentBriefs } = await supabase
    .from("briefs")
    .select("stage, meddpicc, matched_case_studies, risks")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false })
    .limit(5)

  const prevBrief =
    (recentBriefs as Pick<Brief, "stage" | "meddpicc" | "matched_case_studies" | "risks">[] | null)?.[0] ??
    null

  const { data: openTasks } = await supabase
    .from("deal_tasks")
    .select("id, description")
    .eq("deal_id", dealId)
    .eq("status", "open")

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) =>
        controller.enqueue(new TextEncoder().encode(JSON.stringify(event) + "\n"))

      try {
        // Phase 1: score MEDDPICC, match case studies, extract baseline in parallel
        const [meddpicc, caseStudies, baseline] = await Promise.all([
          scoreMeddpicc(transcript, product, deal.prospect_company, prevBrief?.meddpicc).then((r) => {
            emit({ type: "meddpicc", data: r })
            return r
          }),
          matchCaseStudies(transcript, product).then((r) => {
            emit({ type: "case_studies", data: r })
            return r
          }),
          extractVeBaseline(transcript, product, deal.prospect_company).then((r) => {
            emit({ type: "baseline", data: r })
            return r
          }),
        ])

        const delta = prevBrief ? computeDelta(prevBrief.meddpicc, meddpicc) : null
        if (delta) emit({ type: "delta", data: delta })

        const today = new Date().toISOString().split("T")[0]

        // Phase 2: downstream analysis in parallel
        const [risks, questionsResult, email, actions, stakeholders, completedCandidates, resolvedCallDate] = await Promise.all([
          identifyRisks(transcript, meddpicc, product, deal.prospect_company, prevBrief?.risks).then((r) => {
            emit({ type: "risks", data: r })
            return r
          }),
          updateQuestions(
            transcript,
            meddpicc,
            prevBrief?.meddpicc?.suggested_questions,
            product
          ).then((r) => {
            emit({ type: "questions", data: r })
            return r
          }),
          draftVeCallEmail({
            prospect_name: deal.prospect_name,
            prospect_company: deal.prospect_company,
            transcript,
            product,
            baseline_inputs: baseline as VeBaselineInput[],
            sc_name: scName,
          }).then((r) => {
            emit({ type: "email", data: r })
            return r
          }),
          generateNextActions(transcript, deal.prospect_company, today).then((r) => {
            emit({ type: "actions", data: r })
            return r
          }),
          extractStakeholders(transcript, deal.prospect_company),
          detectCompletedTasks(openTasks ?? [], transcript),
          call_date ? Promise.resolve(call_date as string) : extractCallDate(transcript),
        ])

        const meddpiccFull: MeddpiccScore = {
          ...meddpicc,
          suggested_questions: questionsResult.open,
          answered_questions: questionsResult.answered,
        }

        const { data: brief, error: briefError } = await supabase
          .from("briefs")
          .insert({
            user_id: user.id,
            deal_id: dealId,
            stage: "value_engineering",
            prospect_name: deal.prospect_name,
            prospect_company: deal.prospect_company,
            discovery_notes: transcript,
            meddpicc: meddpiccFull,
            matched_case_studies: caseStudies,
            follow_up_email: email,
            delta,
            risks,
            pov_assessment: [],
            recording_url: recording_url ?? null,
            ve_baseline_inputs: baseline,
            call_date: resolvedCallDate,
          })
          .select("id")
          .single()

        if (briefError || !brief) {
          emit({ type: "error", message: briefError?.message ?? "Failed to save brief." })
          controller.close()
          return
        }

        await upsertStakeholders(supabase, dealId, brief.id, stakeholders)

        const openTaskIds = new Set((openTasks ?? []).map((t) => t.id))
        for (const candidate of completedCandidates) {
          if (!openTaskIds.has(candidate.task_id)) continue
          await supabase
            .from("deal_tasks")
            .update({ suggested_done_evidence: candidate.evidence })
            .eq("id", candidate.task_id)
        }

        if (actions.length > 0) {
          const source = `ve_${today}`
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

        await supabase.from("deals").update({ stage: "value_engineering" }).eq("id", dealId)

        emit({ type: "done", data: { brief_id: brief.id, deal_id: dealId } })
      } catch (e) {
        emit({ type: "error", message: e instanceof Error ? e.message : "Something went wrong." })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
