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
} from "@/lib/analysis"
import { upsertStakeholders } from "@/lib/stakeholders"
import type { ProductContext, MeddpiccScore, Brief } from "@/types"

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

  const { transcript } = await req.json()

  const [{ data: deal }, { data: ctx }] = await Promise.all([
    supabase.from("deals").select("*").eq("id", dealId).eq("user_id", user.id).single(),
    supabase.from("product_contexts").select("*").eq("user_id", user.id).single(),
  ])

  if (!deal) return new Response("Deal not found", { status: 404 })
  if (!ctx) return new Response("No product context found", { status: 400 })

  const product = ctx as ProductContext

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

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) =>
        controller.enqueue(new TextEncoder().encode(JSON.stringify(event) + "\n"))

      try {
        const meddpicc = await scoreMeddpicc(
          transcript,
          product,
          deal.prospect_company,
          prevBrief?.meddpicc
        )
        emit({ type: "meddpicc", data: meddpicc })

        const delta = prevBrief ? computeDelta(prevBrief.meddpicc, meddpicc) : null
        if (delta) emit({ type: "delta", data: delta })

        const today = new Date().toISOString().split("T")[0]

        const [risks, questionsResult, email, actions, stakeholders] = await Promise.all([
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
            stage: "post_call",
            prospect_name: deal.prospect_name,
            prospect_company: deal.prospect_company,
            discovery_notes: transcript,
            meddpicc: meddpiccFull,
            matched_case_studies: [],
            follow_up_email: email,
            delta,
            risks,
          })
          .select("id")
          .single()

        if (briefError || !brief) {
          emit({ type: "error", message: briefError?.message ?? "Failed to save brief." })
          controller.close()
          return
        }

        await upsertStakeholders(supabase, dealId, brief.id, stakeholders)

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
