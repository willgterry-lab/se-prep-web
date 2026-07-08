import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateVeWorkshopQuestions } from "@/lib/analysis"
import type { ProductContext, ResearchBrief } from "@/types"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dealId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [{ data: deal }, { data: briefs }, { data: ctx }, { data: researchBriefs }] = await Promise.all([
    supabase.from("deals").select("prospect_company").eq("id", dealId).eq("user_id", user.id).single(),
    supabase
      .from("briefs")
      .select("meddpicc")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: true }),
    supabase.from("product_contexts").select("*").eq("user_id", user.id).single(),
    supabase
      .from("research_briefs")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: true }),
  ])

  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!ctx) return NextResponse.json({ error: "No product context" }, { status: 400 })

  // Aggregate metrics and pain evidence across all briefs
  const metricsEvidence = (briefs ?? [])
    .map((b) => b.meddpicc?.metrics?.evidence)
    .filter((e): e is string => !!e && e !== "none")
    .join("\n")

  const painEvidence = (briefs ?? [])
    .map((b) => b.meddpicc?.identify_pain?.evidence)
    .filter((e): e is string => !!e && e !== "none")
    .join("\n")

  // Value driver hypotheses and cost-of-doing-nothing seeds from prospect
  // research carry through as candidate drivers awaiting verbatim baselines --
  // the latest research run, if one exists.
  const latestResearch = (researchBriefs as ResearchBrief[] | null)?.at(-1)
  const candidateLines = [
    ...(latestResearch?.sections.value_drivers.hypotheses.map((h) => `- ${h.driver_statement}`) ?? []),
    ...(latestResearch?.sections.risks.risks
      .filter((r) => r.cost_of_doing_nothing_seed)
      .map((r) => `- Cost of doing nothing: ${r.cost_of_doing_nothing_seed}`) ?? []),
  ]
  const candidateDrivers = candidateLines.length ? candidateLines.join("\n") : undefined

  const questions = await generateVeWorkshopQuestions(
    metricsEvidence,
    painEvidence,
    ctx as ProductContext,
    candidateDrivers
  )

  return NextResponse.json({ questions })
}
