import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { anthropic, MODEL } from "@/lib/anthropic"
import type { ProductContext } from "@/types"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const body = await req.json()
  let { prospect_name, prospect_company } = body as {
    prospect_name?: string
    prospect_company?: string
  }

  const { data: ctx } = await supabase
    .from("product_contexts")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!ctx) {
    return new Response(
      JSON.stringify({ type: "error", message: "No product context found. Please complete setup first." }),
      { status: 400 }
    )
  }

  const product = ctx as ProductContext

  const icpSummary = product.icp?.length ? product.icp.slice(0, 4).join(", ") : "mid-market B2B companies"
  const competitorList = product.competitor_mentions?.length
    ? product.competitor_mentions.slice(0, 4).join(", ")
    : "existing tools"
  const caseStudyHint = product.case_studies?.length
    ? `The prospect's situation should loosely echo one of these customer outcomes: ${product.case_studies
        .slice(0, 2)
        .map((cs) => cs.headline_pain)
        .join("; ")}.`
    : ""

  const needsIdentity = !prospect_name || !prospect_company
  const identityInstruction = needsIdentity
    ? `Invent a realistic prospect: a plausible full name and a fictional but believable company name that fits the ICP (${icpSummary}). Use these consistently throughout the transcript. On the very first line, before the transcript, output a JSON line in this exact format and nothing else before the AE line:
PROSPECT_META: {"prospect_name": "First Last", "prospect_company": "Company Name"}
`
    : `Prospect contact: ${prospect_name}, ${prospect_company}\n`

  const prompt = `Generate a realistic B2B SaaS discovery call transcript between an Account Executive (AE) and a prospect. Aim for a 5-minute call — approximately 30–36 exchanges.

Product being sold: ${product.company} — ${product.one_line_value}
Typical buyers (ICP): ${icpSummary}
Known competitors in this space: ${competitorList}
${identityInstruction}${caseStudyHint}

FORMAT — use exactly this pattern, speaker labels in caps followed by a colon:
AE: [text]
PROSPECT: [text]

RULES:
- 30–36 exchanges total (AE + PROSPECT lines each count as one exchange).
- Structure the call in four natural phases: (1) agenda-setting and rapport (4–5 exchanges), (2) current state and pain discovery (10–12 exchanges), (3) metrics, process, and stakeholders (8–10 exchanges), (4) next steps and wrap-up (4–5 exchanges).
- The AE should ask open-ended follow-up questions that go deeper, not just move to the next topic.
- The prospect should be engaged but not a pushover — they have real constraints, ask clarifying questions, and give multi-sentence answers that reveal detail.
- Surface strong evidence for 5–6 MEDDPICC elements with specific numbers or verbatim quotes the prospect says out loud: Metrics (a concrete number), Identify Pain (a specific problem they describe), Champion (who is driving this internally), Decision Criteria (what they care about in a solution), Competition (a tool they mention by name).
- Leave Economic Buyer vague — the AE asks but the prospect is unclear or says "that would be my manager."
- Leave Paper Process unmentioned — the call ends before it comes up.
- Include at least two specific metrics the prospect states (e.g. "we're spending about 12 hours a week on this", "our data is usually 3–4 days stale by the time it reaches the team").
- Speaker turns should feel natural: some short, some multi-sentence. Avoid bullet-point style answers from the prospect.
- Keep the language natural and specific to ${product.company}'s domain. No marketing clichés.
- Do not add any preamble, headings, or notes outside the PROSPECT_META line (if present) and the transcript lines.`

  const readable = new ReadableStream({
    async start(controller) {
      const emit = (event: object) =>
        controller.enqueue(new TextEncoder().encode(JSON.stringify(event) + "\n"))

      try {
        const stream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 3500,
          messages: [{ role: "user", content: prompt }],
        })

        // Buffer until we've resolved the optional PROSPECT_META first line
        let firstLineBuffer = ""
        let firstLineProcessed = !needsIdentity

        stream.on("text", (text) => {
          if (!firstLineProcessed) {
            firstLineBuffer += text
            const newlineIdx = firstLineBuffer.indexOf("\n")
            if (newlineIdx !== -1) {
              const firstLine = firstLineBuffer.slice(0, newlineIdx)
              const metaMatch = firstLine.match(/^PROSPECT_META:\s*(\{.+\})$/)
              if (metaMatch) {
                try {
                  const meta = JSON.parse(metaMatch[1])
                  prospect_name = meta.prospect_name ?? prospect_name
                  prospect_company = meta.prospect_company ?? prospect_company
                  emit({ type: "meta", prospect_name: prospect_name ?? null, prospect_company: prospect_company ?? null })
                } catch {}
              }
              const rest = firstLineBuffer.slice(newlineIdx + 1)
              if (rest) emit({ type: "text", chunk: rest })
              firstLineProcessed = true
              firstLineBuffer = ""
            }
          } else {
            emit({ type: "text", chunk: text })
          }
        })

        await stream.finalMessage()
        emit({ type: "done" })
      } catch (e) {
        emit({ type: "error", message: e instanceof Error ? e.message : "Generation failed." })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
