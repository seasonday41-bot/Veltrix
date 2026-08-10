const clean=v=>String(v??'').replace(/\D/g,'');
const top3=v=>clean(v).padStart(3,'0').slice(-3);
const bottom2=v=>clean(v).padStart(2,'0').slice(-2);
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));

function rawPercent(n,pct){
  const x=n*pct;
  return `${Math.floor(x/100)}${String(x%100).padStart(2,'0')}`;
}
function rawFormulas(row){
  const t=top3(row.top3),b=bottom2(row.bottom2),[A,B,C]=[...t].map(Number),[D,E]=[...b].map(Number),upper2=Number(t.slice(-2)),lower2=Number(b),sum2=upper2+lower2;
  const x1=(A+D)%10,f2=[...String(sum2)].reduce((s,x)=>s+Number(x),0)%10,x21=(A+B+C+D+E)%10;
  return {
    f1:`${x1}${(x1+1)%10}`,
    f2:String(f2),
    f21:`${x21}${(x21+1)%10}`,
    f22:`${(B+E)%10}${(B+D)%10}${(C+E)%10}`,
    p9:rawPercent(Number(t),9),
    p7:rawPercent(Number(t),7),
    p6:rawPercent(sum2,6),
    p99:rawPercent(sum2,99)
  };
}
function windows3(s=''){
  const out=[];
  for(let i=0;i<=s.length-3;i++){
    const [a,b,c]=s.slice(i,i+3);
    if(a===b&&b===c)out.push({type:'AAA'});
    else if(a===b)out.push({type:'AAB'});
    else if(a===c)out.push({type:'ABA'});
    else if(b===c)out.push({type:'ABB'});
  }
  return out;
}
function hasAdjacent(s=''){for(let i=1;i<s.length;i++)if(s[i]===s[i-1])return true;return false;}
function pairSet(s=''){const out=new Set();for(let i=0;i<s.length-1;i++)out.add(s.slice(i,i+2));return out;}
function sharesPair(a,b){const bs=pairSet(b);for(const p of pairSet(a))if(bs.has(p))return true;return false;}
function sharesDigit(a,b){for(const d of new Set(a))if(b.includes(d))return true;return false;}
function patternOfTop(t){const [a,b,c]=top3(t);if(a===b&&b===c)return 'AAA';if(a===b)return 'AAB';if(a===c)return 'ABA';if(b===c)return 'ABB';return 'NONE';}
function recentPatternPrior(rows=[]){
  const c={AAB:0,ABA:0,ABB:0,AAA:0};
  rows.slice(0,5).forEach((r,i)=>{const p=patternOfTop(r.top3);if(c[p]!=null)c[p]+=1-.12*i;});
  return c;
}
function label(type){return ({AAB:'เบิ้ลหน้า',ABA:'หาม',ABB:'เบิ้ลหลัง',AAA:'ตอง'})[type]||'เบิ้ลบน';}

export function calculateDoublePattern(inputRows=[]){
  const rows=inputRows.slice(0,20);if(!rows.length)return null;
  const f=rawFormulas(rows[0]);
  const pair96=sharesPair(f.p9,f.p6);
  const tripleConfluence=f.f22.at(-1)===f.p99.at(-1)&&sharesDigit(f.f2,f.p6)&&sharesDigit(f.f1,f.p9);
  const tailCounts={};for(const s of Object.values(f)){const d=s.at(-1);tailCounts[d]=(tailCounts[d]||0)+1;}
  const tailMax=Math.max(...Object.values(tailCounts));
  let topChance=29;
  if(pair96)topChance=Math.max(topChance,57);
  if(tripleConfluence)topChance=Math.max(topChance,60);
  if(tailMax>=4)topChance=Math.max(topChance,45);
  if(hasAdjacent(f.p6)||hasAdjacent(f.p9)||hasAdjacent(f.p99))topChance=Math.max(topChance,40);
  topChance=clamp(topChance,0,75);

  const prior=recentPatternPrior(rows),score={AAB:prior.AAB*.12,ABA:prior.ABA*.12,ABB:prior.ABB*.12,AAA:prior.AAA*.05};
  for(const p of windows3(f.p6)){if(p.type==='AAB'||p.type==='ABB')score[p.type]+=.50;else if(p.type==='AAA')score.AAA+=.12;}
  for(const p of windows3(f.p7))if(p.type==='ABA')score.ABA+=.55;
  for(const p of windows3(f.p9))if(p.type==='AAB'||p.type==='ABB')score[p.type]+=.25;
  for(const p of windows3(f.p99)){if(p.type==='AAB'||p.type==='ABB')score[p.type]+=.18;else if(p.type==='ABA')score.ABA+=.12;}
  const topType=Object.keys(score).sort((a,b)=>score[b]-score[a]||['ABB','AAB','ABA','AAA'].indexOf(a)-['ABB','AAB','ABA','AAA'].indexOf(b))[0];

  const bottomPair=sharesPair(f.p7,f.p99);
  let bottomChance=9;
  if(bottomPair)bottomChance=27;
  if(hasAdjacent(f.p6)&&hasAdjacent(f.p99))bottomChance=Math.max(bottomChance,21);
  else if(hasAdjacent(f.p6)||hasAdjacent(f.p99))bottomChance=Math.max(bottomChance,15);
  bottomChance=clamp(bottomChance,0,45);

  return {
    version:'DOUBLE_PATTERN_AI_V1',
    top:{chance:topChance,type:topType,label:label(topType)},
    bottom:{chance:bottomChance,type:'AA',label:'เบิ้ลล่าง'},
    signals:{pair96,tripleConfluence,tailMax,bottomPair,p6Adjacent:hasAdjacent(f.p6),p99Adjacent:hasAdjacent(f.p99)},
    raw:f
  };
}
