-- VELTRIX explicit market aliases
-- Explicit aliases only. No fuzzy/automatic remapping.

with alias_seed(alias, canonical_name) as (
  values
    ('ดาวโจนส์ VIP', 'หุ้นดาวโจนส์ VIP'),
    ('ดาวโจนส์สตาร์', 'หุ้นดาวโจนส์สตาร์'),
    ('เกาหลี VIP', 'หุ้นเกาหลี VIP'),
    ('จีน VIP เช้า', 'หุ้นจีน VIP เช้า'),
    ('จีน VIP บ่าย', 'หุ้นจีน VIP บ่าย'),
    ('สิงคโปร์ VIP', 'หุ้นสิงคโปร์ VIP'),
    ('อังกฤษ VIP', 'หุ้นอังกฤษ VIP'),
    ('รัสเซีย VIP', 'หุ้นรัสเซีย VIP'),
    ('เยอรมัน VIP', 'หุ้นเยอรมัน VIP'),
    ('ไต้หวัน VIP', 'หุ้นไต้หวัน VIP'),
    ('นิคเคอิเช้า', 'หุ้นนิคเคอิเช้า'),
    ('หุ้นฮั่งเส็ง VIP เช้า', 'ฮั่งเส็ง VIP เช้า'),
    ('หุ้นฮั่งเส็ง VIP บ่าย', 'ฮั่งเส็ง VIP บ่าย')
)
insert into public.veltrix_market_aliases (market_id, alias, active)
select m.id, s.alias, true
from alias_seed s
join public.veltrix_markets m
  on lower(trim(m.market_name)) = lower(trim(s.canonical_name))
where m.active = true
on conflict do nothing;

select a.alias, m.market_name as canonical_market, a.active
from public.veltrix_market_aliases a
join public.veltrix_markets m on m.id = a.market_id
where a.active = true
order by a.alias;
