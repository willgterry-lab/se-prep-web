import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { runSinglePovAnalysis } from "@/lib/pov-analysis"
import type { ProductContext, PovCallType } from "@/types"

// Batch of 2-3 calls, each running several AI calls sequentially (they depend
// on one another: each call's scoring/risk carry-forward needs the previous
// call's brief already saved) -- can take noticeably longer than a single call.
export const maxDuration = 300

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

  const { calls } = (await req.json()) as {
    calls: {
      transcript: string
      recording_url: string | null
      call_date: string | null
      call_type: PovCallType
    }[]
  }

  if (!Array.isArray(calls) || calls.length === 0) {
    return new Response("At least one call is required.", { status: 400 })
  }

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
        // Sequential, not parallel: each call's scoring and risk carry-forward
        // depends on the previous call's brief already being saved.
        for (let i = 0; i < calls.length; i++) {
          const call = calls[i]
          emit({ type: "call_start", call_index: i })

          const { briefId } = await runSinglePovAnalysis({
            supabase,
            dealId,
            userId: user.id,
            product: ctx as ProductContext,
            scName,
            transcript: call.transcript,
            recording_url: call.recording_url ?? null,
            call_type: call.call_type,
            call_date: call.call_date ?? null,
            emit: (event) => emit({ ...event, call_index: i }),
          })

          emit({ type: "call_done", call_index: i, brief_id: briefId })
        }

        emit({ type: "done", data: { deal_id: dealId } })
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
