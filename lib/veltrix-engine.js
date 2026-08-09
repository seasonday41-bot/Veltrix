const DIGITS=[...'0123456789'];
function chars(r){return `${r.top3}${r.bottom2}`;}
function pool(rows){const s=new Set();for(const r of rows)for(const d of chars(r))s.add(d);return s;}
function sat(n){if(n<=6)return 1;if(n===7)return .8;if(n===8)return .5;if(n===9)return .25;return 0;}
function counts(rows,sel=chars){const m=Object.fromEntries(DIGITS.map(d=>[d,0]));for(const r of rows)for(const d of sel(r))m[d]++;return m;}
function normMap(m){const mx=Math.max(1,...Object.values(m));return Object.fromEntries(DIGITS.map(d=>[d,(m[d]||0)/mx]));}
function gapAny(d,rows){const i=rows.findIndex(r=>chars(r).includes(d));return i<0?1:Math.min(i+1,8)/8;}
function recentScore(d,rows,sel){const w=[3,2,1];let s=0;rows.slice(0,3).forEach((r,i)=>{for(const x of sel(r))if(x===d)s+=w[i];});return s;}
function modeRows(rows,mode){const A=rows.slice(0,3),B=rows.slice(2,5);return mode==='B'?{primary:B,support:A}:{primary:A,support:B};}

function crossRudEngine(rows,mode){
  const {primary}=modeRows(rows,mode),target=r=>`${r.top3.slice(-2)}${r.bottom2}`;
  const freq=counts(primary,target),rec=Object.fromEntries(DIGITS.map(d=>[d,recentScore(d,primary,target)])),score={};
  for(const d of DIGITS){
    const persistence=primary.filter(r=>target(r).includes(d)).length/3;
    const topSeen=primary.some(r=>r.top3.slice(-2).includes(d));
    const bottomSeen=primary.some(r=>r.bottom2.includes(d));
    const bothSides=topSeen&&bottomSeen?1:0;
    score[d]=.45*(freq[d]/12)+.25*persistence+.20*bothSides+.10*(rec[d]/6);
  }
  const ranked=[...DIGITS].sort((a,b)=>score[b]-score[a]||freq[b]-freq[a]||rec[b]-rec[a]||(+a)-(+b));
  return {top:ranked[0],bottom:ranked[1],support:null,cross:true,crossScores:score};
}

function rankMode(rows,mode,rud){
  const {primary,support}=modeRows(rows,mode),P=pool(primary),S=pool(support);
  const pFreq=normMap(counts(primary));
  const persistence=Object.fromEntries(DIGITS.map(d=>[d,primary.filter(r=>chars(r).includes(d)).length/3]));
  const recency=Object.fromEntries(DIGITS.map(d=>{const w=[3,2,1];let s=0;primary.forEach((r,i)=>{if(chars(r).includes(d))s+=w[i];});return [d,s/6];}));
  const score={};
  for(const d of DIGITS){
    const gap=gapAny(d,rows),rudHit=(d===rud.top||d===rud.bottom)?1:0;
    if(P.size<=7)score[d]=(P.has(d)?sat(P.size):0)+.5*gap;
    else if(P.size===8)score[d]=.25*(P.has(d)?1:0)+.10*pFreq[d]+.20*persistence[d]+.05*recency[d]+.10*(S.has(d)?1:0)+.25*gap+.05*rudHit;
    else if(P.size===9)score[d]=(P.has(d)?sat(P.size):0)+.5*(S.has(d)?sat(S.size):0)+.5*gap;
    else score[d]=(S.has(d)?sat(S.size):0)+.5*gap;
  }
  const ranked=[...DIGITS].sort((a,b)=>score[b]-score[a]||(+a)-(+b));
  const A=pool(rows.slice(0,3)),B=pool(rows.slice(2,5));
  return {ranked,score,A:[...A].sort().join(''),B:[...B].sort().join(''),poolSize:P.size};
}

function canonPair(p){return [...p].sort().join('');}
function tripleKey(s){return [...s].sort().join('');}
function rud2Digits(rud){return [rud.top,rud.bottom].filter((d,i,a)=>d!=null&&a.indexOf(d)===i);}

function sharedWin7(rows,rank,rud){
  const out=[],seen5=pool(rows.slice(0,5));
  for(const d of rud2Digits(rud))if(d&&!out.includes(d))out.push(d);
  for(const d of rank.ranked)if(seen5.has(d)&&!out.includes(d)){out.push(d);if(out.length===7)break;}
  if(out.length<7)for(const d of rank.ranked)if(!out.includes(d)){out.push(d);if(out.length===7)break;}
  return out.slice(0,7);
}

