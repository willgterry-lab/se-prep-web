# Session log

## Current state (2026-07-09, shutdown — pushed, deployed, MEDDPICC pacing fix)

**Session ended cleanly, dev server stopped, working tree clean, everything
pushed and confirmed live.** Continues directly from the entries below (same
day): VE DOCX export, the Kitwave call-stage demo cache, and the deal page
reorder were all built earlier in the day but sat uncommitted until this
closing stretch — the user asked to push once they noticed the live site
didn't reflect any of it (nothing had been pushed yet, a real gap worth
remembering: committing locally is not the same as it being live, and this
project's Vercel deploy only triggers on push to `origin/main`, not on
commit).

### What happened this closing stretch, in order
1. **Committed and pushed everything from earlier in the day**, split into 4
   logical commits rather than one giant one: VE DOCX export (`df23557`),
   Kitwave call-stage demo cache (`9a36e97`), deal page reorder (`ec6254b`),
   docs (`29a258c`). Verified `Ready` + aliased to `se-prep-web.vercel.app`
   before telling the user anything was live — same discipline as every prior
   session.
2. **Revisited the "SE Agent" stage-value narrative doc** the user had
   previously codified stage-by-stage (`~/Downloads/SE Agent (1).pdf`) against
   everything shipped since it was written. Two real gaps found: Prospect
   Research wasn't mentioned as a stage at all (it now genuinely comes before
   Prep and changes what Prep even starts from), and Stage 4 (VE) still said
   "PDF" throughout. Wrote an updated version to `~/Downloads/SE Agent (2).md`
   as a 5-stage narrative (new Stage 1: Prospect Research, Prep now marked
   explicitly optional, post-call now genuinely can be the first call logged,
   POV left as-is after verifying the "manual override" claim against the
   code, VE updated to DOCX + the upload/re-publish workflow). Not yet
   reviewed by the user stage-by-stage the way the original was built --
   flagged as a next step, not something to treat as final.
3. **Fixed the Kitwave demo's MEDDPICC pacing** (`d114e6a`) -- the user
   caught that it jumped from 50/100 at Prep to ~92/100 by the very next call
   and flatlined near-max for the rest of the deal, an artefact of the real
   underlying transcripts being extremely strong evidence throughout (the
   whole reason Kitwave was chosen as the demo company). Specified target
   displayed scores (AE call 50, SC call 62, POV1 73, POV2 86, POV3 90, VE
   flat at 90). Since the internal scale is 0-24 (8 elements x 0-3) displayed
   via `Math.round(raw/24*100)`, only 25 discrete percentages are reachable --
   confirmed with the user which nearest achievable values to use (**50 / 63 /
   75 / 88 / 92 / 92**) before touching anything, and confirmed the JS
   `Math.round` behaviour specifically (Python's `round()` gives a different,
   wrong answer on the exact `.5` case at raw=15 -- 62 vs 63 -- due to
   banker's-rounding vs round-half-up; verified with `node -e` directly rather
   than trusting the Python spot-check). User also asked to rebalance the
   underlying 8 MEDDPICC elements per stage, not just the headline
   `overall_score` field, since `overall_score` is trusted directly everywhere
   it's displayed (confirmed via grep -- header badge, score history table,
   and each brief's own delta card all read `meddpicc.overall_score` directly,
   never recomputed from summing the 8 elements) but a sharp viewer opening
   the per-element breakdown grid would still see the old near-maxed values if
   only the headline number changed. Rebalanced all 8 elements across all 5
   post-Prep stages by hand, keeping `paper_process` deliberately lagging
   throughout (consistent with the "no paper process visibility" risk already
   present in the risk fixtures -- a genuine cross-consistency win, not just a
   coincidence), monotonic non-decreasing per element (matches the app's own
   MEDDPICC carry-forward rule), and every `delta` object recomputed to match.
   Caught and fixed two `summary` text fields that had gone factually wrong
   once elements were rebalanced -- POV_2 claimed "all eight elements at 2 or
   above" and VE claimed "every element explicitly confirmed", neither true
   anymore with `paper_process` deliberately held at 1/3 -- rewrote both
   rather than leaving a contradiction between the prose and the numbers.
   Evidence/gap text per element was deliberately left untouched throughout
   (still genuine, verbatim-grounded content) -- only the numeric `score` and
   `summary` framing changed, which does mean a couple of elements now carry
   real strong-evidence text next to a deliberately conservative score number;
   flagged as an accepted trade-off, not hidden.

### Verified
`tsc`/`eslint`/`next build` clean after every step. Confirmed via a small
Python cross-check script that every stage's 8 element scores sum exactly to
that stage's `overall_score` field, and every `delta.overall_prev/curr` chains
correctly to the adjacent stage's `overall_score` (no drift). Pushed and
confirmed `Ready` + aliased on `se-prep-web.vercel.app` (`vercel ls` /
`vercel inspect`), same verification standard as every commit this session.

### Outstanding
- **Live click-test the full Kitwave call-stage demo** end to end in a real
  browser session (paste each of the 5 transcripts into the real forms in
  order, confirm the MEDDPICC progression now reads as gradual on screen, not
  just in the data) -- still the single most important pre-demo verification,
  carried over from the entry below.
- **`~/Downloads/SE Agent (2).md`** -- the updated stage-value narrative --
  hasn't been walked through with the user the way the original was built.
  Treat as a draft, not final copy, until reviewed together.
- The research-first flow / optional-Prep CTA (2026-07-08) still not
  live-click-tested end to end -- unrelated to this session, still
  outstanding.
- VE document upload/download/revert also still needs a real browser
  click-test.
- seagent.co.uk DNS still not pointed to Vercel; Privacy page still says "SE
  Prep".

## Current state (2026-07-09, Kitwave call-stage demo cache + deal page reorder)

Continuation of the same day, after the VE DOCX work below. User sent a new 3-item
build list (`Untitled document.pdf`): speed up analysis stages for the demo,
promote exec summary above the fold, move the next-step CTA higher. Items 2+3
were unambiguous UI reorders, done directly. Item 1 turned out to be a much
bigger build once scoped with the user -- extending the existing Kitwave
research+prep demo cache to the four remaining analysis stages (post-call,
POV x3, VE workshop), baked from five real call transcripts the user provided
mid-session (`~/Desktop/02-06 - *.pdf`, all still on disk there).

