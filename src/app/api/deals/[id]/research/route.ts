import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { extractStakeholders } from "@/lib/analysis"
import {
  researchSnapshotAndContext,
  researchOperatingModel,
  researchStakeholdersAndSignals,
  researchValueDriversAndRisks,
  researchDiscoveryQuestions,
  buildSourceLog,
  getDemoCache,
  emitCachedResearch,
  CHOCO_OPERATING_MODEL_LENS,
  CHOCO_VALUE_DRIVER_TAXONOMY,
} from "@/lib/research"
import { upsertStakeholders } from "@/lib/stakeholders"
import type { ProductContext, ResolvedCompany, ResearchSections, ExtractedStakeholder, CompanyResolution } from "@/types"

// Manual fallback path: "Run prospect research" / "Re-run research" on the deal
// page. Same research pipeline as the automatic Prep path (/api/analyze), just
// without the surrounding MEDDPICC/case-study/email steps -- those belong to a
// specific call's brief, not to a standalone research run. Reuses whatever
// discovery notes already exist on the deal's earliest prep brief, if any.
// 300s matches /api/analyze -- see the comment there on why 120s timed out
// for real in production.
export const maxDuration = 300

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: dealId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const { data: deal } = await supabase
    .from("deals")
    .select("id")
    .eq("id", dealId)
    .eq("user_id", user.id)
    .single()
  if (!deal) return new Response("Not found", { status: 404 })

  const { company } = (await req.json()) as { company?: ResolvedCompany & Pick<CompanyResolution, "confidence"> }
  if (!company?.name) {
    return new Response(JSON.stringify({ type: "error", message: "A resolved company is required." }), { status: 400 })
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

  const { data: earliestBrief } = await supabase
    .from("briefs")
    .select("discovery_notes")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  const discoveryNotes = earliestBrief?.discovery_notes ?? ""

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) =>
        controller.enqueue(new TextEncoder().encode(JSON.stringify(event) + "\n"))

      try {
        // Demo cache: see the comment in /api/analyze/route.ts.
        const demoCache = getDemoCache(company.name)

        const [{ sections, sourceLog }, notesStakeholders] = await Promise.all([
          demoCache
            ? emitCachedResearch(demoCache, emit).then(() => ({ sections: demoCache.sections, sourceLog: demoCache.sourceLog }))
            : (async (): Promise<{ sections: ResearchSections; sourceLog: ReturnType<typeof buildSourceLog> }> => {
                const [snapshotAndContext, operatingModel, stakeholdersAndSignals, driversAndRisks] =
                  await Promise.all([
                    researchSnapshotAndContext(company).then((r) => {
                      emit({ type: "research_snapshot", data: r.snapshot })
                      emit({ type: "research_strategic_context", data: r.strategic_context })
                      return r
                    }),
                    researchOperatingModel(company, CHOCO_OPERATING_MODEL_LENS).then((r) => {
                      emit({ type: "research_operating_model", data: r })
                      return r
                    }),
                    researchStakeholdersAndSignals(company).then((r) => {
                      emit({ type: "research_stakeholders", data: r.stakeholders })
                      emit({ type: "research_buying_signals", data: r.buying_signals })
                      return r
                    }),
                    researchValueDriversAndRisks({
                      company,
                      discovery_notes: discoveryNotes,
                      product,
                      taxonomy: CHOCO_VALUE_DRIVER_TAXONOMY,
                    }).then((r) => {
                      emit({ type: "research_value_drivers", data: r.value_drivers })
                      emit({ type: "research_risks", data: r.risks })
                      return r
                    }),
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
                  discovery_notes: discoveryNotes,
                  sections: sectionsWithoutQuestions,
                })
                emit({ type: "research_discovery_questions", data: discoveryQuestions })

                const sections: ResearchSections = { ...sectionsWithoutQuestions, discovery_questions: discoveryQuestions }
                const sourceLog = buildSourceLog(sections)
                emit({ type: "research_source_log", data: sourceLog })
                return { sections, sourceLog }
              })(),
          discoveryNotes ? extractStakeholders(discoveryNotes, company.name) : Promise.resolve([]),
        ])

        const { data: researchBrief, error } = await supabase
          .from("research_briefs")
          .insert({
            deal_id: dealId,
            user_id: user.id,
            company_name: company.name,
            company_domain: company.domain ?? null,
            company_hq: company.hq ?? null,
            company_description: company.description ?? null,
            resolution_confidence: company.confidence ?? null,
            sections,
            source_log: sourceLog,
          })
          .select()
          .single()

        if (error || !researchBrief) {
          emit({ type: "error", message: error?.message ?? "Failed to save research brief." })
          controller.close()
          return
        }

        const researchStakeholders: ExtractedStakeholder[] = sections.stakeholders.entries
          .filter((s): s is typeof s & { name: string } => Boolean(s.name))
          .map((s) => ({ name: s.name, role: s.role }))
        await upsertStakeholders(supabase, dealId, null, [...notesStakeholders, ...researchStakeholders])

        emit({ type: "research_done", data: { research_brief_id: researchBrief.id } })
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
