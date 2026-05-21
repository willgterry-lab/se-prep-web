import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CopyButton } from "@/components/copy-button"
import { DeleteBriefButton } from "@/components/delete-brief-button"
import { cn } from "@/lib/utils"
import type { Brief, MeddpiccScore, MatchedCaseStudy } from "@/types"

const MEDDPICC_LABELS: Record<keyof Omit<MeddpiccScore, "overall_score" | "summary">, string> = {
  metrics: "Metrics",
  economic_buyer: "Economic Buyer",
  decision_criteria: "Decision Criteria",
  decision_process: "Decision Process",
  paper_process: "Paper Process",
  identify_pain: "Identify Pain",
  champion: "Champion",
  competition: "Competition",
}

function ScorePip({ score }: { score: number }) {
  const colors = ["bg-gray-200", "bg-red-400", "bg-yellow-400", "bg-green-500"]
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map((i) => (
        <span key={i} className={`w-2 h-2 rounded-full ${i <= score ? colors[score] : "bg-gray-200"}`} />
      ))}
    </div>
  )
}

export default async function BriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from("briefs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single()

  if (!data) notFound()

  const brief = data as Brief
  const m = brief.meddpicc

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{brief.prospect_name}</h1>
          <p className="text-gray-500">{brief.prospect_company}</p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(brief.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        {m && (
          <div className="text-right">
            <div className="text-3xl font-bold">{m.overall_score}<span className="text-lg font-normal text-gray-400">/24</span></div>
            <p className="text-xs text-gray-500 mt-0.5">MEDDPICC score</p>
          </div>
        )}
      </div>

      {m && (
        <>
          {/* Deal summary */}
          <Card>
            <CardHeader><CardTitle>Deal assessment</CardTitle></CardHeader>
            <CardContent>
              <p className="text-gray-700">{m.summary}</p>
            </CardContent>
          </Card>

          {/* MEDDPICC */}
          <Card>
            <CardHeader><CardTitle>MEDDPICC breakdown</CardTitle></CardHeader>
            <CardContent className="divide-y">
              {(Object.keys(MEDDPICC_LABELS) as Array<keyof typeof MEDDPICC_LABELS>).map((key) => {
                const element = m[key]
                return (
                  <div key={key} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{MEDDPICC_LABELS[key]}</span>
                      <ScorePip score={element.score} />
                    </div>
                    {element.evidence && element.evidence !== "none" && (
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Evidence: </span>
                        &ldquo;{element.evidence}&rdquo;
                      </p>
                    )}
                    {element.gap && (
                      <p className="text-sm text-gray-400">
                        <span className="font-medium">Gap: </span>{element.gap}
                      </p>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </>
      )}

      {/* Case studies */}
      {brief.matched_case_studies?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recommended case studies</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {brief.matched_case_studies.map((cs: MatchedCaseStudy, i: number) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{cs.industry}</Badge>
                  <a
                    href={cs.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sm hover:underline"
                  >
                    {cs.customer}
                  </a>
                </div>
                <p className="text-sm text-gray-600">{cs.summary}</p>
                <p className="text-xs text-blue-600 italic">{cs.relevance_reason}</p>
                {i < brief.matched_case_studies.length - 1 && <Separator className="mt-3" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Follow-up email */}
      {brief.follow_up_email && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Follow-up email</CardTitle>
              <CopyButton text={brief.follow_up_email} />
            </div>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
              {brief.follow_up_email}
            </pre>
          </CardContent>
        </Card>
      )}

      <div className="pb-8 flex items-center justify-between">
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }))}>
          ← Back to dashboard
        </Link>
        <DeleteBriefButton briefId={brief.id} />
      </div>
    </div>
  )
}

