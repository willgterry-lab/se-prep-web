import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { PovAssessment, PovCriterionStatus } from "@/types"

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

  const { brief_id, criterion_id, status, note } = await req.json() as {
    brief_id: string
    criterion_id: number
    status: PovCriterionStatus
    note: string | null
  }

  const { data: deal } = await supabase
    .from("deals")
    .select("id")
    .eq("id", dealId)
    .eq("user_id", user.id)
    .single()

  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data: brief } = await supabase
    .from("briefs")
    .select("id, deal_id, pov_assessment")
    .eq("id", brief_id)
    .eq("deal_id", dealId)
    .single()

  if (!brief) return NextResponse.json({ error: "Brief not found" }, { status: 404 })

  const existing = (brief.pov_assessment as PovAssessment[]) ?? []
  const idx = existing.findIndex((a) => a.criterion_id === criterion_id)

  const updated: PovAssessment =
    idx >= 0
      ? { ...existing[idx], status, notes: note }
      : { criterion_id, status, evidence: "Manually set by SC.", notes: note }

  const nextAssessment =
    idx >= 0
      ? existing.map((a, i) => (i === idx ? updated : a))
      : [...existing, updated]

  const { error } = await supabase
    .from("briefs")
    .update({ pov_assessment: nextAssessment })
    .eq("id", brief_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pov_assessment: nextAssessment })
}
