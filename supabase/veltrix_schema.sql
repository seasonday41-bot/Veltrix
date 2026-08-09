-- VELTRIX Supabase schema
-- Project: six-digit-thai-lao
-- All VELTRIX objects are isolated with the veltrix_ prefix.
-- Designed for irregular market schedules: predictions are tied to the latest known result,
-- not to a guessed next calendar date.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Shared updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.veltrix_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1) Canonical markets
-- -----------------------------------------------------------------------------
create table if not exists public.veltrix_markets (
  id uuid primary key default gen_random_uuid(),
  market_key text not null unique,
  market_name text not null,
  country_code text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint veltrix_markets_key_format check (market_key ~ '^[a-z0-9][a-z0-9_-]*$')
);

create unique index if not exists veltrix_markets_name_unique_ci
  on public.veltrix_markets (lower(trim(market_name)));

create index if not exists veltrix_markets_active_idx
  on public.veltrix_markets (active, market_name);

-- -----------------------------------------------------------------------------
-- 2) Explicit aliases only. No fuzzy/automatic remapping.
-- -----------------------------------------------------------------------------
create table if not exists public.veltrix_market_aliases (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.veltrix_markets(id) on delete cascade,
  alias text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists veltrix_market_aliases_alias_unique_ci
  on public.veltrix_market_aliases (lower(trim(alias)));

create index if not exists veltrix_market_aliases_market_idx
  on public.veltrix_market_aliases (market_id, active);

-- -----------------------------------------------------------------------------
-- 3) Actual market results
--    One result per canonical market per draw date.
--    Calendar gaps do NOT count as missing draws; the engine reads latest occurrences.
-- -----------------------------------------------------------------------------
create table if not exists public.veltrix_market_results (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.veltrix_markets(id) on delete restrict,
  draw_date date not null,
  top3 text not null,
  bottom2 text not null,
  source text not null default 'manual_import',
  import_batch_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint veltrix_results_top3_format check (top3 ~ '^[0-9]{3}$'),
  constraint veltrix_results_bottom2_format check (bottom2 ~ '^[0-9]{2}$'),
  constraint veltrix_results_market_date_unique unique (market_id, draw_date)
);

create index if not exists veltrix_results_market_latest_idx
  on public.veltrix_market_results (market_id, draw_date desc, created_at desc);

create index if not exists veltrix_results_draw_date_idx
  on public.veltrix_market_results (draw_date desc);

-- -----------------------------------------------------------------------------
-- 4) Import batches
--    Exact same source text can be detected by content_hash.
--    Row-level duplicates are still blocked by (market_id, draw_date).
-- -----------------------------------------------------------------------------
create table if not exists public.veltrix_import_batches (
  id uuid primary key default gen_random_uuid(),
  content_hash text not null unique,
  source_date date,
  raw_text text not null,
  parsed_count integer not null default 0,
  added_count integer not null default 0,
  duplicate_count integer not null default 0,
  conflict_count integer not null default 0,
  unknown_market_count integer not null default 0,
  conflict_items jsonb not null default '[]'::jsonb,
  unknown_market_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint veltrix_import_counts_nonnegative check (
    parsed_count >= 0 and added_count >= 0 and duplicate_count >= 0
    and conflict_count >= 0 and unknown_market_count >= 0
  )
);

-- Add FK only after import_batches exists.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'veltrix_results_import_batch_fk'
  ) then
    alter table public.veltrix_market_results
      add constraint veltrix_results_import_batch_fk
      foreign key (import_batch_id)
      references public.veltrix_import_batches(id)
      on delete set null;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 5) Locked prediction snapshots for the NEXT occurrence after source_result_id.
--    This is the key rule for markets that do not draw every day.
--    MODE A: draws 1-3 main. MODE B: draws 3-5 main.
-- -----------------------------------------------------------------------------
create table if not exists public.veltrix_prediction_snapshots (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.veltrix_markets(id) on delete restrict,
  source_result_id uuid not null references public.veltrix_market_results(id) on delete restrict,
  mode text not null,
  engine_version text not null default 'v1',

  pool_a text,
  pool_b text,
  rank_scores jsonb not null default '{}'::jsonb,

  win6 text not null,
  reserve7 text not null,

  rud_top text,
  rud_bottom text,
  rud_shared text,
  rud_support text,
  rud_challenger text,

  pair2_top text[] not null default '{}'::text[],
  pair2_bottom text[] not null default '{}'::text[],
  pair3_top text[] not null default '{}'::text[],

  metadata jsonb not null default '{}'::jsonb,
  locked_at timestamptz not null default now(),
  settled_at timestamptz,
  created_at timestamptz not null default now(),

  constraint veltrix_snapshot_mode check (mode in ('A','B')),
  constraint veltrix_snapshot_win6_format check (win6 ~ '^[0-9]{6}$'),
  constraint veltrix_snapshot_reserve_format check (reserve7 ~ '^[0-9]$'),
  constraint veltrix_snapshot_rud_top_format check (rud_top is null or rud_top ~ '^[0-9]$'),
  constraint veltrix_snapshot_rud_bottom_format check (rud_bottom is null or rud_bottom ~ '^[0-9]$'),
  constraint veltrix_snapshot_rud_shared_format check (rud_shared is null or rud_shared ~ '^[0-9]$'),
  constraint veltrix_snapshot_rud_support_format check (rud_support is null or rud_support ~ '^[0-9]$'),
  constraint veltrix_snapshot_rud_challenger_format check (rud_challenger is null or rud_challenger ~ '^[0-9]$'),
  constraint veltrix_snapshot_pair2_top_len check (coalesce(array_length(pair2_top,1),0) <= 5),
  constraint veltrix_snapshot_pair2_bottom_len check (coalesce(array_length(pair2_bottom,1),0) <= 5),
  constraint veltrix_snapshot_pair3_top_len check (coalesce(array_length(pair3_top,1),0) <= 5),
  constraint veltrix_snapshot_source_mode_unique unique (source_result_id, mode, engine_version)
);

