import {calculatePair2Shadow} from './pair2-shadow.js';

export const PAIR2_BATTLE_VERSION='PAIR2_WORLD_WIN_RESERVE_BATTLE_V1';
const V1='PAIR2_POSITION_SPECIALIST_V1';
const V21='PAIR2_V21_EXACT_DNA_3_5';
const ALPHA=.25;
const DNA_WEIGHTS=[1,.9,.8];

function clean(v=''){return String(v??'').replace(/\D/g,'');}
function top3(v){return clean(v).padStart(3,'0').slice(-3);}
function bottom2(v){return clean(v).padStart(2,'0').slice(-2);}
function chars(r){return `${top3(r?.top3)}${bottom2(r?.bottom2)}`;}
function canonPair(s=''){return [...String(s)].sort().join('');}
function normalizeRows(rows=[]){return rows.slice(0,20).map(r=>({...r,top3:top3(r.top3),bottom2:bottom2(r.bottom2)}));}
function normalizeWin6(v=''){const out=[];for(const d of clean(v))if(!out.includes(d))out.push(d);return out.slice(0,6);}
function positionProb(rows,pos,d){let count=1,total=10;rows.slice(0,5).forEach((r,i)=>{const w=1.5-.15*i;total+=w;if(chars(r)[pos]===d)count+=w;});return count/total;}
function baseScore(rows,a,b){return positionProb(rows,1,a)*positionProb(rows,2,b)+positionProb(rows,3,a)*positionProb(rows,4,b);}
function exactDna(rows,a,b){let score=0;rows.slice(2,5).forEach((r,i)=>{const w=DNA_WEIGHTS[i]||0;if(canonPair(top3(r.top3).slice(-2))===canonPair(a+b))score+=w;if(canonPair(bottom2(r.bottom2))===canonPair(a+b))score+=w;});return score;}
function uniquePairs(xs=[]){const out=[],seen=new Set();for(const p of xs){if(typeof p!=='string'||p.length!==2)continue;const k=canonPair(p);if(seen.has(k))continue;seen.add(k);out.push(p);}return out;}

function reserveCandidates(rows,win6,reserve,model){
  if(!reserve||win6.includes(reserve))return [];
  const raw=win6.map(d=>({pair:`${reserve}${d}`,base:baseScore(rows,reserve,d),dna:exactDna(rows,reserve,d)}));
  const maxBase=Math.max(1e-12,...raw.map(x=>x.base)),maxDna=Math.max(1e-12,...raw.map(x=>x.dna));
  for(const x of raw)x.score=model===V21?((1-ALPHA)*(x.base/maxBase)+ALPHA*(x.dna/maxDna)):x.base;
  raw.sort((a,b)=>b.score-a.score||b.base-a.base||a.pair.localeCompare(b.pair));
  return raw;
}
function withReserve(basePairs,reservePairs,keepBase,reserveCount){
  const out=uniquePairs(basePairs).slice(0,keepBase),seen=new Set(out.map(canonPair));
  for(const x of reservePairs){const k=canonPair(x.pair);if(seen.has(k))continue;seen.add(k);out.push(x.pair);if(out.length>=keepBase+reserveCount)break;}
  for(const p of uniquePairs(basePairs)){if(out.length>=5)break;const k=canonPair(p);if(seen.has(k))continue;seen.add(k);out.push(p);}
  return out.slice(0,5);
}

export function buildPair2ForwardBattle(inputRows,prediction,worldWinDigits=''){
  const rows=normalizeRows(inputRows),win6=normalizeWin6(prediction?.win6||''),reserve=clean(prediction?.reserve7||'').slice(0,1),worldWin=clean(worldWinDigits);
  if(rows.length<5||win6.length!==6)return null;
  const v1A=uniquePairs(prediction?.pair2Shared||prediction?.pair2Top||[]).slice(0,5);
  const v21=calculatePair2Shadow(rows,win6.join(''),{worldWinEnabled:true,worldWinDigits:worldWin});
  const v21A=uniquePairs(v21?.pairs||[]).slice(0,5);
  if(v1A.length<5||v21A.length<5)return null;
  const r1=reserveCandidates(rows,win6,reserve,V1),r21=reserveCandidates(rows,win6,reserve,V21);
  return {
    version:PAIR2_BATTLE_VERSION,
    world_win:true,
    world_win_digits:worldWin,
    win6:win6.join(''),
    reserve7:reserve||null,
    rules:{A:'5 WIN6 pairs',B:'4 WIN6 + 1 Reserve7 pair',C:'3 WIN6 + up to 2 Reserve7 pairs'},
    variants:{
      v1_a:{model:V1,reserve_mode:'A_WIN6_ONLY',pairs:v1A},
      v1_b:{model:V1,reserve_mode:'B_4_PLUS_1',pairs:withReserve(v1A,r1,4,1)},
      v1_c:{model:V1,reserve_mode:'C_3_PLUS_2',pairs:withReserve(v1A,r1,3,2)},
      v21_a:{model:V21,reserve_mode:'A_WIN6_ONLY',pairs:v21A},
      v21_b:{model:V21,reserve_mode:'B_4_PLUS_1',pairs:withReserve(v21A,r21,4,1)},
      v21_c:{model:V21,reserve_mode:'C_3_PLUS_2',pairs:withReserve(v21A,r21,3,2)}
    },
    reserve_rankings:{v1:r1.slice(0,3),v21:r21.slice(0,3)}
  };
}

function hit(pairs,target){const key=canonPair(target);return (pairs||[]).some(p=>canonPair(p)===key);}
export function settlePair2ForwardBattle(variants={},actual){
  const t=top3(actual?.top3).slice(-2),b=bottom2(actual?.bottom2),results={};
  for(const [name,v] of Object.entries(variants||{})){
    const topHit=hit(v?.pairs||[],t),bottomHit=hit(v?.pairs||[],b);
    results[name]={top:topHit,bottom:bottomHit,any:topHit||bottomHit,both:topHit&&bottomHit,pairs:v?.pairs||[]};
  }
  return {actual_top2:t,actual_bottom2:b,results};
}
