import {calculateFormulaSet} from './veltrix-engine.js';

const DIGITS=[...'0123456789'];
const FORMULA_NAMES=['สูตร 1','สูตร 2','สูตร 2.1','สูตร 2.2','สูตร 3-9%','สูตร 3-7%','สูตร 3-6%','สูตร 3-99%'];
const PAIR3_FORMULA_PRIORITY=['สูตร 3-6%','สูตร 3-9%','สูตร 3-99%','สูตร 2.2','สูตร 3-7%'];
const SPECIALIST_VERSION='OUTPUT_SPECIALISTS_V16';
const RUD_FIRST_VERSION='RUD_FIRST_WIN6_V17';
const RUD_WEIGHTS=[1.15,1.15,1.35,1.35,1.30,.95,.82,.70,.60,.52];

function digitsOnly(v=''){return String(v??'').replace(/\D/g,'');}
function top3(v){return digitsOnly(v).padStart(3,'0').slice(-3);}
function bottom2(v){return digitsOnly(v).padStart(2,'0').slice(-2);}
function normalizeRows(rows=[]){return rows.slice(0,20).map(r=>({...r,top3:top3(r.top3),bottom2:bottom2(r.bottom2)}));}
function chars(r){return `${r.top3}${r.bottom2}`;}
function normMap(map){const mx=Math.max(1e-9,...DIGITS.map(d=>Number(map?.[d]||0)));return Object.fromEntries(DIGITS.map(d=>[d,Number(map?.[d]||0)/mx]));}
function rawPercent(row,pct=56){const n=Number(top3(row.top3))*pct;return `${Math.floor(n/100)}${String(n%100).padStart(2,'0')}`;}
function sources(row){return {P56:rawPercent(row,56),...calculateFormulaSet(row)};}
function positionProb(rows,pos,d){let count=1,total=10;rows.slice(0,5).forEach((r,i)=>{const w=1.5-.15*i;total+=w;if(chars(r)[pos]===d)count+=w;});return count/total;}
function doubleDigits(row){const t=top3(row.top3),b=bottom2(row.bottom2),out=[];if(t[0]===t[1])out.push(t[0]);if(t[1]===t[2])out.push(t[1]);if(t[0]===t[2])out.push(t[0]);if(b[0]===b[1])out.push(b[0]);return [...new Set(out)];}

