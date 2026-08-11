import {db,json,allow} from '../lib/db.js';
import {calculateVeltrix} from '../lib/veltrix-engine.js';
import {enhanceVeltrixWithRud} from '../lib/rud-ai.js';
import {applyWorldWinFusion,normalizeWorldWin} from '../lib/world-win.js';
import {loadErrorMemories} from '../lib/error-memory-batch.js';
import {buildPair2ForwardBattle,PAIR2_BATTLE_VERSION} from '../lib/pair2-forward-battle.js';

const TARGET_DATE='2026-08-11';
const ENGINE_VERSION='adaptive_v17';
const BATTLE_CONFLICT='market_id,source_result_id,target_date,mode,engine_version,battle_version';
function chunks(a,n){const out=[];for(let i=0;i<a.length;i+=n)out.push(a.slice(i,i+n));return out;}
async function loadAllHistory(){
  const markets=await db('veltrix_markets?select=id&active=eq.true&order=market_key.asc');
  const ids=(markets||[]).map(x=>x.id),parts=await Promise.all(chunks(ids,30).map(xs=>db(`veltrix_latest_20?select=id,market_id,market_key,market_name,draw_date,top3,bottom2,rn&market_id=in.(${xs.join(',')})&order=market_id.asc,rn.asc&limit=1000`)));
  return parts.flat();
}

export default async function handler(req,res){
  allow(res,'GET');
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  try{
    const [historyRows,worldRows]=await Promise.all([
      loadAllHistory(),
      db('veltrix_engine_settings?select=setting_value&setting_key=eq.daily_win_global&limit=1')
    ]);
    const worldWin=normalizeWorldWin(worldRows?.[0]?.setting_value?.digits||'');
    const by=new Map();for(const r of historyRows||[]){if(!by.has(r.market_id))by.set(r.market_id,[]);by.get(r.market_id).push(r);}
    const marketIds=[...by.keys()],errorMemories=await loadErrorMemories(marketIds),rowsToInsert=[];
    let marketsLocked=0,skipped=0;
    for(const [marketId,rows0] of by){
      const rows=[...rows0].sort((a,b)=>Number(a.rn)-Number(b.rn));
      if(rows.length<5||String(rows[0]?.draw_date||'')>=TARGET_DATE){skipped++;continue;}
      const core=calculateVeltrix(rows,{targetDate:TARGET_DATE,errorMemory:errorMemories.get(marketId)||null});
      const fused=applyWorldWinFusion(core,worldWin),predictions=enhanceVeltrixWithRud(rows,fused);
      if(!predictions){skipped++;continue;}
      let made=false;
      for(const p of Object.values(predictions)){
        const battle=buildPair2ForwardBattle(rows,p,worldWin);if(!battle)continue;
        rowsToInsert.push({market_id:marketId,source_result_id:rows[0].id,target_date:TARGET_DATE,mode:p.mode,engine_version:ENGINE_VERSION,battle_version:PAIR2_BATTLE_VERSION,world_win:worldWin,win6:battle.win6,reserve7:battle.reserve7,variants:battle.variants});
        made=true;
      }
      if(made)marketsLocked++;
    }
    if(rowsToInsert.length)await db(`veltrix_pair2_forward_battle?on_conflict=${BATTLE_CONFLICT}`,{method:'POST',prefer:'resolution=ignore-duplicates,return=minimal',body:rowsToInsert});
    return json(res,200,{ok:true,temporary:true,target_date:TARGET_DATE,world_win:worldWin,battle_version:PAIR2_BATTLE_VERSION,markets_seen:by.size,markets_locked:marketsLocked,rows_attempted:rowsToInsert.length,skipped});
  }catch(e){return json(res,500,{error:e.message,detail:e.data||null});}
}
