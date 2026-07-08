"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  CompanyChip,
  CompanyOverrideInput,
  CompanyCandidatePicker,
  CompanyNotFound,
} from "@/components/company-resolution"
import {
  CompanySnapshotSectionView,
  StrategicContextSectionView,
  OperatingModelSectionView,
  ValueDriverSectionView,
  StakeholderMapSectionView,
  BuyingSignalsSectionView,
  RisksSectionView,
  DiscoveryQuestionsSectionView,
  SourceLogSectionView,
} from "@/components/research-brief-view"
import type { CompanyResolution, ResolvedCompany, ResearchSections, SourceLogEntry } from "@/types"

// Manual fallback entry point (spec: "Run prospect research" / "Re-run research"
// on the deal page). Same company-resolution and section components as the
// automatic Prep path -- only the trigger and the target (a standalone research
// run, not a full Prep pipeline) differ.

type Phase = "confirm" | "streaming" | "done"

export default function ResearchNewPage() {
  const { id: dealId } = useParams<{ id: string }>()
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>("confirm")
  const [prefill, setPrefill] = useState("")
  const [companyRes, setCompanyRes] = useState<CompanyResolution | null>(null)
  const [resolving, setResolving] = useState(false)
  const [correcting, setCorrecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [sections, setSections] = useState<Partial<ResearchSections>>({})
  const [sourceLog, setSourceLog] = useState<SourceLogEntry[] | null>(null)

  useEffect(() => {
    fetch(`/api/deals/${dealId}`)
      .then((res) => res.json())
      .then((data) => setPrefill(data?.deal?.prospect_company ?? ""))
      .catch(() => {})
  }, [dealId])

  async function resolve(nameOrUrl: string) {
    setResolving(true)
    setError(null)
    try {
      const res = await fetch("/api/resolve-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name_or_url: nameOrUrl }),
      })
      const data: CompanyResolution = await res.json()
      setCompanyRes(data)
      if (data.status === "resolved") setCorrecting(false)
    } catch {
      setCompanyRes({ status: "not_found" })
    } finally {
      setResolving(false)
    }
  }

  function pickCandidate(candidate: ResolvedCompany) {
    setCompanyRes({ status: "resolved", confidence: "high", company: candidate })
    setCorrecting(false)
  }

  async function runResearch() {
    if (!companyRes || companyRes.status !== "resolved" || !companyRes.company) return
    setPhase("streaming")
    setError(null)

    try {
      const res = await fetch(`/api/deals/${dealId}/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: { ...companyRes.company, confidence: companyRes.confidence } }),
      })

      if (!res.ok || !res.body) {
        const text = await res.text()
        throw new Error(text || "Request failed")
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.trim()) continue
          const event = JSON.parse(line)

          if (event.type === "research_snapshot") {
            setSections((s) => ({ ...s, snapshot: event.data }))
          } else if (event.type === "research_strategic_context") {
            setSections((s) => ({ ...s, strategic_context: event.data }))
          } else if (event.type === "research_operating_model") {
            setSections((s) => ({ ...s, operating_model: event.data }))
          } else if (event.type === "research_stakeholders") {
            setSections((s) => ({ ...s, stakeholders: event.data }))
          } else if (event.type === "research_buying_signals") {
            setSections((s) => ({ ...s, buying_signals: event.data }))
          } else if (event.type === "research_value_drivers") {
            setSections((s) => ({ ...s, value_drivers: event.data }))
          } else if (event.type === "research_risks") {
            setSections((s) => ({ ...s, risks: event.data }))
          } else if (event.type === "research_discovery_questions") {
            setSections((s) => ({ ...s, discovery_questions: event.data }))
          } else if (event.type === "research_source_log") {
            setSourceLog(event.data)
          } else if (event.type === "research_done") {
            setPhase("done")
          } else if (event.type === "error") {
            throw new Error(event.message)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
      setPhase("confirm")
    }
  }

  if (phase === "confirm") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Run prospect research</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Confirm or enter the company to research. This runs the same research pipeline as the Prep stage.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-3">
            {companyRes?.status === "resolved" && companyRes.company && !correcting ? (
              <CompanyChip company={companyRes.company} onWrongCompany={() => setCorrecting(true)} />
            ) : companyRes?.status === "ambiguous" ? (
              <CompanyCandidatePicker
                candidates={companyRes.candidates ?? []}
                onPick={pickCandidate}
                onManual={resolve}
                loading={resolving}
              />
            ) : companyRes?.status === "not_found" ? (
              <CompanyNotFound onManual={resolve} loading={resolving} />
            ) : (
              <CompanyOverrideInput
                placeholder="Company name or URL"
                defaultValue={prefill}
                onSubmit={resolve}
                onCancel={correcting ? () => setCorrecting(false) : undefined}
                loading={resolving}
              />
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>

        <Button
          className="w-full"
          size="lg"
          disabled={!companyRes || companyRes.status !== "resolved" || resolving}
          onClick={runResearch}
        >
          Run research
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {companyRes?.status === "resolved" ? companyRes.company?.name : "Researching…"}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {phase === "streaming" ? "Researching prospect company…" : "Research complete."}
          </p>
        </div>
        {phase === "done" && (
          <Button onClick={() => router.push(`/deal/${dealId}`)}>Continue to deal</Button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {sections.snapshot && <CompanySnapshotSectionView section={sections.snapshot} />}
      {sections.strategic_context && <StrategicContextSectionView section={sections.strategic_context} />}
      {sections.operating_model && <OperatingModelSectionView section={sections.operating_model} />}
      {sections.value_drivers && <ValueDriverSectionView section={sections.value_drivers} />}
      {sections.stakeholders && <StakeholderMapSectionView section={sections.stakeholders} />}
      {sections.buying_signals && <BuyingSignalsSectionView section={sections.buying_signals} />}
      {sections.risks && <RisksSectionView section={sections.risks} />}
      {sections.discovery_questions && <DiscoveryQuestionsSectionView section={sections.discovery_questions} />}
      {sourceLog && <SourceLogSectionView sourceLog={sourceLog} />}
    </div>
  )
}
