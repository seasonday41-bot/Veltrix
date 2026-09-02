import {db} from './db.js';
import {calculateVeltrix} from './veltrix-engine.js';
import {enhanceVeltrixWithRud} from './rud-ai.js';
import {applyWorldWinFusion,normalizeWorldWin} from './world-win.js';
import {loadErrorMemories} from './error-memory-batch.js';
import {settlePrediction} from './error-memory.js';
import {buildPair2ForwardBattle,PAIR2_BATTLE_VERSION} from './pair2-forward-battle.js';

const ENGINE_VERSION='adaptive_v17';
const BATTLE_CONFLICT='market_id,source_result_id,target_date,mode,engine_version,battle_version';
function chunks(a,n){const out=[];for(let i=0;i<a.length;i+=n)out.push(a.slice(i,i+n));return out;}
async function loadHistoryRows(marketIds=[]){
  const parts=await Promise.all(chunks(marketIds,30).map(xs=>db(`veltrix_latest_20?select=id,market_id,draw_date,top3,bottom2,rn&market_id=in.(${xs.join(',')})&order=market_id.asc,rn.asc&limit=1000`)));
  return parts.flat();
}

function rowFromPrediction(marketId,sourceId,p,lockSource='auto_before_result_insert'){
  const shared=Array.isArray(p.pair2Shared)?p.pair2Shared:(Array.isArray(p.pair2Top)?p.pair2Top:[]);
  return {
    market_id:marketId,source_result_id:sourceId,mode:p.mode,engine_version:ENGINE_VERSION,
    pool_a:p.poolA||null,pool_b:p.poolB||null,rank_scores:p.rankScores||{},win6:p.win6,reserve7:p.reserve7,
    rud_top:p.rudTop||null,rud_bottom:p.rudBottom||null,rud_shared:p.rudTop===p.rudBottom?p.rudTop:null,rud_support:p.rudSupport||null,
    pair2_top:shared.slice(0,5),pair2_bottom:[],pair3_top:(p.pair3Top||[]).slice(0,3),
    metadata:{
      pool_size:p.poolSize,ui_version:'adaptive-v17-rud-first',lock_source:lockSource,target_date:p.targetDate||null,source_date:p.sourceDate||null,
      hybrid_version:p.hybridVersion||null,specialist_version:p.specialistVersion||null,specialists:p.specialists||null,
      relationship_locked:true,rud_first:true,rud_first_version:p.rudFirstVersion||'RUD_FIRST_WIN6_V17',
      pair2_layout:'coherent_win6_5_pairs_specialist',pair2_shared:shared.slice(0,5),
      pair2_forward_battle:p.pair2ForwardBattle?{version:p.pair2ForwardBattle.version,world_win:true,reserve7:p.pair2ForwardBattle.reserve7}:null,
      reserve_rank7:p.reserveRank7||null,reserve_strategy:p.reserveStrategy||null,rud_ai:p.rudAI||null,
      rud_primary_side:p.rudPrimarySide||null,rud_secondary_side:p.rudSecondarySide||null,
      world_win:p.worldWin||'',world_win_fusion:p.fusionBonus?.worldWin||null,
      drift_score:p.driftScore??null,drift_level:p.driftLevel||null,drift_components:p.driftComponents||null,
      base_weight:p.baseWeight??null,recent_weight:p.recentWeight??null,adaptive_window:p.adaptiveWindow??null,adaptive_validation_scores:p.adaptiveValidationScores||null,
      error_memory_applied:!!p.errorMemoryApplied,error_memory_samples:p.errorMemorySamples??0,error_memory_confidence:p.errorMemoryConfidence??0,error_memory_bias:p.errorMemoryBias||{},
      double_chance:p.doubleChance??null,double_watch:p.doubleWatch||[],formula_outputs:p.formulaOutputs||{},formula_reliability:p.formulaReliability||{}
    }
  };
}

function auditRow(snapshotId,actual,settled){
  return {
    snapshot_id:snapshotId,actual_result_id:actual.id,
    win6_top_count:settled.win6_top_count,win7_top_count:settled.win7_top_count,
    win6_top_full:settled.win6_top_full,win7_top_full:settled.win7_top_full,
    win6_top2_full:settled.win6_top2_full,win7_top2_full:settled.win7_top2_full,
    win6_bottom_full:settled.win6_bottom_full,win7_bottom_full:settled.win7_bottom_full,
    rud_top_hit:settled.rud_top_hit,rud_bottom_hit:settled.rud_bottom_hit,
    rud_shared_hit:settled.rud_shared_hit,rud_support_hit:settled.rud_support_hit,rud_challenger_hit:settled.rud_challenger_hit,
    pair2_top_hit:settled.pair2_top_hit,pair2_bottom_hit:settled.pair2_bottom_hit,pair3_top_hit:settled.pair3_top_hit,
    details:settled.details
  };
}

