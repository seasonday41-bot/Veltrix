const DIGITS=[...'0123456789'];
function chars(r){return `${r.top3}${r.bottom2}`;}
function pool(rows){const s=new Set();for(const r of rows)for(const d of chars(r))s.add(d);return s;}
function sat(n){if(n<=6)return 1;if(n===7)return .8;if(n===8)return .5;if(n===9)return .25;return 0;}
function counts(rows,sel=chars){const m=Object.fromEntries(DIGITS.map(d=>[d,0]));for(const r of rows)for(const d of sel(r))m[d]++;return m;}
function normMap(m){const mx=Math.max(1,...Object.values(m));return Object.fromEntries(DIGITS.map(d=>[d,(m[d]||0)/mx]));}
function gapAny(d,rows){const i=rows.findIndex(r=>chars(r).includes(d));return i<0?1:Math.min(i+1,8)/8;}
function bottomGap(d,rows){const i=rows.findIndex(r=>r.bottom2.includes(d));return i<0?8:Math.min(i+1,8);}
function recentScore(d,rows,sel){const w=[3,2,1];let s=0;rows.slice(0,3).forEach((r,i)=>{for(const x of sel(r))if(x===d)s+=w[i];});return s;}
function modeRows(rows,mode){const A=rows.slice(0,3),B=rows.slice(2,5);return mode==='B'?{primary:B,support:A}:{primary:A,support:B};}

function rudEngine(rows,mode){
  const {primary,support}=modeRows(rows,mode);
  const topDNA=counts(primary,r=>r.top3.slice(-2)),botDNA=counts(primary,r=>r.bottom2);
  const topRecent=Object.fromEntries(DIGITS.map(d=>[d,recentScore(d,primary,r=>r.top3.slice(-2))]));
  const botRecent=Object.fromEntries(DIGITS.map(d=>[d,recentScore(d,primary,r=>r.bottom2)]));
  const supTop=counts(support,r=>r.top3.slice(-2)),supBot=counts(support,r=>r.bottom2);
  const top=[...DIGITS].sort((a,b)=>botDNA[b]-botDNA[a]||topRecent[b]-topRecent[a]||topDNA[b]-topDNA[a]||supTop[b]-supTop[a]||supBot[b]-supBot[a]||(+a)-(+b))[0];
  const bottom=[...DIGITS].sort((a,b)=>bottomGap(b,primary)-bottomGap(a,primary)||botDNA[b]-botDNA[a]||botRecent[b]-botRecent[a]||supBot[b]-supBot[a]||(+a)-(+b))[0];
  let supportDigit=null;
  if(top===bottom)supportDigit=[...DIGITS].filter(d=>d!==top).sort((a,b)=>botDNA[b]-botDNA[a]||botRecent[b]-botRecent[a]||topDNA[b]-topDNA[a]||supBot[b]-supBot[a]||(+a)-(+b))[0];
  return {top,bottom,support:supportDigit};
}

function rankMode(rows,mode,rud){
  const Arows=rows.slice(0,3),Brows=rows.slice(2,5),A=pool(Arows),B=pool(Brows);
  const bFreq=normMap(counts(Brows));
  const persistence=Object.fromEntries(DIGITS.map(d=>[d,Brows.filter(r=>chars(r).includes(d)).length/3]));
  const recency=Object.fromEntries(DIGITS.map(d=>{const w=[3,2,1];let s=0;Brows.forEach((r,i)=>{if(chars(r).includes(d))s+=w[i];});return [d,s/6];}));
  const score={};
  for(const d of DIGITS){const gap=gapAny(d,rows);if(mode==='A'){
    if(A.size===10)score[d]=(B.has(d)?sat(B.size):0)+.5*gap;
    else if(A.size===9)score[d]=(A.has(d)?sat(A.size):0)+.5*(B.has(d)?sat(B.size):0)+.5*gap;
    else score[d]=(A.has(d)?sat(A.size):0)+.5*gap;
  }else{
    if(B.size<=7)score[d]=(B.has(d)?sat(B.size):0)+.5*gap;
    else if(B.size===8){const rudHit=(d===rud.top||d===rud.bottom||d===rud.support)?1:0;score[d]=.25*(B.has(d)?1:0)+.10*bFreq[d]+.20*persistence[d]+.05*recency[d]+.10*(A.has(d)?1:0)+.25*gap+.05*rudHit;}
    else if(B.size===9)score[d]=(B.has(d)?sat(B.size):0)+.5*(A.has(d)?sat(A.size):0)+.5*gap;
    else score[d]=(A.has(d)?sat(A.size):0)+.5*gap;
  }}
  const ranked=[...DIGITS].sort((a,b)=>score[b]-score[a]||(+a)-(+b));
  return {ranked,score,A:[...A].sort().join(''),B:[...B].sort().join(''),poolSize:mode==='A'?A.size:B.size};
}

