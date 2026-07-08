import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { runResearchOnlyPipeline } from "@/lib/research"
import { upsertStakeholders } from "@/lib/stakeholders"
import type { ProductContext, ResolvedCompany, ExtractedStakeholder, CompanyResolution } from "@/types"

// Research-first entry point ("New deal" on the dashboard): a resolved company
// only, no discovery notes or call yet. Creates the deal row immediately (so
// the research brief has a dealId to attach to), then streams the same nine
// research_* NDJSON events the manual /api/deals/[id]/research route does.
// prospect_name has no value at this point -- defaults to "" rather than a
// nullable-column migration; deal-view.tsx/dashboard already render it
// conditionally to handle the blank case.
// 300s matches /api/analyze and the manual research route -- see the comment
// there on why 120s timed out for real in production.
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

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

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .insert({
      user_id: user.id,
      prospect_name: "",
      prospect_company: company.name,
    })
    .select()
    .single()

  if (dealError || !deal) {
    return new Response(
      JSON.stringify({ type: "error", message: dealError?.message ?? "Failed to create deal." }),
      { status: 500 }
    )
  }

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) =>
        controller.enqueue(new TextEncoder().encode(JSON.stringify(event) + "\n"))

      emit({ type: "deal_created", data: { deal_id: deal.id } })

      try {
        const { sections, sourceLog, notesStakeholders } = await runResearchOnlyPipeline({
          company,
          discoveryNotes: "",
          product,
          emit,
        })

        const { data: researchBrief, error } = await supabase
          .from("research_briefs")
          .insert({
            deal_id: deal.id,
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
        await upsertStakeholders(supabase, deal.id, null, [...notesStakeholders, ...researchStakeholders])

        emit({ type: "research_done", data: { deal_id: deal.id, research_brief_id: researchBrief.id } })
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
