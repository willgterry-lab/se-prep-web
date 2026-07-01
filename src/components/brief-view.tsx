"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CopyButton } from "@/components/copy-button"
import { DeleteBriefButton } from "@/components/delete-brief-button"
import { cn } from "@/lib/utils"
import type { Brief, MeddpiccScore, MeddpiccDelta, RiskItem, MatchedCaseStudy, SuggestedQuestions } from "@/types"

// ─── Constants ────────────────────────────────────────────────────────────────

const MEDDPICC_LABELS: Record<
  keyof Omit<MeddpiccScore, "overall_score" | "summary" | "suggested_questions" | "answered_questions">,
  string
> = {
  metrics: "Metrics",
  economic_buyer: "Economic Buyer",
  decision_criteria: "Decision Criteria",
  decision_process: "Decision Process",
  paper_process: "Paper Process",
  identify_pain: "Identify Pain",
  champion: "Champion",
  competition: "Competition",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDisplayScore(raw: number) {
  return Math.round((raw / 24) * 100)
}

function ScorePip({ score }: { score: number }) {
  const colors = ["bg-gray-200", "bg-red-400", "bg-amber-400", "bg-[#1ED760]"]
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${i <= score ? colors[score] : "bg-gray-200"}`}
        />
      ))}
    </div>
  )
}

function meddpiccToText(m: MeddpiccScore): string {
  const keys = Object.keys(MEDDPICC_LABELS) as Array<
    keyof typeof MEDDPICC_LABELS
  >
  const lines = [
    `MEDDPICC Score: ${toDisplayScore(m.overall_score)}/100`,
    "",
    m.summary,
    "",
    ...keys.flatMap((key) => {
      const el = m[key]
      const rows = [`${MEDDPICC_LABELS[key]} (${el.score}/3)`]
      if (el.evidence && el.evidence !== "none") rows.push(`  Evidence: "${el.evidence}"`)
      if (el.gap) rows.push(`  Gap: ${el.gap}`)
      return [...rows, ""]
    }),
  ]
  return lines.join("\n").trim()
}

function caseStudiesToText(studies: MatchedCaseStudy[]): string {
  return studies
    .map(
      (cs) =>
        `${cs.customer} (${cs.industry})\n${cs.relevance_reason}\n${cs.url}`
    )
    .join("\n\n")
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
}

function elementToText(
  label: string,
  el: { score: number; evidence: string; gap: string }
): string {
  const lines = [`${label} (${el.score}/3)`]
  if (el.evidence && el.evidence !== "none") lines.push(`Evidence: "${el.evidence}"`)
  if (el.gap) lines.push(`Gap: ${el.gap}`)
  return lines.join("\n")
}

function buildEmailText(
  rawEmail: string,
  selected: MatchedCaseStudy[]
): string {
  const body = stripMarkdown(rawEmail.split("\n").slice(2).join("\n").trim())

  const oneLiners = selected.filter((cs) => cs.one_liner).map((cs) => cs.one_liner!)
  const caseStudySection = oneLiners.length
    ? `How we've helped businesses like yours:\n\n${oneLiners.map((l) => `- ${l}`).join("\n")}`
    : null

  // Split on [NEXT_STEPS] marker so the case study section lands before the CTA
  const markerIndex = body.search(/^[^\S\n]*\[NEXT_STEPS\][^\S\n]*$/m)
  let assembled: string
  if (markerIndex !== -1) {
    const beforeNextSteps = body.slice(0, markerIndex).trim()
    const nextStepsOnward = body.slice(markerIndex).replace(/^[^\S\n]*\[NEXT_STEPS\][^\S\n]*\n?/m, "").trim()
    const parts = [beforeNextSteps]
    if (caseStudySection) parts.push(caseStudySection)
    parts.push(nextStepsOnward)
    assembled = parts.join("\n\n")
  } else {
    // Fallback for briefs generated before this change
    const parts = [body]
    if (caseStudySection) parts.push(caseStudySection)
    assembled = parts.join("\n\n")
  }

  if (!selected.length) return assembled
  const links = selected.map((cs) => `  • ${cs.customer}: ${cs.url}`).join("\n")
  return `${assembled}\n\n---\nCase studies referenced:\n${links}`
}

function buildMailtoHref(rawEmail: string, selected: MatchedCaseStudy[]): string {
  const subject = rawEmail.split("\n")[0]
  const body = buildEmailText(rawEmail, selected)
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// ─── Delta card ───────────────────────────────────────────────────────────────

const MEDDPICC_ELEMENTS = Object.keys(MEDDPICC_LABELS) as Array<keyof typeof MEDDPICC_LABELS>

function ChangeChip({ change }: { change: number }) {
  if (change === 0) return <span className="text-xs text-gray-400">no change</span>
  const positive = change > 0
  return (
    <span className={`text-xs font-semibold ${positive ? "text-[#1ED760]" : "text-red-500"}`}>
      {positive ? "+" : ""}{change}
    </span>
  )
}

function DeltaCard({ delta }: { delta: MeddpiccDelta }) {
  const prevDisplay = Math.round((delta.overall_prev / 24) * 100)
  const currDisplay = Math.round((delta.overall_curr / 24) * 100)
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Score movement</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">{prevDisplay}/100</span>
            <span className="text-gray-400">to</span>
            <span className={`font-bold ${delta.overall_curr >= 16 ? "text-[#1ED760]" : delta.overall_curr >= 8 ? "text-amber-500" : "text-red-500"}`}>
              {currDisplay}/100
            </span>
            <ChangeChip change={currDisplay - prevDisplay} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="divide-y">
        {MEDDPICC_ELEMENTS.map((key) => {
          const el = delta[key as keyof MeddpiccDelta] as { prev: number; curr: number; change: number } | undefined
          if (!el || typeof el !== "object" || !("prev" in el)) return null
          return (
            <div key={key} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
              <span className="text-sm text-gray-700 w-36 shrink-0">{MEDDPICC_LABELS[key]}</span>
              <div className="flex items-center gap-3">
                <ScorePip score={el.prev} />
                <span className="text-gray-300 text-xs">to</span>
                <ScorePip score={el.curr} />
                <ChangeChip change={el.change} />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ─── Risk card ────────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: RiskItem["severity"] }) {
  const classes = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-gray-100 text-gray-600 border-gray-200",
  }
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${classes[severity]}`}>
      {severity}
    </span>
  )
}

function RiskCard({ risks }: { risks: RiskItem[] }) {
  const sorted = [...risks].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.severity] - order[b.severity]
  })
  return (
    <Card>
      <CardHeader><CardTitle>Risk areas</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {sorted.map((risk, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-start gap-2">
              <SeverityBadge severity={risk.severity} />
              <p className="text-sm font-medium text-gray-800 leading-snug">{risk.risk}</p>
            </div>
            {risk.evidence && risk.evidence !== "none" && (
              <p className="text-xs text-gray-500 pl-1">&ldquo;{risk.evidence}&rdquo;</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Suggested questions card ─────────────────────────────────────────────────

const QUESTION_SECTIONS: { key: keyof SuggestedQuestions; label: string }[] = [
  { key: "sc_intro", label: "Opening the call" },
  { key: "discovery", label: "Deeper discovery" },
  { key: "technical", label: "Technical deep dive" },
]

function SuggestedQuestionsCard({ questions }: { questions: SuggestedQuestions }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggested questions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {QUESTION_SECTIONS.map(({ key, label }) => (
          <div key={key}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{label}</p>
            <ul className="space-y-2">
              {questions[key].map((q, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-[#1ED760] text-sm font-bold mt-0.5 shrink-0">{i + 1}.</span>
                  <p className="text-sm text-gray-700">{q}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BriefView({ brief }: { brief: Brief }) {
  const m = brief.meddpicc
  const allStudies = brief.matched_case_studies ?? []

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    () => new Set(allStudies.map((_, i) => i))
  )

  function toggleStudy(i: number) {
    setSelectedIndices((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const selectedStudies = useMemo(
    () => allStudies.filter((_, i) => selectedIndices.has(i)),
    [allStudies, selectedIndices]
  )

  const emailText = useMemo(
    () => (brief.follow_up_email ? buildEmailText(brief.follow_up_email, selectedStudies) : ""),
    [brief.follow_up_email, selectedStudies]
  )

  const emailSubject = brief.follow_up_email?.split("\n")[0] ?? ""

  const copyAllText = useMemo(() => {
    const parts: string[] = []
    if (m) {
      parts.push(meddpiccToText(m))
    }
    if (allStudies.length) {
      parts.push("── Case studies ──\n\n" + caseStudiesToText(selectedStudies.length ? selectedStudies : allStudies))
    }
    if (brief.follow_up_email) {
      parts.push(`── Intro email ──\n\n${brief.follow_up_email.split("\n")[0]}\n\n${emailText}`)
    }
    return parts.join("\n\n\n")
  }, [m, allStudies, selectedStudies, brief.follow_up_email, emailText])

  const mailtoHref = useMemo(
    () => brief.follow_up_email ? buildMailtoHref(brief.follow_up_email, selectedStudies) : "#",
    [brief.follow_up_email, selectedStudies]
  )

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{brief.prospect_name}</h1>
          <p className="text-gray-500">{brief.prospect_company}</p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(brief.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CopyButton text={copyAllText} label="Copy all" />
          {m && (
            <div className="text-right">
              <div className={`text-3xl font-bold ${m.overall_score >= 16 ? "text-[#1ED760]" : m.overall_score >= 8 ? "text-amber-500" : "text-red-500"}`}>
                {toDisplayScore(m.overall_score)}
                <span className="text-lg font-normal text-gray-400">/100</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">MEDDPICC score</p>
            </div>
          )}
        </div>
      </div>

      {/* Score delta (post-call briefs only) */}
      {brief.delta && <DeltaCard delta={brief.delta} />}

      {/* Risk areas (post-call briefs only) */}
      {brief.risks && brief.risks.length > 0 && <RiskCard risks={brief.risks} />}

      {m && (
        <>
          {/* Deal summary */}
          <Card>
            <CardHeader>
              <CardTitle>Deal assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{m.summary}</p>
            </CardContent>
          </Card>

          {/* MEDDPICC breakdown */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>MEDDPICC breakdown</CardTitle>
                <CopyButton text={meddpiccToText(m)} label="Copy all" />
              </div>
            </CardHeader>
            <CardContent className="divide-y">
              {(
                Object.keys(MEDDPICC_LABELS) as Array<keyof typeof MEDDPICC_LABELS>
              ).map((key) => {
                const element = m[key]
                return (
                  <div key={key} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {MEDDPICC_LABELS[key]}
                      </span>
                      <div className="flex items-center gap-2">
                        <ScorePip score={element.score} />
                        <CopyButton text={elementToText(MEDDPICC_LABELS[key], element)} />
                      </div>
                    </div>
                    {element.evidence && element.evidence !== "none" && (
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Evidence: </span>
                        &ldquo;{element.evidence}&rdquo;
                      </p>
                    )}
                    {element.gap && (
                      <p className="text-sm text-gray-400">
                        <span className="font-medium">Gap: </span>
                        {element.gap}
                      </p>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Suggested questions */}
          {m.suggested_questions && (
            <SuggestedQuestionsCard questions={m.suggested_questions} />
          )}

          {/* Questions answered on this call (post-call briefs only) */}
          {m.answered_questions && (
            m.answered_questions.sc_intro.length > 0 ||
            m.answered_questions.discovery.length > 0 ||
            m.answered_questions.technical.length > 0
          ) && (
            <Card>
              <CardHeader>
                <CardTitle>Covered on this call</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {QUESTION_SECTIONS.map(({ key, label }) => {
                  const qs = m.answered_questions![key]
                  if (!qs?.length) return null
                  return (
                    <div key={key}>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{label}</p>
                      <ul className="space-y-2">
                        {qs.map((q, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <svg className="w-4 h-4 text-[#1ED760] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <p className="text-sm text-gray-400 line-through">{q}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Case studies */}
      {allStudies.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recommended case studies</CardTitle>
                <p className="text-xs text-gray-400 mt-1">
                  Select which to include in the email
                </p>
              </div>
              <CopyButton text={caseStudiesToText(selectedStudies.length ? selectedStudies : allStudies)} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {allStudies.map((cs: MatchedCaseStudy, i: number) => (
              <div key={i}>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedIndices.has(i)}
                    onChange={() => toggleStudy(i)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 accent-[#1ED760] cursor-pointer"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{cs.industry}</Badge>
                      <a
                        href={cs.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-sm hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {cs.customer}
                      </a>
                    </div>
                    <p className="text-sm text-gray-600">{cs.summary}</p>
                    <p className="text-xs text-[#1ED760] italic" style={{ color: "#0e8a42" }}>
                      {cs.relevance_reason}
                    </p>
                    {cs.one_liner && (
                      <div className="flex items-start justify-between gap-3 rounded-md bg-[#F4F7F6] border px-3 py-2 mt-2">
                        <p className="text-xs text-gray-700 leading-relaxed">
                          &ldquo;{cs.one_liner}&rdquo;
                        </p>
                        <span onClick={(e) => e.stopPropagation()}>
                          <CopyButton text={cs.one_liner} />
                        </span>
                      </div>
                    )}
                  </div>
                </label>
                {i < allStudies.length - 1 && <Separator className="mt-4" />}
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
              <div>
                <CardTitle>{brief.stage === "post_call" ? "Follow-up email" : "Intro email"}</CardTitle>
                <p className="text-xs text-gray-400 mt-1">{emailSubject}</p>
              </div>
              <div className="flex items-center gap-2">
                <CopyButton text={emailText} />
                <a
                  href={mailtoHref}
                  className={cn(
                    buttonVariants({ variant: "default", size: "sm" })
                  )}
                >
                  Send
                </a>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
              {emailText}
            </pre>
            {selectedStudies.length > 0 && (
              <div className="rounded-md bg-[#F4F7F6] border px-4 py-3 space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Included case study links
                </p>
                {selectedStudies.map((cs, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <a
                      href={cs.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {cs.customer}
                    </a>
                    <span className="text-gray-400 text-xs truncate">{cs.url}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Footer actions */}
      <div className="pb-8 flex items-center justify-between">
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          ← Back to dashboard
        </Link>
        <DeleteBriefButton briefId={brief.id} />
      </div>
    </div>
  )
}