**Items 2+3 (`deal-view.tsx`):** the next-step CTA block (first-call
choice/post-call/POV/POV+VE) moved from below `StakeholdersCard` to directly
under `DealProgressBar`. The full tabbed research view (`ResearchBriefFullView`
-- exec summary + one tab per section, i.e. already-hyperlinked "click to dig
deeper") is now also rendered at the top of the page, between the CTA and
`StakeholdersCard`, whenever `briefs.length === 0 && researchBriefs.length > 0`
(research just ran, no call logged yet) -- exact order asked for: timeline ->
CTA -> exec summary. Once a brief exists it's gone from the top and lives only
in the Research tab below, as before. No new "hyperlink" mechanism was built --
the promoted component already has a tab bar as its first element, which
satisfies "click to dig deeper" directly.

**Item 1, after clarifying scope with the user** (multiSelect: all of
post-call/POV/VE, not just research; approach: extend the fixture pattern using
real transcripts the user would paste in, not synthesize speed via prompt/model
changes): built a second demo-cache layer, `getCachedCall`/`emitCachedPostCall`/
`emitCachedPov`/`emitCachedVe`/`matchCachedCompletedTasks` in `research.ts`,
fixture data in new `src/lib/demo-fixtures/kitwave-calls.ts`.

**How the fixture data was generated -- same discipline as the original Kitwave
research+prep fixture, nothing hand-authored:** a temporary debug route
(`/api/debug/kitwave-calls`, deleted after use) called the real `analysis.ts`
functions directly against the five real transcripts, chaining
prevBrief/criteria/openTasks state by hand exactly as the real routes do
(post-call's prevBrief = the existing Kitwave `KITWAVE_MEDDPICC` prep brief;
each POV call's prevBrief = the previous stage's own output; VE's prevBrief =
POV call 3). ~40 real Claude calls, took about 6 minutes end to end, written to
scratchpad JSON per stage as it went. Verified real behaviour, not fabricated:
POV call 1 genuinely surfaced 7 agreed criteria and the app's 5-cap correctly
kept 5 while `total_agreed: 7` recorded the rest (the exact documented overflow
behaviour, not something contrived for the demo); POV assessment status
progression is genuine (criteria 1-2 `in_progress` at the two-week checkpoint,
all 5 `met` by final review, matching the transcript's own narrative); VE
baseline extracted all 12 workshop data points with correct category/direction
tagging and the £2.8M/£1.7M/£1.4M leakage figures cross-referencing correctly
across calls. One schema gap found and fixed by hand before baking: a single
risk item in the post-call output was missing `severity` (a genuine, if rare,
LLM output gap) -- filled from the same risk's `severity: "medium"` in a later
stage's more complete re-statement of the same risk, rather than guessing.

**The non-obvious wiring problem:** `detectCompletedTasks`'s output references
task ids, but the debug run's ids were synthetic (`t1`, `t2`...) and don't exist
in production -- real `deal_tasks` rows only get their real ids once an earlier
cached stage's own `actions` are actually inserted. Solved by remapping the
baked fixture's completed-task list from id to description text at bake time
(`CachedCompletedTask { description, evidence }`), then `matchCachedCompletedTasks`
matches against whatever's actually open in the DB at cache-serving time by
description equality. All three routes (`post-call/route.ts`, `pov-analysis.ts`'s
`runSinglePovAnalysis` -- shared by both the single-call and batch POV routes,
`value-engineering/route.ts`) branch on `getCachedCall(transcript)` right where
real generation would start, matched by the pasted transcript's own distinctive
title line (e.g. `/Trial Setup Call/i`) since these routes take a transcript,
not a company name. Both branches converge on the same DB-write tail
unchanged, so cached and live runs are indistinguishable downstream. Pacing:
6-8 emitted steps per stage at 1700-2000ms each, landing every stage inside the
requested 10-20s window (post-call ~12s, POV ~12.6-14.4s, VE ~13.6s).

**Verified live** (Chrome extension wouldn't connect again, same flakiness as
every recent session -- fallback debug-route-plus-curl pattern used
successfully again): a second temporary debug route
(`/api/debug/kitwave-integration-test`, deleted after use) created a real
throwaway "Kitwave Group" deal under the Choco product-context user, ran it
through the actual production code (not copies) for all 4 stages -- POV
specifically via the real unmodified `runSinglePovAnalysis` -- and confirmed:
briefs saved in the correct stage order with the correct real call dates from
the transcripts (27 May / 9 June / 30 June / 14 July / 22 July), and most
importantly that `matchCachedCompletedTasks` genuinely matches against
real DB-assigned UUIDs (0/8/6/9/2 tasks matched done across the five stages,
44 tasks total accumulated, 25 ultimately marked done by the end -- a rich,
realistic task lifecycle). Deal deleted in a `finally` block; confirmed via a
fresh `supabaseAdmin` query afterward that only the two real deals
(Luminary Brands, Bramwell Fine Foods Ltd) remain and zero Kitwave briefs are
left over. Both debug routes confirmed removed from the `next build` route
manifest before finishing.

`npx tsc --noEmit`, `npx eslint` (all touched files individually clean, no new
issues on the full `src/` sweep beyond the same pre-existing baseline noted in
every recent entry), and `npx next build` all clean throughout, including
after final cleanup.

**Not yet live-browser-tested**: the actual `VePublishSection`-style UI
experience of pasting one of these five transcripts into the real
post-call/POV/VE forms and watching the paced streaming UI -- the integration
test above proves the backend logic end-to-end (cache match, pacing steps,
task completion, brief/stage progression) but not what it feels like/looks
like in the browser. Should be the first thing clicked through next session,
or by the user directly, before relying on this in the actual demo.

### Outstanding
- **Live click-test the full Kitwave call-stage demo** end to end in a real
  browser session (paste each of the 5 transcripts into the real forms in
  order) -- this is now the single most important pre-demo verification, on
  top of the research-first-flow click-test already outstanding from
  2026-07-08.
- The research-first flow / optional-Prep CTA (2026-07-08) still not
  live-click-tested -- unrelated to this session, still outstanding.
- VE document upload/download/revert (see entry below) also still needs a
  real browser click-test.
- seagent.co.uk DNS still not pointed to Vercel; Privacy page still says
  "SE Prep".
- Decide whether to commit and push everything from today (VE DOCX + this
  entry) -- nothing pushed yet, working tree has the full diff.

## Current state (2026-07-09, VE report PDF -> DOCX, item 4 of "Improvements to SE Agent")

Picked up from the 2026-07-08 handoff. Built item 4, the last unbuilt item from
the "Improvements to SE Agent" doc: switch the VE proposal export from PDF to
an editable DOCX, add a download button (already existed, retargeted), and add
a re-upload feature so an SC can download the generated DOCX, tidy it up
offline in Word, and re-upload it as the new downloadable artifact -- exactly
as the user specified back on 2026-07-08 (store the upload as-is, never
re-parse edits back into `ve_proposal`).

**Migration v10** (confirmed run by the user in the Supabase SQL editor,
verified via a live REST select afterward): `deals.ve_document_uploaded_at`
(timestamptz, nullable) -- null means "generate fresh from `ve_proposal` on
every download", set means "an SC uploaded an override, serve that instead."

**New Supabase Storage bucket `ve-documents`** (this codebase's first use of
Storage) -- created via `supabaseAdmin.storage.createBucket`, private,
DOCX-mimetype-only, 10MB limit, no RLS policies (every access goes through
`supabaseAdmin` in the API routes, which check deal ownership against the
authenticated session first, same pattern the rest of the app uses for
service-role operations). Deterministic path per deal: `{deal_id}/ve-proposal.docx`
-- no history kept, upload always overwrites, matching "the new downloadable
artifact" from the spec rather than a versioned archive.

**What shipped:**
1. `src/lib/ve-document.ts` -- `buildVeProposalDocx` using the new `docx`
   dependency, mirrors the old PDF's content and colour palette (green/navy,
   driver cards, confidence badges) but as an editable Word doc instead of a
   flattened PDF. Bar-chart driver viz (SVG in the PDF) simplified to a text
   line -- not worth reproducing as a docx chart/image for a doc meant to be
   edited, not viewed as a polished artifact.
2. **Removed** `@react-pdf/renderer` entirely (was only used by the VE PDF
   route, confirmed via grep before removing) -- deleted
   `ve-proposal.pdf/route.tsx`, uninstalled the package, dropped it from
   `next.config.ts`'s `serverExternalPackages`. This was a genuine swap, not
   an addition -- item 4 said "switch," so no PDF option was left behind.
3. New `src/app/api/deals/[id]/ve-document/route.ts` -- GET (serves uploaded
   override if `ve_document_uploaded_at` set, else generates), POST (multipart
   upload, .docx-only, 10MB cap, upserts to storage, sets the timestamp),
   DELETE (removes the storage object, clears the timestamp, reverting
   downloads to generated). DB writes go through the normal RLS-scoped
   `supabase` client after an ownership check; only the storage calls use
   `supabaseAdmin`, since the bucket has no policies of its own.
4. `deal-view.tsx`'s `VePublishSection`: "Download PDF" -> "Download DOCX"
   (same link position, new route), plus a new "Replace with edited version"
   file-input control and a "Revert to generated" action that appears once an
   override exists. Kept as inline text-link-style controls to match the
   existing "Download PDF" link's visual weight rather than adding new
   heavyweight buttons to an already-busy card.
5. `AGENTS.md` updated in the same session (schema v10, new routes, new "VE
   document generation" section replacing "PDF generation", new **VE
   document** glossary entry) -- did not repeat the gap from 2026-07-08
   morning where a shipped feature went undocumented for most of a day.

**Verified live**, via the same debug-route-plus-curl fallback used
successfully in prior sessions (Claude's Chrome extension would not connect
this session either -- `tabs_context_mcp` returned "not connected", consistent
with the flakiness noted in every recent entry). Rather than spend real
Anthropic API calls running a full VE workshop analysis just to get a
`ve_proposal` to test against (neither Luminary Brands nor Bramwell has one
saved), temporarily seeded a synthetic, clearly-labelled
("TEST FIXTURE - DO NOT DEMO") proposal onto Luminary Brands via
`supabaseAdmin`, added a temporary unauthenticated debug route mirroring the
real route's exact logic, and confirmed via curl:
- `file` identifies the GET response as a genuine "Microsoft Word 2007+"
  document; unzipping and extracting `word/document.xml` text confirmed every
  proposal field (headline, drivers, confidence, risks, next step) rendered
  correctly.
- POSTing a modified `.docx` then GETting again returned a byte-identical copy
  of the uploaded file (`x-debug-source: uploaded`), confirming the override
  path is genuinely served, not silently ignored.
- DELETE reverted correctly -- the next GET reported `x-debug-source: generated`
  again and the extracted text matched the original generated version exactly
  (raw bytes differed by a few bytes, traced to `docx`'s own non-deterministic
  zip metadata/timestamps, not a content bug).
- Cleaned up fully afterward: cleared the seeded `ve_proposal` back to null on
  Luminary Brands, removed the test storage object, deleted the temporary
  debug route. Confirmed via a fresh `supabaseAdmin` select that both real
  deals are back to their pre-session state (`ve_proposal: null,
  ve_document_uploaded_at: null`).

**Not yet click-tested through the real browser UI/auth flow** -- the
debug-route method verifies the exact same underlying logic (same storage
path convention, same `buildVeProposalDocx` call, same `supabaseAdmin`
storage calls) but doesn't exercise the actual `VePublishSection` buttons,
the real session-cookie auth path on the real routes, or what the file input
UX feels like in practice. Worth a real click-through next time Chrome
connects, or manually by the user, before relying on it in the actual demo --
generate a real VE proposal on a throwaway/test deal first since neither real
deal has one yet.

`npx tsc --noEmit` and `npx next build` clean throughout (confirmed again
after cleanup, with the debug route removed, to make sure nothing about the
temporary route had leaked into the manifest). `npx eslint src/` shows the
same pre-existing baseline issues as documented in the 2026-07-08 entry below
(the `deal-view.tsx` line ~1161 setState-in-effect and unused `dealId`
warning, plus a few other long-standing warnings elsewhere) -- confirmed via
`git diff` that none of them are new.

**Not committed yet** -- working tree has the full diff, nothing pushed. Dev
server still running locally on port 3000 (started this session, not yet
stopped).

### Outstanding
- **Real browser click-test of the VE document upload/download/revert UI**
  still needed -- see above, the debug-route verification covers the backend
  logic but not the actual UI/auth path.
- Decide whether to commit and push this session's work.
- seagent.co.uk DNS still not pointed to Vercel.
- Privacy page still says "SE Prep" -- needs a rename pass.
- The research-first flow / optional-Prep CTA (built 2026-07-08) is still not
  live-click-tested end to end -- carried over, unrelated to this session's
  work but still the bigger demo-readiness gap.
- Multi-call POV batch save path (the actual save, not just classify) still
  not dry-run against real data.

## Current state (2026-07-08, live demo QA pass on the research-first flow — shutdown, session closed)

**Session ended cleanly, dev server stopped, working tree clean, everything pushed
and confirmed live.** This continues directly from the entry below (same day) --
that entry built items 2+3 of "Improvements to SE Agent"; this one is the live
QA pass on top of that work, done with the user clicking through the deployed
app and reporting issues back one at a time.

### What happened, in order (6 commits this sub-session, all pushed and
verified `Ready` + aliased to `se-prep-web.vercel.app` individually)

