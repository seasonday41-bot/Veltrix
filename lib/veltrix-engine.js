const DIGITS=[...'0123456789'];
const FORMULA_NAMES=['สูตร 1','สูตร 2','สูตร 2.1','สูตร 2.2','สูตร 3-9%','สูตร 3-7%','สูตร 3-6%','สูตร 3-99%'];
const RECENT_DRAWS=5;
const CHALLENGER_MARGIN=.60;
const CHALLENGER_DRIFT_MIN=30;

function clamp(n,a=0,b=1){return Math.max(a,Math.min(b,n));}
function digitsOnly(v=''){return String(v??'').replace(/\D/g,'');}
function top3(v){return digitsOnly(v).padStart(3,'0').slice(-3);}
function bottom2(v){return digitsOnly(v).padStart(2,'0').slice(-2);}
function normalizeRows(rows=[]){
  return rows.slice(0,20).map(r=>({...r,top3:top3(r.top3),bottom2:bottom2(r.bottom2)}));
}
function chars(r){return `${r.top3}${r.bottom2}`;}
function unique(s=''){const out=[];for(const d of String(s))if(/\d/.test(d)&&!out.includes(d))out.push(d);return out.join('');}
function normMap(map){const mx=Math.max(1e-9,...DIGITS.map(d=>Number(map[d]||0)));return Object.fromEntries(DIGITS.map(d=>[d,Number(map[d]||0)/mx]));}
function weightedPresence(rows,count=5,decay=.82){
  const score=Object.fromEntries(DIGITS.map(d=>[d,0]));
  rows.slice(0,count).forEach((r,i)=>{const w=decay**i;for(const d of new Set(chars(r)))score[d]+=w;});
  return normMap(score);
}
function pctResult(numerator,mode){
  const integer=Math.floor(numerator/100),decimal=numerator%100;
  const raw=`${integer}${String(decimal).padStart(2,'0')}`;
  const picked=mode==='first3'?raw.slice(0,3).padEnd(3,'0'):raw.slice(-3).padStart(3,'0');
  return unique(picked);
}

export function calculateFormulaSet(row){
  const t=top3(row.top3),b=bottom2(row.bottom2);
  const [A,B,C]=[...t].map(Number),[D,E]=[...b].map(Number);
  const upper2=Number(t.slice(-2)),lower2=Number(b),sum2=upper2+lower2;
  const x1=(A+D)%10;
  const f2=[...String(sum2)].reduce((s,x)=>s+Number(x),0)%10;
  const x21=(A+B+C+D+E)%10;
  return {
    'สูตร 1':unique(`${x1}${(x1+1)%10}`),
    'สูตร 2':String(f2),
    'สูตร 2.1':unique(`${x21}${(x21+1)%10}`),
    'สูตร 2.2':unique(`${(B+E)%10}${(B+D)%10}${(C+E)%10}`),
    'สูตร 3-9%':pctResult(Number(t)*9,'first3'),
    'สูตร 3-7%':pctResult(Number(t)*7,'last3'),
    'สูตร 3-6%':pctResult(sum2*6,'last3'),
    'สูตร 3-99%':pctResult(sum2*99,'last3')
  };
}

function baseRanking(row){
  const formulas=calculateFormulaSet(row),count=Object.fromEntries(DIGITS.map(d=>[d,0])),first={};let pos=0;
  for(const name of FORMULA_NAMES){
    for(const d of formulas[name]){count[d]++;if(first[d]==null)first[d]=pos;pos++;}
  }
  const score=normMap(count);
  const ranked=[...DIGITS].sort((a,b)=>score[b]-score[a]||(first[a]??999)-(first[b]??999)||Number(a)-Number(b));
  return {formulas,count,score,first,ranked};
}

