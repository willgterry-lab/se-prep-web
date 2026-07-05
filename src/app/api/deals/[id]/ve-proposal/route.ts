import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateValueProposal } from "@/lib/analysis"
import { randomBytes } from "crypto"
import type { ProductContext, VeBaselineInput, VeSliderInputs, MatchedCaseStudy } from "@/types"

// POST: generate and save value proposal
// PATCH: publish or unpublish the saved proposal to the salesroom

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dealId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { ve_slider_inputs }: { ve_slider_inputs: VeSliderInputs } = await req.json()

  const [{ data: deal }, { data: ctx }, { data: veBriefs }, { data: allBriefs }] =
    await Promise.all([
      supabase
        .from("deals")
        .select("prospect_company")
        .eq("id", dealId)
        .eq("user_id", user.id)
        .single(),
      supabase.from("product_contexts").select("*").eq("user_id", user.id).single(),
      supabase
        .from("briefs")
        .select("ve_baseline_inputs, matched_case_studies")
        .eq("deal_id", dealId)
        .eq("stage", "value_engineering")
        .order("created_at", { ascending: true }),
      supabase
        .from("briefs")
        .select("meddpicc, matched_case_studies")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: true }),
    ])

  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!ctx) return NextResponse.json({ error: "No product context" }, { status: 400 })

  // Aggregate baseline inputs across all VE briefs (dedup by key, last-write-wins)
  const baselineMap = new Map<string, VeBaselineInput>()
  for (const b of veBriefs ?? []) {
    for (const inp of (b.ve_baseline_inputs as VeBaselineInput[]) ?? []) {
      baselineMap.set(inp.key, inp)
    }
  }
  const aggregated_baselines = [...baselineMap.values()]

  if (!aggregated_baselines.length) {
    return NextResponse.json(
      { error: "No baseline inputs found. Log a VE workshop call first." },
      { status: 400 }
    )
  }

  // Aggregate pain evidence across all briefs
  const aggregated_pain_evidence = (allBriefs ?? [])
    .map((b) => b.meddpicc?.identify_pain?.evidence)
    .filter((e): e is string => !!e && e !== "none")
    .join("\n")

  // Aggregate case studies (dedup by url, favour more recent)
  const csMap = new Map<string, MatchedCaseStudy>()
  for (const b of allBriefs ?? []) {
    for (const cs of (b.matched_case_studies as MatchedCaseStudy[]) ?? []) {
      if (!csMap.has(cs.url)) csMap.set(cs.url, cs)
    }
  }
  const matched_case_studies = [...csMap.values()].slice(0, 3)

  const proposal = await generateValueProposal({
    aggregated_baselines,
    ve_slider_inputs,
    matched_case_studies,
    aggregated_pain_evidence,
    product: ctx as ProductContext,
    prospect_company: deal.prospect_company,
  })

  await supabase
    .from("deals")
    .update({ ve_proposal: proposal, ve_slider_inputs })
    .eq("id", dealId)

  return NextResponse.json({ proposal })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dealId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { action }: { action: "publish" | "unpublish" } = await req.json()

  const { data: deal } = await supabase
    .from("deals")
    .select("id, ve_proposal, share_token")
    .eq("id", dealId)
    .eq("user_id", user.id)
    .single()

  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (action === "publish" && !deal.ve_proposal) {
    return NextResponse.json({ error: "Generate a value proposal first." }, { status: 400 })
  }

  const ve_published = action === "publish"

  // Publishing makes the proposal "live on the salesroom" -- that's only true if
  // a share_token (the salesroom's URL) actually exists yet. Generate one here
  // rather than allowing a published-but-unreachable state.
  const share_token =
    action === "publish" && !deal.share_token ? randomBytes(32).toString("hex") : deal.share_token

  await supabase
    .from("deals")
    .update({ ve_published, ...(share_token !== deal.share_token ? { share_token } : {}) })
    .eq("id", dealId)

  return NextResponse.json({ ve_published, share_token })
}
