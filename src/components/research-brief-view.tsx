"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
// view (section-by-section as each completes, stacked cards) and the deal
// page (ResearchBriefFullView, tabbed with an exec summary). Each section
// component is still self-contained (own Card, own citation list) so it works
// standalone in the streaming context, not just inside the tabbed full view.

// ─── Citation tracker: footnote-style references instead of inline quotes ────
// Per spec: a small numbered marker sits next to the claim, linking down to a
// Sources list at the bottom of the same section/tab, rather than the full
// quote + "Web" pill appearing immediately under every statement. Dedupes by
// URL (falling back to origin+text for notes evidence, which has no URL) so
// the same source cited twice in one section keeps one footnote number.

class CitationTracker {
  items: EvidenceItem[] = []
  private seen = new Map<string, number>()

  mark(item: EvidenceItem): number {
    const key = item.url ?? `${item.origin}:${item.text}`
    const existing = this.seen.get(key)
    if (existing) return existing
    this.items.push(item)
    const n = this.items.length
    this.seen.set(key, n)
    return n
  }
}

function CiteMark({ n, sectionId }: { n: number; sectionId: string }) {
  return (
    <sup className="ml-0.5">
      <a
        href={`#src-${sectionId}-${n}`}
        className="text-[10px] font-medium text-blue-600 hover:underline"
      >
        [{n}]
      </a>
    </sup>
  )
}

function CiteMarks({ items, tracker, sectionId }: { items: EvidenceItem[]; tracker: CitationTracker; sectionId: string }) {
  if (!items.length) return null
  return (
    <>
      {items.map((item, i) => (
        <CiteMark key={i} n={tracker.mark(item)} sectionId={sectionId} />
      ))}
    </>
  )
}

