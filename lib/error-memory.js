import {db} from './db.js';

const DIGITS=[...'0123456789'];
const LIVE_VERSION='adaptive_v16';
const PREVIOUS_LIVE_VERSION='adaptive_v15';
const BACKFILL_VERSION='adaptive_v15_backfill';
const COMPATIBLE_VERSIONS=[LIVE_VERSION,PREVIOUS_LIVE_VERSION,BACKFILL_VERSION];

function onlyDigits(v=''){return String(v??'').replace(/\D/g,'');}
function uniqueDigits(v=''){
  const out=[];
  for(const d of onlyDigits(v))if(!out.includes(d))out.push(d);
  return out;
}
function map0(){return Object.fromEntries(DIGITS.map(d=>[d,0]));}
function normalizeMap(m){
  const mx=Math.max(1e-9,...DIGITS.map(d=>Number(m?.[d]||0)));
  return Object.fromEntries(DIGITS.map(d=>[d,Number(m?.[d]||0)/mx]));
}
function clamp(n,a=-1,b=1){return Math.max(a,Math.min(b,n));}

export function doubleDigits(actual){
  const t=onlyDigits(actual?.top3).padStart(3,'0').slice(-3);
  const b=onlyDigits(actual?.bottom2).padStart(2,'0').slice(-2);
  const out=[];
  if(t[0]===t[1])out.push(t[0]);
  if(t[1]===t[2])out.push(t[1]);
  if(t[0]===t[2])out.push(t[0]);
  if(b[0]===b[1])out.push(b[0]);
  return [...new Set(out)];
}

