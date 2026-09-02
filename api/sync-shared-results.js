import {db,json,allow} from './_db.js';
import {requireAdmin} from '../lib/admin-auth.js';
import {repairDirectFinderActuals} from '../lib/auto-snapshot.js';
import {settlePrediction,ERROR_MEMORY_VERSIONS} from '../lib/error-memory.js';

const FINDER_PREFIX='result_finder:';
const LIVE_VERSION=ERROR_MEMORY_VERSIONS.live;
const SCAN_LIMIT=300;
const PROCESS_LIMIT=3;

function chunks(list,size){const out=[];for(let i=0;i<list.length;i+=size)out.push(list.slice(i,i+size));return out;}
function arr(v){return Array.isArray(v)?v:[];}

function predictionFromSnapshot(snapshot){
  const m=snapshot?.metadata||{};
  return {
    mode:snapshot?.mode,
    win6:snapshot?.win6,
    reserve7:snapshot?.reserve7,
    rudTop:snapshot?.rud_top,
    rudBottom:snapshot?.rud_bottom,
    pair2Shared:m.pair2_shared||snapshot?.pair2_top||[],
    pair2Top:snapshot?.pair2_top||[],
    pair3Top:snapshot?.pair3_top||[],
    driftScore:m.drift_score,
    driftLevel:m.drift_level,
    baseWeight:m.base_weight,
    recentWeight:m.recent_weight,
    doubleWatch:m.double_watch||[],
    doubleChance:m.double_chance,
    formulaOutputs:m.formula_outputs||{},
    formulaReliability:m.formula_reliability||{},
    reserveRank7:m.reserve_rank7||null,
    reserveStrategy:m.reserve_strategy||null,
    specialistVersion:m.specialist_version||null,
    specialists:m.specialists||null,
    rudFirst:!!m.rud_first,
    rudFirstVersion:m.rud_first_version||null,
    rudPrimarySide:m.rud_primary_side||null,
    rudSecondarySide:m.rud_secondary_side||null,
    rudAI:m.rud_ai||null
  };
}

function auditRow(snapshot,actual,sourceDate){
  const settled=settlePrediction(predictionFromSnapshot(snapshot),actual,{
    backfill:false,
    market_id:actual.market_id,
    source_result_id:snapshot.source_result_id,
    target_result_id:actual.id,
    source_date:sourceDate||snapshot?.metadata?.source_date||null,
    target_date:actual.draw_date
  });
  return {snapshot_id:snapshot.id,actual_result_id:actual.id,...settled};
}

async function loadFinderActuals(){
  const rows=await db(`veltrix_market_results?select=id,market_id,draw_date,top3,bottom2,source,created_at&order=created_at.desc&limit=${SCAN_LIMIT}`);
  return arr(rows).filter(r=>String(r.source||'').startsWith(FINDER_PREFIX));
}

async function loadAuditedActualIds(ids=[]){
  const set=new Set();
  for(const part of chunks(ids,80)){
    if(!part.length)continue;
    const rows=await db(`veltrix_forward_audit?select=actual_result_id&actual_result_id=in.(${part.join(',')})&limit=1000`);
    for(const row of rows||[])if(row.actual_result_id)set.add(row.actual_result_id);
  }
  return set;
}

async function loadMarketMap(marketIds=[]){
  const map=new Map();
  for(const part of chunks([...new Set(marketIds)],80)){
    if(!part.length)continue;
    const rows=await db(`veltrix_markets?select=id,market_key,market_name&id=in.(${part.join(',')})`);
    for(const row of rows||[])map.set(row.id,row);
  }
  return map;
}

