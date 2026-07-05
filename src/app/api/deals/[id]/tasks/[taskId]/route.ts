import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { id: dealId, taskId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { status, reminder_at, dismiss_suggestion } = await req.json() as {
    status?: "open" | "done"
    reminder_at?: string | null
    dismiss_suggestion?: boolean
  }

  // Verify the task belongs to a deal owned by this user.
  const { data: task } = await supabase
    .from("deal_tasks")
    .select("id, deal_id")
    .eq("id", taskId)
    .single()

  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data: deal } = await supabase
    .from("deals")
    .select("id")
    .eq("id", dealId)
    .eq("user_id", user.id)
    .single()

  if (!deal) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const update: Record<string, string | null> = {}
  if (status !== undefined) {
    update.status = status
    update.completed_at = status === "done" ? new Date().toISOString() : null
    if (status === "done") update.suggested_done_evidence = null
  }
  if (reminder_at !== undefined) {
    update.reminder_at = reminder_at
  }
  if (dismiss_suggestion) {
    update.suggested_done_evidence = null
  }

  const { error } = await supabase
    .from("deal_tasks")
    .update(update)
    .eq("id", taskId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
