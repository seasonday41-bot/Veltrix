const DIGITS=[...'0123456789'];

function chars(row){return `${row.top3}${row.bottom2}`;}
function pool(rows){const s=new Set();rows.forEach(r=>[...chars(r)].forEach(d=>s.add(d)));return s;}
function sat(n){if(n<=6)return 1;if(n===7)return .8;if(n===8)return .5;if(n===9)return .25;return 0;}
function normMap(map){const m=Math.max(1,...Object.values(map));return Object.fromEntries(DIGITS.map(d=>[d,(map[d]||0)/m]));}
function counts(rows,selector=chars){const m=Object.fromEntries(DIGITS.map(d=>[d,0]));rows.forEach(r=>[...selector(r)].forEach(d=>m[d]++));return m;}
function gapAny(d,rows){const i=rows.findIndex(r=>chars(r).includes(d));return i<0?1:Math.min(i+1,8)/8;}
function bottomGap(d,rows){const i=rows.findIndex(r=>r.bottom2.includes(d));return i<0?8:Math.min(i+1,8);}
function recentScore(d,rows,selector){const w=[3,2,1];let s=0;rows.slice(0,3).forEach((r,i)=>{for(const x of selector(r))if(x===d)s+=w[i];});return s;}

function rudEngine(rows){
  const topDNA=counts(rows,r=>r.top3.slice(-2));
  const botDNA=counts(rows,r=>r.bottom2);
  const topRecent=Object.fromEntries(DIGITS.map(d=>[d,recentScore(d,rows,r=>r.top3.slice(-2))]));
  const botRecent=Object.fromEntries(DIGITS.map(d=>[d,recentScore(d,rows,r=>r.bottom2)]));
  const top=[...DIGITS].sort((a,b)=>botDNA[b]-botDNA[a]||topRecent[b]-topRecent[a]||botRecent[b]-botRecent[a]||topDNA[b]-topDNA[a]||(+a)-(+b))[0];
  const bottom=[...DIGITS].sort((a,b)=>bottomGap(b,rows)-bottomGap(a,rows)||botDNA[b]-botDNA[a]||botRecent[b]-botRecent[a]||(+a)-(+b))[0];
  let support=null;
  if(top===bottom)support=[...DIGITS].filter(d=>d!==top).sort((a,b)=>botDNA[b]-botDNA[a]||botRecent[b]-botRecent[a]||(+a)-(+b))[0];
  return {top,bottom,support};
}

function rankMode(rows,mode,rud){
  const Arows=rows.slice(0,3),Brows=rows.slice(2,5);
  const A=pool(Arows),B=pool(Brows);
  const bFreq=normMap(counts(Brows));
  const persistence=Object.fromEntries(DIGITS.map(d=>[d,Brows.filter(r=>chars(r).includes(d)).length/3]));
  const recency=Object.fromEntries(DIGITS.map(d=>{const w=[3,2,1];let s=0;Brows.forEach((r,i)=>{if(chars(r).includes(d))s+=w[i];});return [d,s/6];}));
  const score={};
  for(const d of DIGITS){
    const gap=gapAny(d,rows);
    if(mode==='A'){
      if(A.size===10)score[d]=(B.has(d)?sat(B.size):0)+.5*gap;
      else if(A.size===9)score[d]=(A.has(d)?sat(A.size):0)+.5*(B.has(d)?sat(B.size):0)+.5*gap;
      else score[d]=(A.has(d)?sat(A.size):0)+.5*gap;
    }else{
      if(B.size<=7)score[d]=(B.has(d)?sat(B.size):0)+.5*gap;
      else if(B.size===8){const rudHit=(d===rud.top||d===rud.bottom)?1:0;score[d]=.25*(B.has(d)?1:0)+.10*bFreq[d]+.20*persistence[d]+.05*recency[d]+.10*(A.has(d)?1:0)+.25*gap+.05*rudHit;}
      else if(B.size===9)score[d]=(B.has(d)?sat(B.size):0)+.5*(A.has(d)?sat(A.size):0)+.5*gap;
      else score[d]=(A.has(d)?sat(A.size):0)+.5*gap;
    }
  }
  const ranked=[...DIGITS].sort((a,b)=>score[b]-score[a]||(+a)-(+b));
  return {ranked,score,A:[...A].sort().join(''),B:[...B].sort().join(''),poolSize:mode==='A'?A.size:B.size};
}

function canonPair(p){return [...p].sort().join('');}
function pair2Engine(rows,rank,rud){
  const top=[],seen=new Set();
  for(const r of rows){const p=r.top3.slice(-2),c=canonPair(p);if(!seen.has(c)){seen.add(c);top.push(p);}if(top.length===4)break;}
  for(const d of rank.ranked){const p=`${rud.top}${d}`,c=canonPair(p);if(!seen.has(c)){seen.add(c);top.push(p);break;}}
  while(top.length<5){const a=rank.ranked[top.length%rank.ranked.length],b=rank.ranked[(top.length+1)%rank.ranked.length];const p=`${a}${b}`,c=canonPair(p);if(!seen.has(c)){seen.add(c);top.push(p);}else top.push(`${a}${a}`);}
  const bottom=[],sb=new Set();
  for(const d of rank.ranked){const p=`${rud.bottom}${d}`,c=canonPair(p);if(!sb.has(c)){sb.add(c);bottom.push(p);}if(bottom.length===5)break;}
  return {top:top.slice(0,5),bottom:bottom.slice(0,5)};
}