1. **`9dec5b2`** -- Fixed a real correctness bug the user caught: the Kitwave
   demo cache had only one fixture (built from the full prep pipeline, real AE
   transcript baked in), served unconditionally including to the notes-free
   research-first flow (`/deal/new`). Generated a genuine research-only variant
   for real (empty notes, live web_search, same product context) via a
   temporary debug route, verified zero notes-origin evidence before baking it
   into `kitwave-group.ts` as `KITWAVE_RESEARCH_ONLY_*`. `runResearchOnlyPipeline`
   now branches on whether `discoveryNotes` is empty. Also slowed demo pacing
   500ms -> 1500ms/step (looked "too fast to be believable" for a live demo),
   fixed the research tab bar's broken-looking wrap (10 tabs wrapping into an
   ugly second row -> single-row horizontal scroll), folded Research into
   `deal-view.tsx`'s main tab bar instead of a separate always-visible block,
   and converted `BriefView` from one long scroll into tabs.
2. **`6d4c498`** -- User reported the tabbed design "wasn't there" after
   testing. Root cause: the previous commit only tabbed `ResearchBriefFullView`
   (deal page) and `BriefView` (prep review) -- it missed the actual screen a
   user sees immediately after clicking "Create deal and research", which
   still stacked all nine sections vertically in both `/deal/new` and
   `/deal/[id]/research/new`. Both now hand off to the same tabbed
   `ResearchBriefFullView` once generation finishes, keeping the stacked
   live-reveal only for the in-progress streaming state.
   **Lesson for next time:** when told "the change isn't showing," verify the
   actual deployed bundle contains the target string (grep `.next/static/chunks`
   or similar) before assuming it's a caching/deploy issue -- in this case the
   deploy was correct, the code just didn't cover the screen the user was
   actually looking at. Confirming "deployed" isn't the same as confirming
   "deployed to the right place."
