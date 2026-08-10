import {db,json,allow} from '../lib/db.js';

const SOURCES=['สูตร 1','สูตร 2','สูตร 2.1','สูตร 2.2','สูตร 3-9%','สูตร 3-7%','สูตร 3-6%','สูตร 3-99%'];
const digits=v=>String(v??'').replace(/\D/g,'');
const top3=v=>digits(v).padStart(3,'0').slice(-3);
const bottom2=v=>digits(v).padStart(2,'0').slice(-2);
const pctRaw=numerator=>`${Math.floor(numerator/100)}.${String(numerator%100).padStart(2,'0')}`;

function rawFormulaSet(row){
  const t=top3(row.top3),b=bottom2(row.bottom2);
  const [A,B,C]=[...t].map(Number),[D,E]=[...b].map(Number);
  const upper2=Number(t.slice(-2)),lower2=Number(b),sum2=upper2+lower2;
  const x1=(A+D)%10;
  const f2=[...String(sum2)].reduce((s,x)=>s+Number(x),0)%10;
  const x21=(A+B+C+D+E)%10;
  return {
    'สูตร 1':`${x1}${(x1+1)%10}`,
    'สูตร 2':String(f2),
    'สูตร 2.1':`${x21}${(x21+1)%10}`,
    'สูตร 2.2':`${(B+E)%10}${(B+D)%10}${(C+E)%10}`,
    'สูตร 3-9%':pctRaw(Number(t)*9),
    'สูตร 3-7%':pctRaw(Number(t)*7),
    'สูตร 3-6%':pctRaw(sum2*6),
    'สูตร 3-99%':pctRaw(sum2*99)
  };
}

function actualDouble(row){
  const t=top3(row.top3),b=bottom2(row.bottom2);
  const adjacent=[];
  if(t[0]===t[1])adjacent.push(t[0]);
  if(t[1]===t[2])adjacent.push(t[1]);
  if(b[0]===b[1])adjacent.push(b[0]);
  const any=[...adjacent];
  if(t[0]===t[2])any.push(t[0]);
  return {adjacent:[...new Set(adjacent)],any:[...new Set(any)]};
}
function signal(raw,mode){
  const s=digits(raw),out=[];
  if(mode==='adjacent'){
    for(let i=1;i<s.length;i++)if(s[i]===s[i-1])out.push(s[i]);
  }else{
    const counts={};for(const d of s)counts[d]=(counts[d]||0)+1;
    for(const [d,n] of Object.entries(counts))if(n>=2)out.push(d);
  }
  return [...new Set(out)];
}
function emptyStats(){return Object.fromEntries(SOURCES.map(s=>[s,{signals:0,eventHits:0,digitHits:0,supportHits:0}]));}
function pct(a,b){return b?Math.round(a*10000/b)/100:0;}

function evaluate(rowsByMarket,mode,actualMode){
  const stats=emptyStats();let transitions=0,eventCount=0;
  const examples=[];
  for(const rows of rowsByMarket.values()){
    const ordered=[...rows].sort((a,b)=>Number(a.rn)-Number(b.rn)); // rn=1 newest
    for(let i=1;i<ordered.length;i++){
      const target=ordered[i-1],source=ordered[i];
      const actual=actualDouble(target)[actualMode];
      transitions++;if(actual.length)eventCount++;
      const fs=rawFormulaSet(source);
      for(const name of SOURCES){
        const candidates=signal(fs[name],mode),st=stats[name];
        if(actual.length&&[...new Set(digits(fs[name]))].some(d=>actual.includes(d)))st.supportHits++;
        if(!candidates.length)continue;
        st.signals++;
        if(actual.length){
          st.eventHits++;
          if(candidates.some(d=>actual.includes(d)))st.digitHits++;
          if(examples.length<30)examples.push({source:`${source.top3}-${source.bottom2}`,target:`${target.top3}-${target.bottom2}`,formula:name,raw:fs[name],signalDigits:candidates,actualDouble:actual});
        }
      }
    }
  }
  const table=SOURCES.map(name=>{
    const s=stats[name];return {formula:name,signals:s.signals,event_hits:s.eventHits,event_precision_pct:pct(s.eventHits,s.signals),event_recall_pct:pct(s.eventHits,eventCount),digit_hits_when_signal_and_event:s.digitHits,digit_accuracy_given_event_hit_pct:pct(s.digitHits,s.eventHits),digit_support_hits_on_all_events:s.supportHits,digit_support_recall_pct:pct(s.supportHits,eventCount)};
  });
  table.sort((a,b)=>b.event_precision_pct-a.event_precision_pct||b.event_hits-a.event_hits);
  return {signal_mode:mode,actual_event_mode:actualMode,transitions,double_events:eventCount,double_event_rate_pct:pct(eventCount,transitions),table,examples};
}

export default async function handler(req,res){
  allow(res,'GET');if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  try{
    const [rows,markets]=await Promise.all([
      db('veltrix_latest_20?select=id,market_id,draw_date,top3,bottom2,rn&order=market_id.asc,rn.asc&limit=2000'),
      db('veltrix_markets?select=id,market_key,market_name&active=eq.true&order=market_key.asc')
    ]);
    const by=new Map();for(const r of rows||[]){if(!by.has(r.market_id))by.set(r.market_id,[]);by.get(r.market_id).push(r);}
    const marketMap=new Map((markets||[]).map(m=>[m.id,m]));
    const marketCounts=[...by.entries()].map(([id,x])=>({market:marketMap.get(id)?.market_name||id,count:x.length}));
    return json(res,200,{ok:true,read_only:true,markets:by.size,market_counts:marketCounts,tests:{adjacent_signal_vs_adjacent_double:evaluate(by,'adjacent','adjacent'),repeat_signal_vs_adjacent_double:evaluate(by,'repeat','adjacent'),adjacent_signal_vs_any_double:evaluate(by,'adjacent','any'),repeat_signal_vs_any_double:evaluate(by,'repeat','any')}});
  }catch(e){return json(res,500,{error:e.message});}
}