create index if not exists veltrix_snapshots_market_locked_idx
  on public.veltrix_prediction_snapshots (market_id, locked_at desc);

create index if not exists veltrix_snapshots_pending_idx
  on public.veltrix_prediction_snapshots (market_id, settled_at, locked_at desc);

-- -----------------------------------------------------------------------------
-- 6) Forward audit / settlement
-- -----------------------------------------------------------------------------
create table if not exists public.veltrix_forward_audit (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.veltrix_prediction_snapshots(id) on delete cascade,
  actual_result_id uuid not null references public.veltrix_market_results(id) on delete restrict,

  win6_top_count smallint not null default 0,
  win7_top_count smallint not null default 0,
  win6_top_full boolean not null default false,
  win7_top_full boolean not null default false,
  win6_top2_full boolean not null default false,
  win7_top2_full boolean not null default false,
  win6_bottom_full boolean not null default false,
  win7_bottom_full boolean not null default false,

  rud_top_hit boolean,
  rud_bottom_hit boolean,
  rud_shared_hit boolean,
  rud_support_hit boolean,
  rud_challenger_hit boolean,

  pair2_top_hit boolean,
  pair2_bottom_hit boolean,
  pair3_top_hit boolean,

  details jsonb not null default '{}'::jsonb,
  settled_at timestamptz not null default now(),

  constraint veltrix_audit_top_count_range check (win6_top_count between 0 and 3 and win7_top_count between 0 and 3),
  constraint veltrix_audit_snapshot_result_unique unique (snapshot_id, actual_result_id)
);

create index if not exists veltrix_forward_audit_result_idx
  on public.veltrix_forward_audit (actual_result_id, settled_at desc);

create index if not exists veltrix_forward_audit_snapshot_idx
  on public.veltrix_forward_audit (snapshot_id);

-- -----------------------------------------------------------------------------
-- 7) Engine settings. Keeps A/B weights and UI/engine flags isolated per version.
-- -----------------------------------------------------------------------------
create table if not exists public.veltrix_engine_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Seed only VELTRIX-owned settings.
insert into public.veltrix_engine_settings (setting_key, setting_value, description)
values
  ('engine_version', '"v1"'::jsonb, 'Current VELTRIX engine version'),
  ('mode_a', '{"main_window":"1-3","support_window":"3-5"}'::jsonb, 'MODE A: recent window is primary'),
  ('mode_b', '{"main_window":"3-5","support_window":"1-3"}'::jsonb, 'MODE B: memory window is primary'),
  ('result_reading', '{"basis":"latest_occurrences","calendar_gap_is_missing":false,"history_limit":20}'::jsonb, 'Read latest occurrences for each market; never infer missing daily draws'),
  ('pair2_display', '{"top_internal":5,"bottom_internal":5,"ui_label":"เจาะ 2","show_top_bottom_labels":false}'::jsonb, 'Keep 5+5 internally while UI shows one compact เจาะ 2 block'),
  ('rud_display', '{"top_count":1,"bottom_count":1,"shared_support_enabled":true}'::jsonb, 'One top Rud and one bottom Rud; when equal, show shared Rud plus support digit')
on conflict (setting_key) do nothing;

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
drop trigger if exists veltrix_markets_touch_updated_at on public.veltrix_markets;
create trigger veltrix_markets_touch_updated_at
before update on public.veltrix_markets
for each row execute function public.veltrix_touch_updated_at();

drop trigger if exists veltrix_results_touch_updated_at on public.veltrix_market_results;
create trigger veltrix_results_touch_updated_at
before update on public.veltrix_market_results
for each row execute function public.veltrix_touch_updated_at();

drop trigger if exists veltrix_settings_touch_updated_at on public.veltrix_engine_settings;
create trigger veltrix_settings_touch_updated_at
before update on public.veltrix_engine_settings
for each row execute function public.veltrix_touch_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: enabled with no anon policies. VELTRIX should write/read through server-side
-- Vercel API routes using SUPABASE_SERVICE_ROLE_KEY. Never expose that key to browser JS.
-- -----------------------------------------------------------------------------
alter table public.veltrix_markets enable row level security;
alter table public.veltrix_market_aliases enable row level security;
alter table public.veltrix_market_results enable row level security;
alter table public.veltrix_import_batches enable row level security;
alter table public.veltrix_prediction_snapshots enable row level security;
alter table public.veltrix_forward_audit enable row level security;
alter table public.veltrix_engine_settings enable row level security;

-- -----------------------------------------------------------------------------
-- Helpful view: latest 20 actual occurrences per market.
-- Calendar gaps are ignored; rn is occurrence order, not day difference.
-- -----------------------------------------------------------------------------
create or replace view public.veltrix_latest_20 as
select *
from (
  select
    r.id,
    r.market_id,
    m.market_key,
    m.market_name,
    r.draw_date,
    r.top3,
    r.bottom2,
    row_number() over (
      partition by r.market_id
      order by r.draw_date desc, r.created_at desc, r.id desc
    ) as rn
  from public.veltrix_market_results r
  join public.veltrix_markets m on m.id = r.market_id
  where m.active = true
) x
where x.rn <= 20;

comment on view public.veltrix_latest_20 is
'Latest 20 actual occurrences per market. rn is occurrence order; calendar gaps do not create missing draws.';