3. **`7db306d`** -- Removed 2 placeholder stakeholder entries ("Alan"/"Michael",
   no surname, `is_placeholder: true`) from the Kitwave fixture's shared
   `stakeholders.entries` -- correct per the research prompt's own placeholder
   feature, but read as broken in the demo. Prose fields referencing them by
   first name (`likely_champion_profile`, `who_is_missing`) still make sense
   without the card.
4. **`63ae75a`** then **`0744cd4`** -- Two separate live JSON-parse failures on
   POV submission, both in `detectCompletedTasks`, different root causes:
   - First: `max_tokens: 1024` too tight once a deal has several open tasks
     each needing a full verbatim evidence quote -- response cut off mid-array,
     no closing bracket. Raised to 2048.
   - Second (after the above fix, same live retest): response completed
     cleanly this time (proper closing brackets/fence) but still failed
     `JSON.parse` -- almost certainly an unescaped `"` inside a verbatim
     transcript quote. Added `createAndParseJson` (retry-once wrapper,
     analysis.ts's own version of research.ts's `createAndParse` for the same
     class of non-deterministic failure) and switched `detectCompletedTasks`
     onto it, plus an explicit escaping instruction in the prompt as a first
     line of defence.
   **Not yet re-verified by the user as of session end** -- last message was
   "Run shutdown" before confirming the retry actually fixed it. If it fails a
   third time on the same call, the error message will name a different
   function; same `createAndParseJson` pattern applies, and worth considering
   applying it more broadly across `analysis.ts` at that point rather than
   fixing one function at a time -- most functions there ask for verbatim
   quotes and are theoretically exposed to the same escaping failure mode,
   `detectCompletedTasks` was just the one that actually got exercised live.

### Verification approach used throughout
Every commit this sub-session: `tsc --noEmit` clean, `next build` clean,
pushed, then polled `vercel ls`/`vercel inspect https://se-prep-web.vercel.app`
until the new deployment showed `Ready` AND the production alias pointed at
it, not just that a build succeeded. For the Kitwave fixture fix specifically,
also did real functional verification (temporary debug routes, curl against
the running dev server, deleted after use) rather than trusting code review
alone -- confirmed zero notes-origin evidence in the research-only path and
confirmed the notes-present path was unchanged, before shipping.

### Outstanding
- **Confirm the POV retry fix actually worked** -- this is the first thing to
  check next session if not already confirmed by the user.
- The VE DOCX work (item 4 of "Improvements to SE Agent") still hasn't been
  started -- untouched since the entry below.
- Consider whether `createAndParseJson` should be applied proactively to other
  `analysis.ts` functions that also ask for verbatim quotes (scoreMeddpicc,
  identifyRisks, etc.), rather than reactively, if the escaping failure recurs
  on a different function.
- Local dev server was killed at session end (`kill` on the port 3000 process)
  -- will need `npm run dev` again next session before any local testing.

## Current state (2026-07-08, items 2+3 of "Improvements to SE Agent" built — flow reorder + optional Prep)

