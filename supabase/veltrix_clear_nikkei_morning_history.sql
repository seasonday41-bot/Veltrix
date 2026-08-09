-- VELTRIX cleanup: clear ONLY the two suspect Nikkei morning histories.
-- This does NOT delete market definitions or aliases.
-- Dependent prediction snapshots / forward audits linked to these results
-- will cascade-delete according to the current VELTRIX foreign keys.

begin;

-- Preview exact canonical markets to be affected.
select id, market_key, market_name
from public.veltrix_markets
where market_name in ('นิคเคอิ VIP เช้า', 'หุ้นนิคเคอิเช้า')
order by market_name;

-- Delete historical results for ONLY these two markets.
delete from public.veltrix_market_results r
using public.veltrix_markets m
where r.market_id = m.id
  and m.market_name in ('นิคเคอิ VIP เช้า', 'หุ้นนิคเคอิเช้า');

commit;

-- Verify: both should now show 0 rows.
select
  m.market_name,
  count(r.id) as remaining_results
from public.veltrix_markets m
left join public.veltrix_market_results r on r.market_id = m.id
where m.market_name in ('นิคเคอิ VIP เช้า', 'หุ้นนิคเคอิเช้า')
group by m.market_name
order by m.market_name;