function SourcesList({ sectionId, tracker }: { sectionId: string; tracker: CitationTracker }) {
  if (!tracker.items.length) return null
  return (
    <div className="pt-3 mt-3 border-t space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Sources</p>
      {tracker.items.map((item, i) => {
        const n = i + 1
        return (
          <div key={n} id={`src-${sectionId}-${n}`} className="flex items-start gap-1.5 text-xs scroll-mt-4">
            <span className="text-gray-400 shrink-0">[{n}]</span>
            <div className="min-w-0 space-y-0.5">
              <EvidenceBadge item={item} />
              <p className="text-gray-600 leading-snug">&ldquo;{item.text}&rdquo;</p>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-600 hover:underline break-all block"
                >
                  {item.url}
                </a>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Value driver hypotheses (section 4, the core section) ───────────────────

function HypothesisCard({ hypothesis, tracker, sectionId }: { hypothesis: ValueDriverHypothesis; tracker: CitationTracker; sectionId: string }) {
  // Notes evidence cited first -- first-party, generally stronger, per spec.
  const sortedEvidence = [...hypothesis.evidence].sort((a, b) =>
    a.origin === b.origin ? 0 : a.origin === "notes" ? -1 : 1
  )

  return (
    <div className="rounded-lg border p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-sm font-semibold text-gray-900 leading-snug">
          {hypothesis.driver_statement}
          <CiteMarks items={sortedEvidence} tracker={tracker} sectionId={sectionId} />
        </p>
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

const VALUE_DRIVERS_SECTION_ID = "value_drivers"

export function ValueDriverSectionView({ section }: { section: ValueDriverSection }) {
  const tracker = new CitationTracker()
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
          <HypothesisCard key={i} hypothesis={h} tracker={tracker} sectionId={VALUE_DRIVERS_SECTION_ID} />
        ))}
        <SourcesList sectionId={VALUE_DRIVERS_SECTION_ID} tracker={tracker} />
      </CardContent>
    </Card>
  )
}

// ─── Shared "sourced field" row -- a value plus footnoted evidence ───────────

function SourcedFieldRow({
  label,
  field,
  tracker,
  sectionId,
}: {
  label: string
  field: SourcedField<string | string[]>
  tracker: CitationTracker
  sectionId: string
}) {
  const hasValue = field.value !== null && (!Array.isArray(field.value) || field.value.length > 0)
  return (
    <div className="py-2.5 first:pt-0 last:pb-0 border-t first:border-t-0 space-y-1">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      {hasValue ? (
        <p className="text-sm text-gray-800">
          {Array.isArray(field.value) ? field.value.join(", ") : field.value}
          <CiteMarks items={field.evidence} tracker={tracker} sectionId={sectionId} />
        </p>
      ) : (
        <p className="text-sm text-gray-400 italic">Not found</p>
      )}
    </div>
  )
}

// ─── Section 1: Company snapshot ──────────────────────────────────────────────

const SNAPSHOT_SECTION_ID = "snapshot"

export function CompanySnapshotSectionView({ section }: { section: CompanySnapshotSection }) {
  const tracker = new CitationTracker()
  return (
    <Card>
      <CardHeader><CardTitle>Company snapshot</CardTitle></CardHeader>
      <CardContent>
        <SourcedFieldRow label="What they do" field={section.description} tracker={tracker} sectionId={SNAPSHOT_SECTION_ID} />
        <SourcedFieldRow label="Headquarters" field={section.hq} tracker={tracker} sectionId={SNAPSHOT_SECTION_ID} />
        <SourcedFieldRow label="Geographies" field={section.geographies} tracker={tracker} sectionId={SNAPSHOT_SECTION_ID} />
        <SourcedFieldRow label="Size" field={section.size} tracker={tracker} sectionId={SNAPSHOT_SECTION_ID} />
        <SourcedFieldRow label="Ownership" field={section.ownership_type} tracker={tracker} sectionId={SNAPSHOT_SECTION_ID} />
        <SourcedFieldRow label="Business lines" field={section.business_lines} tracker={tracker} sectionId={SNAPSHOT_SECTION_ID} />
        <SourcedFieldRow label="Customer segments" field={section.customer_segments} tracker={tracker} sectionId={SNAPSHOT_SECTION_ID} />
        <SourcedFieldRow label="Direct competitors" field={section.competitors} tracker={tracker} sectionId={SNAPSHOT_SECTION_ID} />
        <SourcesList sectionId={SNAPSHOT_SECTION_ID} tracker={tracker} />
      </CardContent>
    </Card>
  )
}

// ─── Section 2: Strategic context ─────────────────────────────────────────────

const STRATEGIC_CONTEXT_SECTION_ID = "strategic_context"

const STRATEGIC_TAG_LABELS: Record<StrategicContextTag, string> = {
  initiative: "Initiative",
  leadership_change: "Leadership change",
  hiring_signal: "Hiring signal",
  expansion_move: "Expansion move",
  risk: "Risk",
}

export function StrategicContextSectionView({ section }: { section: StrategicContextSection }) {
  const tracker = new CitationTracker()
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
            <p className="text-sm text-gray-800">
              {item.text}
              <CiteMarks items={[item.evidence]} tracker={tracker} sectionId={STRATEGIC_CONTEXT_SECTION_ID} />
            </p>
          </div>
        ))}
        <SourcesList sectionId={STRATEGIC_CONTEXT_SECTION_ID} tracker={tracker} />
      </CardContent>
    </Card>
  )
}

// ─── Section 3: Operating model ───────────────────────────────────────────────

const OPERATING_MODEL_SECTION_ID = "operating_model"

export function OperatingModelSectionView({ section }: { section: OperatingModelSection }) {
  const tracker = new CitationTracker()
  return (
    <Card>
      <CardHeader><CardTitle>Operating model</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <SourcedFieldRow label="Order process" field={section.order_process} tracker={tracker} sectionId={OPERATING_MODEL_SECTION_ID} />
        <SourcedFieldRow label="Catalogue and pricing complexity" field={section.catalogue_pricing_complexity} tracker={tracker} sectionId={OPERATING_MODEL_SECTION_ID} />
        {section.tech_stack.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500">Tech stack hints</p>
            {section.tech_stack.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm text-gray-800">
                  {t.item}
                  <CiteMarks items={[t.evidence]} tracker={tracker} sectionId={OPERATING_MODEL_SECTION_ID} />
                </span>
                <ConfidenceBadge confidence={t.confidence} />
              </div>
            ))}
          </div>
        )}
        {section.manual_process_evidence.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500">
              Evidence of manual process
              <CiteMarks items={section.manual_process_evidence} tracker={tracker} sectionId={OPERATING_MODEL_SECTION_ID} />
            </p>
          </div>
        )}
        <SourcesList sectionId={OPERATING_MODEL_SECTION_ID} tracker={tracker} />
      </CardContent>
    </Card>
  )
}