Picked the session back up from the handoff note below. Built items 2 and 3
from the "Improvements to SE Agent" ask (item 1 was folded into item 2 --
they're really one flow). Item 4 (VE DOCX) is still not started.

**Decisions confirmed with the user before implementing** (both one-way-door-ish,
asked rather than guessed): `deals.prospect_name` stays NOT NULL, defaulting to
`""` on research-first creation rather than a nullable-column migration --
`deal-view.tsx` header and the dashboard card now render it conditionally,
skipping the blank case rather than showing an empty line. `/brief/new` is
retired from the dashboard nav (CTA now points to `/deal/new`) but the page
itself is untouched and still works -- just unlinked, not deleted.

**What shipped, not yet pushed:**
1. Refactored `/api/deals/[id]/research/route.ts` to call the already-written
   (but previously dead-code) `runResearchOnlyPipeline` from `research.ts`,
   instead of duplicating the four-call orchestration inline. Net -65 lines,
   no behaviour change -- verified by diffing the emitted event sequence
   against the pre-refactor version.
2. New `POST /api/deals` (`src/app/api/deals/route.ts`): the research-first
   entry point. Takes a resolved company, creates the deal row immediately
   (`prospect_name: ""`) so research has a dealId to attach to, then streams
   the same nine `research_*` NDJSON events via `runResearchOnlyPipeline`,
   saves `research_briefs`, upserts stakeholders. Emits `deal_created` first
   (client gets the dealId before research finishes) then `research_done`.
   `maxDuration = 300`, matching the other research-pipeline routes.
3. New page `/deal/new` (`src/app/(app)/deal/new/page.tsx`): company name/URL
   input only, reusing the `CompanyChip`/`CompanyOverrideInput`/
   `CompanyCandidatePicker`/`CompanyNotFound` components and the nine
   `*SectionView` research renderers -- essentially `/deal/[id]/research/new`
   minus an existing dealId. Redirects to `/deal/[id]` on `research_done`.
   Dashboard's "New deal" CTA now points here instead of `/brief/new`.
4. `deal-view.tsx`: new CTA block, shown when `briefs.length === 0 &&
   researchBriefs.length > 0` (research exists, no brief of any stage yet) --
   two choices side by side, "Upload AE Discovery to prep for first SC Call"
   (`/deal/[id]/prep/new`) and "Post Initial SC call analysis" (existing
   `/deal/[id]/post-call/new`, unchanged). The pre-existing `!hasPostCall &&
   briefs.length > 0` post-call CTA is untouched and still covers the old
   notes-first-with-a-prep-brief-already path.
   `DealProgressBar`'s "Prep" node was checked live-in-code (not clicked) --
   it's driven by `deal.stage`, which stays `'prep'` (the default) until
   post-call is logged either way, so a Prep-skipping deal shows "Prep" as
   current rather than looking broken. No schema/enum change needed, matching
   the conclusion in the paused plan below.
5. New `POST /api/deals/[id]/prep` (`src/app/api/deals/[id]/prep/route.ts`)
   and page `/deal/[id]/prep/new`: the "Upload AE Discovery" choice. Notes-only
   form (no company resolution -- reused the file-upload/drag-drop chrome from
   `/brief/new` verbatim, dropped the company-resolution card). Added an
   optional "Contact name" field on this form specifically, not part of the
   original spec but needed in practice -- `draftPrepEmail` interpolates
   `prospect_name` directly into the salutation with no blank-safe fallback,
   and a research-first deal's `prospect_name` is `""` until something sets
   it. If supplied and the deal's name is still blank, the route persists it
   onto `deals.prospect_name` so it's no longer blank going forward; never
   overwrites an existing one. Runs scoreMeddpicc/matchCaseStudies/
   draftPrepEmail/generateQuestions grounded in the deal's existing
   `research_briefs` row (same grounding `/api/analyze` does from scratch).
   Reuses `BriefView` for the review step, same as `/brief/new`.
6. `post-call/route.ts`: now fetches the deal's latest `research_briefs` row
   and passes `sections.value_drivers` as `scoreMeddpicc`'s 5th arg -- it
   didn't ground research before, only `/api/analyze` did. Matters more now
   that post-call can genuinely be the first call logged on a deal (item 4
   above). Deliberately did NOT add research grounding to `matchCaseStudies`
   in post-call -- it hardcodes `matched_case_studies: []` there already,
   which looks like a pre-existing, deliberate "case studies are matched once
   at Prep, not re-matched every call" design choice, not something this
   session's feedback doc asked to change.
7. **Backfilled `AGENTS.md` for the entire Prospect Research feature**, which
   turned out to have never been documented despite being built and shipped
   earlier this same day (schema v9, `research.ts`, `research-brief-view.tsx`,
   `company-resolution.tsx`, `/deal/[id]/research/new`) -- the doc still said
   "Schema version: v8" with no mention of research_briefs anywhere. Added
   glossary entries (Prospect research, Research-first deal creation, Optional
   Prep), the v9 table, all new/changed routes and pages, and a proper
   `research.ts` section under "Shared analysis lib". Worth remembering this
   gap existed -- the "update AGENTS.md same session as the change" rule
   didn't hold for the research feature itself, only started being followed
   again this pickup.

**Verified:** `tsc --noEmit` clean, `next build` clean (all new routes/pages
appear in the route manifest: `/api/deals`, `/api/deals/[id]/prep`,
`/deal/new`, `/deal/[id]/prep/new`). `eslint` on every touched file is clean
except two PRE-EXISTING issues in `deal-view.tsx` (a `setState`-in-effect on
the unrelated share-link `useEffect` at the old line ~1161, and an unused
`dealId` warning) -- confirmed via `git diff` that neither line is part of
this session's diff, not something introduced now. Curled `/api/resolve-company`
directly against the running dev server (no auth required on that route) and
got a correct real resolution back (also confirmed it still correctly hits
the Kitwave demo-cache short-circuit).

**Not verified live in the browser.** Claude's Chrome extension would not
connect this pickup (`tabs_context_mcp` returned "Browser extension is not
connected") -- same flakiness noted in the entry below. Everything past
`/api/resolve-company` needs a real Supabase auth session, which isn't
curl-able without the user's browser cookies, so the full research-first
create-a-deal flow, the new-CTA branching, and the Prep-from-existing-research
flow are all still only verified by code/type/build correctness, not by
actually clicking through them. **This is the single most important thing to
do before relying on any of this in the demo** -- click through `/deal/new`
end to end, confirm the two-choice CTA appears correctly, and run both
branches (`/deal/[id]/prep/new` and post-call-first) against a real test deal.

### Outstanding
- **Live click-test everything in this entry** -- see above, this is the gate
  before demo-readiness, not build/type success.
- Item 4 (VE DOCX) not started at all -- see the plan in the entry below,
  nothing about it has changed.
- Whether to eventually delete `/brief/new` outright (vs. leaving it unlinked
  indefinitely) wasn't decided -- leaving it as legacy/unlinked was explicitly
  the user's call this session, revisit only if it starts causing real
  confusion or maintenance burden.
- Consider whether `/deal/[id]/research/new` (manual re-run) and the new
  `/deal/new` company-resolution UI could share more than just the imported
  components -- there's now three near-identical "resolve a company, submit,
  stream research" pages (`/deal/new`, `/deal/[id]/research/new`, and the
  company-resolution portion of `/brief/new`). Not extracted this session
  since none of the three are complex enough yet to be worth the abstraction,
  but worth revisiting if a fourth entry point ever appears.

## Current state (2026-07-08, mid-session pause — demo fixes + "Improvements to SE Agent" in progress)

**Paused mid-task, user had to leave for a train.** This entry is a handoff note for
picking the session back up cold. Read this before doing anything else.

### What happened this session, in order
1. Shipped the full Prospect Research feature (see the entry below this one for
   full detail) -- Migration v9, 9-section research brief, company resolution,
   deal-screen integration, downstream MEDDPICC/case-study/email grounding.
2. **Live demo debugging**, all shipped and confirmed live on
   `se-prep-web.vercel.app`:
   - Fixed intermittent JSON parse failures in the research pipeline (model
     sometimes adds a prose lead-in before its JSON despite instructions not
     to -- added a retry wrapper `createAndParse` in `research.ts`, plus a
     stronger prompt instruction).
   - Found via production logs (`vercel logs`, not guesswork) that
     `/api/analyze`'s `maxDuration=120` was too tight for the real research
     pipeline against a data-rich company -- raised to 300s.
   - Same root cause pre-existed on `post-call`/`pov`/`value-engineering`
     (60s, each chains 7-9 Claude calls) -- raised all to 120s proactively
     before they caused the same failure live.
   - **Built a demo-day cache for "Kitwave Group"**: the user gave me the
     real AE discovery transcript PDF they'll paste live. Generated the full
     prep brief for real (research + MEDDPICC + case studies + email +
     stakeholders) against the actual Choco product context and that exact
     transcript, baked it into `src/lib/demo-fixtures/kitwave-group.ts`.
     When the resolved company matches `/kitwave/i` (see `getDemoCache` in
     `research.ts`), the pipeline serves this cached brief with paced NDJSON
     event emission (~5.5s) instead of ~60-100s of live generation. Company
     resolution also fast-paths in `resolveCompany()` itself. **If the user
     pastes different/edited notes for the "same" demo, the cached content
     is still what's served -- it does not re-read the live text.**
3. User then sent `~/Downloads/Improvements to SE Agent.pdf` -- a 4-part
   feedback doc, confirmed **all parts are demo-critical**. Read this PDF
   again from disk if it's still there; full text is summarized below since
   the file may not persist.

### The "Improvements to SE Agent" ask, in full (paraphrased from the PDF)
1. **Reorder the flow**: research should run FIRST, before a deal exists --
   paste just a company URL/name, it creates the deal once research
   completes. Rationale: an AE should be able to use this as part of their
   own initial prep, without needing discovery notes yet.
2. **Make the Prep (pre-call) stage optional**: Choco doesn't always have a
   separate AE discovery call before the SC joins. A deal with research but
   no calls logged yet should offer two choices: **"Upload AE Discovery to
   prep for first SC Call"** (today's Prep flow, minus company
   resolution/creation which already happened) and **"Post Initial SC call
   analysis"** (skip Prep entirely, log the first real call directly).
3. **Research step UI**: too text-heavy/messy -- ***DONE, shipped, see below.***
4. **VE report**: too text-heavy; switch PDF output to DOCX; add a download
   button; add a re-upload feature so an offline-edited DOCX becomes the new
   downloadable artifact. User explicitly chose "store the uploaded file as
   the new artifact only, don't attempt to re-parse edits back into
   structured deal data" (simpler, no silent-corruption risk) when I asked.

