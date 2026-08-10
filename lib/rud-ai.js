import {calculateFormulaSet} from './veltrix-engine.js';

const DIGITS=[...'0123456789'];
const FORMULA_NAMES=['สูตร 1','สูตร 2','สูตร 2.1','สูตร 2.2','สูตร 3-9%','สูตร 3-7%','สูตร 3-6%','สูตร 3-99%'];
// Main learning uses up to 10 completed transitions; never reads beyond 20 rows.
// Transitions 3-5 carry the strongest weight.
const RUD_WEIGHTS=[1.15,1.15,1.35,1.35,1.30,.95,.82,.70,.60,.52];

function digitsOnly(v=''){return String(v??'').replace(/\D/g,'');}
function top3(v){return digitsOnly(v).padStart(3,'0').slice(-3);}
function bottom2(v){return digitsOnly(v).padStart(2,'0').slice(-2);}
function normalizeRows(rows=[]){return rows.slice(0,20).map(r=>({...r,top3:top3(r.top3),bottom2:bottom2(r.bottom2)}));}
function chars(r){return `${r.top3}${r.bottom2}`;}
function normMap(map){const mx=Math.max(1e-9,...DIGITS.map(d=>Number(map?.[d]||0)));return Object.fromEntries(DIGITS.map(d=>[d,Number(map?.[d]||0)/mx]));}
function rawPercent(row,pct=56){
  const n=Number(top3(row.top3))*pct;
  return `${Math.floor(n/100)}${String(n%100).padStart(2,'0')}`;
}
function sources(row){return {P56:rawPercent(row,56),...calculateFormulaSet(row)};}

function sourcePositionStats(rows){
  const stats=new Map();
  for(let k=1;k<Math.min(rows.length,11);k++){
    const w=RUD_WEIGHTS[k-1],src=sources(rows[k]),targetTop=new Set(top3(rows[k-1].top3)),targetBottom=new Set(bottom2(rows[k-1].bottom2));
    for(const [name,raw] of Object.entries(src)){
      for(let pos=0;pos<raw.length;pos++){
        const key=`${name}:${pos}`,d=raw[pos],x=stats.get(key)||{any:.5,top:.3,bottom:.2,total:1};
        x.total+=w;
        if(targetTop.has(d)||targetBottom.has(d))x.any+=w;
        if(targetTop.has(d))x.top+=w;
        if(targetBottom.has(d))x.bottom+=w;
        stats.set(key,x);
      }
    }
  }
  return stats;
}

function allSourceEvidence(rows){
  const stats=sourcePositionStats(rows),current=sources(rows[0]);
  const evidence=Object.fromEntries(DIGITS.map(d=>[d,[]]));
  for(const [name,raw] of Object.entries(current)){
    for(let pos=0;pos<raw.length;pos++){
      const d=raw[pos],x=stats.get(`${name}:${pos}`)||{any:.5,top:.3,bottom:.2,total:1};
      evidence[d].push({name,pos,any:x.any/x.total,top:x.top/x.total,bottom:x.bottom/x.total});
    }
  }
  const score={},sideByDigit={};
  for(const d of DIGITS){
    const ev=evidence[d];
    if(!ev.length){score[d]=0;sideByDigit[d]='บน';continue;}
    const rel=ev.map(x=>x.any).sort((a,b)=>b-a),best2=rel.slice(0,2),best2Mean=best2.reduce((s,x)=>s+x,0)/best2.length,support=Math.min(1,ev.length/4);
    score[d]=.80*best2Mean+.20*support;
    const sideEvidence=[...ev].sort((a,b)=>b.any-a.any);
    let ts=0,bs=0;
    sideEvidence.forEach((x,i)=>{const w=i<2?1:.5;ts+=w*x.top;bs+=w*x.bottom;});
    sideByDigit[d]=ts>=bs?'บน':'ล่าง';
  }
  return {score:normMap(score),sideByDigit,evidence,current};
}

