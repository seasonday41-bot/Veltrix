-- VELTRIX canonical market seed
-- 60 real active markets. market_040 / market_041 are retained only as inactive
-- legacy duplicate labels for Hong Kong VIP and must never receive results.

insert into public.veltrix_markets (market_key, market_name, active)
values
  ('market_001', 'เกาหลี', true),
  ('market_002', 'จีนเช้า', true),
  ('market_003', 'จีนบ่าย', true),
  ('market_004', 'ดาวโจนส์', true),
  ('market_005', 'ไต้หวัน', true),
  ('market_006', 'ธ.ก.ส.', true),
  ('market_007', 'นิคเคอิ VIP เช้า', true),
  ('market_008', 'นิคเคอิ VIP บ่าย', true),
  ('market_009', 'นิคเคอิบ่าย', true),
  ('market_010', 'ประชาชนลาว', true),
  ('market_011', 'มาเลย์', true),
  ('market_012', 'เยอรมัน', true),
  ('market_013', 'รัฐบาลไทย', true),
  ('market_014', 'รัสเซีย', true),
  ('market_015', 'ลาว Extra', true),
  ('market_016', 'ลาว HD', true),
  ('market_017', 'ลาว VIP', true),
  ('market_018', 'ลาวกาชาด', true),
  ('market_019', 'ลาวทีวี', true),
  ('market_020', 'ลาวประตูชัย', true),
  ('market_021', 'ลาวพัฒนา', true),
  ('market_022', 'ลาวสตาร์', true),
  ('market_023', 'ลาวสตาร์ VIP', true),
  ('market_024', 'ลาวสันติภาพ', true),
  ('market_025', 'ลาวสามัคคี', true),
  ('market_026', 'ลาวสามัคคี VIP', true),
  ('market_027', 'ลาวอาเซียน', true),
  ('market_028', 'สิงคโปร์', true),
  ('market_029', 'หุ้นเกาหลี VIP', true),
  ('market_030', 'หุ้นจีน VIP เช้า', true),
  ('market_031', 'หุ้นจีน VIP บ่าย', true),
  ('market_032', 'หุ้นดาวโจนส์ VIP', true),
  ('market_033', 'หุ้นดาวโจนส์สตาร์', true),
  ('market_034', 'หุ้นไต้หวัน VIP', true),
  ('market_035', 'หุ้นนิคเคอิเช้า', true),
  ('market_036', 'หุ้นเยอรมัน VIP', true),
  ('market_037', 'หุ้นรัสเซีย VIP', true),
  ('market_038', 'หุ้นสิงคโปร์ VIP', true),
  ('market_039', 'หุ้นอังกฤษ VIP', true),
  ('market_040', 'หุ้นฮั่งเส็ง VIP เช้า', false),
  ('market_041', 'หุ้นฮั่งเส็ง VIP บ่าย', false),
  ('market_042', 'ออมสิน', true),
  ('market_043', 'อังกฤษ', true),
  ('market_044', 'อินเดีย', true),
  ('market_045', 'อียิปต์', true),
  ('market_046', 'ฮั่งเส็ง VIP เช้า', true),
  ('market_047', 'ฮั่งเส็ง VIP บ่าย', true),
  ('market_048', 'ฮั่งเส็งเช้า', true),
  ('market_049', 'ฮั่งเส็งบ่าย', true),
  ('market_050', 'ฮานอย Extra', true),
  ('market_051', 'ฮานอย HD', true),
  ('market_052', 'ฮานอย VIP', true),
  ('market_053', 'ฮานอยกาชาด', true),
  ('market_054', 'ฮานอยเฉพาะกิจ', true),
  ('market_055', 'ฮานอยดึก', true),
  ('market_056', 'ฮานอยทีวี', true),
  ('market_057', 'ฮานอยปกติ', true),
  ('market_058', 'ฮานอยพัฒนา', true),
  ('market_059', 'ฮานอยพิเศษ', true),
  ('market_060', 'ฮานอยสตาร์', true),
  ('market_061', 'ฮานอยสามัคคี', true),
  ('market_062', 'ฮานอยอาเซียน', true)
on conflict (market_key) do update
set market_name=excluded.market_name,
    active=excluded.active,
    updated_at=now();

-- Hong Kong VIP duplicate labels are aliases of the real markets.
delete from public.veltrix_market_aliases
where market_id in (select id from public.veltrix_markets where market_key in ('market_040','market_041'))
   or lower(trim(alias)) in (lower('หุ้นฮั่งเส็ง VIP เช้า'),lower('หุ้นฮั่งเส็ง VIP บ่าย'));

insert into public.veltrix_market_aliases (market_id,alias,active)
select m.id,x.alias,true
from (values
  ('market_046','หุ้นฮั่งเส็ง VIP เช้า'),
  ('market_047','หุ้นฮั่งเส็ง VIP บ่าย')
) x(market_key,alias)
join public.veltrix_markets m on m.market_key=x.market_key
on conflict do nothing;

select count(*) as veltrix_active_market_count
from public.veltrix_markets
where active=true; -- expected 60

select market_key,market_name,active
from public.veltrix_markets
order by market_key;
