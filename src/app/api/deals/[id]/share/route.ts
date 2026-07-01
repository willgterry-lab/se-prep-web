import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { randomBytes } from "crypto"

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

  const { action } = await req.json()

  const { data: deal } = await supabase
    .from("deals")
    .select("id")
    .eq("id", dealId)
    .eq("user_id", user.id)
    .single()

  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (action === "generate") {
    const token = randomBytes(32).toString("hex")
    const { error } = await supabase
      .from("deals")
      .update({ share_token: token })
      .eq("id", dealId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ share_token: token })
  }

  if (action === "revoke") {
    const { error } = await supabase
      .from("deals")
      .update({ share_token: null })
      .eq("id", dealId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ share_token: null })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
