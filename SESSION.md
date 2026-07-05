# Session log

## Current state (2026-07-05, multi-call POV upload)

### Completed this session
Built for an upcoming demo: ability to upload several POV call transcripts at once (e.g. setup +
check-in + final review together) instead of logging each one separately. `npx tsc --noEmit`
clean, `npm run build` passes, `npx eslint src/` shows the same 7 pre-existing problems as
baseline (confirmed via diff), nothing new. No schema migration needed.

**Refactor first**: extracted the single-POV-call analysis logic (previously ~150 lines inline in
`POST /api/deals/[id]/pov`) into `src/lib/pov-analysis.ts` (`runSinglePovAnalysis`), fully
self-contained -- it fetches its own deal/criteria/prior-brief/open-tasks state fresh from the DB
rather than accepting them as params. This is what lets the same function be called once (the
existing single-call route, behaviour unchanged) or in a loop (the new batch route) without
duplicating logic or risking the two drifting apart.

**Auto-detection, not manual tagging**: the user asked for the tool to recognise which call is
which, not just accept a pile of files. New `classifyPovCallSequence` (`src/lib/analysis.ts`)
takes all the transcripts together and returns the correct chronological order plus a
setup/checkin/review label per one, with reasoning grounded in a verbatim quote. Classifying them
side by side is far more reliable than one at a time -- "check-in" and "final review" can look
similar in isolation but the progression across calls usually makes it obvious.

**A confirm step before anything is saved**: whichever call is detected as first triggers
extracting the (immutable) success criteria, so a misclassification there isn't cosmetic -- new
`POST /api/deals/[id]/pov/classify` returns the detected order for the SC to review (reorder with
up/down, relabel via a picker, see the AI's reasoning + a transcript excerpt per call) before
`POST /api/deals/[id]/pov/batch` actually runs the analysis. Both are new routes; the existing
single-call `POST /api/deals/[id]/pov` is untouched apart from now delegating to the shared
function.

**Batch processing is sequential, not parallel**: each POV call's scoring depends on the one
before it being saved already (delta computation, risk carry-forward, criteria continuity), so the
batch route loops through the confirmed order one at a time, streaming NDJSON events tagged with
`call_index` so the client can show per-call progress. Set `maxDuration = 300` (existing routes use
60) since 3 sequential calls' worth of AI work can run long -- worth checking this against the
project's actual Vercel plan limit before the demo.

**UI**: `/deal/[id]/pov/new` now starts with one call slot (identical to the old single-call form)
and a "+ Add another call" link. With exactly one slot, behaviour is byte-for-byte the same as
before (manual call-type picker, direct submit). With two or more, submit goes through
classify -> confirm -> batch-stream instead, with a per-call progress card in the streaming view.

### Outstanding
- **Not click-tested live** -- Chrome extension not connected in this environment. Basic sanity
  check only: routes respond 401 (not 500) to an unauthenticated request, confirming they're wired
  up; the actual classify/confirm/batch flow needs a real run before relying on it in the demo.
- Worth a dry run with the actual Bramwell (or demo) transcripts before the real thing, particularly
  to sanity-check the classification reasoning and that maxDuration=300 is enough headroom.

## Prior state (2026-07-05, live QA fixes)

### Completed this session
Live QA pass against the Bramwell Fine Foods test deal (`6bfe5d15-971d-4068-b9b2-34befb4e909c`)
surfaced 14 issues across the deal view, salesroom, and PDF export. Re-verified `AGENTS.md` against
the actual code first (found real drift -- see below), answered 5 gated design questions before
touching code, fixed 2 immediately (unit-conversion + degenerate ranges, both root-caused to the
same thing: `generateValueProposal` has no code-side arithmetic at all, it's 100% LLM-authored text
with no dimensional-consistency check), then implemented everything else once the user confirmed.
Three new schema migrations (v6, v7, v8) -- **must be run in the Supabase SQL editor before testing
any of this**, otherwise inserts referencing the new columns will fail. `npx tsc --noEmit` clean;
`npm run build` passes; `npx eslint src/` shows the same 7 pre-existing problems (1 error, 6
warnings), confirmed via `git stash` diff, nothing new introduced.

**Doc drift found (corrected in `AGENTS.md`):** `deal_tasks.owner` glossary/schema comment still
said "SC / Prospect / null" -- `"Joint"` was added as a real third value in the 2026-07-04 session
(Phase C) and never backfilled into the docs. This is exactly why item #1 below needed a "what are
the real values" check before writing a filter. The "up to 5" success criteria cap, by contrast,
was NOT drifted -- it's a real, deliberate, currently-enforced prompt constraint (see #7).

**Fixed directly (no gate needed):**
- **Salesroom task leak (critical)**: `/s/[token]` fetched *every* open `deal_task` regardless of
  owner, including SC-internal admin/coaching notes -- one example seen live was an internal
  instruction to the SC about how to caveat a soft number to the prospect. Now filtered to
  `owner in ('Prospect', 'Joint')` only; SC-owned and unowned tasks never reach the query.
- **VE unit-conversion bug**: a driver headlined "~1,170 staff-hours/week freed" but the shown
  maths only ever multiplied order *count* by a percentage, never converting through the
  transcript's own 7-minutes-per-order baseline (1,170 hours would be 2.6x the team's total
  capacity). `generateValueProposal`'s prompt now requires the headline unit and the calculation's
  actual unit to match, and requires an explicit conversion step through another listed baseline
  when volume is turned into time.
