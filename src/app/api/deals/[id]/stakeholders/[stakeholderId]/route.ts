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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stakeholderId: string }> }
) {
  const { id: dealId, stakeholderId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!(await verifyDealOwnership(supabase, dealId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { name, role } = await req.json() as { name?: string; role?: string | null }
  const update: Record<string, string | null> = {}
  if (name !== undefined) update.name = name.trim()
  if (role !== undefined) update.role = role?.trim() || null

  const { data, error } = await supabase
    .from("deal_stakeholders")
    .update(update)
    .eq("id", stakeholderId)
    .eq("deal_id", dealId)
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ stakeholder: data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stakeholderId: string }> }
) {
  const { id: dealId, stakeholderId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!(await verifyDealOwnership(supabase, dealId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { error } = await supabase
    .from("deal_stakeholders")
    .delete()
    .eq("id", stakeholderId)
    .eq("deal_id", dealId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
