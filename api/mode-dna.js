import {db,json,allow} from '../lib/db.js';
import {calculateVeltrix} from '../lib/veltrix-engine.js';

function canonPair(s=''){return [...String(s)].sort().join('');}
function canonTriple(s=''){return [...String(s)].sort().join('');}
function hasAllDigits(value,set){return [...String(value)].every(d=>set.has(d));}
function pct(n,d){return d?Number((100*n/d).toFixed(2)):0;}

function evaluate(o,actual){
  const win7=new Set([...(o.win6||''),String(o.reserve7??'')].filter(Boolean));
  const target4=`${actual.top3.slice(-2)}${actual.bottom2}`;
  const rudDigits=[o.rudTop,o.rudBottom].filter((d,i,a)=>d!=null&&a.indexOf(d)===i);
  const pairs=o.pair2Shared||o.pair2Top||[];
  const top2Key=canonPair(actual.top3.slice(-2)),bottomKey=canonPair(actual.bottom2),tripleKey=canonTriple(actual.top3);
  return {
    rud_hit:rudDigits.some(d=>target4.includes(String(d))),
    win7_top3_full:hasAllDigits(actual.top3,win7),
    win7_top2_full:hasAllDigits(actual.top3.slice(-2),win7),
    win7_bottom_full:hasAllDigits(actual.bottom2,win7),
    pair2_any_hit:pairs.some(p=>{const k=canonPair(p);return k===top2Key||k===bottomKey;}),
    pair3_hit:(o.pair3Top||[]).some(t=>canonTriple(t)===tripleKey)
  };
}

const KPI=['rud_hit','win7_top3_full','win7_top2_full','win7_bottom_full','pair2_any_hit','pair3_hit'];

function emptyAgg(){return Object.fromEntries(KPI.map(k=>[k,0]));}
function addAgg(a,m){for(const k of KPI)if(m[k])a[k]++;}

export default async function handler(req,res){
  allow(res,'GET');
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  try{
    const [markets,rows]=await Promise.all([
      db('veltrix_markets?select=id,market_key,market_name&active=eq.true&order=market_key.asc'),
      db('veltrix_market_results?select=id,market_id,draw_date,top3,bottom2,created_at&order=market_id.asc,draw_date.desc,created_at.desc')
    ]);
    const byMarket=new Map();
    for(const r of rows||[]){
      if(!byMarket.has(r.market_id))byMarket.set(r.market_id,[]);
      const arr=byMarket.get(r.market_id);
      if(arr.length<20)arr.push(r);
    }

    const results=[];let totalCases=0;
    const global={A:emptyAgg(),B:emptyAgg()};
    for(const market of markets||[]){
      const hist=byMarket.get(market.id)||[];
      const maxCases=Math.max(0,Math.min(15,hist.length-5));
      const agg={A:emptyAgg(),B:emptyAgg()};
      let cases=0;
      for(let t=0;t<maxCases;t++){
        const actual=hist[t];
        const prior=hist.slice(t+1,t+11);
        if(prior.length<5)continue;
        const out=calculateVeltrix(prior);
        if(!out?.A||!out?.B)continue;
        for(const mode of ['A','B']){
          const ev=evaluate(out[mode],actual);addAgg(agg[mode],ev);addAgg(global[mode],ev);
        }
        cases++;totalCases++;
      }
      if(!cases)continue;
      let winsA=0,winsB=0,ties=0;
      for(const k of KPI){if(agg.A[k]>agg.B[k])winsA++;else if(agg.B[k]>agg.A[k])winsB++;else ties++;}
      const totalHitsA=KPI.reduce((s,k)=>s+agg.A[k],0),totalHitsB=KPI.reduce((s,k)=>s+agg.B[k],0);
      let winner='TIE';
      if(totalHitsA>totalHitsB)winner='A';else if(totalHitsB>totalHitsA)winner='B';
      const edge=Number(((totalHitsA-totalHitsB)/(cases*KPI.length)*100).toFixed(2));
      results.push({
        market_key:market.market_key,market_name:market.market_name,cases,winner,edge_pp:edge,
        kpi_wins:{A:winsA,B:winsB,tie:ties},
        score:{A:totalHitsA,B:totalHitsB,A_pct:pct(totalHitsA,cases*KPI.length),B_pct:pct(totalHitsB,cases*KPI.length)},
        A:Object.fromEntries(KPI.map(k=>[k,{hits:agg.A[k],pct:pct(agg.A[k],cases)}])),
        B:Object.fromEntries(KPI.map(k=>[k,{hits:agg.B[k],pct:pct(agg.B[k],cases)}]))
      });
    }
    results.sort((a,b)=>Math.abs(b.edge_pp)-Math.abs(a.edge_pp)||a.market_name.localeCompare(b.market_name,'th'));
    const counts={A:results.filter(x=>x.winner==='A').length,B:results.filter(x=>x.winner==='B').length,TIE:results.filter(x=>x.winner==='TIE').length};
    return json(res,200,{
      engine:'MODE_A_B_SHARED_PIPELINE_WINDOW_ONLY_V7',basis:'latest 20 actual occurrences per market; walk-forward up to 15 cases/market',
      kpis:KPI,market_count:results.length,total_cases:totalCases,winner_counts:counts,
      global:{A:Object.fromEntries(KPI.map(k=>[k,{hits:global.A[k],pct:pct(global.A[k],totalCases)}])),B:Object.fromEntries(KPI.map(k=>[k,{hits:global.B[k],pct:pct(global.B[k],totalCases)}]))},
      markets:results
    });
  }catch(e){return json(res,500,{error:e.message,detail:e.data||null});}
}
