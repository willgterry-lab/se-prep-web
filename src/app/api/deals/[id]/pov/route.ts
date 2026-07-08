import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { runSinglePovAnalysis } from "@/lib/pov-analysis"
import type { ProductContext, PovCallType } from "@/types"

// runSinglePovAnalysis chains a comparable sequence to post-call/VE
// (scoreMeddpicc, assessPovCriteria, risks, questions, email, actions,
// completed-tasks). See the comment on post-call's maxDuration.
export const maxDuration = 120

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dealId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const scName = (user.user_metadata?.full_name as string | undefined) ?? ""

  const { transcript, recording_url, call_type, call_date } = await req.json()

  const { data: ctx } = await supabase
    .from("product_contexts")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!ctx) return new Response("No product context found", { status: 400 })

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) =>
        controller.enqueue(new TextEncoder().encode(JSON.stringify(event) + "\n"))

      try {
        const { briefId } = await runSinglePovAnalysis({
          supabase,
          dealId,
          userId: user.id,
          product: ctx as ProductContext,
          scName,
          transcript,
          recording_url: recording_url ?? null,
          call_type: (call_type as PovCallType) ?? "setup",
          call_date: call_date ?? null,
          emit,
        })

        emit({ type: "done", data: { brief_id: briefId, deal_id: dealId } })
      } catch (e) {
        emit({ type: "error", message: e instanceof Error ? e.message : "Something went wrong." })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
