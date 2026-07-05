import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  scoreMeddpicc,
  matchCaseStudies,
  generateQuestions,
  draftPrepEmail,
  extractStakeholders,
} from "@/lib/analysis"
import { upsertStakeholders } from "@/lib/stakeholders"
import type { ProductContext, MeddpiccScore, MatchedCaseStudy } from "@/types"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const scName = (user.user_metadata?.full_name as string | undefined) ?? ""

  const { discovery_notes, prospect_name, prospect_company } = await req.json()

  const { data: ctx } = await supabase
    .from("product_contexts")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!ctx) {
    return new Response(
      JSON.stringify({ type: "error", message: "No product context found. Please complete setup first." }),
      { status: 400 }
    )
  }

  const product = ctx as ProductContext

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) =>
        controller.enqueue(new TextEncoder().encode(JSON.stringify(event) + "\n"))

      try {
        // Find or create a deal for this prospect company.
        let { data: deal } = await supabase
          .from("deals")
          .select("id")
          .eq("user_id", user.id)
          .ilike("prospect_company", prospect_company.trim())
          .maybeSingle()

        if (!deal) {
          const { data: newDeal, error: dealError } = await supabase
            .from("deals")
            .insert({ user_id: user.id, prospect_name, prospect_company, stage: "prep" })
            .select("id")
            .single()

          if (dealError || !newDeal) {
            emit({ type: "error", message: dealError?.message ?? "Failed to create deal." })
            controller.close()
            return
          }
          deal = newDeal
        }

        const dealId = deal.id

        const [meddpicc, caseStudies] = await Promise.all([
          scoreMeddpicc(discovery_notes, product, prospect_company).then((result) => {
            emit({ type: "meddpicc", data: result })
            return result
          }),
          matchCaseStudies(discovery_notes, product).then((result) => {
            emit({ type: "case_studies", data: result })
            return result
          }),
        ])

        const [email, questions, stakeholders] = await Promise.all([
          draftPrepEmail({
            prospect_name,
            prospect_company,
            discovery_notes,
            product,
            meddpicc,
            matched_case_studies: caseStudies as MatchedCaseStudy[],
            sc_name: scName,
          }),
          generateQuestions(discovery_notes, meddpicc, product),
          extractStakeholders(discovery_notes, prospect_company),
        ])
        emit({ type: "email", data: email })

        const meddpiccWithQuestions: MeddpiccScore = { ...meddpicc, suggested_questions: questions }

        const { data: brief, error } = await supabase
          .from("briefs")
          .insert({
            user_id: user.id,
            deal_id: dealId,
            stage: "prep",
            prospect_name,
            prospect_company,
            discovery_notes,
            meddpicc: meddpiccWithQuestions,
            matched_case_studies: caseStudies,
            follow_up_email: email,
          })
          .select()
          .single()

        if (error) {
          emit({ type: "error", message: error.message })
        } else {
          await upsertStakeholders(supabase, dealId, brief.id, stakeholders)
          emit({ type: "done", data: { brief_id: brief.id, deal_id: dealId } })
        }
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
