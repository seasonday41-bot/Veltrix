import {db,json,allow} from '../lib/db.js';
import {calculateVeltrix} from '../lib/veltrix-engine.js';
import {buildErrorMemory,settlePrediction,ERROR_MEMORY_VERSIONS} from '../lib/error-memory.js';
import {requireAdmin} from '../lib/admin-auth.js';

const VERSION=ERROR_MEMORY_VERSIONS.backfill;
const MODE='A';
const MIN_HISTORY=5;
const BATCH=100;

function chunks(items,size=BATCH){
  const out=[];
  for(let i=0;i<items.length;i+=size)out.push(items.slice(i,i+size));
  return out;
}
function predictionFromSnapshot(s){
  const m=s.metadata||{};
  return {
    mode:s.mode,
    win6:s.win6,
    reserve7:s.reserve7,
    rudTop:s.rud_top,
    rudBottom:s.rud_bottom,
    pair2Shared:m.pair2_shared||s.pair2_top||[],
    pair2Top:s.pair2_top||[],
    pair3Top:s.pair3_top||[],
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
function snapshotRow(marketId,source,pred,target,memory){
  const pairs=(pred.pair2Shared||pred.pair2Top||[]).slice(0,5);
  const now=new Date().toISOString();
  return {
    market_id:marketId,
    source_result_id:source.id,
    mode:MODE,
    engine_version:VERSION,
    pool_a:pred.poolA||null,
    pool_b:pred.poolB||null,
    rank_scores:pred.rankScores||{},
    win6:pred.win6,
    reserve7:pred.reserve7,
    rud_top:pred.rudTop||null,
    rud_bottom:pred.rudBottom||null,
    rud_shared:pred.rudTop===pred.rudBottom?pred.rudTop:null,
    rud_support:pred.rudSupport||null,
    pair2_top:pairs,
    pair2_bottom:[],
    pair3_top:(pred.pair3Top||[]).slice(0,3),
    settled_at:now,
    metadata:{
      ui_version:'adaptive-v14-backfill',
      backfill:true,
      simulated_walk_forward:true,
      source_date:source.draw_date,
      target_date:target.draw_date,
      target_result_id:target.id,
      pair2_layout:'coherent_win6_5_pairs',
      pair2_shared:pairs,
      drift_score:pred.driftScore??null,
      drift_level:pred.driftLevel||null,
      drift_components:pred.driftComponents||null,
      base_weight:pred.baseWeight??null,
      recent_weight:pred.recentWeight??null,
      adaptive_window:pred.adaptiveWindow??null,
      adaptive_validation_scores:pred.adaptiveValidationScores||null,
      double_chance:pred.doubleChance??null,
      double_watch:pred.doubleWatch||[],
      formula_outputs:pred.formulaOutputs||{},
      formula_reliability:pred.formulaReliability||{},
      error_memory_samples_before:memory?.samples||0,
      error_memory_confidence_before:memory?.confidence||0,
      error_memory_bias_before:memory?.digitBias||{}
    }
  };
}
function auditRow(snapshotId,target,settled){
  return {
    snapshot_id:snapshotId,
    actual_result_id:target.id,
    win6_top_count:settled.win6_top_count,
    win7_top_count:settled.win7_top_count,
    win6_top_full:settled.win6_top_full,
    win7_top_full:settled.win7_top_full,
    win6_top2_full:settled.win6_top2_full,
    win7_top2_full:settled.win7_top2_full,
    win6_bottom_full:settled.win6_bottom_full,
    win7_bottom_full:settled.win7_bottom_full,
    rud_top_hit:settled.rud_top_hit,
    rud_bottom_hit:settled.rud_bottom_hit,
    rud_shared_hit:settled.rud_shared_hit,
    rud_support_hit:settled.rud_support_hit,
    rud_challenger_hit:settled.rud_challenger_hit,
    pair2_top_hit:settled.pair2_top_hit,
    pair2_bottom_hit:settled.pair2_bottom_hit,
    pair3_top_hit:settled.pair3_top_hit,
    details:settled.details
  };
}
function overall(details){
  const n=details.length;
  if(!n)return {predictions:0,full5:0,atLeast4:0,atLeast3:0};
  const count=k=>details.filter(x=>x[k]).length;
  const doubles=details.filter(x=>(x.double_actual_digits||[]).length);
  const caught=doubles.filter(x=>x.double_watch_hit).length;
  return {
    predictions:n,
    full5:count('win6_full_5'),
    full5Rate:count('win6_full_5')/n,
    atLeast4:count('win6_at_least_4'),
    atLeast4Rate:count('win6_at_least_4')/n,
    atLeast3:count('win6_at_least_3'),
    atLeast3Rate:count('win6_at_least_3')/n,
    doubleEvents:doubles.length,
    doubleCaught:caught,
    doubleCatchRate:doubles.length?caught/doubles.length:0
  };
}

export default async function handler(req,res){
  allow(res,'POST');
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  if(!requireAdmin(req,res))return;
  try{
    const body=req.body||{};
    if(body.confirm!=='VELTRIX_BACKFILL_V14')return json(res,400,{error:'ต้องส่ง confirm=VELTRIX_BACKFILL_V14'});
    const dryRun=!!body.dry_run;
    const onlyKey=String(body.market_key||'').trim();

    const [markets,h1,h2]=await Promise.all([
      db(`veltrix_markets?select=id,market_key,market_name&active=eq.true${onlyKey?`&market_key=eq.${encodeURIComponent(onlyKey)}`:''}&order=market_key.asc`),
      db('veltrix_latest_20?select=id,market_id,market_key,market_name,draw_date,top3,bottom2,rn&order=market_id.asc,rn.asc&limit=1000&offset=0'),
      db('veltrix_latest_20?select=id,market_id,market_key,market_name,draw_date,top3,bottom2,rn&order=market_id.asc,rn.asc&limit=1000&offset=1000')
    ]);
    const allowed=new Set((markets||[]).map(m=>m.id));
    const byMarket=new Map();
    for(const r of [...(h1||[]),...(h2||[])]){
      if(!allowed.has(r.market_id))continue;
      if(!byMarket.has(r.market_id))byMarket.set(r.market_id,[]);
      byMarket.get(r.market_id).push(r);
    }
    for(const arr of byMarket.values())arr.sort((a,b)=>Number(a.rn)-Number(b.rn));

    const existing=await db(`veltrix_prediction_snapshots?select=id,market_id,source_result_id,mode,engine_version,win6,reserve7,rud_top,rud_bottom,pair2_top,pair3_top,metadata,settled_at&mode=eq.${MODE}&engine_version=eq.${VERSION}&limit=1000`);
    const existingBySource=new Map((existing||[]).map(s=>[s.source_result_id,s]));
    const existingIds=(existing||[]).map(s=>s.id);
    const existingAudits=existingIds.length?await db(`veltrix_forward_audit?select=id,snapshot_id,actual_result_id,details&snapshot_id=in.(${existingIds.join(',')})&limit=1000`):[];
    const auditBySnapshot=new Map((existingAudits||[]).map(a=>[a.snapshot_id,a]));

    const planned=[],pendingExistingAudits=[],allDetails=[];
    let eligible=0,reused=0;

    for(const market of markets||[]){
      const arr=byMarket.get(market.id)||[];
      const priorDetails=[];
      for(let t=arr.length-MIN_HISTORY-1;t>=0;t--){
        const target=arr[t],source=arr[t+1],sourceRows=arr.slice(t+1);
        if(sourceRows.length<MIN_HISTORY)continue;
        eligible++;
        const context={
          backfill:true,
          market_id:market.id,
          source_result_id:source.id,
          target_result_id:target.id,
          source_date:source.draw_date,
          target_date:target.draw_date
        };
        const old=existingBySource.get(source.id);
        if(old){
          reused++;
          const oldAudit=auditBySnapshot.get(old.id);
          let detail=oldAudit?.details;
          if(!detail){
            const settled=settlePrediction(predictionFromSnapshot(old),target,context);
            detail=settled.details;
            pendingExistingAudits.push({snapshot:old,target,settled});
          }
          priorDetails.push(detail);allDetails.push(detail);
          continue;
        }

        const memory=buildErrorMemory([...priorDetails].reverse());
        const outputs=calculateVeltrix(sourceRows,{targetDate:target.draw_date,errorMemory:memory});
        const pred=outputs?.A;
        if(!pred)continue;
        const settled=settlePrediction(pred,target,context);
        const row=snapshotRow(market.id,source,pred,target,memory);
        planned.push({row,target,settled});
        priorDetails.push(settled.details);allDetails.push(settled.details);
      }
    }

    if(dryRun)return json(res,200,{
      ok:true,dry_run:true,engine_version:VERSION,markets:(markets||[]).length,eligible,reused,would_create:planned.length,would_settle_existing:pendingExistingAudits.length,summary:overall(allDetails)
    });

    const inserted=[];
    for(const part of chunks(planned.map(x=>x.row))){
      const r=await db('veltrix_prediction_snapshots',{method:'POST',body:part,prefer:'return=representation'});
      inserted.push(...(r||[]));
    }
    const insertedBySource=new Map(inserted.map(s=>[s.source_result_id,s]));
    const audits=[];
    for(const p of planned){
      const snap=insertedBySource.get(p.row.source_result_id);
      if(snap)audits.push(auditRow(snap.id,p.target,p.settled));
    }
    for(const p of pendingExistingAudits)audits.push(auditRow(p.snapshot.id,p.target,p.settled));
    for(const part of chunks(audits))await db('veltrix_forward_audit',{method:'POST',body:part,prefer:'return=minimal'});

    const unsettle=pendingExistingAudits.filter(x=>!x.snapshot.settled_at).map(x=>x.snapshot.id);
    for(const part of chunks(unsettle)){
      if(part.length)await db(`veltrix_prediction_snapshots?id=in.(${part.join(',')})`,{method:'PATCH',body:{settled_at:new Date().toISOString()},prefer:'return=minimal'});
    }

    return json(res,200,{
      ok:true,dry_run:false,engine_version:VERSION,markets:(markets||[]).length,eligible,reused,created_snapshots:inserted.length,created_audits:audits.length,summary:overall(allDetails)
    });
  }catch(e){return json(res,e.status||500,{error:e.message,details:e.data||null});}
}
