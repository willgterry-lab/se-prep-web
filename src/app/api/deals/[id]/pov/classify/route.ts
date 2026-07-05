import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { classifyPovCallSequence } from "@/lib/analysis"

export const maxDuration = 60

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

  const { data: deal } = await supabase
    .from("deals")
    .select("id")
    .eq("id", dealId)
    .eq("user_id", user.id)
    .single()

  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { transcripts } = (await req.json()) as { transcripts: string[] }
  if (!Array.isArray(transcripts) || transcripts.length === 0) {
    return NextResponse.json({ error: "At least one transcript is required." }, { status: 400 })
  }

  const ordering = await classifyPovCallSequence(transcripts)
  return NextResponse.json({ ordering })
}
