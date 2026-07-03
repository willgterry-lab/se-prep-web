# Session log

## Current state (2026-07-02)

### Completed this session
- **Value Engineering stage built end-to-end** -- schema v4 migration, full analysis pipeline, PDF export, and deal view + salesroom updates all shipped.

**Schema (Migration v4):**
- `deals.ve_proposal` jsonb -- the saved VeProposal (null until generated); published to salesroom via `ve_published` flag
- `deals.ve_slider_inputs` jsonb -- SC's percentage improvement assumptions at time of last proposal generation
- `deals.ve_published` boolean default false -- separate flag decoupling "proposal exists" from "prospect can see it"
- `briefs.ve_baseline_inputs` jsonb default '[]' -- quantifiable inputs extracted from the VE workshop transcript per-brief; aggregated across all VE briefs for proposal generation

**New AI functions (src/lib/analysis.ts):**
- `generateVeWorkshopQuestions(metrics_evidence, pain_evidence, product)` -- 8-12 targeted questions to surface VE maths inputs; generated fresh (not persisted); targets gaps, does not re-ask what is already evidenced
- `extractVeBaseline(transcript, product, prospect_company)` -- extracts VeBaselineInput[] (key, label, raw_value, numeric_value, unit, currency?, evidence) with verbatim evidence; stored on brief
- `generateValueProposal({aggregated_baselines, ve_slider_inputs, matched_case_studies, aggregated_pain_evidence, product, prospect_company})` -- selects 2-3 drivers, shows transparent maths per driver, confidence ratings (high/medium/low), investment notes from pricing_tiers, risks, next step; no hard-coded drivers or benchmarks
- `draftVeCallEmail({..., baseline_inputs})` -- VE workshop follow-up email; references specific baseline figures captured; confirms what SC will build and what is needed from prospect side

**New API routes:**
- `POST /api/deals/[id]/value-engineering` -- streaming analysis (same NDJSON pattern): scoreMeddpicc + matchCaseStudies + extractVeBaseline in parallel (phase 1), then computeDelta + identifyRisks + updateQuestions + draftVeCallEmail + generateNextActions (phase 2); saves brief with ve_baseline_inputs; advances deal stage
- `GET /api/deals/[id]/ve-questions` -- workshop planning questions (generated fresh, not saved); aggregates MEDDPICC metrics + pain evidence from all briefs
- `POST /api/deals/[id]/ve-proposal` -- non-streaming; generates VeProposal from aggregated baselines + SC sliders; saves to deals.ve_proposal + deals.ve_slider_inputs
- `PATCH /api/deals/[id]/ve-proposal` -- publish/unpublish proposal to salesroom ({ action: "publish" | "unpublish" })
- `GET /api/deals/[id]/ve-proposal.pdf` -- renders saved proposal as PDF via @react-pdf/renderer; auth-gated; returns attachment

**New page:**
- `/deal/[id]/value-engineering/new` -- VE workshop form: planning questions section (generated on load from ve-questions route), optional recording URL, transcript upload; baseline inputs extracted automatically on submission

