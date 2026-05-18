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
