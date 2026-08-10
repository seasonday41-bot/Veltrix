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

export function isSiblingPair(value=''){
  const s=clean(value).padStart(2,'0').slice(-2);
  const a=Number(s[0]),b=Number(s[1]);
  return ((a-b+10)%10===1)||((b-a+10)%10===1);
}
function hasSiblingWindow(s=''){
  for(let i=0;i<s.length-1;i++)if(isSiblingPair(s.slice(i,i+2)))return true;
  return false;
}
function siblingRelation(a,b){
  if(a==null||b==null)return false;
  return isSiblingPair(`${a}${b}`);
}
function pairSet(s=''){
  const out=new Set();
  for(let i=0;i<s.length-1;i++)if(isSiblingPair(s.slice(i,i+2)))out.add(s.slice(i,i+2));
  return out;
}
function sharesSiblingPair(a,b){
  const aa=pairSet(a),bb=pairSet(b);
  for(const p of aa){const rev=p[1]+p[0];if(bb.has(p)||bb.has(rev))return true;}
  return false;
}
function recentRate(rows,side){
  const list=rows.slice(0,5);if(!list.length)return 0;
  let sum=0,w=0;
  list.forEach((r,i)=>{const weight=1-.12*i;const pair=side==='top'?top3(r.top3).slice(-2):bottom2(r.bottom2);w+=weight;if(isSiblingPair(pair))sum+=weight;});
  return w?sum/w:0;
}

export function calculateSiblingPosition(inputRows=[]){
  const rows=inputRows.slice(0,20);if(!rows.length)return null;
  const f=rawFormulas(rows[0]);

  const head79=siblingRelation(f.p7[0],f.p99[0]);
  const p6Sibling=hasSiblingWindow(f.p6);
  const f1f21Sibling=siblingRelation(f.f1[0],f.f21[0])||siblingRelation(f.f1.at(-1),f.f21.at(-1));
  const pair96=sharesSiblingPair(f.p9,f.p6);
  const pair799=sharesSiblingPair(f.p7,f.p99);
  const tail22_99=siblingRelation(f.f22.at(-1),f.p99.at(-1));
  const multiSibling=[f.f1,f.f21,f.f22,f.p9,f.p7,f.p6,f.p99].filter(hasSiblingWindow).length;

  let topChance=22;
  if(head79&&p6Sibling&&f1f21Sibling)topChance=Math.max(topChance,58);
  if(pair96&&head79)topChance=Math.max(topChance,50);
  if(pair96)topChance=Math.max(topChance,46);
  if(head79&&p6Sibling)topChance=Math.max(topChance,48);
  if(multiSibling>=4)topChance=Math.max(topChance,43);
  topChance+=Math.round(Math.max(0,recentRate(rows,'top')-.22)*20);
  topChance=clamp(topChance,0,68);

  let bottomChance=20;
  if(pair799&&tail22_99)bottomChance=Math.max(bottomChance,50);
  if(pair799)bottomChance=Math.max(bottomChance,42);
  if(tail22_99&&p6Sibling)bottomChance=Math.max(bottomChance,40);
  if(multiSibling>=4)bottomChance=Math.max(bottomChance,36);
  bottomChance+=Math.round(Math.max(0,recentRate(rows,'bottom')-.20)*20);
  bottomChance=clamp(bottomChance,0,62);

  return {
    version:'SIBLING_POSITION_AI_V1',
    definition:'01/10 12/21 23/32 34/43 45/54 56/65 67/76 78/87 89/98 90/09',
    top:{chance:topChance,label:'พี่น้องบน',scope:'2ตัวบน'},
    bottom:{chance:bottomChance,label:'พี่น้องล่าง',scope:'2ตัวล่าง'},
    signals:{head79,p6Sibling,f1f21Sibling,pair96,pair799,tail22_99,multiSibling,recentTop:recentRate(rows,'top'),recentBottom:recentRate(rows,'bottom')},
    raw:f
  };
}