export async function ensureAutoSnapshots(items=[]){
  const unique=[],seenMarkets=new Set();
  for(const x of items){if(!x?.market_id||!x?.previous_result_id||seenMarkets.has(x.market_id))continue;seenMarkets.add(x.market_id);unique.push(x);}
  if(!unique.length)return {created:0,markets:0,skipped:0,battle_locked:0};
  const sourceIds=unique.map(x=>x.previous_result_id),marketIds=unique.map(x=>x.market_id),sourceFilter=`(${sourceIds.join(',')})`;
  const [existing,historyRows,errorMemories,worldRows]=await Promise.all([
    db(`veltrix_prediction_snapshots?select=source_result_id,mode&source_result_id=in.${sourceFilter}&engine_version=eq.${ENGINE_VERSION}`),
    loadHistoryRows(marketIds),
    loadErrorMemories(marketIds),
    db('veltrix_engine_settings?select=setting_value&setting_key=eq.daily_win_global&limit=1')
  ]);
  const worldWin=normalizeWorldWin(worldRows?.[0]?.setting_value?.digits||''),lockedBySource=new Map();
  for(const s of existing||[]){if(!lockedBySource.has(s.source_result_id))lockedBySource.set(s.source_result_id,new Set());lockedBySource.get(s.source_result_id).add(s.mode);}
  const historyByMarket=new Map();for(const r of historyRows||[]){if(!historyByMarket.has(r.market_id))historyByMarket.set(r.market_id,[]);historyByMarket.get(r.market_id).push(r);}
  const inserts=[],battleInserts=[],createdMarkets=new Set();let skipped=0;
  for(const x of unique){
    const rows=(historyByMarket.get(x.market_id)||[]).sort((a,b)=>Number(a.rn)-Number(b.rn));if(rows.length<5||rows[0]?.id!==x.previous_result_id){skipped++;continue;}
    const errorMemory=errorMemories.get(x.market_id)||null;
    const core=calculateVeltrix(rows,{targetDate:x.draw_date,errorMemory});
    const fused=applyWorldWinFusion(core,worldWin),predictions=enhanceVeltrixWithRud(rows,fused);if(!predictions){skipped++;continue;}
    const locked=lockedBySource.get(x.previous_result_id)||new Set();
    for(const p of Object.values(predictions)){
      const battle=buildPair2ForwardBattle(rows,p,worldWin);
      if(battle){
        battleInserts.push({
          market_id:x.market_id,source_result_id:x.previous_result_id,target_date:x.draw_date,mode:p.mode,
          engine_version:ENGINE_VERSION,battle_version:PAIR2_BATTLE_VERSION,world_win:worldWin,
          win6:battle.win6,reserve7:battle.reserve7,variants:battle.variants
        });
      }
      if(locked.has(p.mode))continue;
      inserts.push(rowFromPrediction(x.market_id,x.previous_result_id,{...p,pair2ForwardBattle:battle}));createdMarkets.add(x.market_id);
    }
  }
  if(inserts.length)await db('veltrix_prediction_snapshots',{method:'POST',prefer:'return=minimal',body:inserts});
  if(battleInserts.length)await db(`veltrix_pair2_forward_battle?on_conflict=${BATTLE_CONFLICT}`,{method:'POST',prefer:'resolution=ignore-duplicates,return=minimal',body:battleInserts});
  return {created:inserts.length,markets:createdMarkets.size,skipped,engine_version:ENGINE_VERSION,world_win:worldWin,battle_locked:battleInserts.length,battle_version:PAIR2_BATTLE_VERSION};
}

