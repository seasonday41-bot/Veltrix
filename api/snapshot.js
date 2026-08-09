import {db,json,allow} from '../lib/db.js';

function rowFromPrediction(marketId,sourceId,p){
  const shared=Array.isArray(p.pair2Shared)?p.pair2Shared:(Array.isArray(p.pair2Top)?p.pair2Top:[]);
  const pair2Top=shared.slice(0,5);
  const pair2Bottom=shared.slice(5,10);
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
    pair2_top:pair2Top,
    pair2_bottom:pair2Bottom,
    pair3_top:p.pair3Top||[],
    metadata:{
      pool_size:p.poolSize,
      ui_version:'v1',
      target_date:p.targetDate||null,
      day_win:p.dayWin||null,
      year_win:p.yearWin||null,
      calendar_bonus:p.calendarBonus||null,
      hybrid_version:p.hybridVersion||null,
      pair2_layout:'shared_10_split_5_5',
      pair2_shared:shared.slice(0,10)
    }
  };
}

export default async function handler(req,res){
  allow(res,'POST');
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  try{
    const {market_id,source_result_id,predictions}=req.body||{};
    if(!market_id||!source_result_id||!Array.isArray(predictions))return json(res,400,{error:'ข้อมูล Snapshot ไม่ครบ'});
    const existing=await db(`veltrix_prediction_snapshots?select=id,mode&source_result_id=eq.${source_result_id}&engine_version=eq.v1`);
    const locked=new Set((existing||[]).map(x=>x.mode));
    const rows=predictions.filter(p=>['A','B'].includes(p.mode)&&!locked.has(p.mode)).map(p=>rowFromPrediction(market_id,source_result_id,p));
    if(rows.length){
      await db('veltrix_prediction_snapshots',{method:'POST',body:rows,prefer:'return=minimal'});
    }
    return json(res,200,{ok:true,already_locked:rows.length===0,created:rows.length});
  }catch(e){return json(res,500,{error:e.message});}
}
