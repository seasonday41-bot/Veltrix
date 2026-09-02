import crypto from 'node:crypto';
import {db,json,allow} from './_db.js';
import {repairDirectFinderActuals} from '../lib/auto-snapshot.js';

const WRITER_TOKEN_SHA256='507ac8e650ac8a3a96b0486c6af75a61a9684bd54eae0fdf811d982284688ee3';

function safeEqual(a='',b=''){
  const aa=Buffer.from(String(a));const bb=Buffer.from(String(b));
  return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb);
}
function authorized(req){
  const token=String(req.headers['x-result-writer-token']||'');
  if(!token)return false;
  return safeEqual(crypto.createHash('sha256').update(token).digest('hex'),WRITER_TOKEN_SHA256);
}

export default async function handler(req,res){
  allow(res,'POST');
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  if(!authorized(req))return json(res,401,{error:'Machine authentication required'});
  if(req.body?.confirm!=='REPAIR_DIRECT_FINDER_LIVE_V17')return json(res,400,{error:'Missing repair confirmation'});
  try{
    const rows=await db('veltrix_market_results?select=id,market_id,draw_date,top3,bottom2,source,created_at&source=like.result_finder:*&order=created_at.asc&limit=100');
    const ids=(rows||[]).map(r=>r.id);
    if(!ids.length)return json(res,200,{ok:true,found:0,repaired:0});
    const audits=await db(`veltrix_forward_audit?select=actual_result_id&actual_result_id=in.(${ids.join(',')})&limit=500`);
    const audited=new Set((audits||[]).map(a=>a.actual_result_id));
    const targets=(rows||[]).filter(r=>!audited.has(r.id));
    if(!targets.length)return json(res,200,{ok:true,found:rows.length,pending:0,repaired:0});
    const result=await repairDirectFinderActuals(targets);
    return json(res,200,{ok:true,found:rows.length,pending:targets.length,...result});
  }catch(error){return json(res,500,{error:error?.message||'Repair failed'});}
}
