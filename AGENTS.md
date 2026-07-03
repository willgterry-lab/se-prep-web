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

**Success criteria** -- up to 5 measurable outcomes agreed with the prospect at POV kickoff. Stored as `deals.success_criteria` (jsonb array of `{ id, description }`). Set once on the first POV brief; immutable after that (enforced in the API route).

**POV assessment** -- per-brief evaluation of each success criterion: status `met | in_progress | not_met`, verbatim evidence quote. Stored as `briefs.pov_assessment` (jsonb). Updated on every POV call.

**Salesroom** -- a public, token-authenticated page at `/s/[token]` shown to the prospect. Displays POV progress (criteria status), pain quotes, relevant case studies, call recordings, open next steps, and (when published) the value proposal. Token is a 32-byte hex string stored in `deals.share_token`; revocable by the SC.

**Value Engineering (VE)** -- the third deal stage after POV. Involves a workshop to quantify business value. Produces a `VeProposal` JSON object with 2-3 grounded value drivers, each with transparent maths, a confidence rating, and a case study evidence anchor. Slider inputs (SC assumptions, 0-100%) are separate from evidenced baseline numbers and are clearly labelled throughout the UI and PDF.

**VE baseline inputs** -- quantifiable figures extracted verbatim from the VE workshop transcript: time, headcount, costs, volumes, error rates, KPI baselines. Stored per-brief in `briefs.ve_baseline_inputs`. Aggregated across all VE briefs on the deal for the proposal generator.

**VE slider inputs** -- the SC's percentage improvement assumptions (e.g. "I expect 40% of reporting time to be saved"). SC-set, not evidence. Stored on `deals.ve_slider_inputs`. Displayed with a distinct visual treatment (amber label, improvement bar) to distinguish them from evidenced baselines.

**VE proposal** -- the structured output of `generateValueProposal`: headline, executive summary, value drivers (2-3), investment notes, risks and sensitivities, recommended next step. Stored on `deals.ve_proposal`. Published to salesroom separately via `ve_published` flag.

**Confidence levels** -- applied to each VE driver. High: evidenced baseline number AND a matching case study outcome. Medium: one of those two. Low: neither. Never invent ROI percentages; every monetary figure must either be a verbatim baseline or a slider assumption.

**MEDDPICC** -- a sales qualification framework with eight elements (Metrics, Economic Buyer, Decision Criteria, Decision Process, Paper Process, Identify Pain, Champion, Competition). Each element is scored 0-3 per brief. Overall score is /24.

**MEDDPICC delta** -- the per-element and overall score change between two briefs on the same deal, computed programmatically (not by AI). Surfaced on post-call briefs to show what the SC moved during their first call.

**Risk item** -- a distinct concept from a MEDDPICC gap. A gap is "we do not know X yet." A risk is "something about this deal is likely to stall or lose it" (e.g. no economic buyer engaged, single-threaded, entrenched competitor). Risks have severity: low / medium / high, and evidence must be verbatim from the transcript.

**Deal task** -- a structured next action extracted from a call transcript and written to `deal_tasks`. Has an owner (SC / Prospect / null), optional `reminder_at` timestamp, and status (open / done). Tasks are surfaced in the deal view with overdue badges when `reminder_at` is in the past.

**Prep email** -- the SC intro email generated at the prep-brief stage. The SC has NOT yet spoken to the prospect; this email introduces the SC before the first call.

**Post-call email** -- the follow-up email generated at the post-call stage. The SC HAS spoken to the prospect; this email references what was discussed and confirms next steps.

---

## Current build state

Schema version: v4 (VE columns). Run the full `supabase/schema.sql` in the Supabase SQL editor on a fresh install; run the "Migration v4" block on an existing install.

All three deal stages are built: prep -> post_call -> pov -> value_engineering.

### Tables
- `product_contexts` -- one per user, stores crawled product data
- `deals` -- one per prospect/opportunity; columns: id, user_id, prospect_name, prospect_company, stage, success_criteria (jsonb), share_token (text unique), ve_proposal (jsonb), ve_slider_inputs (jsonb), ve_published (boolean default false), created_at, updated_at
- `briefs` -- one per analysis run; columns: id, user_id, deal_id, stage, prospect_name, prospect_company, discovery_notes, meddpicc (jsonb), matched_case_studies (jsonb), follow_up_email, delta (jsonb), risks (jsonb), pov_assessment (jsonb), recording_url (text), ve_baseline_inputs (jsonb default '[]'), created_at, updated_at
- `deal_tasks` -- one per extracted next action; columns: id, deal_id, description, status, source, owner, reminder_at, completed_at, created_at