async function previewState(){
  const actuals=await loadFinderActuals();
  const audited=await loadAuditedActualIds(actuals.map(x=>x.id));
  const marketMap=await loadMarketMap(actuals.map(x=>x.market_id));
  const pending=actuals.filter(x=>!audited.has(x.id)).sort((a,b)=>String(a.draw_date).localeCompare(String(b.draw_date))||String(a.created_at).localeCompare(String(b.created_at)));
  const decorate=row=>{
    const m=marketMap.get(row.market_id)||{};
    return {...row,market_key:m.market_key||'',market_name:m.market_name||row.market_id};
  };
  return {
    scanned:actuals.length,
    processed_count:actuals.length-pending.length,
    pending_count:pending.length,
    pending:pending.slice(0,60).map(decorate),
    recent:actuals.slice(0,30).map(decorate)
  };
}

async function settlePrelockedSnapshots(actual){
  const previousRows=await db(`veltrix_market_results?select=id,market_id,draw_date,top3,bottom2,created_at&market_id=eq.${encodeURIComponent(actual.market_id)}&draw_date=lt.${encodeURIComponent(actual.draw_date)}&order=draw_date.desc,created_at.desc&limit=1`);
  const previous=previousRows?.[0];
  if(!previous?.id)return {previous_result_id:null,settled_existing:0};

  const snapshots=await db(`veltrix_prediction_snapshots?select=*&source_result_id=eq.${encodeURIComponent(previous.id)}&engine_version=eq.${LIVE_VERSION}&settled_at=is.null&limit=20`);
  if(!snapshots?.length)return {previous_result_id:previous.id,settled_existing:0};

  const existingAudits=await db(`veltrix_forward_audit?select=snapshot_id&actual_result_id=eq.${encodeURIComponent(actual.id)}&limit=40`);
  const auditedSnapshots=new Set((existingAudits||[]).map(x=>x.snapshot_id));
  const pendingSnapshots=(snapshots||[]).filter(s=>!auditedSnapshots.has(s.id));
  if(!pendingSnapshots.length)return {previous_result_id:previous.id,settled_existing:0};

  const audits=pendingSnapshots.map(snapshot=>auditRow(snapshot,actual,previous.draw_date));
  await db('veltrix_forward_audit',{method:'POST',prefer:'return=minimal',body:audits});
  const ids=pendingSnapshots.map(x=>x.id);
  for(const part of chunks(ids,80)){
    await db(`veltrix_prediction_snapshots?id=in.(${part.join(',')})`,{method:'PATCH',prefer:'return=minimal',body:{settled_at:new Date().toISOString()}});
  }
  return {previous_result_id:previous.id,settled_existing:audits.length};
}

async function processActual(actual){
  // Repair/create any missing live snapshots first. This must run before settling an
  // already-locked snapshot so the current actual cannot enter Error Memory early.
  const repair=await repairDirectFinderActuals([actual]);
  const settled=await settlePrelockedSnapshots(actual);
  return {
    id:actual.id,
    market_id:actual.market_id,
    draw_date:actual.draw_date,
    top3:actual.top3,
    bottom2:actual.bottom2,
    created_snapshots:Number(repair?.created_snapshots||0),
    created_audits:Number(repair?.created_audits||0),
    settled_existing:Number(settled?.settled_existing||0),
    skipped:Number(repair?.skipped||0)
  };
}

export default async function handler(req,res){
  allow(res,'GET, POST');
  if(!['GET','POST'].includes(req.method))return json(res,405,{error:'Method not allowed'});
  if(!requireAdmin(req,res))return;
  try{
    if(req.method==='GET')return json(res,200,{ok:true,...await previewState()});

    const before=await previewState();
    const requested=Math.max(1,Math.min(PROCESS_LIMIT,Number(req.body?.limit)||PROCESS_LIMIT));
    const targets=before.pending.slice(0,requested);
    const results=[];
    for(const actual of targets){
      try{results.push(await processActual(actual));}
      catch(error){results.push({id:actual.id,market_id:actual.market_id,draw_date:actual.draw_date,status:'error',error:error?.message||'sync failed'});}
    }
    const after=await previewState();
    return json(res,200,{ok:true,processed_now:targets.length,results,before_pending:before.pending_count,...after});
  }catch(error){
    return json(res,500,{error:error?.message||'Shared result sync failed'});
  }
}
