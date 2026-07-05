import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

async function verifyDealOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dealId: string,
  userId: string
) {
  const { data: deal } = await supabase
    .from("deals")
    .select("id")
    .eq("id", dealId)
    .eq("user_id", userId)
    .single()
  return !!deal
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dealId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!(await verifyDealOwnership(supabase, dealId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { data, error } = await supabase
    .from("deal_stakeholders")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ stakeholders: data })
}

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

  if (!(await verifyDealOwnership(supabase, dealId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { name, role } = await req.json() as { name: string; role: string | null }
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("deal_stakeholders")
    .insert({ deal_id: dealId, name: name.trim(), role: role?.trim() || null, source: "manual" })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ stakeholder: data })
}