function transitions(rows,start=1,count=5){
  const out=[];
  for(let k=start;k<Math.min(rows.length,start+count);k++)out.push({source:rows[k],target:rows[k-1],age:k-start});
  return out;
}
function formulaReliability(rows,start=1,count=5,decay=.82){
  const acc=Object.fromEntries(FORMULA_NAMES.map(n=>[n,{sum:.45,weight:1}]));
  for(const tr of transitions(rows,start,count)){
    const w=decay**tr.age,target=new Set(chars(tr.target)),fs=calculateFormulaSet(tr.source);
    for(const name of FORMULA_NAMES){
      const ds=[...new Set(fs[name])],hit=ds.filter(d=>target.has(d)).length/Math.max(1,ds.length);
      acc[name].sum+=w*hit;acc[name].weight+=w;
    }
  }
  return Object.fromEntries(FORMULA_NAMES.map(n=>[n,acc[n].sum/acc[n].weight]));
}
function recentDigitScore(rows,currentFormulas){
  const rel=formulaReliability(rows,1,5),formula=Object.fromEntries(DIGITS.map(d=>[d,0]));
  for(const name of FORMULA_NAMES)for(const d of currentFormulas[name])formula[d]+=rel[name];
  const formulaN=normMap(formula),presence=weightedPresence(rows,5,.82),persist=Object.fromEntries(DIGITS.map(d=>[d,0])),den=Object.fromEntries(DIGITS.map(d=>[d,0]));
  for(const tr of transitions(rows,1,5)){
    const w=.82**tr.age,source=new Set(chars(tr.source)),target=new Set(chars(tr.target));
    for(const d of DIGITS){if(source.has(d)){den[d]+=w;if(target.has(d))persist[d]+=w;}}
  }
  const persistN=normMap(Object.fromEntries(DIGITS.map(d=>[d,den[d]?persist[d]/den[d]:0])));
  const raw=Object.fromEntries(DIGITS.map(d=>[d,.40*formulaN[d]+.30*presence[d]+.30*persistN[d]]));
  return {score:normMap(raw),formulaReliability:rel,formulaScore:formulaN,presence,persistence:persistN};
}

function distribution(rows,selector){
  const c=Object.fromEntries(DIGITS.map(d=>[d,0]));let n=0;
  for(const r of rows){for(const d of selector(r)){c[d]++;n++;}}
  return Object.fromEntries(DIGITS.map(d=>[d,n?c[d]/n:0]));
}
function tv(a,b){return .5*DIGITS.reduce((s,d)=>s+Math.abs((a[d]||0)-(b[d]||0)),0);}
function doubleInfo(row){
  const t=row.top3,b=row.bottom2,ds=[];
  if(t[0]===t[1])ds.push(t[0]);if(t[1]===t[2])ds.push(t[1]);if(t[0]===t[2])ds.push(t[0]);if(b[0]===b[1])ds.push(b[0]);
  return [...new Set(ds)];
}
function baselineCoverage(source,target){
  const win=new Set(baseRanking(source).ranked.slice(0,6));
  return [...chars(target)].filter(d=>win.has(d)).length/5;
}
function avgCoverage(rows,start,count){
  const ts=transitions(rows,start,count);if(!ts.length)return 0;
  return ts.reduce((s,t)=>s+baselineCoverage(t.source,t.target),0)/ts.length;
}
function driftEngine(rows){
  const recent=rows.slice(0,5),previous=rows.slice(5,10);
  if(previous.length<3)return {score:20,level:'ข้อมูลกำลังก่อตัว',components:{digit:.2,position:.2,formula:.2,pattern:.2,model:.2}};
  const digit=tv(distribution(recent,chars),distribution(previous,chars));
  let position=0;for(let p=0;p<5;p++)position+=tv(distribution(recent,r=>chars(r)[p]),distribution(previous,r=>chars(r)[p]));position/=5;
  const rr=formulaReliability(rows,1,4),pr=formulaReliability(rows,6,4);
  const formula=FORMULA_NAMES.reduce((s,n)=>s+Math.abs(rr[n]-pr[n]),0)/FORMULA_NAMES.length;
  const pattern=Math.abs(recent.filter(r=>doubleInfo(r).length).length/recent.length-previous.filter(r=>doubleInfo(r).length).length/previous.length);
  const recentCov=avgCoverage(rows,1,4),previousCov=avgCoverage(rows,6,4),model=clamp(previousCov-recentCov);
  const score=Math.round(clamp(.30*digit+.20*position+.25*formula+.10*pattern+.15*model)*100);
  const level=score<25?'นิ่ง':score<45?'เริ่มเปลี่ยน':score<65?'เปลี่ยนชัด':'เปลี่ยนแรง';
  return {score,level,components:{digit,position,formula,pattern,model,recentCoverage:recentCov,previousCoverage:previousCov}};
}
function mixFromDrift(score){return score<25?{base:.80,recent:.20}:score<45?{base:.70,recent:.30}:{base:.60,recent:.40};}
function recentHitCount(rows,d){return rows.slice(0,5).filter(r=>chars(r).includes(d)).length;}

