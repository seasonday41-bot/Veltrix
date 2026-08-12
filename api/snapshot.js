import {db,json,allow} from '../lib/db.js';
import {normalizeWorldWin} from '../lib/world-win.js';
import {buildPair2ForwardBattle,PAIR2_BATTLE_VERSION} from '../lib/pair2-forward-battle.js';
import {requireAdmin} from '../lib/admin-auth.js';

const ENGINE_VERSION='adaptive_v17';
const BATTLE_CONFLICT='market_id,source_result_id,target_date,mode,engine_version,battle_version';

function rowFromPrediction(marketId,sourceId,p){
  const shared=Array.isArray(p.pair2Shared)?p.pair2Shared:(Array.isArray(p.pair2Top)?p.pair2Top:[]);
  return {
    market_id:marketId,source_result_id:sourceId,mode:p.mode,engine_version:ENGINE_VERSION,pool_a:p.poolA||null,pool_b:p.poolB||null,rank_scores:p.rankScores||{},win6:p.win6,reserve7:p.reserve7,rud_top:p.rudTop||null,rud_bottom:p.rudBottom||null,rud_shared:p.rudTop===p.rudBottom?p.rudTop:null,rud_support:p.rudSupport||null,pair2_top:shared.slice(0,5),pair2_bottom:[],pair3_top:(p.pair3Top||[]).slice(0,3),
    metadata:{pool_size:p.poolSize,ui_version:'adaptive-v17-rud-first',target_date:p.targetDate||null,hybrid_version:p.hybridVersion||null,specialist_version:p.specialistVersion||null,specialists:p.specialists||null,relationship_locked:true,rud_first:true,rud_first_version:p.rudFirstVersion||'RUD_FIRST_WIN6_V17',pair2_layout:'coherent_win6_5_pairs_specialist',pair2_shared:shared.slice(0,5),pair2_forward_battle:p.pair2ForwardBattle?{version:p.pair2ForwardBattle.version,world_win:true,reserve7:p.pair2ForwardBattle.reserve7}:null,reserve_rank7:p.reserveRank7||null,reserve_strategy:p.reserveStrategy||null,rud_ai:p.rudAI||null,rud_primary_side:p.rudPrimarySide||null,rud_secondary_side:p.rudSecondarySide||null,world_win:p.worldWin||'',world_win_fusion:p.fusionBonus?.worldWin||null,drift_score:p.driftScore??null,drift_level:p.driftLevel||null,drift_components:p.driftComponents||null,base_weight:p.baseWeight??null,recent_weight:p.recentWeight??null,adaptive_window:p.adaptiveWindow??null,adaptive_validation_scores:p.adaptiveValidationScores||null,error_memory_applied:!!p.errorMemoryApplied,error_memory_samples:p.errorMemorySamples??0,error_memory_confidence:p.errorMemoryConfidence??0,error_memory_bias:p.errorMemoryBias||{},double_chance:p.doubleChance??null,double_watch:p.doubleWatch||[],double_pattern:p.doublePattern||null,sibling_position:p.siblingPosition||null,formula_outputs:p.formulaOutputs||{},formula_reliability:p.formulaReliability||{}}
  };
}
export default async function handler(req,res){
  allow(res,'POST');if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  if(!requireAdmin(req,res))return;
  try{
    const {market_id,source_result_id,predictions}=req.body||{};
    if(!market_id||!source_result_id||!Array.isArray(predictions))return json(res,400,{error:'ข้อมูล Snapshot ไม่ครบ'});
    const [existing,history,worldRows]=await Promise.all([
      db(`veltrix_prediction_snapshots?select=id,mode&source_result_id=eq.${source_result_id}&engine_version=eq.${ENGINE_VERSION}`),
      db(`veltrix_latest_20?select=id,market_id,draw_date,top3,bottom2,rn&market_id=eq.${encodeURIComponent(market_id)}&order=rn.asc&limit=20`),
      db('veltrix_engine_settings?select=setting_value&setting_key=eq.daily_win_global&limit=1')
    ]);
    const worldWin=normalizeWorldWin(worldRows?.[0]?.setting_value?.digits||''),locked=new Set((existing||[]).map(x=>x.mode));
    const historyOk=(history||[]).length>=5&&history?.[0]?.id===source_result_id;
    const rows=[],battleRows=[];
    for(const p of predictions.filter(p=>['A','B'].includes(p.mode))){
      const battle=historyOk?buildPair2ForwardBattle(history,p,worldWin):null;
      if(battle&&p.targetDate){
        battleRows.push({market_id,source_result_id,target_date:p.targetDate,mode:p.mode,engine_version:ENGINE_VERSION,battle_version:PAIR2_BATTLE_VERSION,world_win:worldWin,win6:battle.win6,reserve7:battle.reserve7,variants:battle.variants});
      }
      if(!locked.has(p.mode))rows.push(rowFromPrediction(market_id,source_result_id,{...p,pair2ForwardBattle:battle}));
    }
    if(rows.length)await db('veltrix_prediction_snapshots',{method:'POST',body:rows,prefer:'return=minimal'});
    if(battleRows.length)await db(`veltrix_pair2_forward_battle?on_conflict=${BATTLE_CONFLICT}`,{method:'POST',body:battleRows,prefer:'resolution=ignore-duplicates,return=minimal'});
    return json(res,200,{ok:true,engine_version:ENGINE_VERSION,already_locked:rows.length===0,created:rows.length,pair2_battle:historyOk?PAIR2_BATTLE_VERSION:null,battle_locked:battleRows.length,world_win:worldWin});
  }catch(e){return json(res,500,{error:e.message});}
}
