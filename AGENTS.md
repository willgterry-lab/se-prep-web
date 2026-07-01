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

**Brief** -- a single AI analysis run against a set of input text (discovery notes or call transcript). A brief belongs to a deal. Two types: `prep` (pre-first-call) and `post_call` (after the SC's first real call).

**Deal** -- the persistent, top-level entity representing one sales opportunity with one prospect company. Multiple briefs, tasks, and (later) POV and VE outputs attach to a deal. A deal advances through stages: `prep` -> `post_call` -> `pov` -> `value_engineering`.

**MEDDPICC** -- a sales qualification framework with eight elements (Metrics, Economic Buyer, Decision Criteria, Decision Process, Paper Process, Identify Pain, Champion, Competition). Each element is scored 0-3 per brief. Overall score is /24.

**MEDDPICC delta** -- the per-element and overall score change between two briefs on the same deal, computed programmatically (not by AI). Surfaced on post-call briefs to show what the SC moved during their first call.

**Risk item** -- a distinct concept from a MEDDPICC gap. A gap is "we do not know X yet." A risk is "something about this deal is likely to stall or lose it" (e.g. no economic buyer engaged, single-threaded, entrenched competitor). Risks have severity: low / medium / high, and evidence must be verbatim from the transcript.

**Deal task** -- a structured next action extracted from a call transcript and written to `deal_tasks`. Has an owner (SC / Prospect / null), optional `reminder_at` timestamp, and status (open / done). Tasks are surfaced in the deal view with overdue badges when `reminder_at` is in the past.

**Prep email** -- the SC intro email generated at the prep-brief stage. The SC has NOT yet spoken to the prospect; this email introduces the SC before the first call.

**Post-call email** -- the follow-up email generated at the post-call stage. The SC HAS spoken to the prospect; this email references what was discussed and confirms next steps.

---

## Current build state

Schema version: v2 (deals + deal_tasks). Run the full `supabase/schema.sql` in the Supabase SQL editor on a fresh install; run the "Migration v2" block on an existing install.

### Tables
- `product_contexts` -- one per user, stores crawled product data
- `deals` -- one per prospect/opportunity; columns: id, user_id, prospect_name, prospect_company, stage, created_at, updated_at
- `briefs` -- one per analysis run; columns: id, user_id, deal_id, stage, prospect_name, prospect_company, discovery_notes, meddpicc (jsonb), matched_case_studies (jsonb), follow_up_email, delta (jsonb), risks (jsonb), created_at, updated_at
- `deal_tasks` -- one per extracted next action; columns: id, deal_id, description, status, source, owner, reminder_at, completed_at, created_at

### Key routes
- `POST /api/analyze` -- prep brief: finds/creates a deal, runs scoreMeddpicc + matchCaseStudies + generateQuestions + draftPrepEmail, saves brief, streams NDJSON, redirects to `/deal/[id]`
- `POST /api/deals/[id]/post-call` -- post-call analysis: scoreMeddpicc + computeDelta + identifyRisks + updateQuestions + draftPostCallEmail + generateNextActions, saves brief + deal_tasks, advances deal stage
- `PATCH /api/deals/[id]/tasks/[taskId]` -- toggle task status (open/done)
- `GET /api/deals/[id]` -- fetch deal with briefs and tasks

### Key pages
- `/dashboard` -- lists deals (not raw briefs)
- `/brief/new` -- prep brief form; redirects to `/deal/[id]` on completion
- `/deal/[id]` -- deal view: latest MEDDPICC, score delta, risks, task list, timeline of briefs
- `/deal/[id]/post-call/new` -- post-call analysis form

### Shared analysis lib
All AI functions live in `src/lib/analysis.ts`: `scoreMeddpicc`, `matchCaseStudies`, `generateQuestions`, `updateQuestions`, `identifyRisks`, `generateNextActions`, `draftPrepEmail`, `draftPostCallEmail`, `computeDelta` (pure).

### Reminders
In-app only. Tasks with `reminder_at < now()` render an overdue badge in the deal view. No email infrastructure wired up yet.

### Next stages to build
- POV (Proof of Value) stage
- Value Engineering stage
