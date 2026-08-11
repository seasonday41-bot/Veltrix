import {db,json,allow} from '../lib/db.js';
import {PAIR2_BATTLE_VERSION} from '../lib/pair2-forward-battle.js';

export default async function handler(req,res){
  allow(res,'GET');if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  try{
    const date=String(req.query?.date||'').trim();
    const dailyPath=date
      ? `veltrix_pair2_forward_daily?select=*&target_date=eq.${encodeURIComponent(date)}&order=variant.asc`
      : 'veltrix_pair2_forward_daily?select=*&order=target_date.desc,variant.asc&limit=300';
    const battlePath=date
      ? `veltrix_pair2_forward_battle?select=market_id,target_date,mode,world_win,win6,reserve7,variants,actual_top3,actual_bottom2,settlement,settled_at&battle_version=eq.${PAIR2_BATTLE_VERSION}&mode=eq.A&target_date=eq.${encodeURIComponent(date)}&order=market_id.asc&limit=100`
      : `veltrix_pair2_forward_battle?select=market_id,target_date,mode,world_win,win6,reserve7,variants,actual_top3,actual_bottom2,settlement,settled_at&battle_version=eq.${PAIR2_BATTLE_VERSION}&mode=eq.A&order=target_date.desc,market_id.asc&limit=500`;
    const [daily,battles,markets]=await Promise.all([
      db(dailyPath),db(battlePath),db('veltrix_markets?select=id,market_key,market_name')
    ]);
    const marketById=new Map((markets||[]).map(m=>[m.id,m]));
    const items=(battles||[]).map(b=>{
      const m=marketById.get(b.market_id)||{};
      return {date:b.target_date,market_key:m.market_key||null,market_name:m.market_name||null,world_win:b.world_win,win6:b.win6,reserve7:b.reserve7,actual:b.settled_at?`${b.actual_top3}-${b.actual_bottom2}`:null,settled:!!b.settled_at,variants:b.variants,results:b.settlement?.results||null};
    });
    return json(res,200,{ok:true,read_only:true,track:PAIR2_BATTLE_VERSION,world_win:true,filter_date:date||null,summary:daily||[],items});
  }catch(e){return json(res,500,{error:e.message,detail:e.data||null});}
}