function canonPair(p){return [...p].sort().join('');}
function tripleKey(s){return [...s].sort().join('');}
function rud2Digits(rud){return rud.top===rud.bottom?[rud.top,rud.support].filter(Boolean):[rud.top,rud.bottom];}
function modeBWin7(rank,rud){
  const locked=rud2Digits(rud),out=[];
  for(const d of locked)if(d&&!out.includes(d))out.push(d);
  for(const d of rank.ranked)if(!out.includes(d)){out.push(d);if(out.length===7)break;}
  return out.slice(0,7);
}
function pairAffinity(rows,a,b,kind='top'){
  const {primary,support}=modeRows(rows,'B');let s=0;
  const hit=(r,sel,w)=>{const x=sel(r);if(x.includes(a)&&x.includes(b))s+=w;};
  if(kind==='top'){
    primary.forEach((r,i)=>hit(r,x=>x.top3,3-i*.45));
    support.forEach((r,i)=>hit(r,x=>x.top3,1.05-i*.15));
    primary.forEach((r,i)=>hit(r,chars,.55-i*.08));
  }else{
    primary.forEach((r,i)=>hit(r,x=>x.bottom2,3-i*.45));
    support.forEach((r,i)=>hit(r,x=>x.bottom2,1.05-i*.15));
    primary.forEach((r,i)=>hit(r,chars,.35-i*.05));
  }
  return s;
}
function clusteredPairs(rows,win7,rank,rud,kind='top'){
  const rd=new Set(rud2Digits(rud)),c=[];
  for(let i=0;i<win7.length;i++)for(let j=i;j<win7.length;j++){
    const a=win7[i],b=win7[j];
    if(i===j&&!modeRows(rows,'B').primary.some(r=>(kind==='top'?r.top3:r.bottom2).includes(a+a)))continue;
    const affinity=pairAffinity(rows,a,b,kind);
    const ai=((rank.score[a]||0)+(rank.score[b]||0))/2;
    const rudBonus=(rd.has(a)?0.4:0)+(rd.has(b)?0.4:0);
    const repeatBonus=a===b?.35:0;
    c.push({p:`${a}${b}`,key:canonPair(`${a}${b}`),score:affinity+ai*.45+rudBonus+repeatBonus});
  }
  c.sort((x,y)=>y.score-x.score||(+x.p)-(+y.p));
  const out=[],seen=new Set();for(const x of c){if(seen.has(x.key))continue;seen.add(x.key);out.push(x.p);if(out.length===5)break;}return out;
}
function hybridTriples(rows,win7,rank,rud,pairs){
  const {primary,support}=modeRows(rows,'B'),rd=new Set(rud2Digits(rud)),c=[],seen=new Set();
  for(let pi=0;pi<pairs.length;pi++)for(const d of win7){
    const t=`${pairs[pi]}${d}`,key=tripleKey(t);if(seen.has(key))continue;
    const ds=[...t],unique=[...new Set(ds)];
    let hist=0;primary.forEach((r,i)=>{const k=tripleKey(r.top3);if(k===key)hist+=3-i*.5;else{const overlap=unique.filter(x=>r.top3.includes(x)).length;hist+=overlap*.22;}});
    support.forEach((r,i)=>{const overlap=unique.filter(x=>r.top3.includes(x)).length;hist+=overlap*(.12-i*.02);});
    const ai=ds.reduce((s,x)=>s+(rank.score[x]||0),0)/3;
    const pairBase=(pairs.length-pi)/pairs.length;
    const rudBonus=ds.some(x=>rd.has(x))?.35:0;
    const score=1.15*pairBase+.55*ai+hist+rudBonus;
    c.push({t,key,score});seen.add(key);
  }
  c.sort((a,b)=>b.score-a.score||(+a.t)-(+b.t));return c.slice(0,5).map(x=>x.t);
}

