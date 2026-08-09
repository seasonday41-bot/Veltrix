-- VELTRIX diagnostic: compare 07 Aug 2026 vs 08 Aug 2026
-- Read-only. This file does NOT modify any data.

with d7 as (
  select r.market_id, m.market_name, r.top3, r.bottom2
  from public.veltrix_market_results r
  join public.veltrix_markets m on m.id = r.market_id
  where r.draw_date = '2026-08-07'::date
),
d8 as (
  select r.market_id, m.market_name, r.top3, r.bottom2
  from public.veltrix_market_results r
  join public.veltrix_markets m on m.id = r.market_id
  where r.draw_date = '2026-08-08'::date
),
paired as (
  select
    coalesce(d7.market_id,d8.market_id) as market_id,
    coalesce(d7.market_name,d8.market_name) as market_name,
    d7.top3 as top3_07,
    d7.bottom2 as bottom2_07,
    d8.top3 as top3_08,
    d8.bottom2 as bottom2_08,
    case
      when d7.market_id is null then 'NO_07'
      when d8.market_id is null then 'NO_08'
      when d7.top3 = d8.top3 and d7.bottom2 = d8.bottom2 then 'EXACT_DUPLICATE'
      else 'DIFFERENT'
    end as compare_status
  from d7
  full outer join d8 on d8.market_id = d7.market_id
)
select
  count(*) filter (where compare_status = 'EXACT_DUPLICATE') as exact_duplicate_markets,
  count(*) filter (where compare_status = 'DIFFERENT') as different_markets,
  count(*) filter (where compare_status = 'NO_07') as missing_07_markets,
  count(*) filter (where compare_status = 'NO_08') as missing_08_markets,
  count(*) as markets_seen_07_or_08
from paired;

-- Exact duplicates only: these are the suspicious markets.
with d7 as (
  select r.market_id, m.market_name, r.top3, r.bottom2
  from public.veltrix_market_results r
  join public.veltrix_markets m on m.id = r.market_id
  where r.draw_date = '2026-08-07'::date
),
d8 as (
  select r.market_id, m.market_name, r.top3, r.bottom2
  from public.veltrix_market_results r
  join public.veltrix_markets m on m.id = r.market_id
  where r.draw_date = '2026-08-08'::date
)
select
  d7.market_name,
  d7.top3 || '-' || d7.bottom2 as result_07,
  d8.top3 || '-' || d8.bottom2 as result_08
from d7
join d8 on d8.market_id = d7.market_id
where d7.top3 = d8.top3
  and d7.bottom2 = d8.bottom2
order by d7.market_name;

-- Full side-by-side list for every market found on either date.
with d7 as (
  select r.market_id, m.market_name, r.top3, r.bottom2
  from public.veltrix_market_results r
  join public.veltrix_markets m on m.id = r.market_id
  where r.draw_date = '2026-08-07'::date
),
d8 as (
  select r.market_id, m.market_name, r.top3, r.bottom2
  from public.veltrix_market_results r
  join public.veltrix_markets m on m.id = r.market_id
  where r.draw_date = '2026-08-08'::date
)
select
  coalesce(d7.market_name,d8.market_name) as market_name,
  case when d7.market_id is null then null else d7.top3 || '-' || d7.bottom2 end as result_07,
  case when d8.market_id is null then null else d8.top3 || '-' || d8.bottom2 end as result_08,
  case
    when d7.market_id is null then 'NO_07'
    when d8.market_id is null then 'NO_08'
    when d7.top3 = d8.top3 and d7.bottom2 = d8.bottom2 then 'EXACT_DUPLICATE'
    else 'DIFFERENT'
  end as compare_status
from d7
full outer join d8 on d8.market_id = d7.market_id
order by compare_status desc, market_name;