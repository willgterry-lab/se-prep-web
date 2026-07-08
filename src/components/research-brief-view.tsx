"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EvidenceBadge, ConfidenceBadge, StalenessBadge } from "@/components/score-display"
import type {
  ValueDriverSection,
  ValueDriverHypothesis,
  EvidenceItem,
  ResearchBrief,
  CompanySnapshotSection,
  StrategicContextSection,
  StrategicContextTag,
  OperatingModelSection,
  StakeholderMapSection,
  BuyingSignalsSection,
  RisksSection,
  RiskLandminePattern,
  DiscoveryQuestionsSection,
  SourceLogEntry,
  SourcedField,
} from "@/types"

// Nine-section prospect research renderer. Reused by both the Prep streaming
// view (section-by-section as each completes) and the deal page (full brief).
// Section 4 -- value driver hypotheses -- is the core section and is built out
// first; the remaining eight sections follow the same layout conventions.

function EvidenceQuote({ item }: { item: EvidenceItem }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        <EvidenceBadge item={item} />
      </div>
      <p className="text-xs text-gray-600 leading-snug">&ldquo;{item.text}&rdquo;</p>
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-blue-600 hover:underline break-all"
        >
          {item.url}
        </a>
      )}
    </div>
  )
}

function HypothesisCard({ hypothesis }: { hypothesis: ValueDriverHypothesis }) {
  // Notes evidence first -- first-party, generally stronger, per spec.
  const sortedEvidence = [...hypothesis.evidence].sort((a, b) =>
    a.origin === b.origin ? 0 : a.origin === "notes" ? -1 : 1
  )

  return (
    <div className="rounded-lg border p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-sm font-semibold text-gray-900 leading-snug">{hypothesis.driver_statement}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          <ConfidenceBadge confidence={hypothesis.confidence} />
        </div>
      </div>

      {hypothesis.matched_case_study && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{hypothesis.matched_case_study.industry}</Badge>
          <a
            href={hypothesis.matched_case_study.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium hover:underline"
          >
            Closest match: {hypothesis.matched_case_study.customer}
          </a>
        </div>
      )}

      {/* Evidence */}
      {sortedEvidence.length > 0 && (
        <div className="space-y-2 border-l-2 border-gray-100 pl-3">
          {sortedEvidence.map((item, i) => (
            <EvidenceQuote key={i} item={item} />
          ))}
        </div>
      )}

      {/* Fact vs inference */}
      {(hypothesis.facts.length > 0 || hypothesis.inferences.length > 0) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {hypothesis.facts.length > 0 && (
            <div className="rounded-md border border-gray-200 bg-gray-50/60 p-2.5 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Fact</p>
              <ul className="space-y-1">
                {hypothesis.facts.map((f, i) => (
                  <li key={i} className="text-xs text-gray-700 leading-snug">{f}</li>
                ))}
              </ul>
            </div>
          )}
          {hypothesis.inferences.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50/60 p-2.5 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Inference</p>
              <ul className="space-y-1">
                {hypothesis.inferences.map((f, i) => (
                  <li key={i} className="text-xs text-amber-800 leading-snug">{f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Footer: product mapping + validation question */}
      <div className="space-y-1.5 pt-1 border-t">
        <p className="text-xs text-gray-600">
          <span className="font-medium text-gray-800">Maps to: </span>
          {hypothesis.product_mapping}
        </p>
        <p className="text-xs bg-blue-50 border border-blue-100 rounded-md px-2.5 py-1.5 text-blue-800">
          <span className="font-medium">Validate on call one: </span>
          {hypothesis.validation_question}
        </p>
      </div>
    </div>
  )
}

export function ValueDriverSectionView({ section }: { section: ValueDriverSection }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Value driver hypotheses</CardTitle>
        <CardDescription className="mt-1">
          Hypotheses to validate on call one, not conclusions -- this sharpens discovery, it doesn&apos;t replace it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-gray-50/50 px-3 py-2.5">
          <p className="text-sm font-medium text-gray-900">{section.most_visible_pain_headline}</p>
          <p className="text-xs text-gray-600 mt-0.5">{section.suggested_demo_angle}</p>
        </div>
        {section.hypotheses.map((h, i) => (
          <HypothesisCard key={i} hypothesis={h} />
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Shared "sourced field" row -- a value plus the evidence backing it ──────

function SourcedFieldRow({ label, field }: { label: string; field: SourcedField<string | string[]> }) {
  const hasValue = field.value !== null && (!Array.isArray(field.value) || field.value.length > 0)
  return (
    <div className="py-2.5 first:pt-0 last:pb-0 border-t first:border-t-0 space-y-1">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      {hasValue ? (
        <p className="text-sm text-gray-800">
          {Array.isArray(field.value) ? field.value.join(", ") : field.value}
        </p>
      ) : (
        <p className="text-sm text-gray-400 italic">Not found</p>
      )}
      {field.evidence.length > 0 && (
        <div className="space-y-1.5 pl-2 border-l-2 border-gray-100">
          {field.evidence.map((e, i) => (
            <EvidenceQuote key={i} item={e} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Section 1: Company snapshot ──────────────────────────────────────────────

export function CompanySnapshotSectionView({ section }: { section: CompanySnapshotSection }) {
  return (
    <Card>
      <CardHeader><CardTitle>Company snapshot</CardTitle></CardHeader>
      <CardContent>
        <SourcedFieldRow label="What they do" field={section.description} />
        <SourcedFieldRow label="Headquarters" field={section.hq} />
        <SourcedFieldRow label="Geographies" field={section.geographies} />
        <SourcedFieldRow label="Size" field={section.size} />
        <SourcedFieldRow label="Ownership" field={section.ownership_type} />
        <SourcedFieldRow label="Business lines" field={section.business_lines} />
        <SourcedFieldRow label="Customer segments" field={section.customer_segments} />
        <SourcedFieldRow label="Direct competitors" field={section.competitors} />
      </CardContent>
    </Card>
  )
}

// ─── Section 2: Strategic context ─────────────────────────────────────────────

const STRATEGIC_TAG_LABELS: Record<StrategicContextTag, string> = {
  initiative: "Initiative",
  leadership_change: "Leadership change",
  hiring_signal: "Hiring signal",
  expansion_move: "Expansion move",
  risk: "Risk",
}

export function StrategicContextSectionView({ section }: { section: StrategicContextSection }) {
  if (!section.items.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Strategic context and priorities</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-gray-400 italic">Not found</p></CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardHeader><CardTitle>Strategic context and priorities</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {section.items.map((item, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{STRATEGIC_TAG_LABELS[item.tag]}</Badge>
            </div>
            <p className="text-sm text-gray-800">{item.text}</p>
            <EvidenceQuote item={item.evidence} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Section 3: Operating model ───────────────────────────────────────────────

export function OperatingModelSectionView({ section }: { section: OperatingModelSection }) {
  return (
    <Card>
      <CardHeader><CardTitle>Operating model</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <SourcedFieldRow label="Order process" field={section.order_process} />
        <SourcedFieldRow label="Catalogue and pricing complexity" field={section.catalogue_pricing_complexity} />
        {section.tech_stack.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500">Tech stack hints</p>
            {section.tech_stack.map((t, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-800">{t.item}</span>
                  <ConfidenceBadge confidence={t.confidence} />
                </div>
                <EvidenceQuote item={t.evidence} />
              </div>
            ))}
          </div>
        )}
        {section.manual_process_evidence.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500">Evidence of manual process</p>
            {section.manual_process_evidence.map((e, i) => (
              <EvidenceQuote key={i} item={e} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Section 5: Stakeholder map ───────────────────────────────────────────────

export function StakeholderMapSectionView({ section }: { section: StakeholderMapSection }) {
  return (
    <Card>
      <CardHeader><CardTitle>Stakeholder map (preliminary)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {section.entries.map((s, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900">{s.name ?? "Unnamed"}</span>
                <span className="text-xs text-gray-500">{s.role}</span>
                {s.is_placeholder && <Badge variant="outline" className="text-xs">Persona placeholder</Badge>}
              </div>
              {s.evidence && <EvidenceQuote item={s.evidence} />}
            </div>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 text-xs text-gray-600 pt-2 border-t">
          <p><span className="font-medium text-gray-800">Likely economic buyer: </span>{section.likely_economic_buyer ?? "Not found"}</p>
          <p><span className="font-medium text-gray-800">Likely champion profile: </span>{section.likely_champion_profile ?? "Not found"}</p>
        </div>
        {section.who_is_missing && (
          <p className="text-xs bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 text-amber-800">
            <span className="font-medium">Who is missing: </span>{section.who_is_missing}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Section 6: Buying signals and timing ─────────────────────────────────────

export function BuyingSignalsSectionView({ section }: { section: BuyingSignalsSection }) {
  return (
    <Card>
      <CardHeader><CardTitle>Buying signals and timing</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {section.none_found || !section.signals.length ? (
          <p className="text-sm text-gray-400 italic">No buying signals found</p>
        ) : (
          section.signals.map((s, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-2">
                <ConfidenceBadge confidence={s.strength} />
              </div>
              <p className="text-sm text-gray-800">{s.text}</p>
              <EvidenceQuote item={s.evidence} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

// ─── Section 7: Risks and landmines ───────────────────────────────────────────

const RISK_PATTERN_LABELS: Record<RiskLandminePattern, string> = {
  build_vs_buy: "Build vs buy propensity",
  competitor_in_account: "Competitor already in the account",
  no_compelling_event: "No compelling event found",
}

export function RisksSectionView({ section }: { section: RisksSection }) {
  if (!section.risks.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Risks and landmines</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-gray-400 italic">None identified</p></CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardHeader><CardTitle>Risks and landmines</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {section.risks.map((r, i) => (
          <div key={i} className="space-y-1.5">
            <Badge variant="outline" className="text-xs">{RISK_PATTERN_LABELS[r.pattern]}</Badge>
            <p className="text-sm text-gray-800">{r.text}</p>
            {r.cost_of_doing_nothing_seed && (
              <p className="text-xs bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 text-amber-800">
                <span className="font-medium">Cost-of-doing-nothing seed (candidate for VE): </span>
                {r.cost_of_doing_nothing_seed}
              </p>
            )}
            {r.evidence.length > 0 && (
              <div className="space-y-1.5 pl-2 border-l-2 border-gray-100">
                {r.evidence.map((e, j) => <EvidenceQuote key={j} item={e} />)}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Section 8: Discovery question list ───────────────────────────────────────

export function DiscoveryQuestionsSectionView({ section }: { section: DiscoveryQuestionsSection }) {
  const grouped = new Map<string, typeof section.questions>()
  for (const q of section.questions) {
    const bucket = grouped.get(q.meddpicc_element) ?? []
    bucket.push(q)
    grouped.set(q.meddpicc_element, bucket)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discovery question list</CardTitle>
        <CardDescription className="mt-1">Generated from this brief&apos;s gaps and unknowns.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {[...grouped.entries()].map(([element, questions]) => (
          <div key={element} className="space-y-1.5">
            <Badge variant="outline" className="text-xs capitalize">{element.replace(/_/g, " ")}</Badge>
            <ul className="space-y-1.5">
              {questions.map((q, i) => (
                <li key={i} className="text-sm text-gray-800">
                  {q.question}
                  {q.hypothesis_ref && (
                    <span className="block text-xs text-gray-400 mt-0.5">Validates: {q.hypothesis_ref}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Section 9: Source log ────────────────────────────────────────────────────

export function SourceLogSectionView({ sourceLog }: { sourceLog: SourceLogEntry[] }) {
  const [open, setOpen] = useState(false)
  return (
    <Card>
      <CardHeader>
        <button type="button" onClick={() => setOpen((o) => !o)} className="w-full text-left">
          <div className="flex items-center justify-between">
            <CardTitle>Source log ({sourceLog.length})</CardTitle>
            <span className="text-xs text-gray-400">{open ? "Hide" : "Show"}</span>
          </div>
        </button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-2">
          {sourceLog.map((s, i) => (
            <div key={i} className="flex items-start justify-between gap-3 text-xs border-t first:border-t-0 pt-2 first:pt-0">
              <div className="min-w-0">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                  {s.url}
                </a>
                <p className="text-gray-400 mt-0.5">
                  {s.tier} · fed {s.sections.join(", ")} · retrieved {new Date(s.retrieved_at).toLocaleDateString("en-GB")}
                </p>
              </div>
              <StalenessBadge stale={s.stale} />
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  )
}

// ─── Full brief: all nine sections in order ───────────────────────────────────

export function ResearchBriefFullView({ brief }: { brief: ResearchBrief }) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-gray-50/50 px-3 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{brief.company_name}</span>
            {brief.company_domain && <span className="text-xs text-gray-400">{brief.company_domain}</span>}
            {brief.company_hq && <Badge variant="outline" className="text-xs">{brief.company_hq}</Badge>}
          </div>
          {brief.company_description && <p className="text-xs text-gray-500 mt-0.5">{brief.company_description}</p>}
        </div>
        <p className="text-xs text-gray-400">
          Researched {new Date(brief.created_at).toLocaleDateString("en-GB")}
        </p>
      </div>
      <CompanySnapshotSectionView section={brief.sections.snapshot} />
      <StrategicContextSectionView section={brief.sections.strategic_context} />
      <OperatingModelSectionView section={brief.sections.operating_model} />
      <ValueDriverSectionView section={brief.sections.value_drivers} />
      <StakeholderMapSectionView section={brief.sections.stakeholders} />
      <BuyingSignalsSectionView section={brief.sections.buying_signals} />
      <RisksSectionView section={brief.sections.risks} />
      <DiscoveryQuestionsSectionView section={brief.sections.discovery_questions} />
      <SourceLogSectionView sourceLog={brief.source_log} />
    </div>
  )
}
