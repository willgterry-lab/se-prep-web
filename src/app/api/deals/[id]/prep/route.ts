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
import type { ProductContext, MeddpiccScore, MatchedCaseStudy, ResearchSections } from "@/types"

// "Upload AE Discovery to prep for first SC Call" -- the Prep step on a deal
// that already exists with research already resolved (research-first flow via
// /deal/new). Unlike /api/analyze, this never touches company resolution or
// the research pipeline -- both already happened. Just notes in, MEDDPICC/
// case-studies/email/questions out, grounded in the deal's existing research
// brief the same way /api/analyze grounds a from-scratch Prep run.
export const maxDuration = 120

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: dealId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const scName = (user.user_metadata?.full_name as string | undefined) ?? ""
  const { discovery_notes, prospect_name } = await req.json()
  if (!discovery_notes?.trim()) {
    return new Response(JSON.stringify({ type: "error", message: "Discovery notes are required." }), { status: 400 })
  }

  const [{ data: deal }, { data: ctx }, { data: researchBriefRow }] = await Promise.all([
    supabase.from("deals").select("*").eq("id", dealId).eq("user_id", user.id).single(),
    supabase.from("product_contexts").select("*").eq("user_id", user.id).single(),
    supabase
      .from("research_briefs")
      .select("id, sections")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!deal) return new Response("Deal not found", { status: 404 })
  if (!ctx) return new Response("No product context found", { status: 400 })

  const product = ctx as ProductContext
  const researchSections = researchBriefRow?.sections as ResearchSections | undefined

  // Research-first deals are created with prospect_name: "" (no contact known
  // until a call happens -- see /api/deals). If the SC supplied one on this
  // form, use it and persist it onto the deal so it's no longer blank going
  // forward. Never overwrites a name the deal already has.
  const effectiveProspectName: string = prospect_name?.trim() || deal.prospect_name
  if (prospect_name?.trim() && !deal.prospect_name) {
    await supabase.from("deals").update({ prospect_name: prospect_name.trim() }).eq("id", dealId)
  }

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) =>
        controller.enqueue(new TextEncoder().encode(JSON.stringify(event) + "\n"))

      try {
        const [meddpiccResult, caseStudiesResult, notesStakeholders] = await Promise.all([
          scoreMeddpicc(discovery_notes, product, deal.prospect_company, null, researchSections?.value_drivers).then((r) => {
            emit({ type: "meddpicc", data: r })
            return r
          }),
          matchCaseStudies(discovery_notes, product, researchSections?.value_drivers).then((r) => {
            emit({ type: "case_studies", data: r })
            return r
          }),
          extractStakeholders(discovery_notes, deal.prospect_company),
        ])

        const [emailResult, questions] = await Promise.all([
          draftPrepEmail({
            prospect_name: effectiveProspectName,
            prospect_company: deal.prospect_company,
            discovery_notes,
            product,
            meddpicc: meddpiccResult,
            matched_case_studies: caseStudiesResult as MatchedCaseStudy[],
            sc_name: scName,
            research_drivers: researchSections?.value_drivers,
          }),
          generateQuestions(discovery_notes, meddpiccResult, product, researchSections?.discovery_questions),
        ])
        emit({ type: "email", data: emailResult })

        const meddpicc: MeddpiccScore = { ...meddpiccResult, suggested_questions: questions }

        const { data: brief, error } = await supabase
          .from("briefs")
          .insert({
            user_id: user.id,
            deal_id: dealId,
            stage: "prep",
            prospect_name: effectiveProspectName,
            prospect_company: deal.prospect_company,
            discovery_notes,
            meddpicc,
            matched_case_studies: caseStudiesResult,
            follow_up_email: emailResult,
            research_brief_id: researchBriefRow?.id ?? null,
          })
          .select("id")
          .single()

        if (error || !brief) {
          emit({ type: "error", message: error?.message ?? "Failed to save brief." })
          controller.close()
          return
        }

        await upsertStakeholders(supabase, dealId, brief.id, notesStakeholders)

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