function selectWin6(rows,base,recent,drift){
  const champion=base.ranked.slice(0,6),fixed=champion.slice(0,5),base6=champion[5],candidates=DIGITS.filter(d=>!fixed.includes(d));
  const challenger=[...candidates].sort((a,b)=>recent.score[b]-recent.score[a]||base.ranked.indexOf(a)-base.ranked.indexOf(b)||Number(a)-Number(b))[0];
  const mx=Math.max(1e-9,...candidates.map(d=>recent.score[d])),advantage=(recent.score[challenger]-recent.score[base6])/mx;
  const hitAdvantage=recentHitCount(rows,challenger)-recentHitCount(rows,base6);
  const replace=challenger!==base6&&drift.score>=CHALLENGER_DRIFT_MIN&&advantage>=CHALLENGER_MARGIN&&hitAdvantage>=1;
  const members=[...fixed,replace?challenger:base6];
  return {members,champion,base6,challenger,replace,advantage,hitAdvantage};
}
function orderedWin6(win,base,recent,mix){
  const score=Object.fromEntries(DIGITS.map(d=>[d,mix.base*base.score[d]+mix.recent*recent.score[d]]));
  return {ordered:[...win.members],score};
}
function posProb(rows,pos,d){
  let count=1,total=10;
  rows.slice(0,5).forEach((r,i)=>{const w=1.5-.15*i;total+=w;if(chars(r)[pos]===d)count+=w;});
  return count/total;
}
function pairScore(rows,a,b,rankScore,rud){
  const top=posProb(rows,1,a)*posProb(rows,2,b),bottom=posProb(rows,3,a)*posProb(rows,4,b);
  const ai=((rankScore[a]||0)+(rankScore[b]||0))/2,rudBonus=(rud.includes(a)?1:0)+(rud.includes(b)?1:0);
  let hist=0;rows.slice(0,5).forEach((r,i)=>{const w=1-.12*i;if(r.top3.slice(-2)===a+b)hist+=w;if(r.bottom2===a+b)hist+=w;});
  return 2.2*(top+bottom)+.55*ai+.28*rudBonus+.35*hist;
}
function buildPairs(rows,win6,rankScore,rud){
  const c=[];
  for(const a of win6)for(const b of win6){
    if(a===b&&!rows.slice(0,5).some(r=>r.top3.includes(a+a)||r.bottom2===a+a))continue;
    c.push({p:a+b,score:pairScore(rows,a,b,rankScore,rud)});
  }
  c.sort((x,y)=>y.score-x.score||x.p.localeCompare(y.p));
  const out=[],seen=new Set();
  for(const x of c){const key=[...x.p].sort().join('');if(seen.has(key))continue;seen.add(key);out.push(x.p);if(out.length===5)break;}
  return out;
}
function tripleScore(rows,t,rankScore,rud,pairs){
  const [a,b,c]=t,position=posProb(rows,0,a)*posProb(rows,1,b)*posProb(rows,2,c),ai=(rankScore[a]+rankScore[b]+rankScore[c])/3;
  const rudBonus=[...new Set(t)].filter(d=>rud.includes(d)).length,pairBonus=pairs.some(p=>t.includes(p[0])&&t.includes(p[1]))?1:0;
  let hist=0;rows.slice(0,5).forEach((r,i)=>{const w=1-.12*i;if(r.top3===t)hist+=2*w;else hist+=[...new Set(t)].filter(d=>r.top3.includes(d)).length*.12*w;});
  return 3*position+.65*ai+.30*rudBonus+.25*pairBonus+.45*hist;
}
function buildTriples(rows,win6,rankScore,rud,pairs){
  const c=[];
  for(const a of win6)for(const b of win6)for(const d of win6)c.push({t:a+b+d,score:tripleScore(rows,a+b+d,rankScore,rud,pairs)});
  c.sort((x,y)=>y.score-x.score||x.t.localeCompare(y.t));
  const out=[],keys=new Set();
  for(const x of c){const key=[...x.t].sort().join('');if(keys.has(key))continue;keys.add(key);out.push(x.t);if(out.length===3)break;}
  return out;
}
function doubleEngine(rows,win6,rankScore,currentFormulas){
  let event=0,total=0;const ds=Object.fromEntries(DIGITS.map(d=>[d,0]));
  rows.slice(0,10).forEach((r,i)=>{const w=.86**i,hit=doubleInfo(r);total+=w;if(hit.length)event+=w;for(const d of hit)ds[d]+=w;});
  const chance=Math.round(100*(event+1)/(total+2));
  const formula2=`${currentFormulas['สูตร 2']}${currentFormulas['สูตร 2.1']}${currentFormulas['สูตร 2.2']}`;
  const maxHist=Math.max(1,...win6.map(d=>ds[d]));
  const scored=win6.map((d,i)=>({d,score:.55*(ds[d]/maxHist)+.25*(formula2.includes(d)?1:0)+.20*(rankScore[d]||0)-i*1e-5}));
  scored.sort((a,b)=>b.score-a.score||Number(a.d)-Number(b.d));
  return {chance,watch:scored.slice(0,3).map(x=>x.d),scores:Object.fromEntries(scored.map(x=>[x.d,x.score]))};
}
function thaiTodayISO(){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const get=t=>parts.find(x=>x.type===t)?.value||'';return `${get('year')}-${get('month')}-${get('day')}`;
}

