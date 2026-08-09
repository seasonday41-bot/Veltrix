-- VELTRIX explicit market aliases
-- Approved from RESULTS import UNKNOWN review on 2026-08-09.
-- These are aliases only. They do NOT create duplicate markets.

with alias_seed(alias, canonical_name) as (
  values
    ('ดาวโจนส์ VIP', 'หุ้นดาวโจนส์ VIP'),
    ('ดาวโจนส์สตาร์', 'หุ้นดาวโจนส์สตาร์'),
    ('เกาหลี VIP', 'หุ้นเกาหลี VIP'),
    ('จีน VIP บ่าย', 'หุ้นจีน VIP บ่าย'),
    ('สิงคโปร์ VIP', 'หุ้นสิงคโปร์ VIP'),
    ('อังกฤษ VIP', 'หุ้นอังกฤษ VIP'),
    ('รัสเซีย VIP', 'หุ้นรัสเซีย VIP'),
    ('เยอรมัน VIP', 'หุ้นเยอรมัน VIP')
)
insert into public.veltrix_market_aliases (market_id, alias, active)
select m.id, s.alias, true
from alias_seed s
join public.veltrix_markets m
  on lower(trim(m.market_name)) = lower(trim(s.canonical_name))
where m.active = true
on conflict do nothing;

-- Verify: should return 8 rows for this approved alias set.
select
  a.alias,
  m.market_name as canonical_market,
  a.active
from public.veltrix_market_aliases a
join public.veltrix_markets m on m.id = a.market_id
where lower(trim(a.alias)) in (
  lower('ดาวโจนส์ VIP'),
  lower('ดาวโจนส์สตาร์'),
  lower('เกาหลี VIP'),
  lower('จีน VIP บ่าย'),
  lower('สิงคโปร์ VIP'),
  lower('อังกฤษ VIP'),
  lower('รัสเซีย VIP'),
  lower('เยอรมัน VIP')
)
order by a.alias;
