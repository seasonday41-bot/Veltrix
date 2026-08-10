import {db} from './db.js';
import {calculateVeltrix} from './veltrix-engine.js';

const ENGINE_VERSION='adaptive_v13';

function rowFromPrediction(marketId,sourceId,p){
  const shared=Array.isArray(p.pair2Shared)?p.pair2Shared:(Array.isArray(p.pair2Top)?p.pair2Top:[]);
  return {
    market_id:marketId,
    source_result_id:sourceId,
    mode:p.mode,
    engine_version:ENGINE_VERSION,
    pool_a:p.poolA||null,
    pool_b:p.poolB||null,
    rank_scores:p.rankScores||{},
    win6:p.win6,
    reserve7:p.reserve7,
    rud_top:p.rudTop||null,
    rud_bottom:p.rudBottom||null,
    rud_shared:p.rudTop===p.rudBottom?p.rudTop:null,
    rud_support:p.rudSupport||null,
    pair2_top:shared.slice(0,5),
    pair2_bottom:[],
    pair3_top:(p.pair3Top||[]).slice(0,3),
    metadata:{
      pool_size:p.poolSize,
      ui_version:'adaptive-v13',
      lock_source:'auto_before_result_insert',
      target_date:p.targetDate||null,
      hybrid_version:p.hybridVersion||null,
      pair2_layout:'coherent_win6_5_pairs',
      pair2_shared:shared.slice(0,5),
      drift_score:p.driftScore??null,
      drift_level:p.driftLevel||null,
      drift_components:p.driftComponents||null,
      base_weight:p.baseWeight??null,
      recent_weight:p.recentWeight??null,
      adaptive_window:p.adaptiveWindow??null,
      adaptive_validation_scores:p.adaptiveValidationScores||null,
      double_chance:p.doubleChance??null,
      double_watch:p.doubleWatch||[],
      formula_outputs:p.formulaOutputs||{},
      formula_reliability:p.formulaReliability||{}
    }
  };
}

export async function ensureAutoSnapshots(items=[]){
  const unique=[];
  const seenMarkets=new Set();
  for(const x of items){
    if(!x?.market_id||!x?.previous_result_id||seenMarkets.has(x.market_id))continue;
    seenMarkets.add(x.market_id);
    unique.push(x);
  }
  if(!unique.length)return {created:0,markets:0,skipped:0};

  const sourceIds=unique.map(x=>x.previous_result_id);
  const marketIds=unique.map(x=>x.market_id);
  const sourceFilter=`(${sourceIds.join(',')})`;
  const marketFilter=`(${marketIds.join(',')})`;

  const [existing,historyRows]=await Promise.all([
    db(`veltrix_prediction_snapshots?select=source_result_id,mode&source_result_id=in.${sourceFilter}&engine_version=eq.${ENGINE_VERSION}`),
    db(`veltrix_latest_20?select=id,market_id,draw_date,top3,bottom2,rn&market_id=in.${marketFilter}&order=market_id.asc,rn.asc`)
  ]);

  const lockedBySource=new Map();
  for(const s of existing||[]){
    if(!lockedBySource.has(s.source_result_id))lockedBySource.set(s.source_result_id,new Set());
    lockedBySource.get(s.source_result_id).add(s.mode);
  }

  const historyByMarket=new Map();
  for(const r of historyRows||[]){
    if(!historyByMarket.has(r.market_id))historyByMarket.set(r.market_id,[]);
    historyByMarket.get(r.market_id).push(r);
  }

  const inserts=[];
  const createdMarkets=new Set();
  let skipped=0;
  for(const x of unique){
    const rows=historyByMarket.get(x.market_id)||[];
    if(rows.length<5||rows[0]?.id!==x.previous_result_id){skipped++;continue;}
    const predictions=calculateVeltrix(rows,{targetDate:x.draw_date});
    if(!predictions){skipped++;continue;}
    const locked=lockedBySource.get(x.previous_result_id)||new Set();
    for(const p of Object.values(predictions)){
      if(locked.has(p.mode))continue;
      inserts.push(rowFromPrediction(x.market_id,x.previous_result_id,p));
      createdMarkets.add(x.market_id);
    }
  }

  if(inserts.length)await db('veltrix_prediction_snapshots',{method:'POST',prefer:'return=minimal',body:inserts});
  return {created:inserts.length,markets:createdMarkets.size,skipped,engine_version:ENGINE_VERSION};
}
