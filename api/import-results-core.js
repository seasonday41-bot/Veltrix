import crypto from 'node:crypto';
import {db,json,allow} from './_db.js';
import {ensureAutoSnapshots} from '../lib/auto-snapshot.js';
import {settlePrediction,ERROR_MEMORY_VERSIONS} from '../lib/error-memory.js';

const THAI_MONTHS={
  'มกราคม':1,'ม.ค.':1,'ม.ค':1,'กุมภาพันธ์':2,'ก.พ.':2,'ก.พ':2,'มีนาคม':3,'มี.ค.':3,'มี.ค':3,
  'เมษายน':4,'เม.ย.':4,'เม.ย':4,'พฤษภาคม':5,'พ.ค.':5,'พ.ค':5,'มิถุนายน':6,'มิ.ย.':6,'มิ.ย':6,
  'กรกฎาคม':7,'ก.ค.':7,'ก.ค':7,'สิงหาคม':8,'ส.ค.':8,'ส.ค':8,'กันยายน':9,'ก.ย.':9,'ก.ย':9,
  'ตุลาคม':10,'ต.ค.':10,'ต.ค':10,'พฤศจิกายน':11,'พ.ย.':11,'พ.ย':11,'ธันวาคม':12,'ธ.ค.':12,'ธ.ค':12
};

// Explicit aliases approved from the user's two-name market list.
// These are importer fallbacks, so both forms work even before the SQL alias seed is run.
const INPUT_MARKET_ALIASES={
  'หุ้นจีนเช้า':'จีนเช้า',
  'หุ้นจีนบ่าย':'จีนบ่าย',
  'หุ้นฮั่งเส็งเช้า':'ฮั่งเส็งเช้า',
  'หุ้นฮั่งเส็งบ่าย':'ฮั่งเส็งบ่าย',
  'หุ้นไต้หวัน':'ไต้หวัน',
  'หุ้นนิคเคอิบ่าย':'นิคเคอิบ่าย',
  'หุ้นเกาหลี':'เกาหลี',
  'หุ้นสิงคโปร์':'สิงคโปร์',
  'หุ้นอินเดีย':'อินเดีย',
  'หุ้นอียิปต์':'อียิปต์',
  'หุ้นรัสเซีย':'รัสเซีย',
  'หุ้นอังกฤษ':'อังกฤษ',
  'หุ้นเยอรมัน':'เยอรมัน',
  'หุ้นดาวโจนส์':'ดาวโจนส์',

  'ดาวโจนส์ VIP':'หุ้นดาวโจนส์ VIP',
  'ดาวโจนส์สตาร์':'หุ้นดาวโจนส์สตาร์',
  'เกาหลี VIP':'หุ้นเกาหลี VIP',
  'จีน VIP เช้า':'หุ้นจีน VIP เช้า',
  'จีน VIP บ่าย':'หุ้นจีน VIP บ่าย',
  'สิงคโปร์ VIP':'หุ้นสิงคโปร์ VIP',
  'อังกฤษ VIP':'หุ้นอังกฤษ VIP',
  'รัสเซีย VIP':'หุ้นรัสเซีย VIP',
  'เยอรมัน VIP':'หุ้นเยอรมัน VIP',
  'ไต้หวัน VIP':'หุ้นไต้หวัน VIP',
  'นิคเคอิเช้า':'หุ้นนิคเคอิเช้า',
  'หุ้นฮั่งเส็ง VIP เช้า':'ฮั่งเส็ง VIP เช้า',
  'หุ้นฮั่งเส็ง VIP บ่าย':'ฮั่งเส็ง VIP บ่าย'
};

