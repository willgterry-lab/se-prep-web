import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { BriefView } from "@/components/brief-view"
import type { Brief } from "@/types"

export default async function BriefPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data } = await supabase
    .from("briefs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single()

  if (!data) notFound()

  return <BriefView brief={data as Brief} />
}
