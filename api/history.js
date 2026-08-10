import {db,json,allow} from '../lib/db.js';
import {loadErrorMemory} from '../lib/error-memory.js';

export default async function handler(req,res){
  allow(res,'GET');
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  try{
    const marketKey=String(req.query?.market_key||'').trim();
    if(!marketKey)return json(res,400,{error:'market_key is required'});
    const mk=encodeURIComponent(marketKey);
    const markets=await db(`veltrix_markets?select=id,market_key,market_name,country_code&market_key=eq.${mk}&active=eq.true&limit=1`);
    if(!markets?.length)return json(res,404,{error:'ไม่พบตลาดนี้ใน VELTRIX'});
    const market=markets[0];
    const [history,errorMemory]=await Promise.all([
      db(`veltrix_latest_20?select=id,market_id,market_key,market_name,draw_date,top3,bottom2,rn&market_key=eq.${mk}&order=rn.asc`),
      loadErrorMemory(market.id)
    ]);
    return json(res,200,{market,history:history||[],errorMemory});
  }catch(e){return json(res,500,{error:e.message});}
}
