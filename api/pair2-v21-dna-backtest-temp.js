import {db,json,allow} from '../lib/db.js';
import {calculateVeltrix} from '../lib/veltrix-engine.js';
import {enhanceVeltrixWithRud} from '../lib/rud-ai.js';

const clean=v=>String(v??'').replace(/\D/g,'');
const top3=v=>clean(v).padStart(3,'0').slice(-3);
const bottom2=v=>clean(v).padStart(2,'0').slice(-2);
const chars=r=>`${top3(r.top3)}${bottom2(r.bottom2)}`;
const canon=s=>[...String(s)].sort().join('');
const pct=(a,b)=>b?Math.round(a*10000/b)/100:0;

function positionProb(rows,pos,d){
  let count=1,total=10;
  rows.slice(0,5).forEach((r,i)=>{const w=1.5-.15*i;total+=w;if(chars(r)[pos]===d)count+=w;});
  return count/total;
}
function baseCandidates(rows,win6){
  const out=[];
  for(const a of win6)for(const b of win6){
    if(a===b&&!rows.slice(0,5).some(r=>top3(r.top3).includes(a+a)||bottom2(r.bottom2)===a+a))continue;
    const top=positionProb(rows,1,a)*positionProb(rows,2,b),bottom=positionProb(rows,3,a)*positionProb(rows,4,b);
    out.push({p:a+b,key:canon(a+b),base:top+bottom,a,b});
  }
  return out;
}
function dnaRaw(rows,a,b,variant){
  const ws=[1,.9,.8],rs=rows.slice(2,5); // exact occurrences 3-5 only
  let exact=0,co=0,affA=0,affB=0,total=0;
  rs.forEach((r,i)=>{
    const w=ws[i]||.7,t=top3(r.top3).slice(-2),bot=bottom2(r.bottom2),all=chars(r),ca=[...all].filter(x=>x===a).length,cb=[...all].filter(x=>x===b).length;
    total+=w;
    if(canon(t)===canon(a+b))exact+=w;
    if(canon(bot)===canon(a+b))exact+=w;
    const both=a===b?ca>=2:(ca>0&&cb>0);if(both)co+=w;
    if(ca>0)affA+=w;if(cb>0)affB+=w;
  });
  const affinity=total?Math.min(affA,affB)/total:0;
  if(variant==='exact')return exact;
  if(variant==='cooccur')return co;
  if(variant==='affinity')return affinity;
  return .70*exact+.30*co; // hybrid
}
function buildV21(rows,win6,variant,alpha){
  const c=baseCandidates(rows,win6);
  const maxBase=Math.max(1e-12,...c.map(x=>x.base));
  const raw=c.map(x=>dnaRaw(rows,x.a,x.b,variant));
  const maxDna=Math.max(1e-12,...raw);
  c.forEach((x,i)=>{const bn=x.base/maxBase,dn=raw[i]/maxDna;x.score=(1-alpha)*bn+alpha*dn;});
  c.sort((x,y)=>y.score-x.score||y.base-x.base||x.p.localeCompare(y.p));
  const out=[],seen=new Set();
  for(const x of c){if(seen.has(x.key))continue;seen.add(x.key);out.push(x.p);if(out.length===5)break;}
  return out;
}
function hit(pairs,target){
  const keys=new Set((pairs||[]).map(canon)),t=canon(top3(target.top3).slice(-2)),b=canon(bottom2(target.bottom2));
  const top=keys.has(t),bottom=keys.has(b);return {top,bottom,any:top||bottom,both:top&&bottom};
}
function bucket(){return {cases:0,top:0,bottom:0,any:0,both:0};}
function add(x,h){x.cases++;if(h.top)x.top++;if(h.bottom)x.bottom++;if(h.any)x.any++;if(h.both)x.both++;}
function shape(x){return {...x,topPct:pct(x.top,x.cases),bottomPct:pct(x.bottom,x.cases),anyPct:pct(x.any,x.cases),bothPct:pct(x.both,x.cases)};}