function normName(s=''){return s.trim().replace(/\s+/g,' ').toLocaleLowerCase('th-TH');}
function cleanMarket(s=''){return s.replace(/^[^A-Za-z0-9ก-๙]+/u,'').trim().replace(/\s+/g,' ');}
function isoDate(y,m,d){return `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
function parseDate(raw){
  const m=raw.match(/ประจำวันที่\s*(\d{1,2})\s+([^\s]+)\s+(\d{4})/u)||raw.match(/วันที่\s*(\d{1,2})\s+([^\s]+)\s+(\d{4})/u);
  if(!m)return null;
  const month=THAI_MONTHS[m[2]]; if(!month)return null;
  let year=Number(m[3]); if(year>2400)year-=543;
  return isoDate(year,month,Number(m[1]));
}
function canonPair(s){return [...String(s)].sort().join('');}
function canonTriple(s){return [...String(s)].sort().join('');}
function arr(v){return Array.isArray(v)?v:[];}

function legacyAudit(snapshot,actual){
  const w6=new Set([...snapshot.win6]); const w7=new Set([...snapshot.win6,snapshot.reserve7]);
  const top=[...actual.top3], top2=actual.top3.slice(-2), bottom=actual.bottom2;
  const c6=top.filter(d=>w6.has(d)).length, c7=top.filter(d=>w7.has(d)).length;
  const top2full=(set)=>[...top2].every(d=>set.has(d));
  const botfull=(set)=>[...bottom].every(d=>set.has(d));
  const p2t=arr(snapshot.pair2_top).some(p=>canonPair(p)===canonPair(top2));
  const p2b=arr(snapshot.pair2_bottom).some(p=>canonPair(p)===canonPair(bottom));
  const p3=arr(snapshot.pair3_top).some(p=>canonTriple(p)===canonTriple(actual.top3));
  return {
    snapshot_id:snapshot.id,actual_result_id:actual.id,
    win6_top_count:c6,win7_top_count:c7,
    win6_top_full:c6===3,win7_top_full:c7===3,
    win6_top2_full:top2full(w6),win7_top2_full:top2full(w7),
    win6_bottom_full:botfull(w6),win7_bottom_full:botfull(w7),
    rud_top_hit:snapshot.rud_top?top2.includes(snapshot.rud_top):null,
    rud_bottom_hit:snapshot.rud_bottom?bottom.includes(snapshot.rud_bottom):null,
    rud_shared_hit:snapshot.rud_shared?(top2+bottom).includes(snapshot.rud_shared):null,
    rud_support_hit:snapshot.rud_support?(top2+bottom).includes(snapshot.rud_support):null,
    rud_challenger_hit:snapshot.rud_challenger?(top2+bottom).includes(snapshot.rud_challenger):null,
    pair2_top_hit:p2t,pair2_bottom_hit:p2b,pair3_top_hit:p3,
    details:{mode:snapshot.mode,actual_top3:actual.top3,actual_bottom2:actual.bottom2,engine_version:snapshot.engine_version}
  };
}

function predictionFromSnapshot(snapshot){
  const m=snapshot.metadata||{};
  return {
    mode:snapshot.mode,
    win6:snapshot.win6,
    reserve7:snapshot.reserve7,
    rudTop:snapshot.rud_top,
    rudBottom:snapshot.rud_bottom,
    pair2Shared:m.pair2_shared||snapshot.pair2_top||[],
    pair2Top:snapshot.pair2_top||[],
    pair3Top:snapshot.pair3_top||[],
    driftScore:m.drift_score,
    driftLevel:m.drift_level,
    baseWeight:m.base_weight,
    recentWeight:m.recent_weight,
    doubleWatch:m.double_watch||[],
    doubleChance:m.double_chance,
    formulaOutputs:m.formula_outputs||{},
    formulaReliability:m.formula_reliability||{}
  };
}

function audit(snapshot,actual,input){
  if(snapshot.engine_version!==ERROR_MEMORY_VERSIONS.live)return legacyAudit(snapshot,actual);
  const settled=settlePrediction(predictionFromSnapshot(snapshot),actual,{
    backfill:false,
    market_id:actual.market_id,
    source_result_id:snapshot.source_result_id,
    target_result_id:actual.id,
    source_date:snapshot.metadata?.source_date||null,
    target_date:actual.draw_date
  });
  return {snapshot_id:snapshot.id,actual_result_id:actual.id,...settled};
}

export default async function handler(req,res){
  allow(res,'POST');
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  try{
    const raw=String(req.body?.raw_text||'').trim(); const dry=Boolean(req.body?.dry_run);
    if(!raw)return json(res,400,{error:'ยังไม่มีข้อความผลให้ตรวจ'});
    const sourceDate=parseDate(raw);
    if(!sourceDate)return json(res,400,{error:'อ่านวันที่จากหัวข้อไม่ได้'});

    const [markets,aliases,existing]=await Promise.all([
      db('veltrix_markets?select=id,market_key,market_name&active=eq.true'),
      db('veltrix_market_aliases?select=market_id,alias&active=eq.true'),
      db('veltrix_market_results?select=id,market_id,draw_date,top3,bottom2,created_at&order=draw_date.desc,created_at.desc')
    ]);
    const marketById=new Map((markets||[]).map(m=>[m.id,m]));
    const nameMap=new Map();
    for(const m of markets||[])nameMap.set(normName(m.market_name),m);
    for(const a of aliases||[]){const m=marketById.get(a.market_id);if(m)nameMap.set(normName(a.alias),m);}

    for(const [alias,canonical] of Object.entries(INPUT_MARKET_ALIASES)){
      const market=nameMap.get(normName(canonical));
      if(market)nameMap.set(normName(alias),market);
    }

    const currentMap=new Map(); const latestByMarket=new Map();
    for(const r of existing||[]){
      currentMap.set(`${r.market_id}|${r.draw_date}`,r);
      if(!latestByMarket.has(r.market_id))latestByMarket.set(r.market_id,r);
    }

    const parsed=[];
    for(const line of raw.split(/\r?\n/)){
      const m=line.match(/^\s*(\d{3})-(\d{2})\s+(.+?)\s*$/u); if(!m)continue;
      const top3=m[1],bottom2=m[2],rawMarket=cleanMarket(m[3]);
      const market=nameMap.get(normName(rawMarket));
      if(!market){parsed.push({raw_market:rawMarket,top3,bottom2,draw_date:sourceDate,status:'UNKNOWN'});continue;}
      const old=currentMap.get(`${market.id}|${sourceDate}`);
      let status='NEW';
      if(old)status=(old.top3===top3&&old.bottom2===bottom2)?'DUPLICATE':'CONFLICT';
      const previous=latestByMarket.get(market.id)||null;
      parsed.push({market_id:market.id,market_name:market.market_name,raw_market:rawMarket,top3,bottom2,draw_date:sourceDate,status,previous_result_id:previous?.id||null,previous_draw_date:previous?.draw_date||null});
    }
    if(!parsed.length)return json(res,400,{error:'ไม่พบบรรทัดรูปแบบ 000-00 ชื่อตลาด'});

    const stats={
      parsed_count:parsed.length,
      added_count:parsed.filter(x=>x.status==='NEW').length,
      duplicate_count:parsed.filter(x=>x.status==='DUPLICATE').length,
      conflict_count:parsed.filter(x=>x.status==='CONFLICT').length,
      unknown_market_count:parsed.filter(x=>x.status==='UNKNOWN').length
    };
    const base={source_date:sourceDate,...stats,items:parsed.map(({previous_result_id,previous_draw_date,...x})=>x)};
    if(dry)return json(res,200,base);

    const hash=crypto.createHash('sha256').update(raw).digest('hex');
    let batches=await db(`veltrix_import_batches?select=id&content_hash=eq.${hash}&limit=1`);
    let batchId=batches?.[0]?.id;
    if(!batchId){
      const inserted=await db('veltrix_import_batches',{method:'POST',prefer:'return=representation',body:[{
        content_hash:hash,source_date:sourceDate,raw_text:raw,...stats,
        conflict_items:parsed.filter(x=>x.status==='CONFLICT').map(x=>({market:x.market_name,top3:x.top3,bottom2:x.bottom2})),
        unknown_market_items:parsed.filter(x=>x.status==='UNKNOWN').map(x=>({market:x.raw_market,top3:x.top3,bottom2:x.bottom2}))
      }]});
      batchId=inserted?.[0]?.id;
    }

    const newItems=parsed.filter(x=>x.status==='NEW');

    // AUTO LOCK: prediction is created before the actual is inserted.
    let autoLock={created:0,markets:0,skipped:0};
    if(newItems.length)autoLock=await ensureAutoSnapshots(newItems);

    let insertedRows=[];
    if(newItems.length){
      insertedRows=await db('veltrix_market_results',{method:'POST',prefer:'return=representation',body:newItems.map(x=>({market_id:x.market_id,draw_date:x.draw_date,top3:x.top3,bottom2:x.bottom2,source:'manual_import',import_batch_id:batchId}))});
    }

    let settled=0,adaptiveMemoryAudits=0;
    if(insertedRows?.length){
      const predIds=[...new Set(newItems.map(x=>x.previous_result_id).filter(Boolean))];
      let pending=[];
      if(predIds.length) pending=await db('veltrix_prediction_snapshots?select=*&settled_at=is.null');
      const pendingBySource=new Map();
      for(const s of pending||[]){if(predIds.includes(s.source_result_id)){if(!pendingBySource.has(s.source_result_id))pendingBySource.set(s.source_result_id,[]);pendingBySource.get(s.source_result_id).push(s);}}
      const inputByKey=new Map(newItems.map(x=>[`${x.market_id}|${x.draw_date}`,x]));
      const audits=[]; const settledSnapshotIds=[];
      for(const actual of insertedRows){
        const input=inputByKey.get(`${actual.market_id}|${actual.draw_date}`); if(!input?.previous_result_id)continue;
        for(const s of pendingBySource.get(input.previous_result_id)||[]){
          const row=audit(s,actual,input);
          if(s.engine_version===ERROR_MEMORY_VERSIONS.live)adaptiveMemoryAudits++;
          audits.push(row); settledSnapshotIds.push(s.id);
        }
      }
      if(audits.length){
        await db('veltrix_forward_audit',{method:'POST',prefer:'return=minimal',body:audits});
        settled=audits.length;
        const now=new Date().toISOString();
        for(const id of settledSnapshotIds) await db(`veltrix_prediction_snapshots?id=eq.${id}`,{method:'PATCH',prefer:'return=minimal',body:{settled_at:now}});
      }
    }

    return json(res,200,{
      ...base,
      auto_locked_snapshot_count:autoLock.created,
      auto_locked_market_count:autoLock.markets,
      auto_lock_skipped:autoLock.skipped,
      settled_count:settled,
      adaptive_error_memory_audit_count:adaptiveMemoryAudits
    });
  }catch(e){return json(res,500,{error:e.message,detail:e.data||null});}
}
