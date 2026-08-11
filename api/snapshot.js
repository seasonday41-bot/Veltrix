import {db,json,allow} from '../lib/db.js';
import {calculateVeltrix} from '../lib/veltrix-engine.js';
import {enhanceVeltrixWithRud} from '../lib/rud-ai.js';
import {loadErrorMemory} from '../lib/error-memory.js';
import {calculatePair2Shadow} from '../lib/pair2-shadow.js';

const ENGINE_VERSION='adaptive_v17';
const PAIR2_SHADOW_TRACK='PAIR2_NO_WORLD_V1_V21_FORWARD';

function rowFromPrediction(marketId,sourceId,p){
  const shared=Array.isArray(p.pair2Shared)?p.pair2Shared:(Array.isArray(p.pair2Top)?p.pair2Top:[]);
  return {
    market_id:marketId,source_result_id:sourceId,mode:p.mode,engine_version:ENGINE_VERSION,pool_a:p.poolA||null,pool_b:p.poolB||null,rank_scores:p.rankScores||{},win6:p.win6,reserve7:p.reserve7,rud_top:p.rudTop||null,rud_bottom:p.rudBottom||null,rud_shared:p.rudTop===p.rudBottom?p.rudTop:null,rud_support:p.rudSupport||null,pair2_top:shared.slice(0,5),pair2_bottom:[],pair3_top:(p.pair3Top||[]).slice(0,3),
    metadata:{pool_size:p.poolSize,ui_version:'adaptive-v17-rud-first',target_date:p.targetDate||null,hybrid_version:p.hybridVersion||null,specialist_version:p.specialistVersion||null,specialists:p.specialists||null,relationship_locked:true,rud_first:true,rud_first_version:p.rudFirstVersion||'RUD_FIRST_WIN6_V17',pair2_layout:'coherent_win6_5_pairs_specialist',pair2_shared:shared.slice(0,5),pair2_no_world_shadow:p.pair2NoWorldShadow||null,reserve_rank7:p.reserveRank7||null,reserve_strategy:p.reserveStrategy||null,rud_ai:p.rudAI||null,rud_primary_side:p.rudPrimarySide||null,rud_secondary_side:p.rudSecondarySide||null,world_win:p.worldWin||'',world_win_fusion:p.fusionBonus?.worldWin||null,drift_score:p.driftScore??null,drift_level:p.driftLevel||null,drift_components:p.driftComponents||null,base_weight:p.baseWeight??null,recent_weight:p.recentWeight??null,adaptive_window:p.adaptiveWindow??null,adaptive_validation_scores:p.adaptiveValidationScores||null,error_memory_applied:!!p.errorMemoryApplied,error_memory_samples:p.errorMemorySamples??0,error_memory_confidence:p.errorMemoryConfidence??0,error_memory_bias:p.errorMemoryBias||{},double_chance:p.doubleChance??null,double_watch:p.doubleWatch||[],double_pattern:p.doublePattern||null,sibling_position:p.siblingPosition||null,formula_outputs:p.formulaOutputs||{},formula_reliability:p.formulaReliability||{}}
  };
}
export default async function handler(req,res){
  allow(res,'POST');if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  try{
    const {market_id,source_result_id,predictions}=req.body||{};
    if(!market_id||!source_result_id||!Array.isArray(predictions))return json(res,400,{error:'ข้อมูล Snapshot ไม่ครบ'});
    const [existing,history]=await Promise.all([
      db(`veltrix_prediction_snapshots?select=id,mode&source_result_id=eq.${source_result_id}&engine_version=eq.${ENGINE_VERSION}`),
      db(`veltrix_latest_20?select=id,market_id,draw_date,top3,bottom2,rn&market_id=eq.${encodeURIComponent(market_id)}&order=rn.asc&limit=20`)
    ]);
    const locked=new Set((existing||[]).map(x=>x.mode));
    const historyOk=(history||[]).length>=5&&history?.[0]?.id===source_result_id;
    let noWorldPredictions=null;
    if(historyOk){
      const errorMemory=await loadErrorMemory(market_id);
      const core=calculateVeltrix(history,{targetDate:predictions?.[0]?.targetDate||null,errorMemory});
      noWorldPredictions=enhanceVeltrixWithRud(history,core);
    }
    const rows=predictions.filter(p=>['A','B'].includes(p.mode)&&!locked.has(p.mode)).map(p=>{
      const noWorld=noWorldPredictions?.[p.mode]||null;
      const challenger=noWorld?calculatePair2Shadow(history,noWorld.win6):null;
      const championPairs=noWorld?(Array.isArray(noWorld.pair2Shared)?noWorld.pair2Shared:(noWorld.pair2Top||[])):[];
      const pair2NoWorldShadow=noWorld&&challenger?{version:PAIR2_SHADOW_TRACK,world_win:false,win6:noWorld.win6,champion:{version:'PAIR2_POSITION_SPECIALIST_V1',pairs:championPairs.slice(0,5)},challenger}:null;
      return rowFromPrediction(market_id,source_result_id,{...p,pair2NoWorldShadow});
    });
    if(rows.length)await db('veltrix_prediction_snapshots',{method:'POST',body:rows,prefer:'return=minimal'});
    return json(res,200,{ok:true,engine_version:ENGINE_VERSION,already_locked:rows.length===0,created:rows.length,pair2_shadow:historyOk?PAIR2_SHADOW_TRACK:null});
  }catch(e){return json(res,500,{error:e.message});}
}