function sourcePositionStats(rows){
  const stats=new Map();
  for(let k=1;k<Math.min(rows.length,11);k++){
    const w=RUD_WEIGHTS[k-1],src=sources(rows[k]),targetTop=new Set(top3(rows[k-1].top3)),targetBottom=new Set(bottom2(rows[k-1].bottom2));
    for(const [name,raw] of Object.entries(src))for(let pos=0;pos<raw.length;pos++){
      const key=`${name}:${pos}`,d=raw[pos],x=stats.get(key)||{any:.5,top:.3,bottom:.2,total:1};x.total+=w;
      if(targetTop.has(d)||targetBottom.has(d))x.any+=w;if(targetTop.has(d))x.top+=w;if(targetBottom.has(d))x.bottom+=w;stats.set(key,x);
    }
  }
  return stats;
}
function allSourceEvidence(rows){
  const stats=sourcePositionStats(rows),current=sources(rows[0]),evidence=Object.fromEntries(DIGITS.map(d=>[d,[]]));
  for(const [name,raw] of Object.entries(current))for(let pos=0;pos<raw.length;pos++){const d=raw[pos],x=stats.get(`${name}:${pos}`)||{any:.5,top:.3,bottom:.2,total:1};evidence[d].push({name,pos,any:x.any/x.total,top:x.top/x.total,bottom:x.bottom/x.total});}
  const score={},sideByDigit={};
  for(const d of DIGITS){const ev=evidence[d];if(!ev.length){score[d]=0;sideByDigit[d]='บน';continue;}const rel=ev.map(x=>x.any).sort((a,b)=>b-a),best2=rel.slice(0,2);score[d]=.80*(best2.reduce((s,x)=>s+x,0)/best2.length)+.20*Math.min(1,ev.length/4);const side=[...ev].sort((a,b)=>b.any-a.any);let ts=0,bs=0;side.forEach((x,i)=>{const w=i<2?1:.5;ts+=w*x.top;bs+=w*x.bottom;});sideByDigit[d]=ts>=bs?'บน':'ล่าง';}
  return {score:normMap(score),sideByDigit,evidence,current};
}
function percent56Evidence(rows){
  const stats=new Map();
  for(let k=1;k<Math.min(rows.length,11);k++){
    const w=RUD_WEIGHTS[k-1],raw=rawPercent(rows[k],56),targetTop=new Set(top3(rows[k-1].top3)),targetBottom=new Set(bottom2(rows[k-1].bottom2));
    for(let pos=0;pos<raw.length;pos++){const d=raw[pos],x=stats.get(pos)||{any:.5,top:.3,bottom:.2,total:1};x.total+=w;if(targetTop.has(d)||targetBottom.has(d))x.any+=w;if(targetTop.has(d))x.top+=w;if(targetBottom.has(d))x.bottom+=w;stats.set(pos,x);}
  }
  const raw=rawPercent(rows[0],56),ev=Object.fromEntries(DIGITS.map(d=>[d,[]]));
  for(let pos=0;pos<raw.length;pos++){const d=raw[pos],x=stats.get(pos)||{any:.5,top:.3,bottom:.2,total:1};ev[d].push({pos,any:x.any/x.total,top:x.top/x.total,bottom:x.bottom/x.total});}
  const score=Object.fromEntries(DIGITS.map(d=>[d,-1])),sideByDigit={};
  for(const d of DIGITS){if(!ev[d].length){sideByDigit[d]='บน';continue;}const sorted=[...ev[d]].sort((a,b)=>b.any-a.any),best=sorted.slice(0,2);score[d]=best.reduce((s,x)=>s+x.any,0)/best.length;sideByDigit[d]=sorted[0].top>=sorted[0].bottom?'บน':'ล่าง';}
  return {score,sideByDigit,evidence:ev,raw};
}
function buildRudScores(rows,rankScore={}){
  const p56=percent56Evidence(rows),all=allSourceEvidence(rows),rankN=normMap(rankScore||{}),p56N=normMap(Object.fromEntries(DIGITS.map(d=>[d,Math.max(0,Number(p56.score[d]||0))])));
  const scores=Object.fromEntries(DIGITS.map(d=>[d,.60*all.score[d]+.25*p56N[d]+.15*rankN[d]]));
  return {p56,all,rankN,scores};
}
function selectRudFirst(rows,rankScore={}){
  const x=buildRudScores(rows,rankScore);
  const primary=[...DIGITS].sort((a,b)=>x.p56.score[b]-x.p56.score[a]||x.scores[b]-x.scores[a]||x.rankN[b]-x.rankN[a]||Number(a)-Number(b))[0];
  const secondary=[...DIGITS].filter(d=>d!==primary).sort((a,b)=>x.scores[b]-x.scores[a]||x.rankN[b]-x.rankN[a]||Number(a)-Number(b))[0];
  return {...x,primary,secondary,primarySide:x.p56.sideByDigit[primary]||x.all.sideByDigit[primary]||'บน',secondarySide:x.all.sideByDigit[secondary]||'บน'};
}
function buildRudFirstWin6(rows,p){
  const pick=selectRudFirst(rows,p.rankScores||{}),central=[...DIGITS].sort((a,b)=>Number(p.rankScores?.[b]||0)-Number(p.rankScores?.[a]||0)||Number(a)-Number(b));
  const win6=[pick.primary,pick.secondary];for(const d of central)if(!win6.includes(d)){win6.push(d);if(win6.length===6)break;}
  return {win6,pick,central};
}
function buildLegacyPairEvidence(rows,win6,rankScore,rud){const c=[];for(const a of win6)for(const b of win6){if(a===b&&!rows.slice(0,5).some(r=>r.top3.includes(a+a)||r.bottom2===a+a))continue;const top=positionProb(rows,1,a)*positionProb(rows,2,b),bottom=positionProb(rows,3,a)*positionProb(rows,4,b),ai=((rankScore[a]||0)+(rankScore[b]||0))/2,rudBonus=(rud.includes(a)?1:0)+(rud.includes(b)?1:0);let hist=0;rows.slice(0,5).forEach((r,i)=>{const w=1-.12*i;if(r.top3.slice(-2)===a+b)hist+=w;if(r.bottom2===a+b)hist+=w;});c.push({p:a+b,score:2.2*(top+bottom)+.55*ai+.22*rudBonus+.35*hist});}c.sort((x,y)=>y.score-x.score||x.p.localeCompare(y.p));const out=[],seen=new Set();for(const x of c){const key=[...x.p].sort().join('');if(seen.has(key))continue;seen.add(key);out.push(x.p);if(out.length===5)break;}return out;}
function buildPair2Specialist(rows,win6){const c=[];for(const a of win6)for(const b of win6){if(a===b&&!rows.slice(0,5).some(r=>r.top3.includes(a+a)||r.bottom2===a+a))continue;const top=positionProb(rows,1,a)*positionProb(rows,2,b),bottom=positionProb(rows,3,a)*positionProb(rows,4,b);c.push({p:a+b,score:top+bottom});}c.sort((x,y)=>y.score-x.score||x.p.localeCompare(y.p));const out=[],seen=new Set();for(const x of c){const key=[...x.p].sort().join('');if(seen.has(key))continue;seen.add(key);out.push(x.p);if(out.length===5)break;}return out;}
function buildLegacyTriples(rows,win6,rankScore,rud,pairs){const c=[];for(const a of win6)for(const b of win6)for(const d of win6){const t=a+b+d,position=positionProb(rows,0,a)*positionProb(rows,1,b)*positionProb(rows,2,d),ai=((rankScore[a]||0)+(rankScore[b]||0)+(rankScore[d]||0))/3,pairBonus=pairs.some(p=>t.includes(p[0])&&t.includes(p[1]))?1:0,rudBonus=[...new Set(t)].filter(x=>rud.includes(x)).length;let hist=0;rows.slice(0,5).forEach((r,i)=>{const w=1-.12*i;if(r.top3===t)hist+=2*w;else hist+=[...new Set(t)].filter(x=>r.top3.includes(x)).length*.12*w;});c.push({t,score:3*position+.65*ai+.20*rudBonus+.25*pairBonus+.45*hist});}c.sort((x,y)=>y.score-x.score||x.t.localeCompare(y.t));const out=[],seen=new Set();for(const x of c){const key=[...x.t].sort().join('');if(seen.has(key))continue;seen.add(key);out.push(x.t);if(out.length===3)break;}return out;}
function buildPair3Specialist(rows,win6,rankScore,rud,legacyPairs){const formulas=calculateFormulaSet(rows[0]),out=[],seen=new Set(),winSet=new Set(win6),add=t=>{if(typeof t!=='string'||t.length!==3||[...t].some(d=>!winSet.has(d)))return;const key=[...t].sort().join('');if(seen.has(key))return;seen.add(key);out.push(t);};for(const name of PAIR3_FORMULA_PRIORITY){add(formulas[name]);if(out.length===3)return out;}for(const t of buildLegacyTriples(rows,win6,rankScore,rud,legacyPairs)){add(t);if(out.length===3)break;}return out;}
function buildDoubleSpecialist(rows,win6,rankScore,currentFormulas){const hist=Object.fromEntries(DIGITS.map(d=>[d,0]));rows.slice(0,10).forEach((r,i)=>{const w=.86**i;for(const d of doubleDigits(r))hist[d]+=w;});const maxHist=Math.max(1,...win6.map(d=>hist[d])),formula2=`${currentFormulas['สูตร 2']||''}${currentFormulas['สูตร 2.1']||''}${currentFormulas['สูตร 2.2']||''}`,scored=win6.map((d,i)=>({d,score:.25*(hist[d]/maxHist)+.30*(formula2.includes(d)?1:0)+.30*(rankScore[d]||0)-i*1e-5}));scored.sort((a,b)=>b.score-a.score||Number(a.d)-Number(b.d));return {watch:scored.slice(0,3).map(x=>x.d),scores:Object.fromEntries(scored.map(x=>[x.d,x.score]))};}

