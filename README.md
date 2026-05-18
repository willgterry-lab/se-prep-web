# SE Prep

A web app that helps Solutions Engineers and Presales Engineers prep for discovery and demo calls in minutes.

Paste your product URL. Paste your discovery notes. Get back:

- **MEDDPICC scorecard** — evidence-cited from your own notes, gaps flagged
- **Matched case studies** — ranked by relevance to the prospect's situation
- **Follow-up email** — drafted and ready to send

---

## How it works

1. **Product setup (once)** — enter your product's homepage URL. SE Prep crawls the site, extracts your value prop, ICP, pricing tiers, named customers, and case studies. You confirm the competitor list.
2. **New brief** — enter the prospect's name and paste your raw discovery notes (transcripts, bullets, anything).
3. **Instant output** — MEDDPICC scoring with verbatim evidence, top 3 case study matches with relevance reasoning, and a follow-up email ready to copy.

Briefs are saved and retrievable. Refresh your product context any time.

---

## Tech stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Supabase](https://supabase.com) — auth (magic link) + Postgres
- [Anthropic Claude](https://anthropic.com) — scraping extraction, MEDDPICC scoring, case study matching, email drafting
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Vercel](https://vercel.com) — deployment

---

## Running locally

### 1. Clone and install

```bash
git clone https://github.com/your-username/se-prep-web
cd se-prep-web
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the Supabase SQL editor
3. Copy your project URL and keys

### 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```
ANTHROPIC_API_KEY=               # from console.anthropic.com
NEXT_PUBLIC_SUPABASE_URL=        # your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # your Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=       # your Supabase service role key
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploying to Vercel

```bash
npx vercel
```

Add the same environment variables in the Vercel dashboard under **Settings → Environment Variables**.

Set the Supabase auth redirect URL to `https://your-vercel-url.vercel.app/auth/callback` in your Supabase project under **Authentication → URL Configuration**.

---

## Project structure

```
src/
├── app/
│   ├── (app)/               # Protected routes (auth required)
│   │   ├── dashboard/       # Brief list + product context overview
│   │   ├── setup/           # Product URL → scrape → confirm
│   │   └── brief/
│   │       ├── new/         # Discovery notes input
│   │       └── [id]/        # Brief output: MEDDPICC + cases + email
│   ├── api/
│   │   ├── scrape/          # Crawl product site, Claude extraction
│   │   ├── analyze/         # MEDDPICC + case study match + email
│   │   └── product-context/ # Save / fetch product context
│   ├── auth/callback/       # Supabase auth callback
│   └── login/               # Magic link login
├── components/
├── lib/
│   ├── anthropic.ts         # Anthropic client
│   └── supabase/            # Browser, server, and middleware clients
└── types/                   # Shared TypeScript types
supabase/
└── schema.sql               # Postgres schema + RLS policies
```