function tripleKey(s){return [...s].sort().join('');}
function pairKeysOfTriple(t){return [canonPair(t[0]+t[1]),canonPair(t[0]+t[2]),canonPair(t[1]+t[2])];}
function tripleKind(t){const n=new Set([...t]).size;return n===3?'distinct':n===2?'double':'triple';}
function repeatedDigit(t){const c={};for(const d of t)c[d]=(c[d]||0)+1;return Object.keys(c).find(d=>c[d]>=2)||null;}

function pair3Engine(rows,rank,rud,pair2top){
  const pairWeight=new Map(pair2top.map((p,i)=>[canonPair(p),(pair2top.length-i)/pair2top.length]));
  const pairSupport=new Set(pairWeight.keys());
  const dna={};rows.forEach((r,i)=>{const k=tripleKey(r.top3);const w=i===0?4:i===1?3:i===2?2:1;dna[k]=(dna[k]||0)+w;});
  const recentTopKeys=new Set(rows.slice(0,3).map(r=>tripleKey(r.top3)));
  const hasRecentDouble=rows.slice(0,10).some(r=>tripleKind(r.top3)==='double');
  const hasRecentTriple=rows.slice(0,10).some(r=>tripleKind(r.top3)==='triple');
  const maxDigit=Math.max(...Object.values(rank.score),1),byKey=new Map();
  for(const basePair of pair2top){
    const baseKey=canonPair(basePair);
    for(const d of rank.ranked){
      const t=`${basePair}${d}`,key=tripleKey(t),kind=tripleKind(t);if(kind==='triple'&&!hasRecentTriple)continue;
      const ds=[...t],supportedPairs=pairKeysOfTriple(t).filter(p=>pairSupport.has(p));
      const pairScore=Math.max(0,...supportedPairs.map(p=>pairWeight.get(p)||0));
      const fusionScore=supportedPairs.length/3;
      const digitScore=ds.reduce((s,x)=>s+(rank.score[x]||0)/maxDigit,0)/3;
      const dnaScore=Math.min((dna[key]||0)/4,1),recentMatch=recentTopKeys.has(key)?1:0,rudScore=ds.includes(rud.top)?1:0,repeatEvidence=kind==='double'&&hasRecentDouble?1:0;
      const score=.30*pairScore+.20*fusionScore+.25*digitScore+.10*dnaScore+.05*recentMatch+.05*rudScore+.05*repeatEvidence;
      const item={t,key,kind,score,baseKey,repeatDigit:repeatedDigit(t)},old=byKey.get(key);if(!old||score>old.score)byKey.set(key,item);
    }
  }
  const candidates=[...byKey.values()].sort((a,b)=>b.score-a.score||(+a.t)-(+b.t));
  const out=[],seen=new Set(),pairUse=new Map(),repeatDigits=new Set();let repeatCount=0,tripleCount=0;
  const accept=(c,strict=true)=>{if(seen.has(c.key))return false;if(strict&&(pairUse.get(c.baseKey)||0)>=2)return false;if(c.kind!=='distinct'){if(strict&&repeatCount>=2)return false;if(strict&&c.repeatDigit&&repeatDigits.has(c.repeatDigit))return false;if(c.kind==='triple'&&tripleCount>=1)return false;}seen.add(c.key);out.push(c.t);pairUse.set(c.baseKey,(pairUse.get(c.baseKey)||0)+1);if(c.kind!=='distinct'){repeatCount++;if(c.repeatDigit)repeatDigits.add(c.repeatDigit);if(c.kind==='triple')tripleCount++;}return true;};
  for(const c of candidates){if(accept(c,true)&&out.length===5)break;}
  if(out.length<5)for(const c of candidates){if(seen.has(c.key))continue;if(c.kind==='triple'&&tripleCount>=1)continue;if(c.kind!=='distinct'&&c.repeatDigit&&repeatDigits.has(c.repeatDigit))continue;if(accept(c,false)&&out.length===5)break;}
  if(out.length<5)for(const c of candidates){if(seen.has(c.key))continue;seen.add(c.key);out.push(c.t);if(out.length===5)break;}
  return out.slice(0,5);
}

export function calculateVeltrix(rows){
  const clean=(rows||[]).slice(0,10);
  if(clean.length<5)return null;
  const rud=rudEngine(clean),result={};
  for(const mode of ['A','B']){
    const rank=rankMode(clean,mode,rud),win6=rank.ranked.slice(0,6).join(''),reserve7=rank.ranked[6],p2=pair2Engine(clean,rank,rud),p3=pair3Engine(clean,rank,rud,p2.top);
    result[mode]={mode,win6,reserve7,rudTop:rud.top,rudBottom:rud.bottom,rudSupport:rud.support,pair2Top:p2.top,pair2Bottom:p2.bottom,pair3Top:p3,poolA:rank.A,poolB:rank.B,poolSize:rank.poolSize,rankScores:rank.score};
  }
  return result;
}
