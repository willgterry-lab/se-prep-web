<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes -- APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## Conventions

- No em-dashes anywhere -- not in code comments, UI copy, or generated emails. Use a plain hyphen or restructure the sentence.
- UK English throughout: "analyse", "organised", "recognised", "favour", etc.
- No buzzwords: leveraged, spearheaded, synergy, robust, passionate, results-driven, dynamic, seamless, cutting-edge, rockstar, ninja, guru, thought leader.
- All evidence fields (MEDDPICC, risks) must be verbatim quotes from the source text. Never fabricate or paraphrase.
- No invented metrics, names, or dates in any AI output.
- Teach as you build: any new concept introduced in a coding session gets a plain-English explanation and a glossary entry in the same turn.

---

## Concept glossary

**Brief** -- a single AI analysis run against a set of input text (discovery notes or call transcript). A brief belongs to a deal. Four types: `prep` (pre-first-call), `post_call` (after the SC's first real call), `pov` (each POV call: setup, check-in, or review), `value_engineering` (each VE workshop call).

**Deal** -- the persistent, top-level entity representing one sales opportunity with one prospect company. Multiple briefs, tasks, POV outputs, and the VE proposal attach to a deal. A deal advances through stages: `prep` -> `post_call` -> `pov` -> `value_engineering`.

**Success criteria** -- up to 5 measurable outcomes agreed with the prospect at POV kickoff. Stored as `deals.success_criteria` (jsonb array of `{ id, description }`). Set once on the first POV brief; immutable after that (enforced in the API route). The cap is deliberate (`extractSuccessCriteria` prompt limits it to 5), but a call can genuinely agree more -- `deals.success_criteria_total_agreed` stores the full count identified before narrowing, and the deal view surfaces a note when it exceeds 5, rather than silently dropping the rest.

**POV assessment** -- per-brief evaluation of each success criterion: status `met | in_progress | not_met`, verbatim evidence quote. Stored as `briefs.pov_assessment` (jsonb). Updated on every POV call.

**Salesroom** -- a public, token-authenticated page at `/s/[token]` shown to the prospect. Displays POV progress (criteria status), pain quotes, relevant case studies, call recordings, open next steps, and (when published) the value proposal. Token is a 32-byte hex string stored in `deals.share_token`; revocable by the SC. **Data-exposure rule: the "Next steps" section only ever queries `deal_tasks` with `owner in ('Prospect', 'Joint')`** (`src/app/s/[token]/page.tsx`) -- SC-owned and unowned tasks (internal admin notes, coaching-style instructions to the SC) must never reach this query. If you add a new field to this page, ask whether it could leak SC-internal content before wiring it up. Publishing the VE proposal (`ve_published = true`) auto-generates a `share_token` if one doesn't already exist (`PATCH /api/deals/[id]/ve-proposal`) -- a proposal must never be "live" with no reachable URL.

**Value Engineering (VE)** -- the third deal stage after POV. Involves a workshop to quantify business value. Produces a `VeProposal` JSON object with 2-3 grounded value drivers, each with transparent maths, a confidence rating, and a case study evidence anchor. Slider inputs (SC assumptions, 0-100%) are separate from evidenced baseline numbers and are clearly labelled throughout the UI and PDF.

**VE baseline inputs** -- quantifiable figures extracted verbatim from the VE workshop transcript: time, headcount, costs, volumes, error rates, KPI baselines. Stored per-brief in `briefs.ve_baseline_inputs`. Aggregated across all VE briefs on the deal for the proposal generator. Each has a `category` (`time | cost | error_rate | kpi | context`) and, for non-`context` categories, a `direction` (`increase | decrease`). `context` baselines (headcount, order/transaction volume) describe scale, not a pain to improve -- they're kept for reference and for cross-baseline maths (e.g. converting an order count into hours via a time-per-order baseline) but are never slider-eligible; the slider UI (`VeBaselineCard`) filters them out. Legacy rows extracted before this field existed have no `category` and are treated as slider-eligible, matching the old behaviour.

**VE slider inputs** -- the SC's percentage improvement assumptions (e.g. "I expect 40% of reporting time to be saved"). SC-set, not evidence. Stored on `deals.ve_slider_inputs`. Displayed with a distinct visual treatment (amber label, improvement bar) to distinguish them from evidenced baselines.

**VE proposal** -- the structured output of `generateValueProposal`: headline, executive summary, value drivers (2-3), investment notes, risks and sensitivities, recommended next step. Stored on `deals.ve_proposal`. Published to salesroom separately via `ve_published` flag. There is no code-side arithmetic here -- `calculated_value` and `calculation` are entirely LLM-authored text. The prompt requires: (1) a driver's headline unit and the unit its calculation actually arrives at must match, converting explicitly through another listed baseline when volume is turned into time; (2) `calculated_value` must be a genuine low/high range derived from a named, evidence-grounded method (conservative-vs-full baseline, SC-assumption-vs-case-study, or a stated alternative) -- never the same number repeated as a fake range; if no genuine range can be constructed, state a single figure instead.

**Confidence levels** -- applied to each VE driver. High: evidenced baseline number AND a matching case study outcome. Medium: one of those two. Low: neither. Never invent ROI percentages; every monetary figure must either be a verbatim baseline or a slider assumption.

**MEDDPICC** -- a sales qualification framework with eight elements (Metrics, Economic Buyer, Decision Criteria, Decision Process, Paper Process, Identify Pain, Champion, Competition). Each element is scored 0-3 per brief. Overall score is /24.

**MEDDPICC delta** -- the per-element and overall score change between two briefs on the same deal, computed programmatically (not by AI). Surfaced on post-call briefs to show what the SC moved during their first call.

**Risk item** -- a distinct concept from a MEDDPICC gap. A gap is "we do not know X yet." A risk is "something about this deal is likely to stall or lose it" (e.g. no economic buyer engaged, single-threaded, entrenched competitor). Risks have severity: low / medium / high, and evidence must be verbatim from the transcript. Each risk also has a `key` (a short, stable slug the AI is instructed to reuse across calls even when rewording a carried-forward risk -- best-effort, not guaranteed) and a `suggested_action` (one concrete SC next step to mitigate it). **Risk score** (`computeRiskScore`, `src/lib/risk-score.ts`) is a weighted count of currently-open risks (high=3/medium=2/low=1) as a percentage of the max possible (5 high-severity risks = 15); higher is riskier. Because risks carry forward across calls unless a later transcript resolves or contradicts them, a risk whose `key` was present in an earlier brief but is absent from the latest one is "managed" -- the deal view diffs `briefs` client-side to show these under "Resolved risks" (no schema change, no extra fetch).

**Deal task** -- a structured next action extracted from a call transcript and written to `deal_tasks`. Has an owner (`SC` | `Prospect` | `Joint` | null), optional `reminder_at` timestamp, and status (open / done). Tasks are surfaced in the deal view with overdue badges when `reminder_at` is in the past. `suggested_done_evidence` (text, nullable) is set by `detectCompletedTasks` when a later call's transcript indicates an open task is already done -- surfaced to the SC as a "Confirm done" / "Not yet" prompt in the Actions tab, never auto-completed.

**Prep email** -- the SC intro email generated at the prep-brief stage. The SC has NOT yet spoken to the prospect; this email introduces the SC before the first call.

**Post-call email** -- the follow-up email generated at the post-call stage. The SC HAS spoken to the prospect; this email references what was discussed and confirms next steps.

**Call date** -- `briefs.call_date` (date, nullable), distinct from `created_at` (when the brief was logged into the app, which can be well after the call itself). SC-set manually on the post-call/POV/VE forms, or best-effort extracted from the transcript itself (`extractCallDate`) when left blank; never guessed from context. Falls back to `created_at` for display when null (e.g. prep briefs, which have no call date concept -- prep happens before any call).

---

## Current build state

Schema version: v8. Run the full `supabase/schema.sql` in the Supabase SQL editor on a fresh install; run each "Migration vN" block in order on an existing install. v5 added `deal_stakeholders`; v6 added `deal_tasks.suggested_done_evidence`; v7 added `deals.success_criteria_total_agreed`; v8 added `briefs.call_date`.

All three deal stages are built: prep -> post_call -> pov -> value_engineering.

### Tables
- `product_contexts` -- one per user, stores crawled product data
- `deals` -- one per prospect/opportunity; columns: id, user_id, prospect_name, prospect_company, stage, success_criteria (jsonb), success_criteria_total_agreed (integer, nullable), share_token (text unique), ve_proposal (jsonb), ve_slider_inputs (jsonb), ve_published (boolean default false), created_at, updated_at
- `briefs` -- one per analysis run; columns: id, user_id, deal_id, stage, prospect_name, prospect_company, discovery_notes, meddpicc (jsonb), matched_case_studies (jsonb), follow_up_email, delta (jsonb), risks (jsonb -- items may include `key`/`suggested_action`), pov_assessment (jsonb), recording_url (text), ve_baseline_inputs (jsonb default '[]' -- items may include `category`/`direction`), call_date (date, nullable), created_at, updated_at
- `deal_tasks` -- one per extracted next action; columns: id, deal_id, description, status, source, owner ('SC' | 'Prospect' | 'Joint' | null), reminder_at, completed_at, suggested_done_evidence (text, nullable), created_at
- `deal_stakeholders` -- prospect-side contacts mentioned across a deal's calls; columns: id, deal_id, name, role, source ('ai' | 'manual'), first_mentioned_brief_id, created_at, updated_at. Case-insensitive unique index on (deal_id, lower(name)); `upsertStakeholders` also merges a bare first-name extraction into an existing fuller name when it unambiguously matches exactly one stakeholder's first name.

### Key routes
- `POST /api/analyze` -- prep brief: finds/creates a deal, runs scoreMeddpicc + matchCaseStudies + generateQuestions + draftPrepEmail + extractStakeholders, saves brief, streams NDJSON
- `POST /api/deals/[id]/post-call` -- post-call analysis: scoreMeddpicc + computeDelta + identifyRisks + updateQuestions + draftPostCallEmail + generateNextActions + extractStakeholders + detectCompletedTasks + (call_date or extractCallDate), saves brief + deal_tasks, advances deal stage
- `POST /api/deals/[id]/pov` -- single POV call analysis: saves success_criteria (+ success_criteria_total_agreed) if first POV, scoreMeddpicc + computeDelta + assessPovCriteria + identifyRisks + updateQuestions + draftPovCallEmail + generateNextActions + detectCompletedTasks + (call_date or extractCallDate), saves brief + deal_tasks, advances deal stage. The actual work is `runSinglePovAnalysis` (`src/lib/pov-analysis.ts`), self-contained (fetches its own deal/criteria/prior-brief/open-tasks state) so it's also reusable in a loop -- don't duplicate this logic elsewhere.
- `POST /api/deals/[id]/pov/classify` -- given several POV transcripts uploaded together, returns the detected chronological order + setup/checkin/review label + reasoning per one (`classifyPovCallSequence`). Doesn't save anything.
- `POST /api/deals/[id]/pov/batch` -- runs `runSinglePovAnalysis` sequentially (not parallel -- each call depends on the previous one's brief already being saved) for a confirmed, ordered list of calls; streams NDJSON tagged with `call_index`. `maxDuration = 300` (vs 60 for single-call routes).
- `POST /api/deals/[id]/value-engineering` -- VE workshop analysis (streaming): scoreMeddpicc + matchCaseStudies + extractVeBaseline (parallel), then computeDelta + identifyRisks + updateQuestions + draftVeCallEmail + generateNextActions + detectCompletedTasks + (call_date or extractCallDate); saves brief with ve_baseline_inputs; advances deal stage
- `GET /api/deals/[id]/ve-questions` -- generates and returns VE workshop planning questions (not persisted); aggregates MEDDPICC evidence from all briefs
- `POST /api/deals/[id]/ve-proposal` -- generates value proposal from aggregated baseline inputs + SC slider assumptions (context-category baselines shown as reference only, no assumption %); saves to deals.ve_proposal + deals.ve_slider_inputs; non-streaming
- `PATCH /api/deals/[id]/ve-proposal` -- publish or unpublish the saved proposal to salesroom ({ action: "publish" | "unpublish" }); sets deals.ve_published; auto-generates share_token on publish if one doesn't exist yet, returns it
- `GET /api/deals/[id]/ve-proposal.pdf` -- renders saved value proposal as PDF using @react-pdf/renderer; returns attachment
- `PATCH /api/deals/[id]/share` -- generate or revoke share_token on a deal ({ action: "generate" | "revoke" })
- `PATCH /api/deals/[id]/tasks/[taskId]` -- toggle task status (open/done, clears suggested_done_evidence), update reminder_at, or dismiss a completion suggestion ({ dismiss_suggestion: true })
- `GET /api/deals/[id]` -- fetch deal with briefs and tasks
- `GET /api/deals/[id]/stakeholders`, `PATCH`/`DELETE /api/deals/[id]/stakeholders/[stakeholderId]` -- list/edit/remove stakeholders

### Key pages
- `/dashboard` -- deals only (Product config and account deletion live at `/settings`); each deal card shows a MEDDPICC score badge and a risk score badge
- `/settings` -- product context card (crawl/refresh) and danger zone (delete account); linked from the header email
- `/brief/new` -- prep brief form; shows review step before navigating to deal
- `/deal/[id]` -- deal view: header MEDDPICC + risk score, lifecycle progress, stakeholders (with inline edit), score history table (every brief, all stages, risk score + MEDDPICC rows), MEDDPICC element breakdown, risks (+ suggested actions, + resolved risks), POV progress, salesroom share, VE baseline+sliders, VE proposal, VE publish section, task list (+ completion suggestions), briefs timeline. Once in POV stage, "Log POV call" and "Log VE workshop" both show as top-level CTAs, not hidden in a tab.
- `/deal/[id]/post-call/new`, `/deal/[id]/pov/new`, `/deal/[id]/value-engineering/new` -- call-logging forms, each with an optional call date field (in addition to transcript, and for POV/VE a recording URL). `/deal/[id]/pov/new` also supports uploading several calls at once ("+ Add another call") -- with 2+ calls, submit goes through a classify -> confirm order -> batch-stream flow instead of the single-call submit.
- `/s/[token]` -- public prospect salesroom (no auth required; token is the credential); shows value proposal section when ve_published = true; "Next steps" only shows Prospect/Joint-owned open tasks, never SC-owned or unowned

### Shared analysis lib
All AI functions live in `src/lib/analysis.ts`: `scoreMeddpicc`, `matchCaseStudies`, `generateQuestions`, `updateQuestions`, `identifyRisks`, `generateNextActions`, `detectCompletedTasks`, `assessPovCriteria`, `extractSuccessCriteria` (returns `{ total_agreed, criteria }`), `extractCallDate`, `classifyPovCallSequence` (orders + labels several POV transcripts uploaded together), `draftPrepEmail`, `draftPostCallEmail`, `draftPovCallEmail`, `draftVeCallEmail`, `generateVeWorkshopQuestions`, `extractVeBaseline`, `generateValueProposal`, `computeDelta` (pure). `computeRiskScore` (pure) lives in `src/lib/risk-score.ts`, not here, so client components can import it without pulling in the Anthropic SDK. Shared MEDDPICC/risk display primitives (`ScorePip`, `RiskCard`, etc.) live in `src/components/score-display.tsx`, imported by both `deal-view.tsx` and `brief-view.tsx` -- don't recreate copies in either file.

### PDF generation
`@react-pdf/renderer` v4. Listed in `next.config.ts` serverExternalPackages to prevent Webpack bundling. PDF route is `.tsx` (not `.ts`) to support JSX. Bar charts drawn as SVG Rect elements (no charting library).

### Middleware
`src/lib/supabase/middleware.ts` redirects unauthenticated users to `/login` for all paths except: `/login`, `/api/*`, `/auth/*`, `/`, `/privacy`, `/s/*` (salesroom).

### Reminders
In-app only. Tasks with `reminder_at < now()` render an overdue badge in the deal view. No email infrastructure wired up yet.
