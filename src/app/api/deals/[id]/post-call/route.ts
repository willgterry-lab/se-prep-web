import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  scoreMeddpicc,
  computeDelta,
  identifyRisks,
  updateQuestions,
  draftPostCallEmail,
  generateNextActions,
  extractStakeholders,
  detectCompletedTasks,
  extractCallDate,
} from "@/lib/analysis"
import { getCachedCall, emitCachedPostCall, matchCachedCompletedTasks } from "@/lib/research"
import { upsertStakeholders } from "@/lib/stakeholders"
import type { ProductContext, MeddpiccScore, Brief, ResearchSections, RiskItem, NextAction, ExtractedStakeholder, MeddpiccDelta } from "@/types"

// Chains scoreMeddpicc then seven more calls (risks/questions/email/actions/
// stakeholders/completed-tasks/call-date, mostly parallel). 60s was already
// tight for this many chained calls against a real transcript -- confirmed in
// production that /api/analyze's own 120s limit was too tight for a
// comparable chain, so raised proactively here rather than waiting for the
// same timeout to surface live.
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

  const { transcript, call_date } = await req.json()

  const [{ data: deal }, { data: ctx }, { data: researchBrief }] = await Promise.all([
    supabase.from("deals").select("*").eq("id", dealId).eq("user_id", user.id).single(),
    supabase.from("product_contexts").select("*").eq("user_id", user.id).single(),
    supabase
      .from("research_briefs")
      .select("sections")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!deal) return new Response("Deal not found", { status: 404 })
  if (!ctx) return new Response("No product context found", { status: 400 })

  const product = ctx as ProductContext
  // Post-call can now genuinely be the first call logged on a deal (Prep is
  // optional -- see deal-view.tsx's first-call CTA), so ground scoring in the
  // deal's research the same way /api/analyze already does, not just notes.
  const researchDrivers = (researchBrief?.sections as ResearchSections | undefined)?.value_drivers ?? null

  // Fetch the most recent prep brief for delta computation, question continuity,
  // and cumulative scoring (its meddpicc/risks already reflect everything known so far).
  const { data: prevBriefRow } = await supabase
    .from("briefs")
    .select("meddpicc, risks")
    .eq("deal_id", dealId)
    .eq("stage", "prep")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const prevBrief = prevBriefRow as Pick<Brief, "meddpicc" | "risks"> | null

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
        const today = new Date().toISOString().split("T")[0]
        const cached = getCachedCall(transcript)

        let meddpiccFull: MeddpiccScore
        let delta: MeddpiccDelta | null
        let risks: RiskItem[]
        let email: string
        let actions: NextAction[]
        let stakeholders: ExtractedStakeholder[]
        let completedCandidates: { task_id: string; evidence: string }[]
        let resolvedCallDate: string | null

        if (cached && cached.kind === "post_call") {
          const fixture = cached.fixture
          await emitCachedPostCall(fixture, emit)
          meddpiccFull = fixture.meddpicc
          delta = fixture.delta
          risks = fixture.risks
          email = fixture.email
          actions = fixture.actions
          stakeholders = fixture.stakeholders
          completedCandidates = matchCachedCompletedTasks(openTasks ?? [], fixture.completedTasks)
          resolvedCallDate = call_date ?? fixture.callDate
        } else {
          const meddpicc = await scoreMeddpicc(
            transcript,
            product,
            deal.prospect_company,
            prevBrief?.meddpicc,
            researchDrivers
          )
          emit({ type: "meddpicc", data: meddpicc })

          delta = prevBrief ? computeDelta(prevBrief.meddpicc, meddpicc) : null
          if (delta) emit({ type: "delta", data: delta })

          const [riskResult, questionsResult, emailResult, actionsResult, stakeholdersResult, completedResult, callDateResult] = await Promise.all([
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
            draftPostCallEmail({
              prospect_name: deal.prospect_name,
              prospect_company: deal.prospect_company,
              transcript,
              product,
              meddpicc,
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

          risks = riskResult
          email = emailResult
          actions = actionsResult
          stakeholders = stakeholdersResult
          completedCandidates = completedResult
          resolvedCallDate = callDateResult

          meddpiccFull = {
            ...meddpicc,
            suggested_questions: questionsResult.open,
            answered_questions: questionsResult.answered,
          }
        }

        const { data: brief, error: briefError } = await supabase
          .from("briefs")
          .insert({
            user_id: user.id,
            deal_id: dealId,
            stage: "post_call",
            prospect_name: deal.prospect_name,
            prospect_company: deal.prospect_company,
            discovery_notes: transcript,
            meddpicc: meddpiccFull,
            matched_case_studies: [],
            follow_up_email: email,
            delta,
            risks,
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

        // Flag tasks this call's transcript confirms are already done -- surfaced
        // to the SC to confirm, never auto-completed.
        const openTaskIds = new Set((openTasks ?? []).map((t) => t.id))
        for (const candidate of completedCandidates) {
          if (!openTaskIds.has(candidate.task_id)) continue
          await supabase
            .from("deal_tasks")
            .update({ suggested_done_evidence: candidate.evidence })
            .eq("id", candidate.task_id)
        }

        // Write next actions to deal_tasks.
        if (actions.length > 0) {
          const source = `post_call_${today}`
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

        // Advance the deal stage.
        await supabase
          .from("deals")
          .update({ stage: "post_call" })
          .eq("id", dealId)

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
