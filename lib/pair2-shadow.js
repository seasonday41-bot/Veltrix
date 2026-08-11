const DIGITS=[...'0123456789'];
const VERSION='PAIR2_V21_EXACT_DNA_3_5';
const ALPHA=.25;
const DNA_WEIGHTS=[1,.9,.8];

function clean(v=''){return String(v??'').replace(/\D/g,'');}
function top3(v){return clean(v).padStart(3,'0').slice(-3);}
function bottom2(v){return clean(v).padStart(2,'0').slice(-2);}
function chars(r){return `${top3(r?.top3)}${bottom2(r?.bottom2)}`;}
function canonPair(s=''){return [...String(s)].sort().join('');}
function normalizeRows(rows=[]){return rows.slice(0,20).map(r=>({...r,top3:top3(r.top3),bottom2:bottom2(r.bottom2)}));}
function normalizeWin6(v=''){const out=[];for(const d of clean(v))if(DIGITS.includes(d)&&!out.includes(d))out.push(d);return out.slice(0,6);}
function positionProb(rows,pos,d){let count=1,total=10;rows.slice(0,5).forEach((r,i)=>{const w=1.5-.15*i;total+=w;if(chars(r)[pos]===d)count+=w;});return count/total;}
function exactDna(rows,a,b){
  let score=0;
  rows.slice(2,5).forEach((r,i)=>{
    const w=DNA_WEIGHTS[i]||0;
    if(canonPair(top3(r.top3).slice(-2))===canonPair(a+b))score+=w;
    if(canonPair(bottom2(r.bottom2))===canonPair(a+b))score+=w;
  });
  return score;
}

export function calculatePair2Shadow(inputRows,win6Input='',options={}){
  const rows=normalizeRows(inputRows),win6=normalizeWin6(win6Input);
  if(rows.length<5||win6.length!==6)return null;
  const candidates=[];
  for(const a of win6)for(const b of win6){
    if(a===b&&!rows.slice(0,5).some(r=>top3(r.top3).includes(a+a)||bottom2(r.bottom2)===a+a))continue;
    const base=positionProb(rows,1,a)*positionProb(rows,2,b)+positionProb(rows,3,a)*positionProb(rows,4,b);
    candidates.push({pair:a+b,key:canonPair(a+b),base,dna:exactDna(rows,a,b)});
  }
  const maxBase=Math.max(1e-12,...candidates.map(x=>x.base)),maxDna=Math.max(1e-12,...candidates.map(x=>x.dna));
  for(const x of candidates)x.score=(1-ALPHA)*(x.base/maxBase)+ALPHA*(x.dna/maxDna);
  candidates.sort((a,b)=>b.score-a.score||b.base-a.base||a.pair.localeCompare(b.pair));
  const pairs=[],seen=new Set();
  for(const x of candidates){if(seen.has(x.key))continue;seen.add(x.key);pairs.push(x.pair);if(pairs.length===5)break;}
  return {
    version:VERSION,alpha:ALPHA,dna_window:[3,4,5],dna_type:'exact_pair_top2_or_bottom2_reverse_equivalent',
    world_win:!!options.worldWinEnabled,world_win_digits:clean(options.worldWinDigits||''),win6_source:options.worldWinEnabled?'world_win_fused':'base',pairs
  };
}

export function pair2ShadowHit(pairs=[],target=''){
  const key=canonPair(target);return (pairs||[]).some(p=>canonPair(p)===key);
}

export const PAIR2_SHADOW_VERSION=VERSION;