**deal-view.tsx updates:**
- VeBaselineCard: shows aggregated baseline inputs with sliders (5-90% range, default 40%, accent-[#1ED760]), live preview of improvement estimate, amber disclaimer banner making clear sliders are SC assumptions
- VeProposalCard: shows saved proposal (headline, executive summary, value drivers with confidence badges, improvement bars, investment notes, risks, next step)
- VePublishSection: publish/unpublish to salesroom + PDF download link
- VE CTA: shown after POV stage when no VE brief exists

**Salesroom updates:**
- Fetches `ve_proposal` and `ve_published` from deals
- Shows VE section (Value Proposal header, value drivers with confidence badges, investment notes, sensitivities, next step, SC-assumption disclaimer) when `ve_published = true`
- PDF download not available from salesroom (SC-only, deliberate)

**PDF:**
- @react-pdf/renderer v4; listed in next.config.ts serverExternalPackages
- Route file is `.tsx` for JSX support; bar charts via SVG Rect elements
- A4 page, Helvetica, green/gray colour scheme matching app
- Footer: "SC improvement assumptions are estimates, not evidenced outcomes"

### Post-ship fixes
- **extractVeBaseline max_tokens**: raised 1000 -> 2000 -> 3000 -> 4096 across three deploys. Root cause: a long transcript was producing 9958+ chars of JSON output, exceeding earlier limits and being truncated mid-object. 4096 provides headroom for verbose transcripts.
- **parseJson rewritten**: replaced the lazy regex `[\s\S]+?` fenced-block extractor with explicit string slicing (`indexOf("\n```")`) so trailing prose Claude adds after the closing fence doesn't break extraction. Option 3 (outermost bracket search) now also caps its search range at the first closing fence marker, preventing trailing `]` or `}` in prose from poisoning `lastIndexOf`. Error message extended to show both START (300 chars) and END (200 chars) to aid future debugging.
- **extractVeBaseline cap**: prompt now instructs Claude to return at most 12 inputs, prioritising the most evidenced figures. Prevents unbounded output length on data-rich transcripts.

### Run in Supabase
Run the "Migration v4" block in supabase/schema.sql before testing the VE flow.

### Design decisions recorded
- Call planning questions: generated fresh (not persisted) so they always reflect latest aggregated MEDDPICC evidence
- PDF download: SC-only; no salesroom download link (once a PDF is in prospect's hands it leaves SC control)
- No Attributary content: all driver selection, evidence, and pricing notes are derived from the actual deal's data (product_contexts, matched_case_studies, meddpicc evidence)
- Sliders default to 40%; range is 5-90% (avoids 0% no-value or 100% implausible claims)
- draftVeCallEmail is called with pov_assessment:[] in the brief insert (no POV content in VE stage)

---

## Prior state (2026-07-01)

### Completed this session
- **POV stage built end-to-end** -- schema v3 migration, full analysis pipeline, salesroom, and deal view updates all shipped in commit d5ca8e3

**Schema (Migration v3):**
- `deals.success_criteria` jsonb default '[]' -- up to 5 criteria set on first POV call, immutable after
- `deals.share_token` text unique -- 64-char hex token for salesroom link; generated on demand, revocable
- `briefs.pov_assessment` jsonb default '[]' -- per-criterion assessment (met/in_progress/not_met + evidence) for each POV brief
- `briefs.recording_url` text -- optional Loom/Chorus/Gong URL attached to a POV brief

**New AI functions (src/lib/analysis.ts):**
- `assessPovCriteria(transcript, success_criteria, product, prospect_company)` -- returns PovAssessment[] with verbatim evidence per criterion
- `draftPovCallEmail({ ..., call_type: "setup" | "checkin" | "review" })` -- call-type-aware email referencing criteria progress

**New API routes:**
- `POST /api/deals/[id]/pov` -- full POV analysis stream (same NDJSON pattern as post-call); sets success_criteria on deal if first POV call; emits pov_assessment, risks, questions, email, actions events; saves brief + deal_tasks; advances deal to "pov"
- `PATCH /api/deals/[id]/share` -- generate or revoke share_token ({ action: "generate" | "revoke" })

**New pages:**
- `/deal/[id]/pov/new` -- POV form: call type picker (setup/check-in/review), criteria builder (shown only if first POV call), optional recording URL, transcript upload/paste
- `/s/[token]` -- public prospect salesroom: criteria status table with evidence, pain quotes, relevant case studies, call recordings, open next steps. No auth required; token is the credential

**deal-view.tsx updates:**
- PovProgressCard: shows each criterion with Met/In Progress/Not Yet badge + evidence quote from latest POV brief
- ShareSection: generates and displays /s/[token] URL with copy + revoke; uses useState + useEffect for window.location.origin
- POV CTA: shown after post-call analysis when no POV brief yet
- Imports: added Button, CardDescription, new types

**Middleware:** `src/lib/supabase/middleware.ts` now allows `/s/*` paths without auth

### Run in Supabase
Run the "Migration v3" block in supabase/schema.sql before testing the POV flow.

### Outstanding
- seagent.co.uk DNS not yet pointed to Vercel
- Privacy page still says "SE Prep" -- needs rename pass
- ~~Apollo case study scraper fix~~ -- confirmed merged to main (8e5b29b) and pushed to origin
- Prompt caching on analyze route (cost optimisation, low priority)
- Value Engineering stage not yet built
- Stakeholder mapping section in salesroom deferred to VE stage (needs new extraction + DB column)

### Key technical notes
- pdf-parse must be pinned to v1.1.1; import via `require("pdf-parse/lib/pdf-parse.js")` to avoid test-file side effect
- Regex in stripMarkdown must not use `s` flag -- Vercel build target below ES2018
- Next.js version is 16.2.6 (Turbopack) -- AGENTS.md has version warning
- Prep email body uses [NEXT_STEPS] marker; case study section inserted between pain paragraph and CTA
- suggested_questions stored inside meddpicc JSONB; answered_questions also inside meddpicc JSONB
- SC name sourced from user.user_metadata.full_name; falls back to "[SC Name]" if not set
- MEDDPICC overall_score stored as 0-24 in DB; displayed as /100 via Math.round(raw/24*100)
- deal_tasks RLS joins through deals table (no user_id column on deal_tasks)
- New routes use { params: Promise<{ id: string }> } raw type (not registered in .next/types/routes.d.ts yet)
- POV route inherits case studies from the most recent brief that has them (no new matchCaseStudies call)
- draftPovCallEmail is called with pov_assessment: [] during the parallel phase (email drafts without assessment; assessment computed in parallel)
