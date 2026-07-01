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