### Done this sub-session (commit `e620e14`, pushed and live)
**Item 3 (research UI) is complete.** Rewrote `src/components/research-brief-view.tsx`:
- `ResearchBriefFullView` is now a `Tabs` layout: an Exec Summary tab (one
  short line per section, derived client-side from already-generated
  structured data -- no new AI call) plus one tab per section (10 tabs
  total including the Sources/source-log tab).
- Inline evidence quotes (the "blue Web pill + full quote" pattern) replaced
  with small numbered footnote markers (`CiteMark`, e.g. `[1]`) next to each
  claim, linking to a `SourcesList` at the bottom of that same tab. New
  `CitationTracker` class dedupes citations per section by URL (falls back
  to origin+text for notes evidence). Each section component (`CompanySnapshotSectionView`,
  etc.) still self-contained with its own Card + own citation tracker, so it
  still works standalone in the Prep streaming context, not just inside the
  new tabbed full view.
- Also extracted `runResearchOnlyPipeline` in `research.ts` -- the research-only
  (no MEDDPICC/case-study/email) Promise.all orchestration that was inline in
  `/api/deals/[id]/research/route.ts` -- into a reusable exported function,
  in prep for the new "New deal" entry point needing the same logic. **This
  function is written and type-checks/builds clean, but is not yet wired up
  anywhere -- `/api/deals/[id]/research/route.ts` still has its own
  untouched, working, duplicate inline copy.** Next step should either wire
  both callers to use the shared function, or at minimum wire the new one.

### Not started yet: items 1, 2, and 4
**Item 1 + 2 (research-first flow + optional Prep) -- the bigger one, was mid-design when paused:**

Planned approach (not yet built):
- New top-level page `/deal/new`: company name/URL input only (reuse
  `CompanyChip`/`CompanyOverrideInput`/`CompanyCandidatePicker`/`CompanyNotFound`
  from `src/components/company-resolution.tsx`), resolves via
  `/api/resolve-company`, then POSTs to a **new route `/api/deals` (POST,
  doesn't exist yet)** which: creates the deal row immediately (`prospect_company`
  = resolved name; `prospect_name` has no value at this point -- **schema
  currently has `deals.prospect_name` as `not null`, plan was to default it
  to `''` on this path and handle blank display gracefully in deal-view.tsx's
  header/dashboard cards, rather than a nullable-column migration -- not yet
  decided for certain, reconsider if a cleaner option exists**), then calls
  `runResearchOnlyPipeline` with `discoveryNotes: ""` (no notes at this
  stage) and streams the same `research_*` NDJSON events the existing
  research routes use. On completion, redirect to `/deal/[id]`.
- `deal-view.tsx`'s current post-call CTA (`!hasPostCall && briefs.length > 0`,
  i.e. only shows once a prep brief exists) needs to change: once research
  exists but **no briefs of any stage exist yet**, show both new choices
  side by side:
  - "Upload AE Discovery to prep for first SC Call" -> new page
    `/deal/[id]/prep/new` (doesn't exist yet -- essentially today's
    `brief/new/page.tsx` notes-paste UI, but scoped to an existing deal with
    company/research already done, so it only needs a notes textarea +
    submit, no company resolution step at all). Should ground
    scoreMeddpicc/matchCaseStudies/draftPrepEmail/generateQuestions using the
    deal's existing `research_briefs` row, same pattern as `/api/analyze`
    already does.
  - "Post Initial SC call analysis" -> **can reuse the existing
    `/deal/[id]/post-call/new` page/route almost as-is** -- it already
    handles `prevBrief` being null gracefully. The one real gap: today's
    `post-call/route.ts` doesn't ground `scoreMeddpicc` in the deal's
    research (`researchDrivers` param added to `scoreMeddpicc` this session,
    but only `/api/analyze` passes it). Should fetch the deal's latest
    `research_briefs` row and pass `sections.value_drivers` through, mirroring
    what `/api/analyze/route.ts` already does. Worth doing regardless of the
    optional-Prep feature, since post-call can now genuinely be the first
    call logged on a deal.
- Old `/brief/new` (paste-notes-first, auto-resolves company from the notes
  themselves) was the PREVIOUS primary entry point -- decide whether to
  retire it from the dashboard nav in favour of `/deal/new`, or keep both.
  Leaning toward retiring/redirecting it, since the new flow supersedes it,
  but this wasn't confirmed with the user.
- Deal stage semantics: `deals.stage` defaults to `'prep'` and both
  `post-call`/`pov`/`ve` routes already unconditionally
  `.update({ stage: "post_call" })` etc. on save -- concluded **no schema/enum
  change needed**, since `stage='prep'` already just means "default/initial",
  not "a prep brief exists". `DealProgressBar`'s visual treatment of a
  skipped Prep step wasn't checked -- worth a quick look so a deal that skips
  straight to post-call doesn't look broken, but likely a cosmetic nit, not
  a blocker.

**Item 4 (VE report DOCX) -- not started at all:**
- Needs a new dependency for DOCX generation (current export is
  `@react-pdf/renderer`, PDF-only) -- likely the `docx` npm package.
- Needs file storage for the upload path (user confirmed: uploaded DOCX
  becomes the new downloadable artifact only, no re-parsing back into
  `VeProposal` structured fields). This codebase has no Supabase Storage
  usage anywhere yet -- will need a bucket created (via `supabaseAdmin.storage.createBucket`,
  service-role key already available in `.env.local`) and a new column,
  something like `deals.ve_document_url`, to point at the latest artifact
  (generated DOCX by default, replaced by the uploaded one if present).
- "Tidy up, less text-heavy" -- content/layout edit to whatever the DOCX
  template ends up being, same spirit as the research UI cleanup.

### Everything currently pushed and live
`origin/main` is at `e620e14` (verified via `git fetch` + `git rev-parse`,
not just trusting `git push` output -- that's been the standard verification
step all session, keep doing it). Production (`se-prep-web.vercel.app`) auto-deploys
on push via Vercel's GitHub integration -- confirm the new deployment is
`Ready` and aliased to the production URL before telling the user something
is live (`vercel ls se-prep-web` then `vercel inspect https://se-prep-web.vercel.app`),
same pattern used all session.

### Outstanding / must re-verify next session
- **Migration v9 is applied** (user confirmed ran it in the Supabase SQL editor).
- Nothing in this session's UI changes has been click-tested in a real
  browser by me -- the user was doing that live, hence the bug reports this
  session. Chrome extension connection has been flaky (worked once, then
  user took over browser control directly). Don't assume anything renders
  correctly beyond `tsc`/`eslint`/`next build` passing -- verify live once
  the flow-reorder work is far enough along to test end to end.
- Dev server (`npm run dev`, port 3000) may or may not still be running
  locally -- check `lsof -ti:3000` before assuming either way.

## Current state (2026-07-08, Prospect Research feature — Migration v9)

Built the Prospect Research feature end to end, per the spec in the pasted
build prompt: a 9-section, evidence-cited research brief on the prospect
company, run automatically when notes are pasted into Prep (or manually from
the deal page), grounding MEDDPICC/case studies/discovery questions/email in
research instead of notes alone.

