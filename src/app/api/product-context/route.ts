import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  // Upsert: one product context per user
  const { data: existing } = await supabase
    .from("product_contexts")
    .select("id")
    .eq("user_id", user.id)
    .single()

  const record = { ...body, user_id: user.id }

  const { data, error } = existing
    ? await supabase.from("product_contexts").update(record).eq("id", existing.id).select().single()
    : await supabase.from("product_contexts").insert(record).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ product_context: data })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("product_contexts")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (error) return NextResponse.json({ product_context: null })
  return NextResponse.json({ product_context: data })
}
