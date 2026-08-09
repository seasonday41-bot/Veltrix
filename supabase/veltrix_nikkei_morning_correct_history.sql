-- VELTRIX Nikkei morning history correction
-- Approved by user on 2026-08-09.
-- Corrects ONLY:
--   1) หุ้นนิคเคอิเช้า
--   2) นิคเคอิ VIP เช้า
-- Other markets are untouched.
--
-- Important:
-- - 20 Jul 2026 for หุ้นนิคเคอิเช้า was "งดออกผล", so no row is stored.
-- - This script is safe to run whether or not the earlier clear script was run.

begin;

-- Remove old/mis-mapped histories for only these two markets.
-- Dependent prediction snapshots / forward audits cascade according to schema FKs.
delete from public.veltrix_market_results r
using public.veltrix_markets m
where r.market_id = m.id
  and m.market_name in ('หุ้นนิคเคอิเช้า', 'นิคเคอิ VIP เช้า');

-- Correct หุ้นนิคเคอิเช้า history: 19 actual occurrences.
with rows(draw_date, top3, bottom2) as (
  values
    ('2026-07-13'::date, '686', '87'),
    ('2026-07-14'::date, '836', '37'),
    ('2026-07-15'::date, '391', '41'),
    ('2026-07-16'::date, '679', '72'),
    ('2026-07-17'::date, '648', '06'),
    ('2026-07-21'::date, '568', '56'),
    ('2026-07-22'::date, '112', '93'),
    ('2026-07-23'::date, '444', '84'),
    ('2026-07-24'::date, '875', '85'),
    ('2026-07-27'::date, '401', '86'),
    ('2026-07-28'::date, '646', '73'),
    ('2026-07-29'::date, '986', '06'),
    ('2026-07-30'::date, '841', '22'),
    ('2026-07-31'::date, '225', '82'),
    ('2026-08-03'::date, '051', '51'),
    ('2026-08-04'::date, '335', '55'),
    ('2026-08-05'::date, '100', '47'),
    ('2026-08-06'::date, '667', '77'),
    ('2026-08-07'::date, '916', '10')
)
insert into public.veltrix_market_results
  (market_id, draw_date, top3, bottom2, source)
select m.id, r.draw_date, r.top3, r.bottom2, 'nikkei_user_correction_20260809'
from rows r
cross join public.veltrix_markets m
where m.market_name = 'หุ้นนิคเคอิเช้า'
  and m.active = true
order by r.draw_date asc
on conflict (market_id, draw_date) do update
set top3 = excluded.top3,
    bottom2 = excluded.bottom2,
    source = excluded.source,
    updated_at = now();

-- Correct นิคเคอิ VIP เช้า history: 20 actual occurrences through 08 Aug 2026.
with rows(draw_date, top3, bottom2) as (
  values
    ('2026-07-20'::date, '520', '03'),
    ('2026-07-21'::date, '396', '15'),
    ('2026-07-22'::date, '920', '06'),
    ('2026-07-23'::date, '373', '03'),
    ('2026-07-24'::date, '005', '26'),
    ('2026-07-25'::date, '967', '87'),
    ('2026-07-26'::date, '940', '70'),
    ('2026-07-27'::date, '331', '72'),
    ('2026-07-28'::date, '875', '36'),
    ('2026-07-29'::date, '721', '33'),
    ('2026-07-30'::date, '152', '51'),
    ('2026-07-31'::date, '445', '76'),
    ('2026-08-01'::date, '615', '28'),
    ('2026-08-02'::date, '865', '87'),
    ('2026-08-03'::date, '187', '38'),
    ('2026-08-04'::date, '616', '17'),
    ('2026-08-05'::date, '298', '12'),
    ('2026-08-06'::date, '072', '57'),
    ('2026-08-07'::date, '475', '96'),
    ('2026-08-08'::date, '628', '72')
)
insert into public.veltrix_market_results
  (market_id, draw_date, top3, bottom2, source)
select m.id, r.draw_date, r.top3, r.bottom2, 'nikkei_user_correction_20260809'
from rows r
cross join public.veltrix_markets m
where m.market_name = 'นิคเคอิ VIP เช้า'
  and m.active = true
order by r.draw_date asc
on conflict (market_id, draw_date) do update
set top3 = excluded.top3,
    bottom2 = excluded.bottom2,
    source = excluded.source,
    updated_at = now();

commit;

-- Verification. Expected:
-- หุ้นนิคเคอิเช้า     = 19 rows, latest 2026-08-07 = 916-10
-- นิคเคอิ VIP เช้า    = 20 rows, latest 2026-08-08 = 628-72
select
  m.market_name,
  count(r.id) as draw_count,
  max(r.draw_date) as latest_draw_date,
  (array_agg(r.top3 || '-' || r.bottom2 order by r.draw_date desc))[1] as latest_result
from public.veltrix_markets m
left join public.veltrix_market_results r on r.market_id = m.id
where m.market_name in ('หุ้นนิคเคอิเช้า', 'นิคเคอิ VIP เช้า')
group by m.market_name
order by m.market_name;

-- Verify the engine-facing latest 10 occurrences for these markets.
select market_name, rn, draw_date, top3, bottom2
from public.veltrix_latest_10
where market_name in ('หุ้นนิคเคอิเช้า', 'นิคเคอิ VIP เช้า')
order by market_name, rn;
