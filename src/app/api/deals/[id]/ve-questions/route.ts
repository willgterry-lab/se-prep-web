import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateVeWorkshopQuestions } from "@/lib/analysis"
import type { ProductContext } from "@/types"

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

  const [{ data: deal }, { data: briefs }, { data: ctx }] = await Promise.all([
    supabase.from("deals").select("prospect_company").eq("id", dealId).eq("user_id", user.id).single(),
    supabase
      .from("briefs")
      .select("meddpicc")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: true }),
    supabase.from("product_contexts").select("*").eq("user_id", user.id).single(),
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

  const questions = await generateVeWorkshopQuestions(
    metricsEvidence,
    painEvidence,
    ctx as ProductContext
  )

  return NextResponse.json({ questions })
}