// ─── Section 5: Stakeholder map ───────────────────────────────────────────────

const STAKEHOLDERS_SECTION_ID = "stakeholders"

export function StakeholderMapSectionView({ section }: { section: StakeholderMapSection }) {
  const tracker = new CitationTracker()
  return (
    <Card>
      <CardHeader><CardTitle>Stakeholder map (preliminary)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {section.entries.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-900">
                {s.name ?? "Unnamed"}
                {s.evidence && <CiteMarks items={[s.evidence]} tracker={tracker} sectionId={STAKEHOLDERS_SECTION_ID} />}
              </span>
              <span className="text-xs text-gray-500">{s.role}</span>
              {s.is_placeholder && <Badge variant="outline" className="text-xs">Persona placeholder</Badge>}
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
        <SourcesList sectionId={STAKEHOLDERS_SECTION_ID} tracker={tracker} />
      </CardContent>
    </Card>
  )
}

// ─── Section 6: Buying signals and timing ─────────────────────────────────────

const BUYING_SIGNALS_SECTION_ID = "buying_signals"

export function BuyingSignalsSectionView({ section }: { section: BuyingSignalsSection }) {
  const tracker = new CitationTracker()
  return (
    <Card>
      <CardHeader><CardTitle>Buying signals and timing</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {section.none_found || !section.signals.length ? (
          <p className="text-sm text-gray-400 italic">No buying signals found</p>
        ) : (
          <>
            {section.signals.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <ConfidenceBadge confidence={s.strength} />
                <span className="text-sm text-gray-800">
                  {s.text}
                  <CiteMarks items={[s.evidence]} tracker={tracker} sectionId={BUYING_SIGNALS_SECTION_ID} />
                </span>
              </div>
            ))}
            <SourcesList sectionId={BUYING_SIGNALS_SECTION_ID} tracker={tracker} />
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Section 7: Risks and landmines ───────────────────────────────────────────

const RISKS_SECTION_ID = "risks"

const RISK_PATTERN_LABELS: Record<RiskLandminePattern, string> = {
  build_vs_buy: "Build vs buy propensity",
  competitor_in_account: "Competitor already in the account",
  no_compelling_event: "No compelling event found",
}

export function RisksSectionView({ section }: { section: RisksSection }) {
  const tracker = new CitationTracker()
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
            <p className="text-sm text-gray-800">
              {r.text}
              <CiteMarks items={r.evidence} tracker={tracker} sectionId={RISKS_SECTION_ID} />
            </p>
            {r.cost_of_doing_nothing_seed && (
              <p className="text-xs bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 text-amber-800">
                <span className="font-medium">Cost-of-doing-nothing seed (candidate for VE): </span>
                {r.cost_of_doing_nothing_seed}
              </p>
            )}
          </div>
        ))}
        <SourcesList sectionId={RISKS_SECTION_ID} tracker={tracker} />
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

// ─── Executive summary tab ─────────────────────────────────────────────────────
// A high-level read on each of the nine sections, derived client-side from the
// already-generated structured data -- no extra AI call, no extra latency.

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2.5 first:pt-0 last:pb-0 border-t first:border-t-0">
      <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  )
}

