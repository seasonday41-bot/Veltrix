import {db,json,allow} from '../lib/db.js';

export default async function handler(req,res){
  allow(res,'GET');
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  try{
    const [markets,aliases,results,batches]=await Promise.all([
      db('veltrix_markets?select=id,market_key,market_name,active,created_at,updated_at&order=market_key.asc'),
      db('veltrix_market_aliases?select=market_id,alias,active'),
      db('veltrix_market_results?select=id,market_id,draw_date,top3,bottom2,source,import_batch_id,created_at&order=draw_date.desc,created_at.desc'),
      db('veltrix_import_batches?select=id,source_date,raw_text,parsed_count,added_count,duplicate_count,conflict_count,unknown_market_count,unknown_market_items,created_at&order=created_at.desc&limit=200')
    ]);
    const byMarket=new Map();
    for(const r of results||[]){if(!byMarket.has(r.market_id))byMarket.set(r.market_id,[]);byMarket.get(r.market_id).push(r);}
    const aliasByMarket=new Map();
    for(const a of aliases||[]){if(!aliasByMarket.has(a.market_id))aliasByMarket.set(a.market_id,[]);aliasByMarket.get(a.market_id).push(a.alias);}
    const zero=[];
    for(const m of markets||[]){
      if(!m.active)continue;
      const rs=byMarket.get(m.id)||[];
      if(rs.length)continue;
      const names=[m.market_name,...(aliasByMarket.get(m.id)||[])].map(x=>String(x).trim()).filter(Boolean);
      const mentions=[];
      for(const b of batches||[]){
        const raw=String(b.raw_text||'');
        const matched=names.filter(n=>raw.includes(n));
        const unknown=(b.unknown_market_items||[]).filter(x=>{
          const s=typeof x==='string'?x:JSON.stringify(x);
          return names.some(n=>s.includes(n));
        });
        if(matched.length||unknown.length)mentions.push({batch_id:b.id,source_date:b.source_date,created_at:b.created_at,matched_names:matched,unknown_items:unknown,counts:{parsed:b.parsed_count,added:b.added_count,duplicate:b.duplicate_count,conflict:b.conflict_count,unknown:b.unknown_market_count}});
      }
      zero.push({market_key:m.market_key,market_name:m.market_name,market_id:m.id,market_created_at:m.created_at,market_updated_at:m.updated_at,aliases:aliasByMarket.get(m.id)||[],result_count:0,import_mentions:mentions.slice(0,20)});
    }
    const nonzero=(markets||[]).filter(m=>m.active).map(m=>({market_key:m.market_key,market_name:m.market_name,count:(byMarket.get(m.id)||[]).length})).filter(x=>x.count>0);
    return json(res,200,{active_markets:(markets||[]).filter(m=>m.active).length,total_results:(results||[]).length,zero_count:zero.length,zero,nonzero_counts:nonzero});
  }catch(e){return json(res,500,{error:e.message,detail:e.data||null});}
}