### Key routes
- `POST /api/analyze` -- prep brief: finds/creates a deal, runs scoreMeddpicc + matchCaseStudies + generateQuestions + draftPrepEmail, saves brief, streams NDJSON
- `POST /api/deals/[id]/post-call` -- post-call analysis: scoreMeddpicc + computeDelta + identifyRisks + updateQuestions + draftPostCallEmail + generateNextActions, saves brief + deal_tasks, advances deal stage
- `POST /api/deals/[id]/pov` -- POV analysis: saves success_criteria if first POV, scoreMeddpicc + computeDelta + assessPovCriteria + identifyRisks + updateQuestions + draftPovCallEmail + generateNextActions, saves brief + deal_tasks, advances deal stage
- `POST /api/deals/[id]/value-engineering` -- VE workshop analysis (streaming): scoreMeddpicc + matchCaseStudies + extractVeBaseline (parallel), then computeDelta + identifyRisks + updateQuestions + draftVeCallEmail + generateNextActions; saves brief with ve_baseline_inputs; advances deal stage
- `GET /api/deals/[id]/ve-questions` -- generates and returns VE workshop planning questions (not persisted); aggregates MEDDPICC evidence from all briefs
- `POST /api/deals/[id]/ve-proposal` -- generates value proposal from aggregated baseline inputs + SC slider assumptions; saves to deals.ve_proposal + deals.ve_slider_inputs; non-streaming
- `PATCH /api/deals/[id]/ve-proposal` -- publish or unpublish the saved proposal to salesroom ({ action: "publish" | "unpublish" }); sets deals.ve_published
- `GET /api/deals/[id]/ve-proposal.pdf` -- renders saved value proposal as PDF using @react-pdf/renderer; returns attachment
- `PATCH /api/deals/[id]/share` -- generate or revoke share_token on a deal ({ action: "generate" | "revoke" })
- `PATCH /api/deals/[id]/tasks/[taskId]` -- toggle task status (open/done)
- `GET /api/deals/[id]` -- fetch deal with briefs and tasks

### Key pages
- `/dashboard` -- lists deals (not raw briefs)
- `/brief/new` -- prep brief form; shows review step before navigating to deal
- `/deal/[id]` -- deal view: MEDDPICC, delta, risks, POV progress, salesroom share, VE baseline+sliders, VE proposal, VE publish section, task list, briefs timeline
- `/deal/[id]/post-call/new` -- post-call analysis form
- `/deal/[id]/pov/new` -- POV analysis form (success criteria auto-extracted from first POV call, call type select, recording URL)
- `/deal/[id]/value-engineering/new` -- VE workshop form: planning questions (generated fresh on load), optional recording URL, transcript upload; baseline inputs extracted automatically
- `/s/[token]` -- public prospect salesroom (no auth required; token is the credential); shows value proposal section when ve_published = true

### Shared analysis lib
All AI functions live in `src/lib/analysis.ts`: `scoreMeddpicc`, `matchCaseStudies`, `generateQuestions`, `updateQuestions`, `identifyRisks`, `generateNextActions`, `assessPovCriteria`, `extractSuccessCriteria`, `draftPrepEmail`, `draftPostCallEmail`, `draftPovCallEmail`, `draftVeCallEmail`, `generateVeWorkshopQuestions`, `extractVeBaseline`, `generateValueProposal`, `computeDelta` (pure).

### PDF generation
`@react-pdf/renderer` v4. Listed in `next.config.ts` serverExternalPackages to prevent Webpack bundling. PDF route is `.tsx` (not `.ts`) to support JSX. Bar charts drawn as SVG Rect elements (no charting library).

### Middleware
`src/lib/supabase/middleware.ts` redirects unauthenticated users to `/login` for all paths except: `/login`, `/api/*`, `/auth/*`, `/`, `/privacy`, `/s/*` (salesroom).

### Reminders
In-app only. Tasks with `reminder_at < now()` render an overdue badge in the deal view. No email infrastructure wired up yet.
