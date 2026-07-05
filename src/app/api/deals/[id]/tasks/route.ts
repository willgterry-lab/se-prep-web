import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

  const { description, owner, reminder_at } = await req.json() as {
    description: string
    owner: "SC" | "Prospect" | "Joint" | null
    reminder_at: string | null
  }

  if (!description?.trim()) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 })
  }

  const { data: deal } = await supabase
    .from("deals")
    .select("id")
    .eq("id", dealId)
    .eq("user_id", user.id)
    .single()

  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data, error } = await supabase
    .from("deal_tasks")
    .insert({
      deal_id: dealId,
      description: description.trim(),
      status: "open",
      source: "manual",
      owner: owner ?? null,
      reminder_at: reminder_at ?? null,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data })
}
