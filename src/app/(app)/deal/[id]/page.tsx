import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { DealView } from "@/components/deal-view"
import type { Deal, Brief, DealTask, DealStakeholder } from "@/types"

export default async function DealPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: deal } = await supabase
    .from("deals")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single()

  if (!deal) notFound()

  const [{ data: briefs }, { data: tasks }, { data: stakeholders }] = await Promise.all([
    supabase
      .from("briefs")
      .select("*")
      .eq("deal_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("deal_tasks")
      .select("*")
      .eq("deal_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("deal_stakeholders")
      .select("*")
      .eq("deal_id", id)
      .order("created_at", { ascending: true }),
  ])

  return (
    <DealView
      deal={deal as Deal}
      briefs={(briefs ?? []) as Brief[]}
      tasks={(tasks ?? []) as DealTask[]}
      stakeholders={(stakeholders ?? []) as DealStakeholder[]}
    />
  )
}