// Repairs only actual rows that were inserted directly by Result Finder before the
// Finder was routed through import-results. History is explicitly bounded to rows
// BEFORE each actual draw date, so the actual result cannot leak into its prediction.
export async function repairDirectFinderActuals(actuals=[]){
  const targets=[];
  const seen=new Set();
  for(const a of actuals||[]){
    if(!a?.id||!a?.market_id||!a?.draw_date||seen.has(a.id))continue;
    seen.add(a.id);targets.push(a);
  }
  if(!targets.length)return {targets:0,created_snapshots:0,created_audits:0,skipped:0};

  const marketIds=[...new Set(targets.map(x=>x.market_id))];
  const [errorMemories,worldRows]=await Promise.all([
    loadErrorMemories(marketIds),
    db('veltrix_engine_settings?select=setting_value&setting_key=eq.daily_win_global&limit=1')
  ]);
  const worldWin=normalizeWorldWin(worldRows?.[0]?.setting_value?.digits||'');

  const planned=[];
  const battleInserts=[];
  let skipped=0;

  for(const actual of targets){
    const history=await db(`veltrix_market_results?select=id,market_id,draw_date,top3,bottom2,created_at&market_id=eq.${encodeURIComponent(actual.market_id)}&draw_date=lt.${encodeURIComponent(actual.draw_date)}&order=draw_date.desc,created_at.desc&limit=20`);
    const rows=(history||[]).map((r,i)=>({...r,rn:i+1}));
    const source=rows[0];
    if(rows.length<5||!source?.id){skipped++;continue;}

    const existing=await db(`veltrix_prediction_snapshots?select=id,source_result_id,mode&source_result_id=eq.${encodeURIComponent(source.id)}&engine_version=eq.${ENGINE_VERSION}&limit=20`);
    const locked=new Set((existing||[]).map(s=>s.mode));
    const memory=errorMemories.get(actual.market_id)||null;
    const core=calculateVeltrix(rows,{targetDate:actual.draw_date,errorMemory:memory});
    const fused=applyWorldWinFusion(core,worldWin);
    const predictions=enhanceVeltrixWithRud(rows,fused);
    if(!predictions){skipped++;continue;}

    for(const p of Object.values(predictions)){
      if(locked.has(p.mode))continue;
      const battle=buildPair2ForwardBattle(rows,p,worldWin);
      if(battle){
        battleInserts.push({
          market_id:actual.market_id,source_result_id:source.id,target_date:actual.draw_date,mode:p.mode,
          engine_version:ENGINE_VERSION,battle_version:PAIR2_BATTLE_VERSION,world_win:worldWin,
          win6:battle.win6,reserve7:battle.reserve7,variants:battle.variants
        });
      }
      const prediction={...p,pair2ForwardBattle:battle,sourceDate:source.draw_date,targetDate:actual.draw_date};
      const settled=settlePrediction(prediction,actual,{
        backfill:false,market_id:actual.market_id,source_result_id:source.id,target_result_id:actual.id,
        source_date:source.draw_date,target_date:actual.draw_date
      });
      planned.push({actual,source,prediction,settled,row:rowFromPrediction(actual.market_id,source.id,prediction,'repair_result_finder_direct_insert')});
    }
  }

  const inserted=[];
  for(const part of chunks(planned.map(x=>x.row),100)){
    if(!part.length)continue;
    const rows=await db('veltrix_prediction_snapshots',{method:'POST',prefer:'return=representation',body:part});
    inserted.push(...(rows||[]));
  }
  if(battleInserts.length)await db(`veltrix_pair2_forward_battle?on_conflict=${BATTLE_CONFLICT}`,{method:'POST',prefer:'resolution=ignore-duplicates,return=minimal',body:battleInserts});

  const insertedByKey=new Map(inserted.map(s=>[`${s.source_result_id}|${s.mode}`,s]));
  const audits=[];
  const snapshotIds=[];
  for(const p of planned){
    const snap=insertedByKey.get(`${p.source.id}|${p.prediction.mode}`);
    if(!snap)continue;
    audits.push(auditRow(snap.id,p.actual,p.settled));
    snapshotIds.push(snap.id);
  }
  for(const part of chunks(audits,100))if(part.length)await db('veltrix_forward_audit',{method:'POST',prefer:'return=minimal',body:part});
  for(const part of chunks(snapshotIds,100))if(part.length)await db(`veltrix_prediction_snapshots?id=in.(${part.join(',')})`,{method:'PATCH',prefer:'return=minimal',body:{settled_at:new Date().toISOString()}});

  return {
    targets:targets.length,created_snapshots:inserted.length,created_audits:audits.length,skipped,
    engine_version:ENGINE_VERSION,world_win:worldWin,battle_locked:battleInserts.length,battle_version:PAIR2_BATTLE_VERSION
  };
}
