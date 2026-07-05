import { createClient } from "@/lib/supabase/server"
import type { ExtractedStakeholder } from "@/types"

type Supabase = Awaited<ReturnType<typeof createClient>>

function firstToken(name: string): string {
  return name.trim().split(/\s+/)[0].toLowerCase()
}

// Upserts AI-extracted stakeholders for a deal: updates role on an existing
// case-insensitive name match, otherwise inserts a new row. Manual edits (source
// = "manual") are left alone unless a later call re-mentions the same name, in
// which case only the role is refreshed.
//
// A later call sometimes only uses someone's first name (e.g. a transcript says
// "Rachel" where an earlier call gave the full "Rachel Osei-Bonsu"). If the
// extracted name is a bare first name (no space) and it matches the first name
// of exactly one existing stakeholder, treat it as that person rather than
// inserting a duplicate row. If it matches more than one existing first name,
// it's ambiguous -- fall through to inserting a new row rather than guessing
// which person it is.
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

  const existingByFirstToken = new Map<string, string[]>()
  for (const s of existing ?? []) {
    const token = firstToken(s.name)
    existingByFirstToken.set(token, [...(existingByFirstToken.get(token) ?? []), s.id])
  }

  const toInsert: {
    deal_id: string
    name: string
    role: string | null
    source: "ai"
    first_mentioned_brief_id: string | null
  }[] = []

  // Tracks full names (lower-cased) and bare first-name tokens already handled
  // within this single extraction batch, so the same person mentioned twice in
  // one transcript doesn't get queued for insert twice.
  const seenThisBatch = new Set<string>()

  for (const person of extracted) {
    const name = person.name?.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seenThisBatch.has(key)) continue

    let existingId = existingByLowerName.get(key)

    if (!existingId && !name.includes(" ")) {
      const candidates = existingByFirstToken.get(key) ?? []
      if (candidates.length === 1) existingId = candidates[0]
    }

    seenThisBatch.add(key)

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
    }
  }

  if (toInsert.length) {
    await supabase.from("deal_stakeholders").insert(toInsert)
  }
}
