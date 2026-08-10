import {db,json,allow} from '../lib/db.js';

const ACCESS='PN1C22M1f4Dp5bOFC42ukGfl1VTkJBWR';
const ENGINE='adaptive_v17';

function supabaseRef(){
  try{
    const u=new URL(process.env.SUPABASE_URL||'');
    return u.hostname.split('.')[0]||null;
  }catch{return null;}
}

export default async function handler(req,res){
  allow(res,'GET');
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  if(String(req.query?.k||'')!==ACCESS)return json(res,403,{error:'Forbidden'});
  try{
    const date=String(req.query?.date||'').trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return json(res,400,{error:'date YYYY-MM-DD required'});
    const [snapshots,markets,allSnapshots]=await Promise.all([
      db(`veltrix_prediction_snapshots?select=id,market_id,source_result_id,mode,engine_version,win6,reserve7,rud_top,rud_bottom,pair2_top,pair3_top,metadata,created_at,settled_at&engine_version=eq.${ENGINE}&order=created_at.desc&limit=1000`),
      db('veltrix_markets?select=id,market_key,market_name&active=eq.true'),
      db('veltrix_prediction_snapshots?select=id&limit=1000')
    ]);
    const marketById=new Map((markets||[]).map(m=>[m.id,m]));
    const rows=(snapshots||[])
      .filter(s=>String(s?.metadata?.target_date||'')===date)
      .map(s=>({market_name:marketById.get(s.market_id)?.market_name||s.market_id,market_key:marketById.get(s.market_id)?.market_key||null,mode:s.mode,win6:s.win6,reserve7:s.reserve7,rud_top:s.rud_top,rud_bottom:s.rud_bottom,pair2_top:s.pair2_top,pair3_top:s.pair3_top,created_at:s.created_at,settled_at:s.settled_at,source_result_id:s.source_result_id}));
    rows.sort((a,b)=>a.market_name.localeCompare(b.market_name,'th'));
    return json(res,200,{supabase_project_ref:supabaseRef(),snapshot_total:(allSnapshots||[]).length,date,engine_version:ENGINE,count:rows.length,rows});
  }catch(e){return json(res,500,{error:e.message,detail:e.data||null});}
}
