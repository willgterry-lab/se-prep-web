import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (dealError || !deal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const [{ data: briefs }, { data: tasks }] = await Promise.all([
    supabase
      .from("briefs")
      .select("*")
      .eq("deal_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("deal_tasks")
      .select("*")
      .eq("deal_id", id)
      .order("created_at", { ascending: true }),
  ])

  return NextResponse.json({ deal, briefs: briefs ?? [], tasks: tasks ?? [] })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Briefs, deal_tasks, and deal_stakeholders all have deal_id on delete cascade,
  // so deleting the deal row removes everything attached to it in one go.
  const { error, count } = await supabase
    .from("deals")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!count) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true })
}