**Key architecture decision:** no existing web search capability in the
codebase (`/api/scrape` only crawls known/guessable URLs on one given domain --
fine for the vendor's own product site, useless for news/jobs/LinkedIn/reviews
on a prospect). Confirmed with the user to use Claude's native `web_search`
tool (`web_search_20250305`) rather than adding a third-party search API --
avoids a new vendor account/key and gives citations natively.

**Schema (Migration v9, not yet run in Supabase):**
- New table `research_briefs` -- one row per research run (initial + each
  re-run, kept for history/diffing, same pattern as `briefs` + delta): company
  fields (name/domain/hq/description/resolution_confidence), `sections` jsonb
  (8 of the 9 spec sections), `source_log` jsonb (the 9th, computed not
  generated).
- `briefs.research_brief_id` FK -- links a prep brief to the research run it
  was grounded in.

**New files:**
- `src/lib/research.ts` -- `resolveCompany` (company resolution, confidence-gated,
  never guesses on ambiguity), `researchSnapshotAndContext`/`researchOperatingModel`/
  `researchStakeholdersAndSignals`/`researchValueDriversAndRisks` (4 parallel
  web_search-backed calls covering all 9 sections), `researchDiscoveryQuestions`
  (pure reasoning over the gaps, no search), `buildSourceLog` (pure, dedupes
  evidence URLs). `CHOCO_VALUE_DRIVER_TAXONOMY`/`CHOCO_OPERATING_MODEL_LENS` are
  the vendor-configurable defaults per spec.
- `src/components/research-brief-view.tsx` -- full 9-section renderer
  (`ResearchBriefFullView` + one component per section), reused by both the
  Prep streaming view and the deal page.
- `src/components/company-resolution.tsx` -- shared chip/candidate-picker/
  override-input UI, reused by the Prep form (automatic path) and
  `/deal/[id]/research/new` (manual fallback).
- `src/app/api/resolve-company/route.ts`, `src/app/api/deals/[id]/research/route.ts`
  (manual path, NDJSON streaming, same event names as the Prep route),
  `src/app/(app)/deal/[id]/research/new/page.tsx` (manual entry page).
- `EvidenceBadge`/`ConfidenceBadge`/`StalenessBadge` added to `score-display.tsx`.

