import {db,json,allow} from '../lib/db.js';
import {pair2ShadowHit} from '../lib/pair2-shadow.js';

const TRACK='PAIR2_NO_WORLD_V1_V21_FORWARD';
function clean(v=''){return String(v??'').replace(/\D/g,'');}
function top3(v){return clean(v).padStart(3,'0').slice(-3);}
function bottom2(v){return clean(v).padStart(2,'0').slice(-2);}
function bucket(){return {cases:0,top:0,bottom:0,any:0,both:0};}
function add(x,h){x.cases++;if(h.top)x.top++;if(h.bottom)x.bottom++;if(h.any)x.any++;if(h.both)x.both++;}
function pct(a,b){return b?Math.round(a*10000/b)/100:0;}
function shape(x){return {...x,topPct:pct(x.top,x.cases),bottomPct:pct(x.bottom,x.cases),anyPct:pct(x.any,x.cases),bothPct:pct(x.both,x.cases)};}
function result(pairs,top,bottom){const t=pair2ShadowHit(pairs,top.slice(-2)),b=pair2ShadowHit(pairs,bottom);return {top:t,bottom:b,any:t||b,both:t&&b};}

export default async function handler(req,res){
  allow(res,'GET');if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  try{
    const date=String(req.query?.date||'').trim();
    const snapshots=await db('veltrix_prediction_snapshots?select=id,market_id,source_result_id,settled_at,metadata&engine_version=eq.adaptive_v17&settled_at=not.is.null&order=settled_at.desc&limit=1000');
    const tracked=(snapshots||[]).filter(s=>s?.metadata?.pair2_no_world_shadow?.version===TRACK);
    if(!tracked.length)return json(res,200,{ok:true,read_only:true,track:TRACK,cases:0,message:'ยังไม่มี Shadow Snapshot ที่ Settlement แล้ว'});
    const ids=tracked.map(s=>s.id),[audits,markets]=await Promise.all([
      db(`veltrix_forward_audit?select=snapshot_id,actual_result_id,settled_at,details&snapshot_id=in.(${ids.join(',')})&limit=1200`),
      db('veltrix_markets?select=id,market_key,market_name')
    ]);
    const auditBySnapshot=new Map((audits||[]).map(a=>[a.snapshot_id,a])),marketById=new Map((markets||[]).map(m=>[m.id,m]));
    const champion=bucket(),challenger=bucket(),days=new Map(),items=[];let challengerWins=0,championWins=0,ties=0;
    for(const s of tracked){
      const a=auditBySnapshot.get(s.id);if(!a)continue;
      const d=a.details||{},targetDate=String(d.target_date||s.metadata?.target_date||'');if(date&&targetDate!==date)continue;
      const top=top3(d.actual_top3),bottom=bottom2(d.actual_bottom2);if(!top||!bottom)continue;
      const shadow=s.metadata.pair2_no_world_shadow,cp=shadow?.champion?.pairs||[],xp=shadow?.challenger?.pairs||[];
      const ch=result(cp,top,bottom),xh=result(xp,top,bottom);add(champion,ch);add(challenger,xh);
      const winner=xh.any&&!ch.any?'V2.1':ch.any&&!xh.any?'V1':'TIE';if(winner==='V2.1')challengerWins++;else if(winner==='V1')championWins++;else ties++;
      if(!days.has(targetDate))days.set(targetDate,{champion:bucket(),challenger:bucket(),v1Wins:0,v21Wins:0,ties:0});const day=days.get(targetDate);add(day.champion,ch);add(day.challenger,xh);if(winner==='V2.1')day.v21Wins++;else if(winner==='V1')day.v1Wins++;else day.ties++;
      const m=marketById.get(s.market_id)||{};items.push({date:targetDate,market_key:m.market_key||null,market_name:m.market_name||null,actual:`${top}-${bottom}`,win6_no_world:shadow.win6,champion_pairs:cp,challenger_pairs:xp,champion_hit:ch,challenger_hit:xh,winner});
    }
    const byDate=[...days.entries()].sort((a,b)=>b[0].localeCompare(a[0])).map(([d,x])=>({date:d,champion:shape(x.champion),challenger:shape(x.challenger),v1Wins:x.v1Wins,v21Wins:x.v21Wins,ties:x.ties}));
    return json(res,200,{ok:true,read_only:true,track:TRACK,world_win:false,comparison:'V1 Position Specialist vs V2.1 Exact DNA 3-5 alpha 0.25',filter_date:date||null,cases:champion.cases,champion:shape(champion),challenger:shape(challenger),head_to_head:{v1Wins:championWins,v21Wins:challengerWins,ties},by_date:byDate,items:items.slice(0,300)});
  }catch(e){return json(res,500,{error:e.message});}
}
