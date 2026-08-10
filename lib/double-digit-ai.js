import {calculateFormulaSet} from './veltrix-engine.js';

const DIGITS=[...'0123456789'];
const clean=v=>String(v??'').replace(/\D/g,'');
const top3=v=>clean(v).padStart(3,'0').slice(-3);
const bottom2=v=>clean(v).padStart(2,'0').slice(-2);

function normalizeMap(map){
  const mx=Math.max(1e-9,...DIGITS.map(d=>Number(map[d]||0)));
  return Object.fromEntries(DIGITS.map(d=>[d,Number(map[d]||0)/mx]));
}
function repeatedTopDigit(value=''){
  const [a,b,c]=[...top3(value)];
  if(a===b&&b===c)return a;
  if(a===b)return a;
  if(a===c)return a;
  if(b===c)return b;
  return null;
}
function repeatedBottomDigit(value=''){
  const [a,b]=[...bottom2(value)];
  return a===b?a:null;
}
function historicalDoubleScore(rows=[],side='top'){
  const score=Object.fromEntries(DIGITS.map(d=>[d,0]));
  rows.slice(0,10).forEach((r,i)=>{
    const w=.86**i;
    const d=side==='top'?repeatedTopDigit(r.top3):repeatedBottomDigit(r.bottom2);
    if(d!=null)score[d]+=w;
  });
  return normalizeMap(score);
}
function hotScore(rows=[],side='top'){
  const score=Object.fromEntries(DIGITS.map(d=>[d,0]));
  rows.slice(0,5).forEach((r,i)=>{
    const w=1-.12*i;
    const s=side==='top'?top3(r.top3):bottom2(r.bottom2);
    for(const d of new Set(s))score[d]+=w;
  });
  return normalizeMap(score);
}
function formulaScore(row){
  const fs=calculateFormulaSet(row);
  const weights={
    'สูตร 1':.08,
    'สูตร 2':.07,
    'สูตร 2.1':.08,
    'สูตร 2.2':.10,
    'สูตร 3-9%':.18,
    'สูตร 3-7%':.12,
    'สูตร 3-6%':.15,
    'สูตร 3-99%':.22
  };
  const score=Object.fromEntries(DIGITS.map(d=>[d,0]));
  for(const [name,value] of Object.entries(fs)){
    const w=weights[name]??.05;
    for(const d of new Set(String(value)))if(score[d]!=null)score[d]+=w;
  }
  return normalizeMap(score);
}
function predictionEvidence(prediction={}){
  const score=Object.fromEntries(DIGITS.map(d=>[d,0]));
  const primary=String(prediction.rudTop??'');
  const secondary=String(prediction.rudBottom??'');
  if(score[primary]!=null)score[primary]+=.34;
  if(score[secondary]!=null)score[secondary]+=.26;
  for(const d of String(prediction.win6||''))if(score[d]!=null)score[d]+=.16;
  const reserve=String(prediction.reserve7??'');
  if(score[reserve]!=null)score[reserve]+=.08;
  const rank=prediction.rankScores||{};
  const rankMax=Math.max(1e-9,...DIGITS.map(d=>Number(rank[d]||0)));
  for(const d of DIGITS)score[d]+=.16*(Number(rank[d]||0)/rankMax);
  return normalizeMap(score);
}
function rankSide(rows,side,prediction){
  const historical=historicalDoubleScore(rows,side);
  const hot=hotScore(rows,side);
  const formula=formulaScore(rows[0]);
  const linked=predictionEvidence(prediction);
  const raw=Object.fromEntries(DIGITS.map(d=>[d,
    .38*historical[d]+.22*formula[d]+.20*hot[d]+.20*linked[d]
  ]));
  const ranked=[...DIGITS].sort((a,b)=>raw[b]-raw[a]||historical[b]-historical[a]||formula[b]-formula[a]||Number(a)-Number(b));
  return {ranked,scores:raw,components:{historical,formula,hot,linked}};
}

export function calculateDoubleDigit(inputRows=[],prediction={}){
  const rows=inputRows.slice(0,20);
  if(!rows.length)return null;
  const top=rankSide(rows,'top',prediction);
  const bottom=rankSide(rows,'bottom',prediction);
  return {
    version:'DOUBLE_DIGIT_AI_V1',
    purpose:'select_double_digit_only',
    top:{focus:top.ranked.slice(0,2),watch:top.ranked.slice(0,3),scores:top.scores},
    bottom:{focus:bottom.ranked.slice(0,2),watch:bottom.ranked.slice(0,3),scores:bottom.scores},
    components:{top:top.components,bottom:bottom.components},
    relationship:{pattern_only:false,changesWin6:false,changesPair2:false,changesPair3:false}
  };
}
