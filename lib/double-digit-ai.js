import {calculateFormulaSet} from './veltrix-engine.js';

const DIGITS=[...'0123456789'];
const RUD_WEIGHTS=[1.15,1.15,1.35,1.35,1.30,.95,.82,.70,.60,.52];
const clean=v=>String(v??'').replace(/\D/g,'');
const top3=v=>clean(v).padStart(3,'0').slice(-3);
const bottom2=v=>clean(v).padStart(2,'0').slice(-2);

function normalizeMap(map){
  const mx=Math.max(1e-9,...DIGITS.map(d=>Number(map[d]||0)));
  return Object.fromEntries(DIGITS.map(d=>[d,Number(map[d]||0)/mx]));
}
function repeatedTopDigit(value=''){
  const [a,b,c]=[...top3(value)];
  if(a===b&&b===c)return a;if(a===b)return a;if(a===c)return a;if(b===c)return b;return null;
}
function repeatedBottomDigit(value=''){
  const [a,b]=[...bottom2(value)];return a===b?a:null;
}
function rawPercent(row,pct=56){
  const n=Number(top3(row.top3))*pct;
  return `${Math.floor(n/100)}${String(n%100).padStart(2,'0')}`;
}
function sources(row){return {P56:rawPercent(row,56),...calculateFormulaSet(row)};}
function targetDouble(row,side){return side==='top'?repeatedTopDigit(row.top3):repeatedBottomDigit(row.bottom2);}

function learnedSourceScore(rows=[],side='top'){
  const stats=new Map();
  for(let k=1;k<Math.min(rows.length,11);k++){
    const w=RUD_WEIGHTS[k-1],target=targetDouble(rows[k-1],side),src=sources(rows[k]);
    for(const [name,raw] of Object.entries(src))for(let pos=0;pos<String(raw).length;pos++){
      const key=`${name}:${pos}`,d=String(raw)[pos],x=stats.get(key)||{hit:.05,total:1};
      x.total+=w;if(target!=null&&d===target)x.hit+=w;stats.set(key,x);
    }
  }
  const current=sources(rows[0]),evidence=Object.fromEntries(DIGITS.map(d=>[d,[]]));
  for(const [name,raw0] of Object.entries(current)){
    const raw=String(raw0);
    for(let pos=0;pos<raw.length;pos++){
      const d=raw[pos],x=stats.get(`${name}:${pos}`)||{hit:.05,total:1};
      evidence[d].push({name,pos,rate:x.hit/x.total});
    }
  }
  const score={};
  for(const d of DIGITS){
    const ev=[...evidence[d]].sort((a,b)=>b.rate-a.rate);
    if(!ev.length){score[d]=0;continue;}
    const best=ev.slice(0,2),rel=best.reduce((s,x)=>s+x.rate,0)/best.length;
    score[d]=.88*rel+.12*Math.min(1,ev.length/5);
  }
  return {score:normalizeMap(score),evidence,current};
}
function historicalDoubleScore(rows=[],side='top'){
  const score=Object.fromEntries(DIGITS.map(d=>[d,0]));
  rows.slice(0,10).forEach((r,i)=>{const w=.86**i,d=targetDouble(r,side);if(d!=null)score[d]+=w;});
  return normalizeMap(score);
}
function hotScore(rows=[],side='top'){
  const score=Object.fromEntries(DIGITS.map(d=>[d,0]));
  rows.slice(0,5).forEach((r,i)=>{const w=1-.12*i,s=side==='top'?top3(r.top3):bottom2(r.bottom2);for(const d of new Set(s))score[d]+=w;});
  return normalizeMap(score);
}
function formulaScore(row){
  const fs=calculateFormulaSet(row),score=Object.fromEntries(DIGITS.map(d=>[d,0]));
  const weights={'สูตร 1':.08,'สูตร 2':.07,'สูตร 2.1':.08,'สูตร 2.2':.10,'สูตร 3-9%':.18,'สูตร 3-7%':.12,'สูตร 3-6%':.15,'สูตร 3-99%':.22};
  for(const [name,value] of Object.entries(fs))for(const d of new Set(String(value)))if(score[d]!=null)score[d]+=weights[name]??.05;
  return normalizeMap(score);
}
function predictionEvidence(prediction={}){
  const score=Object.fromEntries(DIGITS.map(d=>[d,0])),primary=String(prediction.rudTop??''),secondary=String(prediction.rudBottom??'');
  if(score[primary]!=null)score[primary]+=.34;if(score[secondary]!=null)score[secondary]+=.26;
  for(const d of String(prediction.win6||''))if(score[d]!=null)score[d]+=.16;
  const reserve=String(prediction.reserve7??'');if(score[reserve]!=null)score[reserve]+=.08;
  const rank=prediction.rankScores||{},rankMax=Math.max(1e-9,...DIGITS.map(d=>Number(rank[d]||0)));
  for(const d of DIGITS)score[d]+=.16*(Number(rank[d]||0)/rankMax);
  return normalizeMap(score);
}
function rankSide(rows,side,prediction){
  const learned=learnedSourceScore(rows,side),historical=historicalDoubleScore(rows,side),formula=formulaScore(rows[0]),hot=hotScore(rows,side),linked=predictionEvidence(prediction);
  const raw=Object.fromEntries(DIGITS.map(d=>[d,.58*learned.score[d]+.16*historical[d]+.10*formula[d]+.08*hot[d]+.08*linked[d]]));
  const ranked=[...DIGITS].sort((a,b)=>raw[b]-raw[a]||learned.score[b]-learned.score[a]||historical[b]-historical[a]||Number(a)-Number(b));
  return {ranked,scores:raw,components:{learned:learned.score,historical,formula,hot,linked},learnedEvidence:learned.evidence};
}

export function calculateDoubleDigit(inputRows=[],prediction={}){
  const rows=inputRows.slice(0,20);if(rows.length<5)return null;
  const top=rankSide(rows,'top',prediction),bottom=rankSide(rows,'bottom',prediction);
  return {
    version:'DOUBLE_DIGIT_AI_V2_SOURCE_POSITION',purpose:'select_double_digit_only',
    top:{focus:top.ranked.slice(0,2),watch:top.ranked.slice(0,3),scores:top.scores},
    bottom:{focus:bottom.ranked.slice(0,2),watch:bottom.ranked.slice(0,3),scores:bottom.scores},
    components:{top:top.components,bottom:bottom.components},
    learnedEvidence:{top:top.learnedEvidence,bottom:bottom.learnedEvidence},
    relationship:{patternOnly:false,changesWin6:false,changesPair2:false,changesPair3:false}
  };
}