function percent56Evidence(rows){
  const stats=new Map();
  for(let k=1;k<Math.min(rows.length,11);k++){
    const w=RUD_WEIGHTS[k-1],raw=rawPercent(rows[k],56),targetTop=new Set(top3(rows[k-1].top3)),targetBottom=new Set(bottom2(rows[k-1].bottom2));
    for(let pos=0;pos<raw.length;pos++){
      const d=raw[pos],x=stats.get(pos)||{any:.5,top:.3,bottom:.2,total:1};
      x.total+=w;
      if(targetTop.has(d)||targetBottom.has(d))x.any+=w;
      if(targetTop.has(d))x.top+=w;
      if(targetBottom.has(d))x.bottom+=w;
      stats.set(pos,x);
    }
  }
  const raw=rawPercent(rows[0],56),ev=Object.fromEntries(DIGITS.map(d=>[d,[]]));
  for(let pos=0;pos<raw.length;pos++){
    const d=raw[pos],x=stats.get(pos)||{any:.5,top:.3,bottom:.2,total:1};
    ev[d].push({pos,any:x.any/x.total,top:x.top/x.total,bottom:x.bottom/x.total});
  }
  const score=Object.fromEntries(DIGITS.map(d=>[d,-1])),sideByDigit={};
  for(const d of DIGITS){
    if(!ev[d].length){sideByDigit[d]='บน';continue;}
    const sorted=[...ev[d]].sort((a,b)=>b.any-a.any),best=sorted.slice(0,2);
    score[d]=best.reduce((s,x)=>s+x.any,0)/best.length;
    const strongest=sorted[0];sideByDigit[d]=strongest.top>=strongest.bottom?'บน':'ล่าง';
  }
  return {score,sideByDigit,evidence:ev,raw};
}

function buildPairs(rows,win6,rankScore,rud){
  function posProb(pos,d){let count=1,total=10;rows.slice(0,5).forEach((r,i)=>{const w=1.5-.15*i;total+=w;if(chars(r)[pos]===d)count+=w;});return count/total;}
  const c=[];
  for(const a of win6)for(const b of win6){
    if(a===b&&!rows.slice(0,5).some(r=>r.top3.includes(a+a)||r.bottom2===a+a))continue;
    const top=posProb(1,a)*posProb(2,b),bottom=posProb(3,a)*posProb(4,b),ai=((rankScore[a]||0)+(rankScore[b]||0))/2;
    const rudBonus=(rud.includes(a)?1:0)+(rud.includes(b)?1:0);
    let hist=0;rows.slice(0,5).forEach((r,i)=>{const w=1-.12*i;if(r.top3.slice(-2)===a+b)hist+=w;if(r.bottom2===a+b)hist+=w;});
    c.push({p:a+b,score:2.2*(top+bottom)+.55*ai+.22*rudBonus+.35*hist});
  }
  c.sort((x,y)=>y.score-x.score||x.p.localeCompare(y.p));
  const out=[],seen=new Set();
  for(const x of c){const key=[...x.p].sort().join('');if(seen.has(key))continue;seen.add(key);out.push(x.p);if(out.length===5)break;}
  return out;
}

function buildTriples(rows,win6,rankScore,rud,pairs){
  function posProb(pos,d){let count=1,total=10;rows.slice(0,5).forEach((r,i)=>{const w=1.5-.15*i;total+=w;if(chars(r)[pos]===d)count+=w;});return count/total;}
  const c=[];
  for(const a of win6)for(const b of win6)for(const d of win6){
    const t=a+b+d,position=posProb(0,a)*posProb(1,b)*posProb(2,d),ai=((rankScore[a]||0)+(rankScore[b]||0)+(rankScore[d]||0))/3;
    const pairBonus=pairs.some(p=>t.includes(p[0])&&t.includes(p[1]))?1:0,rudBonus=[...new Set(t)].filter(x=>rud.includes(x)).length;
    let hist=0;rows.slice(0,5).forEach((r,i)=>{const w=1-.12*i;if(r.top3===t)hist+=2*w;else hist+=[...new Set(t)].filter(x=>r.top3.includes(x)).length*.12*w;});
    c.push({t,score:3*position+.65*ai+.20*rudBonus+.25*pairBonus+.45*hist});
  }
  c.sort((x,y)=>y.score-x.score||x.t.localeCompare(y.t));
  const out=[],seen=new Set();
  for(const x of c){const key=[...x.t].sort().join('');if(seen.has(key))continue;seen.add(key);out.push(x.t);if(out.length===3)break;}
  return out;
}

