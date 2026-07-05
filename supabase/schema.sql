-- Run this in your Supabase SQL editor to set up the database schema.

create table public.product_contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  company text not null,
  homepage text not null,
  one_line_value text not null,
  icp text[] default '{}',
  pricing_tiers jsonb default '[]',
  named_customers text[] default '{}',
  case_studies jsonb default '[]',
  competitor_mentions text[] default '{}',
  crawled_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  prospect_name text not null,
  prospect_company text not null,
  discovery_notes text not null,
  meddpicc jsonb,
  matched_case_studies jsonb default '[]',
  follow_up_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row-level security: users can only access their own rows.
alter table public.product_contexts enable row level security;
alter table public.briefs enable row level security;

create policy "Users manage own product context"
  on public.product_contexts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own briefs"
  on public.briefs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at on row changes.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_product_contexts
  before update on public.product_contexts
  for each row execute function public.set_updated_at();

create trigger set_updated_at_briefs
  before update on public.briefs
  for each row execute function public.set_updated_at();


-- ─── Migration v2: deals and deal_tasks ───────────────────────────────────────
-- Run this block in the Supabase SQL editor on existing installs.
-- Safe to run on a fresh install immediately after the schema above.

-- One deal per prospect/opportunity. Every brief, POV, and VE stage belongs to a deal.
create table public.deals (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        references auth.users(id) on delete cascade not null,
  prospect_name    text        not null,
  prospect_company text        not null,
  stage            text        not null default 'prep',
  -- stage values: 'prep' | 'post_call' | 'pov' | 'value_engineering'
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Structured task list generated from each analysis run, attached to a deal.
create table public.deal_tasks (
  id           uuid        primary key default gen_random_uuid(),
  deal_id      uuid        references public.deals(id) on delete cascade not null,
  description  text        not null,
  status       text        not null default 'open',  -- 'open' | 'done'
  source       text        not null,                 -- e.g. 'post_call_2026-07-01'
  owner        text,                                 -- 'SC', 'Prospect', or null
  reminder_at  timestamptz,                          -- null if no reminder set
  created_at   timestamptz default now(),
  completed_at timestamptz
);

-- Extend briefs with deal linkage and stage.
alter table public.briefs
  add column if not exists deal_id uuid references public.deals(id) on delete cascade,
  add column if not exists stage   text not null default 'prep',
  add column if not exists delta   jsonb,
  add column if not exists risks   jsonb default '[]';

-- RLS for deals and deal_tasks.
alter table public.deals enable row level security;
alter table public.deal_tasks enable row level security;

create policy "Users manage own deals"
  on public.deals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own deal tasks"
  on public.deal_tasks for all
  using (
    exists (
      select 1 from public.deals
      where deals.id = deal_tasks.deal_id
        and deals.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.deals
      where deals.id = deal_tasks.deal_id
        and deals.user_id = auth.uid()
    )
  );

-- updated_at triggers for new tables.
create trigger set_updated_at_deals
  before update on public.deals
  for each row execute function public.set_updated_at();

-- Backfill: create one deal per unique (user_id, prospect_company) from existing briefs,
-- then link each brief to its deal.
-- Uses DISTINCT ON to pick the earliest brief's prospect_name for the deal name.
insert into public.deals (user_id, prospect_name, prospect_company, stage)
select distinct on (user_id, lower(prospect_company))
  user_id, prospect_name, prospect_company, 'prep'
from public.briefs
where deal_id is null
order by user_id, lower(prospect_company), created_at asc;

update public.briefs b
set deal_id = d.id
from public.deals d
where d.user_id = b.user_id
  and lower(d.prospect_company) = lower(b.prospect_company)
  and b.deal_id is null;


-- ─── Migration v3: POV stage ──────────────────────────────────────────────────
-- Run this block in the Supabase SQL editor on existing installs.

alter table public.deals
  add column if not exists success_criteria jsonb default '[]',
  add column if not exists share_token      text unique;

alter table public.briefs
  add column if not exists pov_assessment jsonb default '[]',
  add column if not exists recording_url  text;


-- ─── Migration v4: Value Engineering stage ───────────────────────────────────
-- Run this block in the Supabase SQL editor on existing installs.

alter table public.deals
  add column if not exists ve_proposal      jsonb,
  add column if not exists ve_slider_inputs jsonb,
  add column if not exists ve_published     boolean not null default false;

alter table public.briefs
  add column if not exists ve_baseline_inputs jsonb default '[]';


-- ─── Migration v5: stakeholders ───────────────────────────────────────────────
-- Run this block in the Supabase SQL editor on existing installs.

-- Prospect-side contacts mentioned across a deal's calls, with job role.
create table public.deal_stakeholders (
  id                   uuid        primary key default gen_random_uuid(),
  deal_id              uuid        references public.deals(id) on delete cascade not null,
  name                 text        not null,
  role                 text,
  source               text        not null default 'ai',  -- 'ai' | 'manual'
  first_mentioned_brief_id uuid    references public.briefs(id) on delete set null,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- Case-insensitive dedup: upserts match on (deal_id, lower(name)).
create unique index deal_stakeholders_deal_id_lower_name_idx
  on public.deal_stakeholders (deal_id, lower(name));

alter table public.deal_stakeholders enable row level security;

create policy "Users manage own deal stakeholders"
  on public.deal_stakeholders for all
  using (
    exists (
      select 1 from public.deals
      where deals.id = deal_stakeholders.deal_id
        and deals.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.deals
      where deals.id = deal_stakeholders.deal_id
        and deals.user_id = auth.uid()
    )
  );

create trigger set_updated_at_deal_stakeholders
  before update on public.deal_stakeholders
  for each row execute function public.set_updated_at();


-- ─── Migration v6: task auto-completion suggestions ──────────────────────────
-- Run this block in the Supabase SQL editor on existing installs.

-- Set when a later call's transcript indicates an open task is already done.
-- Never auto-completes the task itself -- the SC confirms or dismisses in the UI.
alter table public.deal_tasks
  add column if not exists suggested_done_evidence text;


-- ─── Migration v7: success criteria discrepancy tracking ─────────────────────
-- Run this block in the Supabase SQL editor on existing installs.

-- Full count of distinct criteria agreed on the kickoff call, before narrowing
-- down to the 5 stored in success_criteria. Lets the UI show when a call agreed
-- more criteria than the app tracks, instead of silently dropping the rest.
alter table public.deals
  add column if not exists success_criteria_total_agreed integer;


-- ─── Migration v8: real call date ─────────────────────────────────────────────
-- Run this block in the Supabase SQL editor on existing installs.

-- The actual date the call happened, distinct from created_at (when the brief
-- was logged into the app, which can be days or weeks later). SC-set manually,
-- or best-effort extracted from the transcript; null falls back to created_at.
alter table public.briefs
  add column if not exists call_date date;
