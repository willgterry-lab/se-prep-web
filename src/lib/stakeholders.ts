import { createClient } from "@/lib/supabase/server"
import type { ExtractedStakeholder } from "@/types"

type Supabase = Awaited<ReturnType<typeof createClient>>

// Upserts AI-extracted stakeholders for a deal: updates role on an existing
// case-insensitive name match, otherwise inserts a new row. Manual edits (source
// = "manual") are left alone unless a later call re-mentions the same name, in
// which case only the role is refreshed.
export async function upsertStakeholders(
  supabase: Supabase,
  dealId: string,
  briefId: string | null,
  extracted: ExtractedStakeholder[]
) {
  if (!extracted.length) return

  const { data: existing } = await supabase
    .from("deal_stakeholders")
    .select("id, name")
    .eq("deal_id", dealId)

  const existingByLowerName = new Map<string, string>(
    (existing ?? []).map((s) => [s.name.toLowerCase(), s.id])
  )

  const toInsert: {
    deal_id: string
    name: string
    role: string | null
    source: "ai"
    first_mentioned_brief_id: string | null
  }[] = []

  for (const person of extracted) {
    const name = person.name?.trim()
    if (!name) continue
    const key = name.toLowerCase()
    const existingId = existingByLowerName.get(key)

    if (existingId) {
      if (person.role) {
        await supabase.from("deal_stakeholders").update({ role: person.role }).eq("id", existingId)
      }
    } else {
      toInsert.push({
        deal_id: dealId,
        name,
        role: person.role ?? null,
        source: "ai",
        first_mentioned_brief_id: briefId,
      })
      // Prevent inserting the same name twice within one transcript's extraction.
      existingByLowerName.set(key, "")
    }
  }

  if (toInsert.length) {
    await supabase.from("deal_stakeholders").insert(toInsert)
  }
}