export default async function handler(req,res){
  allow(res,'GET');if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  try{
    const all=await db('veltrix_latest_20?select=market_id,market_name,draw_date,top3,bottom2,rn&order=market_id.asc,rn.asc&limit=2000');
    const by=new Map();for(const r of all||[]){if(!by.has(r.market_id))by.set(r.market_id,[]);by.get(r.market_id).push(r);}
    const variants=['exact','cooccur','hybrid','affinity'];
    const alphas=[.05,.10,.15,.20,.25,.30,.35,.40,.45,.50];
    const grid=[];
    for(const variant of variants)for(const alpha of alphas)grid.push({variant,alpha,train:bucket(),validation:bucket(),all:bucket(),market:new Map()});
    const champ={train:bucket(),validation:bucket(),all:bucket(),market:new Map()};
    let targets=0;
    for(const [marketId,rs0] of by){
      const rs=[...rs0].sort((a,b)=>Number(a.rn)-Number(b.rn));
      for(let i=0;i<rs.length-5;i++){
        const target=rs[i],hist=rs.slice(i+1);if(hist.length<5)continue;
        const core=calculateVeltrix(hist,{targetDate:target.draw_date}),outputs=enhanceVeltrixWithRud(hist,core),p=outputs?.A||Object.values(outputs||{})[0];if(!p)continue;
        const latest=Number(target.rn)<=5,split=latest?'validation':'train',win6=[...String(p.win6||'')].slice(0,6);if(win6.length<6)continue;
        targets++;
        const h1=hit(p.pair2Shared||p.pair2Top||[],target);add(champ[split],h1);add(champ.all,h1);
        const cm=champ.market.get(marketId)||{train:bucket(),validation:bucket()};add(cm[split],h1);champ.market.set(marketId,cm);
        for(const g of grid){const hv=hit(buildV21(hist,win6,g.variant,g.alpha),target);add(g[split],hv);add(g.all,hv);const gm=g.market.get(marketId)||{train:bucket(),validation:bucket()};add(gm[split],hv);g.market.set(marketId,gm);}
      }
    }
    grid.sort((a,b)=>b.train.any-a.train.any||b.train.bottom-a.train.bottom||b.train.top-a.train.top||b.train.both-a.train.both||a.alpha-b.alpha||a.variant.localeCompare(b.variant));
    const best=grid[0];
    let wins=0,losses=0,ties=0;
    for(const marketId of by.keys()){
      const a=champ.market.get(marketId)?.validation?.any||0,b=best.market.get(marketId)?.validation?.any||0;if(b>a)wins++;else if(b<a)losses++;else ties++;
    }
    const top5=grid.slice(0,5).map(g=>({variant:g.variant,alpha:g.alpha,training:shape(g.train),validation:shape(g.validation),all:shape(g.all)}));
    return json(res,200,{ok:true,read_only:true,world_win:false,method:'walk_forward_occurrence_based',pairDnaWindow:'occurrences_3_to_5_only',markets:by.size,targets,split:{training:'rn 6-15 older',validation:'rn 1-5 latest'},champion:{name:'PAIR2_POSITION_SPECIALIST_V1',training:shape(champ.train),validation:shape(champ.validation),all:shape(champ.all)},challenger:{name:'PAIR2_V21_DNA_3_5_ONLY',selected:{variant:best.variant,alpha:best.alpha},training:shape(best.train),validation:shape(best.validation),all:shape(best.all),validationMarketComparison:{wins,losses,ties}},deltaValidation:{top:best.validation.top-champ.validation.top,bottom:best.validation.bottom-champ.validation.bottom,any:best.validation.any-champ.validation.any,both:best.validation.both-champ.validation.both},top5TrainingChoices:top5,decision:best.validation.any>champ.validation.any?'V21_WINS':best.validation.any<champ.validation.any?'V1_WINS':'TIE'});
  }catch(e){return json(res,500,{error:e.message});}
}