export function calculateVeltrix(inputRows,options={}){
  const rows=normalizeRows(inputRows);if(rows.length<5)return null;
  const base=baseRanking(rows[0]),recent=recentDigitScore(rows,base.formulas),drift=driftEngine(rows),mix=mixFromDrift(drift.score),win=selectWin6(rows,base,recent,drift),ordered=orderedWin6(win,base,recent,mix);
  const win6=ordered.ordered,rud=win6.slice(0,2),pairs=buildPairs(rows,win6,ordered.score,rud),triples=buildTriples(rows,win6,ordered.score,rud,pairs),dbl=doubleEngine(rows,win6,ordered.score,base.formulas);
  const reserve=base.ranked.find(d=>!win6.includes(d))||DIGITS.find(d=>!win6.includes(d))||'0',targetDate=options?.targetDate||thaiTodayISO();
  const prediction={
    win6:win6.join(''),reserve7:reserve,rudTop:rud[0],rudBottom:rud[1],rudSupport:null,rud2:rud,
    pair2Shared:pairs,pair2Top:pairs,pair2Bottom:[],pair3Top:triples,
    poolA:base.ranked.slice(0,6).join(''),poolB:win6.join(''),poolSize:6,
    rankScores:ordered.score,baseRankScores:base.score,formulaOutputs:base.formulas,formulaReliability:recent.formulaReliability,
    targetDate,dayWin:'',yearWin:'',calendarBonus:null,fusionBonus:null,
    driftScore:drift.score,driftLevel:drift.level,driftComponents:drift.components,
    baseWeight:Math.round(mix.base*100),recentWeight:Math.round(mix.recent*100),
    challengerDigit:win.challenger,challengerReplaced:win.replace,challengerAdvantage:win.advantage,
    doubleChance:dbl.chance,doubleWatch:dbl.watch,doubleScores:dbl.scores,
    hybridVersion:'ADAPTIVE_5_DRAW_CONSERVATIVE_WIN6_V12'
  };
  return {A:{...prediction,mode:'A'},B:{...prediction,mode:'B'}};
}