function legacyPair2(rows,rank,rud,mode){
  const {primary,support}=modeRows(rows,mode),source=[...primary,...support],top=[],seen=new Set();
  for(const r of source){const p=r.top3.slice(-2),c=canonPair(p);if(!seen.has(c)){seen.add(c);top.push(p);}if(top.length===4)break;}
  for(const d of rank.ranked){const p=`${rud.top}${d}`,c=canonPair(p);if(!seen.has(c)){seen.add(c);top.push(p);break;}}
  while(top.length<5){const a=rank.ranked[top.length%rank.ranked.length],b=rank.ranked[(top.length+1)%rank.ranked.length],p=`${a}${b}`,c=canonPair(p);if(!seen.has(c)){seen.add(c);top.push(p);}else top.push(`${a}${a}`);}
  const bottom=[],sb=new Set();for(const d of rank.ranked){const p=`${rud.bottom}${d}`,c=canonPair(p);if(!sb.has(c)){sb.add(c);bottom.push(p);}if(bottom.length===5)break;}return {top:top.slice(0,5),bottom:bottom.slice(0,5)};
}
function legacyPair3(rows,rank,rud,pairs,mode){
  const {primary}=modeRows(rows,mode),c=[],seen=new Set();
  for(let i=0;i<pairs.length;i++)for(const d of rank.ranked){const t=`${pairs[i]}${d}`,key=tripleKey(t);if(seen.has(key))continue;let s=(pairs.length-i)/pairs.length+(rank.score[d]||0);if(primary.some(r=>tripleKey(r.top3)===key))s+=1;c.push({t,key,s});seen.add(key);}
  return c.sort((a,b)=>b.s-a.s||(+a.t)-(+b.t)).slice(0,5).map(x=>x.t);
}

export function calculateVeltrix(rows){
  const clean=(rows||[]).slice(0,10);if(clean.length<5)return null;const result={};
  for(const mode of ['A','B']){
    const rud=rudEngine(clean,mode),rank=rankMode(clean,mode,rud);
    if(mode==='B'){
      const win7=modeBWin7(rank,rud),p2top=clusteredPairs(clean,win7,rank,rud,'top'),p2bottom=clusteredPairs(clean,win7,rank,rud,'bottom'),p3=hybridTriples(clean,win7,rank,rud,p2top);
      const score={...rank.score};for(let i=0;i<win7.length;i++)score[win7[i]]=(score[win7[i]]||0)+(7-i)*1e-6;
      result[mode]={mode,win6:win7.slice(0,6).join(''),reserve7:win7[6],rudTop:rud.top,rudBottom:rud.bottom,rudSupport:rud.support,rud2:rud2Digits(rud),pair2Top:p2top,pair2Bottom:p2bottom,pair3Top:p3,poolA:rank.A,poolB:rank.B,poolSize:rank.poolSize,rankScores:score,baseRankScores:rank.score,fusionBonus:null,hybridVersion:'B_RUD2_WIN7_CLUSTER_V1'};
    }else{
      const p2=legacyPair2(clean,rank,rud,mode),p3=legacyPair3(clean,rank,rud,p2.top,mode);
      result[mode]={mode,win6:rank.ranked.slice(0,6).join(''),reserve7:rank.ranked[6],rudTop:rud.top,rudBottom:rud.bottom,rudSupport:rud.support,pair2Top:p2.top,pair2Bottom:p2.bottom,pair3Top:p3,poolA:rank.A,poolB:rank.B,poolSize:rank.poolSize,rankScores:rank.score,baseRankScores:rank.score,fusionBonus:null};
    }
  }
  return result;
}
