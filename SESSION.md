# Session log

## Current state (2026-07-04)

### Completed this session
Implemented the full punch list from `~/Downloads/Notes on SE Agent .pdf` (live-test feedback dated 2026-07-03), across 6 phases. Schema migration v5 added (stakeholders). Full `npm run build` passes; typecheck and lint clean (only pre-existing warnings remain, verified via `git stash` diff before/after).

**Phase A -- bug fixes + cheap wins:**
- Fixed stale risk/delta bug: `deal-view.tsx` was using `briefs.find(b => b.stage === "post_call")` (first match) instead of `latestBrief` for `RiskCard`/`DeltaCard` -- risks and score movement were frozen at the very first post-call brief forever, even once later POV/VE briefs saved fresher data. Backend recomputation was already correct; this was a pure render-side bug.
- Added `stripEmDashes()` in `analysis.ts`, wired into `parseJson` (all AI JSON output) and all four `draft*Email` functions -- code-level enforcement alongside the existing prompt instruction.
- New `DealProgressBar` component (Prep -> Post-call -> POV -> VE) in the deal header, reusing the POV mini-timeline's visual pattern.
- Swapped deal title to company-first (was champion-first) in `deal-view.tsx`, `dashboard/page.tsx`, `brief-view.tsx`.

**Phase B -- cumulative scoring + stakeholders (Migration v5):**
- `scoreMeddpicc`/`identifyRisks` now take optional `priorMeddpicc`/`priorRisks` args (the immediately-prior brief's data, which itself already reflects everything cumulative up to that point -- no need to refetch full history). Prompt rule: carry forward prior evidence unless this transcript actively contradicts it; absence of re-mention is not regression. Wired into all three stage routes + prep.
- New `deal_stakeholders` table (case-insensitive unique index on `deal_id, lower(name)`), `extractStakeholders()` in `analysis.ts`, `upsertStakeholders()` helper in new `src/lib/stakeholders.ts`, called from all four analysis routes. New `/api/deals/[id]/stakeholders` (GET/POST) + `[stakeholderId]` (PATCH/DELETE) routes. New `StakeholdersCard` in deal-view.

**Phase C -- next actions overhaul:**
- `generateNextActions` prompt now allows `owner: "Joint"`. Tasks PATCH route extended to accept `reminder_at`. New `POST /api/deals/[id]/tasks` for manual add.
- `TaskList` reworked: tabs (All/SC/Prospect/Joint) via the `Tabs` primitive, per-stage sub-headers derived from `task.source` prefix, inline "+ Add action" form, editable due date per row (native date input).

**Phase D -- MEDDPICC grid + questions + risk score:**
- `MeddpiccGridCard`: all 8 elements in an aligned CSS grid with click-to-expand evidence/gap. `DeltaCard` also restyled to a true CSS grid for column alignment (was flex-based, matches the user's attached mock now).
- `QuestionsCard`: surfaces `suggested_questions`/`answered_questions` (existed in the data model since day one but was never rendered anywhere).
- `computeRiskScore()` -- **deliberately placed in new `src/lib/risk-score.ts`, NOT `analysis.ts`**, because `analysis.ts` imports the Anthropic SDK client at module scope; importing it from the client-side `deal-view.tsx` would have bundled the SDK (and a `process.env.ANTHROPIC_API_KEY`-keyed constructor call) into the browser. Caught this before it shipped -- worth remembering for any future pure helper that a client component needs from what's currently a server-only file.

**Phase E -- POV override, call-type deep link, salesroom preview:**
- New `PATCH /api/deals/[id]/pov-assessment` to manually override a POV criterion's status + note (the `PovAssessment.notes` field existed in the type since the POV stage was built but was never wired to anything). `PovProgressCard` got inline edit UI.
- `/pov/new` now reads `?call_type=` via `useSearchParams` (verified this doesn't break the build/prerendering); `PovStageCard`'s "Log check-in call"/"Log final review" links now pass it. Explicit query param takes priority over the existing auto-detection from brief count.
- `ShareSection` got a "Preview as prospect" link to `/s/[token]`.

**Phase F -- tabbed deal view:**
- `DealView` restructured: header/progress bar/stakeholders/stage-CTA stay above the fold, then `Tabs` (Overview / Risks / POV / Actions / VE) hold everything else. Kept as one file (didn't split into `deal-view/*.tsx` sub-files as the plan floated -- not worth the import churn risk for a same-session change).

### Verification
- `npx tsc --noEmit` clean throughout.
- `npm run build` succeeds (all routes compile, including the new `?call_type=` search-param usage -- no Suspense boundary issue).
- `npx eslint src/` -- only pre-existing warnings remain (confirmed via `git stash` before/after diff), no new issues introduced.
- Could NOT click through the live authenticated app this session -- Chrome browser extension was not connected in this environment. Dev server was left running at `localhost:3000` for manual testing.

**Migration v5 -- applied and verified (2026-07-04):** user ran it in the Supabase SQL editor. Verified directly against the live DB via REST API (service role key) rather than the UI, since browser access wasn't available:
- `deal_stakeholders` table exists with all expected columns.
- Case-insensitive dedup confirmed: inserting "Rachel Adams" then "rachel adams" for the same deal correctly 409s on `deal_stakeholders_deal_id_lower_name_idx`.
- `updated_at` trigger fires on update (confirmed timestamp changed on a role edit, `created_at` unchanged).
- RLS confirmed: anon key (no user session) gets an empty result for a deal it has no access to, even though the row existed (service-role key could see it).
- `GET /api/deals/[id]/stakeholders` returns 401 (not 500) unauthenticated -- route wiring is correct.
- Test row was inserted against a real deal (Luminary Brands) for these checks, then deleted -- no residue left in the data.

### Outstanding
- Live UI verification still needed (DB-level checks above don't cover the actual click-through): stakeholder auto-extraction from a real transcript, cumulative scoring behaviour across a real multi-call deal (does it actually stop the "score drops for no reason" complaint without becoming falsely monotonic?), tabbed deal view on a deal with data in every stage, task tabs/manual-add/date-edit, POV manual override, call-type deep link, salesroom preview link.
- Original user note "post-call/POV/VE stages don't stream results the same way as prep" was investigated and NOT reproduced in code -- all four stage pages already share an identical NDJSON streaming pattern. Possibly the deployed site was stale (VE commit `00b8cfb` was still unpushed at the time this session started) or the difference was something else entirely. Worth asking the user to re-check live rather than assuming it's fixed.
- seagent.co.uk DNS still not pointed to Vercel (carried over from prior session).
- Privacy page still says "SE Prep" -- needs rename pass (carried over).
- Local commits from this session (Phases A-F) not yet committed/pushed -- working tree still has all changes uncommitted as of end of session. Commit and push when ready to deploy; note origin was already 1 commit behind before this session (VE stage, 00b8cfb).

## Prior state (2026-07-02)

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