export function calculateLinkedRud(inputRows,rankScore={},win6Input=''){
  const rows=normalizeRows(inputRows);if(rows.length<5)return null;const win6=[...new Set([...String(win6Input||'')].filter(d=>DIGITS.includes(d)))].slice(0,6);if(win6.length<2)return null;
  const x=buildRudScores(rows,rankScore),primary=[...win6].sort((a,b)=>x.p56.score[b]-x.p56.score[a]||x.scores[b]-x.scores[a]||x.rankN[b]-x.rankN[a]||win6.indexOf(a)-win6.indexOf(b))[0],secondary=[...win6].filter(d=>d!==primary).sort((a,b)=>x.scores[b]-x.scores[a]||x.rankN[b]-x.rankN[a]||win6.indexOf(a)-win6.indexOf(b))[0];
  const outside=DIGITS.filter(d=>!win6.includes(d)),p56Outside=outside.filter(d=>x.p56.score[d]>=0).sort((a,b)=>x.p56.score[b]-x.p56.score[a]||x.all.score[b]-x.all.score[a]||x.rankN[b]-x.rankN[a]||Number(a)-Number(b)),smartReserve=p56Outside[0]||[...outside].sort((a,b)=>(.55*x.all.score[b]+.45*x.rankN[b])-(.55*x.all.score[a]+.45*x.rankN[a])||Number(a)-Number(b))[0]||null;
  return {primary,secondary,primarySide:x.p56.sideByDigit[primary]||x.all.sideByDigit[primary]||'บน',secondarySide:x.all.sideByDigit[secondary]||'บน',scores:x.scores,sourceScores:x.all.score,p56Scores:x.p56.score,p56Raw:x.p56.raw,smartReserve,relationshipLocked:true,version:'RUD_AI_P56_MARKET_LINKED_WIN6_V2'};
}
export const calculateIndependentRud=calculateLinkedRud;

