import {db} from './db.js';
import {buildErrorMemory,ERROR_MEMORY_VERSIONS} from './error-memory.js';

function chunks(items,size=150){
  const out=[];
  for(let i=0;i<items.length;i+=size)out.push(items.slice(i,i+size));
  return out;
}
function versionPriority(version){
  if(version===ERROR_MEMORY_VERSIONS.live)return 3;
  if(version===ERROR_MEMORY_VERSIONS.previousLive)return 2;
  return 1;
}

export async function loadErrorMemories(marketIds=[]){
  const ids=[...new Set((marketIds||[]).filter(Boolean))];
  const out=new Map(ids.map(id=>[id,buildErrorMemory([])]));
  if(!ids.length)return out;
  const versions=`(${ERROR_MEMORY_VERSIONS.compatible.join(',')})`;
  const marketFilter=`(${ids.join(',')})`;
  const [s1,s2]=await Promise.all([
    db(`veltrix_prediction_snapshots?select=id,market_id,engine_version,settled_at&market_id=in.${marketFilter}&mode=eq.A&engine_version=in.${versions}&settled_at=not.is.null&limit=1000&offset=0`),
    db(`veltrix_prediction_snapshots?select=id,market_id,engine_version,settled_at&market_id=in.${marketFilter}&mode=eq.A&engine_version=in.${versions}&settled_at=not.is.null&limit=1000&offset=1000`)
  ]);
  const snapshots=[...(s1||[]),...(s2||[])];
  if(!snapshots.length)return out;
  const snapById=new Map(snapshots.map(s=>[s.id,s]));
  const audits=[];
  for(const part of chunks(snapshots.map(s=>s.id))){
    const rows=await db(`veltrix_forward_audit?select=snapshot_id,actual_result_id,details,settled_at&snapshot_id=in.(${part.join(',')})&limit=1000`);
    audits.push(...(rows||[]));
  }
  const perMarket=new Map(ids.map(id=>[id,new Map()]));
  for(const a of audits){
    const s=snapById.get(a.snapshot_id);if(!s)continue;
    const chosen=perMarket.get(s.market_id)||new Map();
    perMarket.set(s.market_id,chosen);
    const key=a.actual_result_id||a.details?.target_result_id||a.snapshot_id;
    const priority=versionPriority(s.engine_version),current=chosen.get(key);
    if(!current||priority>current.priority)chosen.set(key,{priority,details:a.details||{},settled_at:a.settled_at});
  }
  for(const id of ids){
    const ordered=[...(perMarket.get(id)?.values()||[])].sort((a,b)=>{
      const ad=String(a.details?.target_date||a.settled_at||''),bd=String(b.details?.target_date||b.settled_at||'');
      return bd.localeCompare(ad);
    }).map(x=>x.details);
    out.set(id,buildErrorMemory(ordered));
  }
  return out;
}