- **Degenerate value ranges**: two of three drivers rendered identical low/high bounds (e.g.
  "£760,000 to £760,000"). Root cause: `calculated_value` and `calculation` are pure LLM freeform
  text with zero code-side arithmetic -- the one driver that got a genuine range did so by chance,
  not through any distinct mechanism. Prompt now requires a genuine range via one of three named,
  evidence-grounded methods (conservative-vs-full baseline, SC-assumption-vs-case-study, or a
  stated alternative), and explicitly forbids repeating one number as a fake range -- if no genuine
  range can be built, it must state a single figure instead. Both this and the unit-conversion fix
  only take effect on a *regenerated* proposal; Bramwell's saved one needs "Regenerate value
  proposal" clicked to pick them up.
- **VE slider eligibility**: every extracted baseline (headcount, order volume, average order
  value, time, cost figures) got an identical "40% improvement" slider, including ones where that's
  nonsensical (a 4.8 FTE "improvement" on a 12-person team directly contradicts the deal's explicit
  no-headcount-reduction framing; order volume and average order value both want to go *up*, not
  down). Added `category` (`time | cost | error_rate | kpi | context`) and `direction`
  (`increase | decrease`) to `VeBaselineInput`, populated at extraction time. `context` baselines
  (headcount, volume) are excluded from the slider UI entirely -- shown as read-only reference
  figures instead -- and non-context sliders now label "increase" vs "improvement" correctly.
  `generateValueProposal` also stopped attaching a phantom "SC assumption: 40%" to context
  baselines. Legacy already-extracted baselines (Bramwell's current data) have no `category` and
  are treated as slider-eligible (old behaviour) until the deal gets a fresh VE call.
- **Publish/share_token decoupling**: a VE proposal could show "Live on salesroom" while the POV
  tab's own share section still said "Generate salesroom link" -- published-but-unreachable.
  `PATCH /api/deals/[id]/ve-proposal` now auto-generates a `share_token` on publish if one doesn't
  exist, and the token state was lifted from `ShareSection`'s local state up into `DealView` so both
  it and `VePublishSection` stay in sync without a page reload.
- **Task auto-completion suggestions**: tasks stayed "OVERDUE" even when a later call's transcript
  confirmed they were done (e.g. "send data flow diagram to Dave for sign-off", later confirmed
  complete). New `detectCompletedTasks` runs alongside the other per-call analysis, comparing
  currently-open tasks against the new transcript for explicit confirmation, verbatim evidence
  required. Never auto-completes -- writes `suggested_done_evidence` on the task, which renders as a
  "Confirm done" / "Not yet" prompt in the Actions tab.
- **Stakeholder duplicates**: `upsertStakeholders` only matched on exact case-insensitive full name,
  so "Rachel" (bare first name, from a later call) and "Rachel Osei-Bonsu" became two rows. Now
  merges a bare-first-name extraction into an existing stakeholder when it unambiguously matches
  exactly one existing person's first name (falls back to inserting new if ambiguous). Also fixed a
  latent bug in the original "don't insert the same name twice in one batch" guard -- it used an
  empty string as a sentinel, which is falsy in JS, so it never actually fired.
- **Risk score legend**: header stat now reads "Risk score (higher = riskier)".
- **Stage badge capitalisation**: the Overview tab's Briefs list badge used raw `brief.stage` text
  through generic CSS `capitalize`, which can't know "POV" is an acronym (hence "Pov"). Swapped to
  the same `STAGE_LABELS` map every other badge already used.
- **VE slider number formatting**: raw values like "140000.0 GBP/year" -- added a formatter
  (comma separators, proper currency symbol, no trailing ".0", no literal "GBP" text baked into the
  unit string). Checked the rest of the app for the same pattern; this was the only call site.
- **Placeholder date bug**: NOT a data population bug -- `reminder_at` was correctly `null`.
  It's a display issue: an empty native `<input type="date">` renders the browser's own locale
  placeholder ("dd/mm/yyyy") as if it were content. Fixed by showing a "+ Set date" affordance
  instead of a bare empty input when no date is set.

**Fixed after explicit confirmation:**
- **Success criteria cap (#7)**: confirmed the "2-5" cap is real and intentional (matches
  `AGENTS.md`), not a bug -- Bramwell's call agreeing 7 just happens to be the first to exceed it.
  Kept the cap (didn't unilaterally raise a deliberate constraint) but added
  `deals.success_criteria_total_agreed`, populated by `extractSuccessCriteria` (now returns
  `{ total_agreed, criteria }`), and a note on `PovProgressCard` when the call agreed more than are
  tracked -- visible instead of buried in a note field.
- **Call date (#9)**: added `briefs.call_date` (date, nullable), an optional field on the
  post-call/POV/VE forms (not prep -- prep happens before any call, so "call date" doesn't apply),
  with `extractCallDate` as a best-effort fallback when left blank (never guesses; only returns a
  date the transcript explicitly states). Score history table, Overview briefs list, and the
  standalone brief page header all now show `call_date ?? created_at`.

### Not changed this pass
- **POV check-in "no MEDDPICC change"** and other purely observational notes from the live QA --
  not reproduced in code, not touched speculatively.

### Outstanding
- **Run migrations v6, v7, v8 in the Supabase SQL editor before testing.**
- Live UI click-through still not possible -- Chrome extension not connected in this environment.
  Dev server left running at `localhost:3000`.
- Bramwell's existing saved VE proposal and baseline inputs won't reflect the #2/#3/#4 fixes until
  the SC re-runs "Regenerate value proposal" (proposal fixes) or logs a fresh VE call (baseline
  category/direction tagging -- extraction-time only, not retroactive).
- Uncommitted as of now.

## Prior state (2026-07-05, punch list 2)

### Completed this session
Implemented the second punch list from `~/Downloads/Notes on SE Agent 05_07_26.pdf` (live-test
feedback dated 2026-07-05, on top of the 2026-07-04 batch which was committed and pushed at the
start of this session, `843a4e6`). No schema migration this time -- everything shipped as a
shape change on existing jsonb columns (`risks`) or new UI over existing data. Full
`npm run build` passes; `npx tsc --noEmit` clean; `npx eslint src/` shows the same 7
problems (1 error, 6 warnings) as `git stash` back to the pre-session commit -- confirmed
byte-for-byte via before/after diff, nothing new introduced.

**Phase A -- nav fixes + de-duplication:**
- `brief-view.tsx` footer: "Back to dashboard" -> "Back to deal" (links to `/deal/${brief.deal_id}`,
  falls back to `/dashboard` if `deal_id` is somehow null).
- `brief-view.tsx`'s MEDDPICC breakdown card was missing the numeric `X/3` score next to each
  element's pip (deal-view's equivalent already had it) -- added it back.
- That drift is exactly why this class of bug happens: `ScorePip`, `ChangeChip`, `SeverityBadge`,
  `MEDDPICC_LABELS`, `MEDDPICC_ELEMENTS`, `toDisplayScore`, `riskScoreColor`, and `RiskCard` were
  copy-pasted verbatim between `brief-view.tsx` and `deal-view.tsx`. Extracted all of it into
  `src/components/score-display.tsx`, imported by both. `RiskCard` there now also takes an
  optional `riskScore` prop and renders `suggested_action` (see Phase C).

**Phase B -- score history table + risk score in header:**
- Replaced `DeltaCard` (deal screen's Overview tab -- only ever compared the latest brief to the
  one before it) with a new `ScoreHistoryTable`: one column per brief across the *whole* deal,
  labelled by stage ("Prep", "Post-call", "POV: Setup", "POV: Check-in", "POV: Review", "VE:
  Workshop 1", ...) since `Brief.stage` itself doesn't distinguish POV/VE sub-stages -- labelled by
  ordinal position among same-stage briefs, same convention `PovStageCard` already used. Rows:
  Risk score, Overall, then the 8 MEDDPICC elements, true grid/table alignment throughout.
  `brief-view.tsx` keeps its own simple prev/curr `DeltaCard` (that page only ever has one brief in
  scope, not the deal's full history -- "what changed on this call" is still a legitimate, separate
  view from the deal-wide trend).
- Deal header now shows Risk score next to MEDDPICC score (previously only visible inside the Risks
  tab) -- same big-number treatment, colour-coded the same way.
- Added a click-to-expand "(?)" next to "Risk score" in the history table explaining the actual
  weighting (high=3/medium=2/low=1, ÷ max of 15) and that only *currently open* risks count -- this
  is what answers "why did the risk score move" (e.g. the reported 80->87): a risk resolved by a
  later call pulls the score down, a new/upgraded one pushes it up, and the table now shows every
  stage's number so that's visible in context instead of just two data points.

**Phase C -- risk key, suggested action, managed risks:**
- `RiskItem` type: added optional `key` (short stable slug, e.g. `"single-threaded"`) and
  `suggested_action`. No migration -- `briefs.risks` is jsonb, this is a shape change only; both
  fields are optional so old rows without them still render fine.
- `identifyRisks` prompt now asks for both fields, and the existing "carry a risk forward unless
  contradicted" instruction now also says to reuse the same `key` across calls even if the risk
  text is reworded -- best-effort (same caveat as the cumulative-scoring carry-forward from last
  session), but it's what makes the next item possible without a new DB column.
- New "Resolved risks" card in the Risks tab: diffs `briefs` client-side by risk `key` (falling back
  to the risk text itself for old briefs with no `key`) -- any risk seen in an earlier brief but
  absent from the latest one is shown there with the stage it was last flagged at. No new fetch.
- `RiskCard` now renders `suggested_action` under each risk's evidence quote.

**Phase D -- stakeholder inline edit:**
- `StakeholdersCard` only supported add/remove before. The PATCH route already accepted
  `{ name, role }` and needed no changes -- added inline edit (click a stakeholder row -> two
  inputs + Save/Cancel, same pattern as the existing "add stakeholder" form) so a first-name-only
  AI extraction can be filled in with a surname and job title.

**Phase E -- POV/VE CTAs promoted above the tab:**
- The only stage-progress CTA visible above the tabs used to be VE ("Log VE workshop"); the next
  POV call button ("Log check-in call" / "Log final review") only lived inside `PovStageCard`,
  itself inside the POV tab -- reported as "hidden under the POV tab, bad UX". Extracted the
  label/call-type logic into `nextPovCall()`, added both buttons side by side in a new top-level CTA
  card, and removed the now-redundant button from inside `PovStageCard` (kept as a pure stepper) so
  the same action doesn't live in two places.

**Phase F -- dashboard/settings split:**
- New `/settings` page: Product card + Danger Zone moved here verbatim from the dashboard.
- Header email (`(app)/layout.tsx`) is now a link to `/settings` instead of inert text.
- Dashboard is now deals-only, per "focus should be the currently live deals". Each deal card also
  shows a risk-score badge next to the existing MEDDPICC badge (added `risks` to the dashboard's
  briefs `select(...)`, it previously only fetched `meddpicc`).

### Not changed this pass (deliberate)
- **Choco pricing indicator for VE/ROI**: the user flagged this needs a real rate card and a
  "deal size" field before it can be built without inventing numbers (violates the project's "no
  invented metrics" rule) -- asked the user how to source it via `AskUserQuestion`, they chose to
  defer the whole item rather than pick a stopgap. Needs a follow-up conversation before any code.
- **"No change in MEDDPICC at POV check-in stage"**: read as an observation about one specific test
  deal rather than a reproducible bug (same treatment as the unreproduced streaming complaint from
  the 2026-07-04 session) -- not touched speculatively. The new score history table should make it
  much easier for the user to tell, next live test, whether this is an actual scoring problem or
  just a quiet call.

### Outstanding
- Live UI click-through still needed -- Chrome browser extension was not connected in this
  environment either session running. Dev server left running at `localhost:3000`.
- Everything in this session is uncommitted as of now -- working tree has all changes from both
  this session and needs a commit/push when the user is ready (previous session's work, `843a4e6`,
  is already pushed).
- seagent.co.uk DNS still not pointed to Vercel (carried over).
- Privacy page still says "SE Prep" -- needs rename pass (carried over).
- Choco pricing/deal-size (see above) -- needs a decision from the user on data source before any
  build work.

## Prior state (2026-07-04)

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
