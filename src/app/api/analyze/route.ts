import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  scoreMeddpicc,
  matchCaseStudies,
  generateQuestions,
  draftPrepEmail,
  extractStakeholders,
} from "@/lib/analysis"
import {
  researchSnapshotAndContext,
  researchOperatingModel,
  researchStakeholdersAndSignals,
  researchValueDriversAndRisks,
  researchDiscoveryQuestions,
  buildSourceLog,
  CHOCO_OPERATING_MODEL_LENS,
  CHOCO_VALUE_DRIVER_TAXONOMY,
} from "@/lib/research"
import { upsertStakeholders } from "@/lib/stakeholders"
import type {
  ProductContext,
  MeddpiccScore,
  MatchedCaseStudy,
  ResolvedCompany,
  ResearchSections,
  ExtractedStakeholder,
} from "@/types"

// Research adds several more model calls on top of the original prep
// pipeline's ~60s budget: four web_search-backed calls (each retried once on
// a parse failure, see createAndParse in research.ts), a follow-up reasoning
// call, then the existing MEDDPICC/case-study/email calls grounded in the
// result. 120s measured as too tight in production (real timeout, not a
// hang) against a data-rich company -- matches the 300s already used for
// pov/batch, the other route in this codebase that chains multiple model
// calls in one request.
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const scName = (user.user_metadata?.full_name as string | undefined) ?? ""

  const { discovery_notes, prospect_name, prospect_company, company } = await req.json()

  // The Prep form resolves the company client-side (see /api/resolve-company)
  // before ever submitting here -- company resolution happening silently in
  // the wrong place is the one unrecoverable failure mode, so this route never
  // re-derives it. If a caller (e.g. a future manual deal-page path) doesn't
  // have the richer resolved object yet, fall back to the plain name so the
  // pipeline can still run rather than failing outright.
  const resolvedCompany: ResolvedCompany = company ?? {
    name: prospect_company,
    domain: null,
    hq: null,
    description: null,
  }

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

        // Prospect research and notes-only stakeholder extraction run in
        // parallel -- extraction only needs the pasted notes, not web evidence,
        // so there's no reason to make it wait behind the research pipeline.
        const [snapshotAndContext, operatingModel, stakeholdersAndSignals, driversAndRisks, notesStakeholders] =
          await Promise.all([
            researchSnapshotAndContext(resolvedCompany).then((r) => {
              emit({ type: "research_snapshot", data: r.snapshot })
              emit({ type: "research_strategic_context", data: r.strategic_context })
              return r
            }),
            researchOperatingModel(resolvedCompany, CHOCO_OPERATING_MODEL_LENS).then((r) => {
              emit({ type: "research_operating_model", data: r })
              return r
            }),
            researchStakeholdersAndSignals(resolvedCompany).then((r) => {
              emit({ type: "research_stakeholders", data: r.stakeholders })
              emit({ type: "research_buying_signals", data: r.buying_signals })
              return r
            }),
            researchValueDriversAndRisks({
              company: resolvedCompany,
              discovery_notes,
              product,
              taxonomy: CHOCO_VALUE_DRIVER_TAXONOMY,
            }).then((r) => {
              emit({ type: "research_value_drivers", data: r.value_drivers })
              emit({ type: "research_risks", data: r.risks })
              return r
            }),
            extractStakeholders(discovery_notes, prospect_company),
          ])

        const sectionsWithoutQuestions = {
          snapshot: snapshotAndContext.snapshot,
          strategic_context: snapshotAndContext.strategic_context,
          operating_model: operatingModel,
          value_drivers: driversAndRisks.value_drivers,
          stakeholders: stakeholdersAndSignals.stakeholders,
          buying_signals: stakeholdersAndSignals.buying_signals,
          risks: driversAndRisks.risks,
        }

        const discoveryQuestions = await researchDiscoveryQuestions({
          discovery_notes,
          sections: sectionsWithoutQuestions,
        })
        emit({ type: "research_discovery_questions", data: discoveryQuestions })

        const researchSections: ResearchSections = {
          ...sectionsWithoutQuestions,
          discovery_questions: discoveryQuestions,
        }
        const sourceLog = buildSourceLog(researchSections)
        emit({ type: "research_source_log", data: sourceLog })

        const { data: researchBrief, error: researchError } = await supabase
          .from("research_briefs")
          .insert({
            deal_id: dealId,
            user_id: user.id,
            company_name: resolvedCompany.name,
            company_domain: resolvedCompany.domain,
            company_hq: resolvedCompany.hq,
            company_description: resolvedCompany.description,
            resolution_confidence: company?.confidence ?? null,
            sections: researchSections,
            source_log: sourceLog,
          })
          .select()
          .single()

        if (researchError) {
          emit({ type: "error", message: researchError.message })
        }
        emit({ type: "research_done", data: { research_brief_id: researchBrief?.id ?? null } })

        // Merge research's preliminary stakeholder map with notes-only
        // extraction before writing to deal_stakeholders -- research surfaces
        // people the notes never named (e.g. a CFO found via LinkedIn); notes
        // surface people not yet publicly findable. upsertStakeholders already
        // dedupes by name.
        const researchStakeholders: ExtractedStakeholder[] = researchSections.stakeholders.entries
          .filter((s): s is typeof s & { name: string } => Boolean(s.name))
          .map((s) => ({ name: s.name, role: s.role }))
        const mergedStakeholders = [...notesStakeholders, ...researchStakeholders]

        // Grounded in the research brief just completed above: MEDDPICC pre-seeds
        // Identified Pain/Metrics from the value driver hypotheses, and case
        // studies match on that evidenced pain rather than vertical alone.
        const [meddpicc, caseStudies] = await Promise.all([
          scoreMeddpicc(discovery_notes, product, prospect_company, null, researchSections.value_drivers).then((result) => {
            emit({ type: "meddpicc", data: result })
            return result
          }),
          matchCaseStudies(discovery_notes, product, researchSections.value_drivers).then((result) => {
            emit({ type: "case_studies", data: result })
            return result
          }),
        ])

        const [email, questions] = await Promise.all([
          draftPrepEmail({
            prospect_name,
            prospect_company,
            discovery_notes,
            product,
            meddpicc,
            matched_case_studies: caseStudies as MatchedCaseStudy[],
            sc_name: scName,
            research_drivers: researchSections.value_drivers,
          }),
          generateQuestions(discovery_notes, meddpicc, product, researchSections.discovery_questions),
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
            research_brief_id: researchBrief?.id ?? null,
          })
          .select()
          .single()

        if (error) {
          emit({ type: "error", message: error.message })
        } else {
          await upsertStakeholders(supabase, dealId, brief.id, mergedStakeholders)
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