function pairAffinity(rows,a,b,kind,mode){
  const {primary,support}=modeRows(rows,mode);let s=0;
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

function sharedClusteredPairs(rows,win7,rank,rud,mode){
  const rd=new Set(rud2Digits(rud)),primary=modeRows(rows,mode).primary,c=[];
  for(let i=0;i<win7.length;i++)for(let j=i;j<win7.length;j++){
    const a=win7[i],b=win7[j];
    if(i===j&&!primary.some(r=>r.top3.includes(a+a)||r.bottom2.includes(a+a)))continue;
    const topAffinity=pairAffinity(rows,a,b,'top',mode),bottomAffinity=pairAffinity(rows,a,b,'bottom',mode),sharedAffinity=topAffinity+bottomAffinity;
    const ai=((rank.score[a]||0)+(rank.score[b]||0))/2,rudHits=(rd.has(a)?1:0)+(rd.has(b)?1:0);
    const crossEvidence=((rud.crossScores?.[a]||0)+(rud.crossScores?.[b]||0))/2,repeatBonus=a===b?.35:0;
    c.push({p:`${a}${b}`,key:canonPair(`${a}${b}`),score:sharedAffinity+ai*.45+rudHits*.4+crossEvidence*.45+repeatBonus});
  }
  c.sort((x,y)=>y.score-x.score||(+x.p)-(+y.p));
  const out=[],seen=new Set();
  for(const x of c){if(seen.has(x.key))continue;seen.add(x.key);out.push(x.p);if(out.length===10)break;}
  return out;
}

function hybridTriples(rows,win7,rank,rud,pairs,mode){
  const {primary,support}=modeRows(rows,mode),rd=new Set(rud2Digits(rud)),c=[];
  for(let pi=0;pi<pairs.length;pi++)for(const d of win7){
    const pair=pairs[pi],t=`${pair}${d}`,key=tripleKey(t),ds=[...t],unique=[...new Set(ds)];
    let hist=0;
    primary.forEach((r,i)=>{const k=tripleKey(r.top3);if(k===key)hist+=3-i*.5;else hist+=unique.filter(x=>r.top3.includes(x)).length*.22;});
    support.forEach((r,i)=>{hist+=unique.filter(x=>r.top3.includes(x)).length*(.12-i*.02);});
    const ai=ds.reduce((s,x)=>s+(rank.score[x]||0),0)/3,pairBase=(pairs.length-pi)/pairs.length;
    const rudHits=unique.filter(x=>rd.has(x)).length,crossEvidence=ds.reduce((s,x)=>s+(rud.crossScores?.[x]||0),0)/3;
    const score=1.15*pairBase+.55*ai+hist+rudHits*.35+crossEvidence*.45;
    c.push({t,key,pairKey:canonPair(pair),pair,third:d,score});
  }
  c.sort((a,b)=>b.score-a.score||a.t.localeCompare(b.t));
  const out=[],usedKeys=new Set(),pairUse=new Map(),digitUse=Object.fromEntries(DIGITS.map(d=>[d,0]));let bothRudCount=0;
  const choose=(strict=true)=>{
    while(out.length<5){
      let best=null,bestAdj=-Infinity;
      for(const x of c){
        if(usedKeys.has(x.key))continue;
        if(strict&&(pairUse.get(x.pairKey)||0)>0)continue;
        const ds=[...x.t],unique=[...new Set(ds)],local=Object.fromEntries(DIGITS.map(d=>[d,0]));ds.forEach(d=>local[d]++);
        if(strict&&DIGITS.some(d=>(digitUse[d]||0)+local[d]>3))continue;
        const hasBothRud=rd.size>=2&&[...rd].every(d=>unique.includes(d));
        if(strict&&hasBothRud&&bothRudCount>=2)continue;
        const newDigits=unique.filter(d=>(digitUse[d]||0)===0).length,usePenalty=unique.reduce((s,d)=>s+(digitUse[d]||0)*.28,0),pairPenalty=(pairUse.get(x.pairKey)||0)*.95;
        let overlapPenalty=0;for(const y of out){const ys=new Set([...y]);const common=unique.filter(d=>ys.has(d)).length;if(common>=2)overlapPenalty+=(common-1)*.42;}
        const freshThird=x.pair.includes(x.third)?0:.12,adj=x.score+newDigits*.48+freshThird-usePenalty-pairPenalty-overlapPenalty-(hasBothRud&&bothRudCount>=1?.35:0);
        if(adj>bestAdj||(adj===bestAdj&&best&&(x.score>best.score||(x.score===best.score&&x.t<best.t)))){best=x;bestAdj=adj;}
      }
      if(!best)break;
      usedKeys.add(best.key);out.push(best.t);pairUse.set(best.pairKey,(pairUse.get(best.pairKey)||0)+1);[...best.t].forEach(d=>digitUse[d]++);
      const uniq=[...new Set([...best.t])];if(rd.size>=2&&[...rd].every(d=>uniq.includes(d)))bothRudCount++;
    }
  };
  choose(true);choose(false);
  for(const x of c){if(out.length===5)break;if(usedKeys.has(x.key))continue;usedKeys.add(x.key);out.push(x.t);}
  return out.slice(0,5);
}

export function calculateVeltrix(rows){
  const clean=(rows||[]).slice(0,10);if(clean.length<5)return null;
  const result={};
  for(const mode of ['A','B']){
    const rud=crossRudEngine(clean,mode),rank=rankMode(clean,mode,rud),win7=sharedWin7(clean,rank,rud);
    const p2shared=sharedClusteredPairs(clean,win7,rank,rud,mode),p3=hybridTriples(clean,win7,rank,rud,p2shared,mode),score={...rank.score};
    for(let i=0;i<win7.length;i++)score[win7[i]]=(score[win7[i]]||0)+(7-i)*1e-6;
    result[mode]={
      mode,win6:win7.slice(0,6).join(''),reserve7:win7[6],
      rudTop:rud.top,rudBottom:rud.bottom,rudSupport:null,rud2:rud2Digits(rud),
      crossRud:true,crossRudScores:rud.crossScores,
      pair2Shared:p2shared,pair2Top:p2shared,pair2Bottom:[],pair3Top:p3,
      poolA:rank.A,poolB:rank.B,poolSize:rank.poolSize,
      rankScores:score,baseRankScores:rank.score,fusionBonus:null,
      hybridVersion:`MODE_${mode}_SHARED_PIPELINE_WINDOW_ONLY_V7`
    };
  }
  return result;
}