export function settlePrediction(prediction,actual,context={}){
  const top=onlyDigits(actual?.top3).padStart(3,'0').slice(-3);
  const bottom=onlyDigits(actual?.bottom2).padStart(2,'0').slice(-2);
  const actual5=`${top}${bottom}`;
  const win6=onlyDigits(prediction?.win6).slice(0,6);
  const reserve=onlyDigits(prediction?.reserve7).slice(0,1);
  const win7=`${win6}${reserve}`;
  const win6Set=new Set(win6),win7Set=new Set(win7);
  const pairs=(prediction?.pair2Shared||prediction?.pair2Top||[]).slice(0,5);
  const triples=(prediction?.pair3Top||[]).slice(0,3);
  const primary=String(prediction?.rudTop||prediction?.rudPrimary||'');
  const secondary=String(prediction?.rudBottom||prediction?.rudSecondary||'');
  const primarySide=prediction?.rudPrimarySide||null,secondarySide=prediction?.rudSecondarySide||null;
  const primaryTop=!!primary&&top.includes(primary),primaryBottom=!!primary&&bottom.includes(primary);
  const secondaryTop=!!secondary&&top.includes(secondary),secondaryBottom=!!secondary&&bottom.includes(secondary);
  const primarySideHit=primarySide==='บน'?primaryTop:primarySide==='ล่าง'?primaryBottom:null;
  const secondarySideHit=secondarySide==='บน'?secondaryTop:secondarySide==='ล่าง'?secondaryBottom:null;
  const watch=(prediction?.doubleWatch||[]).slice(0,3).map(String);
  const doubles=doubleDigits({top3:top,bottom2:bottom});
  const actualUnique=uniqueDigits(actual5);
  const missing=actualUnique.filter(d=>!win6Set.has(d));
  const falsePositive=uniqueDigits(win6).filter(d=>!actualUnique.includes(d));
  const reserveRescue=missing.filter(d=>d===reserve);
  const hit5=[...actual5].filter(d=>win6Set.has(d)).length;
  const doubleHits=doubles.filter(d=>watch.includes(d));

  const details={
    memory_version:'v2',
    backfill:!!context.backfill,
    source_result_id:context.source_result_id||null,
    target_result_id:context.target_result_id||actual?.id||null,
    source_date:context.source_date||null,
    target_date:context.target_date||actual?.draw_date||null,
    market_id:context.market_id||actual?.market_id||null,
    actual_top3:top,
    actual_bottom2:bottom,
    actual_digits:actual5,
    actual_unique_digits:actualUnique,
    win6,
    reserve7:reserve,
    reserve_rank7:prediction?.reserveRank7||null,
    reserve_strategy:prediction?.reserveStrategy||null,
    specialist_version:prediction?.specialistVersion||null,
    specialists:prediction?.specialists||null,
    win6_hit_count_5:hit5,
    win6_full_5:hit5===5,
    win6_at_least_4:hit5>=4,
    win6_at_least_3:hit5>=3,
    missing_digits:missing,
    false_positive_digits:falsePositive,
    reserve_rescue_digits:reserveRescue,
    reserve_rescue_full_5:hit5<5&&[...actual5].every(d=>win7Set.has(d)),
    rud_primary:primary,
    rud_secondary:secondary,
    rud_primary_side:primarySide,
    rud_secondary_side:secondarySide,
    rud_primary_hit_any:!!primary&&actual5.includes(primary),
    rud_secondary_hit_any:!!secondary&&actual5.includes(secondary),
    rud_primary_hit_top:primaryTop,
    rud_primary_hit_bottom:primaryBottom,
    rud_secondary_hit_top:secondaryTop,
    rud_secondary_hit_bottom:secondaryBottom,
    rud_primary_side_hit:primarySideHit,
    rud_secondary_side_hit:secondarySideHit,
    rud_ai:prediction?.rudAI||null,
    pair2:pairs,
    pair3:triples,
    double_actual_digits:doubles,
    double_watch:watch,
    double_watch_hit_digits:doubleHits,
    double_watch_hit:doubleHits.length>0,
    drift_score:prediction?.driftScore??null,
    drift_level:prediction?.driftLevel||null,
    base_weight:prediction?.baseWeight??null,
    recent_weight:prediction?.recentWeight??null,
    formula_outputs:prediction?.formulaOutputs||{},
    formula_reliability:prediction?.formulaReliability||{}
  };

  return {
    win6_top_count:[...top].filter(d=>win6Set.has(d)).length,
    win7_top_count:[...top].filter(d=>win7Set.has(d)).length,
    win6_top_full:[...top].every(d=>win6Set.has(d)),
    win7_top_full:[...top].every(d=>win7Set.has(d)),
    win6_top2_full:[...top.slice(-2)].every(d=>win6Set.has(d)),
    win7_top2_full:[...top.slice(-2)].every(d=>win7Set.has(d)),
    win6_bottom_full:[...bottom].every(d=>win6Set.has(d)),
    win7_bottom_full:[...bottom].every(d=>win7Set.has(d)),
    rud_top_hit:!!primary&&actual5.includes(primary),
    rud_bottom_hit:!!secondary&&actual5.includes(secondary),
    rud_shared_hit:null,
    rud_support_hit:null,
    rud_challenger_hit:null,
    pair2_top_hit:pairs.includes(top.slice(-2)),
    pair2_bottom_hit:pairs.includes(bottom),
    pair3_top_hit:triples.includes(top),
    details
  };
}

