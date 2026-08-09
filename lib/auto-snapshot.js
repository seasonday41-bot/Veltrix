import {db} from './db.js';
import {calculateVeltrix} from './veltrix-engine.js';

function rowFromPrediction(marketId,sourceId,p){
  return {
    market_id:marketId,
    source_result_id:sourceId,
    mode:p.mode,
    engine_version:'v1',
    pool_a:p.poolA||null,
    pool_b:p.poolB||null,
    rank_scores:p.rankScores||{},
    win6:p.win6,
    reserve7:p.reserve7,
    rud_top:p.rudTop||null,
    rud_bottom:p.rudBottom||null,
    rud_shared:p.rudTop===p.rudBottom?p.rudTop:null,
    rud_support:p.rudSupport||null,
    pair2_top:p.pair2Top||[],
    pair2_bottom:p.pair2Bottom||[],
    pair3_top:p.pair3Top||[],
    metadata:{pool_size:p.poolSize,ui_version:'v1',lock_source:'auto_before_result_insert'}
  };
}

export async function ensureAutoSnapshot({marketId,sourceResultId}){
  if(!marketId||!sourceResultId)return {created:0,reason:'missing_source'};

  const existing=await db(`veltrix_prediction_snapshots?select=id,mode&source_result_id=eq.${sourceResultId}&engine_version=eq.v1`);
  const locked=new Set((existing||[]).map(x=>x.mode));
  if(locked.has('A')&&locked.has('B'))return {created:0,reason:'already_locked'};

  const rows=await db(`veltrix_latest_10?select=id,market_id,draw_date,top3,bottom2,rn&market_id=eq.${marketId}&order=rn.asc`);
  if(!rows||rows.length<5)return {created:0,reason:'insufficient_history'};

  const predictions=calculateVeltrix(rows);
  if(!predictions)return {created:0,reason:'insufficient_history'};

  const inserts=Object.values(predictions)
    .filter(p=>!locked.has(p.mode))
    .map(p=>rowFromPrediction(marketId,sourceResultId,p));

  if(!inserts.length)return {created:0,reason:'already_locked'};
  await db('veltrix_prediction_snapshots',{method:'POST',prefer:'return=minimal',body:inserts});
  return {created:inserts.length,reason:'auto_locked'};
}