function ExecSummaryView({ brief }: { brief: ResearchBrief }) {
  const s = brief.sections
  const topStrategicItem = s.strategic_context.items[0]
  const topHypothesis = s.value_drivers.hypotheses[0]
  const topSignal = s.buying_signals.signals[0]
  const riskLabels = s.risks.risks.map((r) => RISK_PATTERN_LABELS[r.pattern])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Executive summary</CardTitle>
        <CardDescription className="mt-1">High-level read across all nine sections -- see each tab for full evidence.</CardDescription>
      </CardHeader>
      <CardContent>
        <SummaryRow label="1. Company snapshot">
          {s.snapshot.description.value ?? "Not found"}
          {s.snapshot.size.value && <span className="text-gray-500"> · {s.snapshot.size.value}</span>}
          {s.snapshot.ownership_type.value && <span className="text-gray-500"> · {s.snapshot.ownership_type.value}</span>}
        </SummaryRow>
        <SummaryRow label="2. Strategic context">
          {topStrategicItem
            ? `${topStrategicItem.text}${s.strategic_context.items.length > 1 ? ` (+${s.strategic_context.items.length - 1} more)` : ""}`
            : "Not found"}
        </SummaryRow>
        <SummaryRow label="3. Operating model">
          {s.operating_model.order_process.value ?? "Not found"}
        </SummaryRow>
        <SummaryRow label="4. Value driver hypotheses">
          <p className="font-medium">{s.value_drivers.most_visible_pain_headline}</p>
          {topHypothesis && (
            <p className="text-xs text-gray-500 mt-0.5">
              {s.value_drivers.hypotheses.length} hypothesis{s.value_drivers.hypotheses.length === 1 ? "" : "es"}, top confidence: {topHypothesis.confidence}
            </p>
          )}
        </SummaryRow>
        <SummaryRow label="5. Stakeholder map">
          {s.stakeholders.likely_economic_buyer ?? "Economic buyer not found"}
          {s.stakeholders.likely_champion_profile && <span className="text-gray-500"> · Champion: {s.stakeholders.likely_champion_profile}</span>}
        </SummaryRow>
        <SummaryRow label="6. Buying signals">
          {s.buying_signals.none_found || !topSignal
            ? "None found"
            : `${topSignal.text} (${s.buying_signals.signals.length} signal${s.buying_signals.signals.length === 1 ? "" : "s"} total)`}
        </SummaryRow>
        <SummaryRow label="7. Risks and landmines">
          {riskLabels.length ? riskLabels.join(", ") : "None identified"}
        </SummaryRow>
        <SummaryRow label="8. Discovery questions">
          {s.discovery_questions.questions.length} question{s.discovery_questions.questions.length === 1 ? "" : "s"} generated from gaps
        </SummaryRow>
        <SummaryRow label="9. Source log">
          {brief.source_log.length} source{brief.source_log.length === 1 ? "" : "s"} gathered
        </SummaryRow>
      </CardContent>
    </Card>
  )
}

// ─── Full brief: exec summary + one tab per section ────────────────────────────

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

      <Tabs defaultValue="summary">
        <TabsList variant="line" className="w-full flex-nowrap justify-start overflow-x-auto">
          <TabsTrigger value="summary" className="shrink-0">Summary</TabsTrigger>
          <TabsTrigger value="snapshot" className="shrink-0">Snapshot</TabsTrigger>
          <TabsTrigger value="strategic_context" className="shrink-0">Strategy</TabsTrigger>
          <TabsTrigger value="operating_model" className="shrink-0">Operating model</TabsTrigger>
          <TabsTrigger value="value_drivers" className="shrink-0">Value drivers</TabsTrigger>
          <TabsTrigger value="stakeholders" className="shrink-0">Stakeholders</TabsTrigger>
          <TabsTrigger value="buying_signals" className="shrink-0">Buying signals</TabsTrigger>
          <TabsTrigger value="risks" className="shrink-0">Risks</TabsTrigger>
          <TabsTrigger value="discovery_questions" className="shrink-0">Questions</TabsTrigger>
          <TabsTrigger value="source_log" className="shrink-0">Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-3">
          <ExecSummaryView brief={brief} />
        </TabsContent>
        <TabsContent value="snapshot" className="mt-3">
          <CompanySnapshotSectionView section={brief.sections.snapshot} />
        </TabsContent>
        <TabsContent value="strategic_context" className="mt-3">
          <StrategicContextSectionView section={brief.sections.strategic_context} />
        </TabsContent>
        <TabsContent value="operating_model" className="mt-3">
          <OperatingModelSectionView section={brief.sections.operating_model} />
        </TabsContent>
        <TabsContent value="value_drivers" className="mt-3">
          <ValueDriverSectionView section={brief.sections.value_drivers} />
        </TabsContent>
        <TabsContent value="stakeholders" className="mt-3">
          <StakeholderMapSectionView section={brief.sections.stakeholders} />
        </TabsContent>
        <TabsContent value="buying_signals" className="mt-3">
          <BuyingSignalsSectionView section={brief.sections.buying_signals} />
        </TabsContent>
        <TabsContent value="risks" className="mt-3">
          <RisksSectionView section={brief.sections.risks} />
        </TabsContent>
        <TabsContent value="discovery_questions" className="mt-3">
          <DiscoveryQuestionsSectionView section={brief.sections.discovery_questions} />
        </TabsContent>
        <TabsContent value="source_log" className="mt-3">
          <SourceLogSectionView sourceLog={brief.source_log} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
