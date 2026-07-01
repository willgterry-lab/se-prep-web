import { NextRequest } from "next/server"
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
} from "@/lib/analysis"
import type { ProductContext, MeddpiccScore, Brief, SuccessCriterion } from "@/types"

export const maxDuration = 60

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

  const { transcript, recording_url, call_type } = await req.json()

  const [{ data: deal }, { data: ctx }] = await Promise.all([
    supabase.from("deals").select("*").eq("id", dealId).eq("user_id", user.id).single(),
    supabase.from("product_contexts").select("*").eq("user_id", user.id).single(),
  ])

  if (!deal) return new Response("Deal not found", { status: 404 })
  if (!ctx) return new Response("No product context found", { status: 400 })

  const product = ctx as ProductContext

  let criteriaToUse: SuccessCriterion[] = (deal.success_criteria as SuccessCriterion[]) ?? []
  const needsExtraction = criteriaToUse.length === 0

  // Fetch the most recent brief for delta + question continuity + case study inheritance.
  const { data: recentBriefs } = await supabase
    .from("briefs")
    .select("stage, meddpicc, matched_case_studies")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false })
    .limit(5)

  const prevBrief = (recentBriefs as Pick<Brief, "stage" | "meddpicc" | "matched_case_studies">[] | null)?.[0] ?? null
  const inheritedCaseStudies =
    (recentBriefs as Pick<Brief, "matched_case_studies">[] | null)?.find(
      (b) => (b.matched_case_studies as unknown[])?.length > 0
    )?.matched_case_studies ?? []

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) =>
        controller.enqueue(new TextEncoder().encode(JSON.stringify(event) + "\n"))

      try {
        // Run scoreMeddpicc and (on first POV call) extractSuccessCriteria in parallel.
        const [meddpicc, resolvedCriteria] = await Promise.all([
          scoreMeddpicc(transcript, product, deal.prospect_company).then((r) => {
            emit({ type: "meddpicc", data: r })
            return r
          }),
          needsExtraction
            ? extractSuccessCriteria(transcript, product, deal.prospect_company).then((r) => {
                emit({ type: "criteria", data: r })
                return r
              })
            : Promise.resolve(criteriaToUse),
        ])

        if (needsExtraction && resolvedCriteria.length > 0) {
          criteriaToUse = resolvedCriteria
          await supabase
            .from("deals")
            .update({ success_criteria: resolvedCriteria })
            .eq("id", dealId)
        }

        if (!criteriaToUse.length) {
          emit({ type: "error", message: "No success criteria could be extracted from the transcript. Add them manually on the deal page." })
          controller.close()
          return
        }

        const delta = prevBrief ? computeDelta(prevBrief.meddpicc, meddpicc) : null
        if (delta) emit({ type: "delta", data: delta })

        const today = new Date().toISOString().split("T")[0]

        const [povAssessment, risks, questionsResult, email, actions] = await Promise.all([
          assessPovCriteria(transcript, criteriaToUse, product, deal.prospect_company).then((r) => {
            emit({ type: "pov_assessment", data: r })
            return r
          }),
          identifyRisks(transcript, meddpicc, product, deal.prospect_company).then((r) => {
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
          draftPovCallEmail({
            prospect_name: deal.prospect_name,
            prospect_company: deal.prospect_company,
            transcript,
            product,
            success_criteria: criteriaToUse,
            pov_assessment: [],  // populated after parallel resolve; email drafted without it
            call_type: call_type ?? "setup",
            sc_name: scName,
          }).then((r) => {
            emit({ type: "email", data: r })
            return r
          }),
          generateNextActions(transcript, deal.prospect_company, today).then((r) => {
            emit({ type: "actions", data: r })
            return r
          }),
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
            stage: "pov",
            prospect_name: deal.prospect_name,
            prospect_company: deal.prospect_company,
            discovery_notes: transcript,
            meddpicc: meddpiccFull,
            matched_case_studies: inheritedCaseStudies,
            follow_up_email: email,
            delta,
            risks,
            pov_assessment: povAssessment,
            recording_url: recording_url ?? null,
          })
          .select("id")
          .single()

        if (briefError || !brief) {
          emit({ type: "error", message: briefError?.message ?? "Failed to save brief." })
          controller.close()
          return
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