**Wiring:** `/api/analyze` now runs company resolution client-side first (Prep
form drops its old manual "Company" field entirely -- resolved from pasted
notes via `/api/resolve-company`, pausing on ambiguous/not-found rather than
guessing), then runs the 4 research calls **in parallel with** `extractStakeholders`
(notes-only, doesn't need research) rather than serially after it -- the one
concurrency win over the spec's default sequencing. `scoreMeddpicc`,
`matchCaseStudies`, `draftPrepEmail`, and `generateQuestions` each gained an
optional research param (pre-seed Identified Pain/Metrics, match on evidenced
pain not just vertical, ground the email in a cited fact, build discovery
questions from section 8's gaps instead of cold-starting). `generateVeWorkshopQuestions`
gained a `candidate_drivers` param carrying research's value-driver hypotheses
and cost-of-doing-nothing seeds through to the VE stage.

**Bug caught during verification:** the shared `parseJson` (analysis.ts) assumes
a fenced JSON block starts at the top of the response -- fine for the rest of
the app's prompts, but web_search-backed calls sometimes reason in prose before
their final JSON block (e.g. weighing ambiguous company candidates), which broke
its fence detection. Added a local `parseResearchJson` in research.ts (prefers
the last fenced block in the response) rather than touching the shared helper
used by ~20 other prompts. Also hit real truncation on the initial token
budgets against a deliberately worst-case test company (Stripe -- extremely
well-documented, unbounded evidence volume); fixed by adding explicit per-field/
per-list caps to the prompts (not just raising max_tokens, which alone wasn't
enough) so output stays bounded regardless of how much is publicly written
about a prospect.

**Verified:** full production build (`next build`) clean, `tsc`/`eslint` clean
throughout. Company resolution smoke-tested live against real companies
(resolved/ambiguous/not-found paths all correct). Full 9-section research
pipeline smoke-tested live end-to-end against a real company (Stripe) via a
temporary debug route (removed after verification) -- real citations, tiered
sourcing, honest "not found" on gaps, fact/inference split, cross-referenced
source log all confirmed working. **Not yet verified in the actual browser UI**
(Claude browser extension wasn't connected this session) -- the Prep form flow,
deal-page CTA/diff, and full section rendering are built and type-safe but
haven't been click-tested end-to-end by a human yet.

### Outstanding
- **Run the Migration v9 block in `supabase/schema.sql` before testing** --
  not yet applied to the live database.
- Click through the actual Prep flow and deal-page research card in the browser
  before considering this done -- only the API layer and component rendering
  were verified this session.
- VE stage's `generateValueProposal` itself doesn't yet consume research's
  cost-of-doing-nothing seed as a driver candidate -- only the workshop
  *questions* generator does. Worth revisiting once a live VE workshop exists
  to test against.
- Prep page's live-streaming view only renders the value-drivers section fully
  (plus a step counter for the rest) -- the deal page has the full 9-section
  renderer. Could upgrade the Prep stream to full section-by-section rendering
  too, reusing the same components, if that granularity turns out to matter in
  practice.

## Prior state (2026-07-07, salesroom task segmentation + delete-deal)

Continuation of the same-day session, after the PDF extraction fix below.

- **Salesroom "Next steps" now segmented like the main app's task list.** Previously a flat list.
  Extracted the stage-grouping logic (`stageFromSource`/`TASK_STAGE_ORDER`, by `post_call_*` /
  `pov_*` / `ve_*` / `manual` source prefix) out of `deal-view.tsx`'s `TaskList` into a shared
  `src/lib/task-stage.ts`, used by both. Then added owner tabs (All / Prospect / Joint) to the
  salesroom too, matching the main app's tabs -- deliberately **no SC tab**, since the salesroom
  query never fetches SC-owned tasks (internal coaching notes, admin) per the documented
  data-exposure rule in AGENTS.md, and an SC tab would either always be empty or require fetching
  that data into a public-facing page. New client component `src/components/salesroom-tasks.tsx`
  holds the tab state (the page itself is a server component). Verified the stage-grouping change
  live against Bramwell's real salesroom URL before deploying; the follow-up tab change shipped
  without a fresh live check since Bramwell was deleted partway through (see below) and Luminary
  Brands had no share link yet -- logic is straightforward client-side filtering reusing the
  already-verified grouping, but worth a quick manual look next session.
- **Added deal deletion.** New `DELETE /api/deals/[id]` route + a "Danger zone" card at the bottom
  of the deal page (`delete-deal-button.tsx`, same two-step confirm pattern as the existing
  account-deletion flow). No manual cascade needed -- `briefs`, `deal_tasks`, and
  `deal_stakeholders` all already have `deal_id ... on delete cascade` in the schema. Verified via
  schema/RLS review and a clean build, not via a live test delete (didn't want to test-execute a
  destructive op against the only remaining deal in the database).
- **Bramwell Fine Foods deal no longer exists.** Mid-session, a query turned up only one deal in
  the database ("Luminary Brands") -- Bramwell was gone. Confirmed with the user this was
  intentional, not something this session's work caused (nothing here ran any write/delete against
  Supabase before that point). Worth noting since Bramwell was the demo-prep deal referenced
  throughout the 2026-07-05/06 entries below -- **Luminary Brands is presumably the new demo deal**,
  though that wasn't explicitly confirmed.

## Prior state (2026-07-07, PDF extraction production bug fix)

Fixed a production-only bug: uploading certain Bramwell call-transcript PDFs (e.g. "02 - SC First
Call") to the post-call/POV/VE upload form failed extraction, while the exact same file worked
fine when tested locally. Root-caused through several layers rather than guessing:

- First fixed `extract-text/route.ts` swallowing the real error silently (no logging, generic
  message to client) -- this was the real blocker to diagnosing anything.
- Verified via server-side sha256 logging that the bytes reaching production were byte-identical
  to a local copy that parsed fine -- ruled out iCloud sync/transit corruption as the cause.
- The real culprit: `pdf-parse` vendors a ~decade-old, heavily-minified `pdf.js` v1.10.100 bundle,
  loaded via a dynamic `require()`. It threw `bad XRef entry` on a well-formed file only when run
  through the deployed function (stack trace pointed at a non-V8 runtime,
  `../../opt/rust/*.js`) -- never reproduced locally under plain Node.
- Replaced `pdf-parse` with `pdfjs-dist` (actively maintained). Hit two more Node/serverless
  quirks along the way, both fixed: (1) missing `DOMMatrix`/`Path2D` globals normally supplied by
  pdfjs-dist's optional native `@napi-rs/canvas` dependency, which didn't resolve on Vercel's Linux
  runtime -- fixed with empty stubs, since we only call `getTextContent`, never render; (2)
  pdfjs-dist's Node "fake worker" does `await import(this.workerSrc)` with `workerSrc` as a runtime
  variable, which no bundler (Turbopack included) can trace statically, so the worker file was
  missing from the deployed bundle regardless of what path we pointed it at. Fixed using pdfjs-dist's
  documented escape hatch: pre-populating `globalThis.pdfjsWorker` with a *statically* imported
  worker module, which makes pdfjs-dist skip the dynamic import path entirely.
- Confirmed fixed by the user via live upload against production after the final deploy.

Net effect: `pdf-parse` and `@types/pdf-parse` removed from `package.json`; `pdfjs-dist` added
(kept out of Turbopack's bundle via `serverExternalPackages`, same treatment as
`@react-pdf/renderer`). New file `src/types/pdfjs-dist-worker.d.ts` for the untyped worker
subpath import.

## Prior state (2026-07-06, interview demo-prep narrative)

No code changes this session -- purely a talk-through to prep the Friday interview demo. Went
stage-by-stage (prep -> post-call -> POV -> VE) building a pain-point/SC-benefit narrative for
each, grounded in what's actually built (per AGENTS.md), not aspirational features. Not yet
covered: the cross-cutting pieces (risk score, stakeholder tracker, salesroom as a whole,
dashboard) -- offered to continue into those next time.

### Outstanding (carried over, still true)
- Batch POV analysis (the actual save path, not just classify) still not run against real data --
  worth a real dry run before the demo, ideally with real setup/check-in/review transcripts on a
  throwaway test deal rather than Bramwell.
- Consider whether to regenerate Bramwell's VE baseline data (re-log the VE call) before the demo
  so the slider-eligibility fix is visible there too, or accept it as a known gap for this
  particular deal.
- seagent.co.uk DNS still not pointed to Vercel.
- Privacy page still says "SE Prep" -- needs rename pass.

## Prior state (2026-07-05, live Chrome verification)

### Completed this session
Migrations v6-v8 were run against the live Supabase instance. Chrome extension connected
successfully (via `/chrome`) after previously being unavailable all session -- did a full live
click-through of the Bramwell deal for the first time this session, rather than relying on code
review alone. This caught two real bugs that static review had missed:

- **`generateValueProposal` `max_tokens` too low (1800) for the tightened prompt.** Clicking
  "Regenerate value proposal" failed with "Unexpected end of JSON input" -- the extra reasoning
  required by the 2026-07-05 unit-conversion/range-methodology prompt fix pushed output past the
  old limit, truncating mid-JSON. Raised to 4096 (same fix pattern as `extractVeBaseline`'s
  documented 1000->4096 history). Regenerating twice more after the fix succeeded both times.
- **The "single figure, not a fake range" escape hatch wasn't being followed.** One regenerated
  driver's reasoning correctly concluded only one figure was supportable and said so in the
  "calculation" text, but `calculated_value` still rendered "1,040 to 1,040" -- the model wasn't
  told the *output format* must change, just that it should reason its way to a single figure.
  Added an explicit rule: "X to X" with the same number on both sides is never acceptable output.
  Verified fixed on the next regeneration (all three drivers came back with genuine, non-repeating
  ranges).

**Confirmed working live** (not just via code/DB inspection): risk score header + legend +
click-to-expand explainer; score history table across all 6 real stages; stage badge
capitalisation fix; stakeholder inline edit (opened, cancelled cleanly); "Resolved risks" section
against real multi-call history (several risks correctly shown as no-longer-flagged with accurate
"last flagged at" stage labels); "+ Set date" replacing the placeholder-date bug; VE number
formatting (£2,000/person, £200/credit, etc., no more "2000.0 GBP/person"); `/settings` page and
header email link; and, most importantly, the **salesroom task filter** -- confirmed the exact
internal task from the original QA report ("Treat £400k attrition figure as soft directional
context...") is completely absent from the live public salesroom page, with only genuine
Prospect/Joint tasks showing.

**New multi-call POV feature smoke-tested end-to-end** with two short synthetic transcripts (a
check-in-style and a final-review-style call) added to the real Bramwell deal's POV form:
classification correctly identified both stages and the correct order, each with an accurate
verbatim-quote-grounded reasoning, and the confirm screen rendered correctly (editable call-type
picker, up/down reorder controls disabled at the right boundaries). Stopped at the confirm screen
and clicked "Back" rather than "Run analysis" -- did not want to write synthetic test briefs into
the user's real demo deal. The actual batch-processing/save path is therefore still unverified
end-to-end; only classification and the confirm UI have been exercised against real data.

**Confirmed NOT retroactive** (expected, documented behaviour, not a bug): Bramwell's existing VE
baseline data (headcount, order volume, AOV sliders) still shows the pre-fix behaviour since it
predates the category/direction tagging -- needs a fresh VE call logged to pick up the fix. The
value proposition ranges/unit-conversion fix, by contrast, was picked up immediately on
regeneration since that's a prompt fix applied at generation time, not extraction time.

### Outstanding
- Batch POV analysis (the actual save path, not just classify) still not run against real data --
  worth a real dry run before the demo, ideally with real setup/check-in/review transcripts on a
  throwaway test deal rather than Bramwell.
- Consider whether to regenerate Bramwell's VE baseline data (re-log the VE call) before the demo
  so the slider-eligibility fix is visible there too, or accept it as a known gap for this
  particular deal.

## Prior state (2026-07-05, multi-call POV upload)

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