export function buildErrorMemory(detailsInput=[],options={}){
  const decay=Number(options.decay??0.90),maxSamples=Number(options.maxSamples??30);
  const seenTargets=new Set(),details=[];
  for(const d of detailsInput||[]){
    if(!d||typeof d!=='object')continue;
    const key=d.target_result_id||`${d.target_date||''}:${d.actual_digits||''}`;
    if(key&&seenTargets.has(key))continue;
    if(key)seenTargets.add(key);
    details.push(d);
    if(details.length>=maxSamples)break;
  }

  const miss=map0(),falsePos=map0(),hit=map0(),doubleMiss=map0();
  let totalWeight=0,full5=0,atLeast4=0,atLeast3=0,doubleEvents=0,doubleCaught=0;
  details.forEach((d,i)=>{
    const w=decay**i; totalWeight+=w;
    const actual=uniqueDigits(d.actual_digits||`${d.actual_top3||''}${d.actual_bottom2||''}`);
    const win=new Set(uniqueDigits(d.win6||''));
    const missing=Array.isArray(d.missing_digits)?d.missing_digits:actual.filter(x=>!win.has(x));
    const falseDigits=Array.isArray(d.false_positive_digits)?d.false_positive_digits:uniqueDigits(d.win6||'').filter(x=>!actual.includes(x));
    for(const x of missing)miss[x]+=w;
    for(const x of falseDigits)falsePos[x]+=w;
    for(const x of actual)if(win.has(x))hit[x]+=w;
    const doubles=Array.isArray(d.double_actual_digits)?d.double_actual_digits:[];
    const watch=new Set(Array.isArray(d.double_watch)?d.double_watch:[]);
    if(doubles.length){
      doubleEvents+=w;
      if(doubles.some(x=>watch.has(x)))doubleCaught+=w;
      for(const x of doubles)if(!watch.has(x))doubleMiss[x]+=w;
    }
    if(d.win6_full_5)full5+=w;
    if(d.win6_at_least_4)atLeast4+=w;
    if(d.win6_at_least_3)atLeast3+=w;
  });

  const missN=normalizeMap(miss),falseN=normalizeMap(falsePos),hitN=normalizeMap(hit),doubleMissN=normalizeMap(doubleMiss);
  const confidence=Math.min(1,details.length/10);
  const digitBias=Object.fromEntries(DIGITS.map(d=>[
    d,
    clamp((0.75*missN[d]+0.15*hitN[d]-0.45*falseN[d])*confidence,-1,1)
  ]));

  return {
    version:'snapshot_error_memory_v2',
    samples:details.length,
    confidence,
    digitBias,
    missingScore:missN,
    falsePositiveScore:falseN,
    hitScore:hitN,
    doubleMissScore:doubleMissN,
    summary:{
      full5Rate:totalWeight?full5/totalWeight:0,
      atLeast4Rate:totalWeight?atLeast4/totalWeight:0,
      atLeast3Rate:totalWeight?atLeast3/totalWeight:0,
      doubleCatchRate:doubleEvents?doubleCaught/doubleEvents:0
    }
  };
}

function versionPriority(version){
  if(version===LIVE_VERSION)return 3;
  if(version===PREVIOUS_LIVE_VERSION)return 2;
  return 1;
}

export async function loadErrorMemory(marketId){
  if(!marketId)return buildErrorMemory([]);
  const versions=`(${COMPATIBLE_VERSIONS.join(',')})`;
  const snapshots=await db(`veltrix_prediction_snapshots?select=id,engine_version,settled_at&market_id=eq.${encodeURIComponent(marketId)}&mode=eq.A&engine_version=in.${versions}&settled_at=not.is.null&limit=80`);
  if(!snapshots?.length)return buildErrorMemory([]);
  const ids=snapshots.map(s=>s.id);
  const audits=await db(`veltrix_forward_audit?select=snapshot_id,actual_result_id,details,settled_at&snapshot_id=in.(${ids.join(',')})&limit=120`);
  const snapById=new Map(snapshots.map(s=>[s.id,s]));
  const chosen=new Map();
  for(const a of audits||[]){
    const s=snapById.get(a.snapshot_id);if(!s)continue;
    const key=a.actual_result_id||a.details?.target_result_id||a.snapshot_id;
    const current=chosen.get(key),priority=versionPriority(s.engine_version);
    if(!current||priority>current.priority)chosen.set(key,{priority,details:a.details||{},settled_at:a.settled_at});
  }
  const ordered=[...chosen.values()].sort((a,b)=>{
    const ad=String(a.details?.target_date||a.settled_at||''),bd=String(b.details?.target_date||b.settled_at||'');
    return bd.localeCompare(ad);
  }).map(x=>x.details);
  return buildErrorMemory(ordered);
}

export const ERROR_MEMORY_VERSIONS={
  live:LIVE_VERSION,
  previousLive:PREVIOUS_LIVE_VERSION,
  backfill:BACKFILL_VERSION,
  compatible:COMPATIBLE_VERSIONS
};