export function calculateLinkedRud(inputRows,rankScore={},win6Input=''){
  const rows=normalizeRows(inputRows);if(rows.length<5)return null;
  const win6=[...new Set([...String(win6Input||'')].filter(d=>DIGITS.includes(d)))].slice(0,6);
  if(win6.length<2)return null;
  const p56=percent56Evidence(rows),all=allSourceEvidence(rows),rankN=normMap(rankScore||{});
  const p56N=normMap(Object.fromEntries(DIGITS.map(d=>[d,Math.max(0,Number(p56.score[d]||0))])));
  const rudScore=Object.fromEntries(DIGITS.map(d=>[d,.60*all.score[d]+.25*p56N[d]+.15*rankN[d]]));

  // RUD AI may score all 0-9, but the actual RUD output is locked to FINAL WIN6.
  const primary=[...win6].sort((a,b)=>p56.score[b]-p56.score[a]||rudScore[b]-rudScore[a]||rankN[b]-rankN[a]||win6.indexOf(a)-win6.indexOf(b))[0];
  const secondary=[...win6].filter(d=>d!==primary).sort((a,b)=>rudScore[b]-rudScore[a]||rankN[b]-rankN[a]||win6.indexOf(a)-win6.indexOf(b))[0];

  // Reserve remains outside WIN6. Prefer learned Percent-RUD evidence, then use
  // the central ranking as tie-break/fallback so the seventh digit stays in the same lineage.
  const outside=DIGITS.filter(d=>!win6.includes(d));
  const p56Outside=outside.filter(d=>p56.score[d]>=0).sort((a,b)=>p56.score[b]-p56.score[a]||all.score[b]-all.score[a]||rankN[b]-rankN[a]||Number(a)-Number(b));
  const smartReserve=p56Outside[0]||[...outside].sort((a,b)=>(.55*all.score[b]+.45*rankN[b])-(.55*all.score[a]+.45*rankN[a])||Number(a)-Number(b))[0]||null;

  return {
    primary,secondary,
    primarySide:p56.sideByDigit[primary]||all.sideByDigit[primary]||'บน',
    secondarySide:all.sideByDigit[secondary]||'บน',
    scores:rudScore,
    sourceScores:all.score,
    p56Scores:p56.score,
    p56Raw:p56.raw,
    smartReserve,
    relationshipLocked:true,
    version:'RUD_AI_P56_MARKET_LINKED_WIN6_V2'
  };
}

// Compatibility alias for code that imported the first experimental name.
export const calculateIndependentRud=calculateLinkedRud;

export function enhanceVeltrixWithRud(inputRows,outputs){
  const rows=normalizeRows(inputRows);if(!outputs||rows.length<5)return outputs;
  const next={};
  for(const [key,p] of Object.entries(outputs)){
    const win6=[...String(p.win6||'')].slice(0,6),rud=calculateLinkedRud(rows,p.rankScores||{},win6.join(''));
    if(!rud){next[key]=p;continue;}
    const rud2=[rud.primary,rud.secondary];
    const pairs=buildPairs(rows,win6,p.rankScores||{},rud2),triples=buildTriples(rows,win6,p.rankScores||{},rud2,pairs),rank7=p.reserve7;
    next[key]={
      ...p,
      // WIN6 membership is the central lock. RUD never injects an outside digit.
      win6:win6.join(''),
      reserveRank7:rank7,
      reserve7:rud.smartReserve||rank7,
      reserveStrategy:rud.smartReserve?'P56_RUD_RANK_LINKED_RESERVE':'RANK7_FALLBACK',
      rudTop:rud.primary,
      rudBottom:rud.secondary,
      rudPrimary:rud.primary,
      rudSecondary:rud.secondary,
      rudPrimarySide:rud.primarySide,
      rudSecondarySide:rud.secondarySide,
      rudAI:rurSafe(rud),
      rud2,
      pair2Shared:pairs,
      pair2Top:pairs,
      pair2Bottom:[],
      pair3Top:triples,
      relationshipLocked:true,
      hybridVersion:`${p.hybridVersion||'VELTRIX'}+RUD_LINKED_RESERVE_V15`
    };
  }
  return next;
}

function rurSafe(rud){
  return {
    version:rud.version,
    primary:rud.primary,secondary:rud.secondary,
    primarySide:rud.primarySide,secondarySide:rud.secondarySide,
    p56Raw:rud.p56Raw,
    scores:rud.scores,p56Scores:rud.p56Scores,
    smartReserve:rud.smartReserve,
    relationshipLocked:true
  };
}
