# Session log

## Current state (2026-05-27)

### Completed this session
- **Example transcript generator** — new `POST /api/generate-transcript` route streams a realistic 30-36 exchange (~5 min) discovery call transcript seeded from the scraped product context; generates fictional prospect name + company via PROSPECT_META header if fields are empty; streams NDJSON to client so transcript appears word-by-word in textarea
- **Auto-fill prospect fields** — new `POST /api/extract-prospect` route; fires after file upload or textarea paste; silently populates empty name/company fields from the text content
- **Brand design system applied** — `#1ED760` green as primary (buttons, focus rings, checkboxes), `#0A192F` navy as foreground/nav background, `#F4F7F6` mint-tinted white as page background; cascades via CSS tokens + targeted overrides across all pages
- **App renamed SE Prep → SE Agent** — all UI text, metadata titles, privacy page updated; logo renders as `SE` (green) + ` Agent` (white/navy)
- **MEDDPICC score display /24 → /100** — pure display-layer conversion `Math.round(raw / 24 * 100)`; no data migration; updated in brief view, streaming preview, dashboard badge, and copy-all text
- **JSON parse error fix** — analyze route `max_tokens` raised: scoreMeddpicc 2048→3000, matchCaseStudies 1024→2000, generateQuestions 512→1024; was truncating on long transcripts
- **generate-transcript converted to streaming** — was a synchronous 3500-token response risking Vercel timeout; now streams via ReadableStream; transcript error surface added to UI (was completely silent before)
- **Textarea expanded** — rows 10→18 to show full generated transcript without scrolling
- **Privacy page** — still has "SE Prep" text (not yet updated in rename commit); low priority

### Outstanding
- seagent.co.uk → Vercel DNS (email DNS done, site DNS not yet pointed to Vercel)
- Privacy page still says "SE Prep" throughout — needs a find/replace pass
- Prompt caching on analyze route (cost optimisation, lower priority)
- Verify intro email tone on a fresh brief end-to-end
- Existing users won't hit /profile redirect for name capture — may need to set full_name manually in Supabase dashboard

### Key technical notes
- pdf-parse must be pinned to v1.1.1; import via `require("pdf-parse/lib/pdf-parse.js")` to avoid test-file side effect
- Regex in stripMarkdown must not use `s` flag — Vercel build target below ES2018
- Next.js version is 16.2.6 (Turbopack) — middleware deprecated, should migrate to proxy
- Email body uses [NEXT_STEPS] marker; case study section inserted between pain paragraph and CTA
- suggested_questions stored inside meddpicc JSONB — no extra DB column; old briefs render gracefully
- SC name sourced from user.user_metadata.full_name; falls back to "[SC Name]" if not set
- generate-transcript streams NDJSON: `meta` event (prospect identity), `text` events (chunks), `done`/`error`
- MEDDPICC overall_score stored as 0-24 in DB; displayed as /100 via Math.round(raw/24*100) everywhere

### Interview prep note (Apollo.io, 2026-05-28)
- App live at se-prep-web.vercel.app
- Demo path documented in interview brief (produced earlier this session)
- One pre-interview check: run a fresh brief to verify email tone after last prompt rewrite
