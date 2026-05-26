# Session log

## Current state (2026-05-26)

### Completed this session
- Email DNS fully set up on Namesco (Resend + Supabase SMTP confirmed working)
- Reactive case study one-liners in intro email — each selected case study appends its one-liner; deselecting removes it from body and links section simultaneously
- One-liners appear in a "How we've helped businesses like yours:" section with dash-prefixed bullets, positioned before the next steps / CTA using [NEXT_STEPS] marker
- Email section renamed "Follow-up email" → "Intro Email" throughout (UI + copy-all text)
- Reframed email prompt: SC pre-call intro (before first SC call) not AE post-discovery follow-up — explicit prohibitions on post-call language, SC introduces themselves as briefed by the AE
- SC name passed into email prompt and sign-off via user.user_metadata.full_name
- Name capture on first login: auth callback redirects to /profile if full_name missing; stored in Supabase user_metadata
- Suggested questions card below MEDDPICC breakdown: 3x Opening the call / 3x Deeper discovery / 3x Technical deep dive — generated in parallel with email drafting, stored inside meddpicc JSONB (no schema migration needed)
- All changes deployed to Vercel on main branch

### Outstanding
- seagent.co.uk → Vercel DNS connection (email DNS done, site DNS not yet pointed to Vercel)
- Prompt caching on analyze route (cost optimisation, lower priority)
- Verify intro email tone on a fresh brief — prompt updated but not yet confirmed working end-to-end
- Existing users (Will) won't be prompted for name via auth callback — may need to visit /profile manually or set full_name via Supabase dashboard

### Key technical notes
- pdf-parse must be pinned to v1.1.1 — v2 has completely different API
- Import via `require("pdf-parse/lib/pdf-parse.js")` to avoid test-file side effect on init
- Regex in stripMarkdown must not use `s` flag — Vercel build target is below ES2018
- Next.js version is 16.2.6 (Turbopack) — middleware deprecated, should migrate to proxy
- Email body uses [NEXT_STEPS] marker to split before CTA; case study section inserted between pain paragraph and next steps
- suggested_questions stored inside meddpicc JSONB — no extra DB column; old briefs render without the card gracefully
- SC name sourced from user.user_metadata.full_name; falls back to "[SC Name]" if not set