export function enhanceVeltrixWithRud(inputRows,outputs){
  const rows=normalizeRows(inputRows);if(!outputs||rows.length<5)return outputs;const next={};
  for(const [key,p] of Object.entries(outputs)){
    const seeded=buildRudFirstWin6(rows,p),win6=seeded.win6,pick=seeded.pick,rud2=[pick.primary,pick.secondary],rankScore=p.rankScores||{},rank7=p.reserve7;
    const outside=DIGITS.filter(d=>!win6.includes(d)),p56Outside=outside.filter(d=>pick.p56.score[d]>=0).sort((a,b)=>pick.p56.score[b]-pick.p56.score[a]||pick.all.score[b]-pick.all.score[a]||pick.rankN[b]-pick.rankN[a]||Number(a)-Number(b));
    const smartReserve=p56Outside[0]||[...outside].sort((a,b)=>(.55*pick.all.score[b]+.45*pick.rankN[b])-(.55*pick.all.score[a]+.45*pick.rankN[a])||Number(a)-Number(b))[0]||rank7;
    const legacyPairs=buildLegacyPairEvidence(rows,win6,rankScore,rud2),pair2=buildPair2Specialist(rows,win6),pair3=buildPair3Specialist(rows,win6,rankScore,rud2,legacyPairs),doubleSpecialist=buildDoubleSpecialist(rows,win6,rankScore,p.formulaOutputs||calculateFormulaSet(rows[0]));
    const rud={version:RUD_FIRST_VERSION,primary:pick.primary,secondary:pick.secondary,primarySide:pick.primarySide,secondarySide:pick.secondarySide,p56Raw:pick.p56.raw,scores:pick.scores,p56Scores:pick.p56.score,smartReserve,relationshipLocked:true,rudFirst:true};
    next[key]={...p,win6:win6.join(''),poolB:win6.join(''),reserveRank7:rank7,reserve7:smartReserve,reserveStrategy:'P56_RUD_RANK_RUD_FIRST_RESERVE',rudTop:pick.primary,rudBottom:pick.secondary,rudPrimary:pick.primary,rudSecondary:pick.secondary,rudPrimarySide:pick.primarySide,rudSecondarySide:pick.secondarySide,rudAI:rurSafe(rud),rud2,pair2Shared:pair2,pair2Top:pair2,pair2Bottom:[],pair3Top:pair3,doubleWatch:doubleSpecialist.watch,doubleScores:doubleSpecialist.scores,specialistVersion:SPECIALIST_VERSION,specialists:{pair2:'PAIR2_POSITION_SPECIALIST_V1',pair3:'PAIR3_FORMULA_PRIORITY_SPECIALIST_V1',double:'DOUBLE_BALANCED_SPECIALIST_V1'},relationshipLocked:true,rudFirst:true,rudFirstVersion:RUD_FIRST_VERSION,hybridVersion:`${p.hybridVersion||'VELTRIX'}+${RUD_FIRST_VERSION}+${SPECIALIST_VERSION}`};
  }
  return next;
}
function rurSafe(rud){return {version:rud.version,primary:rud.primary,secondary:rud.secondary,primarySide:rud.primarySide,secondarySide:rud.secondarySide,p56Raw:rud.p56Raw,scores:rud.scores,p56Scores:rud.p56Scores,smartReserve:rud.smartReserve,relationshipLocked:true,rudFirst:!!rud.rudFirst};}
