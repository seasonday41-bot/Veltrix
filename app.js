const $=id=>document.getElementById(id);
const DIGITS=[...'0123456789'];
let activeMode='B',currentMarket=null,history=[],outputs=null;
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
  const {primary,support}=modeRows(rows,mode),topDNA=counts(primary,r=>r.top3.slice(-2)),botDNA=counts(primary,r=>r.bottom2);
  const topRecent=Object.fromEntries(DIGITS.map(d=>[d,recentScore(d,primary,r=>r.top3.slice(-2))])),botRecent=Object.fromEntries(DIGITS.map(d=>[d,recentScore(d,primary,r=>r.bottom2)]));
  const supTop=counts(support,r=>r.top3.slice(-2)),supBot=counts(support,r=>r.bottom2);
  const top=[...DIGITS].sort((a,b)=>botDNA[b]-botDNA[a]||topRecent[b]-topRecent[a]||topDNA[b]-topDNA[a]||supTop[b]-supTop[a]||supBot[b]-supBot[a]||(+a)-(+b))[0];
  const bottom=[...DIGITS].sort((a,b)=>bottomGap(b,primary)-bottomGap(a,primary)||botDNA[b]-botDNA[a]||botRecent[b]-botRecent[a]||supBot[b]-supBot[a]||(+a)-(+b))[0];
  let supportDigit=null;if(top===bottom)supportDigit=[...DIGITS].filter(d=>d!==top).sort((a,b)=>botDNA[b]-botDNA[a]||botRecent[b]-botRecent[a]||supBot[b]-supBot[a]||(+a)-(+b))[0];
  return {top,bottom,support:supportDigit};
}

function rankMode(rows,mode,rud){
  const Arows=rows.slice(0,3),Brows=rows.slice(2,5),A=pool(Arows),B=pool(Brows),bFreq=normMap(counts(Brows));
  const persistence=Object.fromEntries(DIGITS.map(d=>[d,Brows.filter(r=>chars(r).includes(d)).length/3]));
  const recency=Object.fromEntries(DIGITS.map(d=>{const w=[3,2,1];let s=0;Brows.forEach((r,i)=>{if(chars(r).includes(d))s+=w[i];});return [d,s/6];})),score={};
  for(const d of DIGITS){const gap=gapAny(d,rows);if(mode==='A'){
    if(A.size===10)score[d]=(B.has(d)?sat(B.size):0)+.5*gap;else if(A.size===9)score[d]=(A.has(d)?sat(A.size):0)+.5*(B.has(d)?sat(B.size):0)+.5*gap;else score[d]=(A.has(d)?sat(A.size):0)+.5*gap;
  }else{
    if(B.size<=7)score[d]=(B.has(d)?sat(B.size):0)+.5*gap;else if(B.size===8){const rudHit=(d===rud.top||d===rud.bottom)?1:0;score[d]=.25*(B.has(d)?1:0)+.10*bFreq[d]+.20*persistence[d]+.05*recency[d]+.10*(A.has(d)?1:0)+.25*gap+.05*rudHit;}else if(B.size===9)score[d]=(B.has(d)?sat(B.size):0)+.5*(A.has(d)?sat(A.size):0)+.5*gap;else score[d]=(A.has(d)?sat(A.size):0)+.5*gap;
  }}
  const ranked=[...DIGITS].sort((a,b)=>score[b]-score[a]||(+a)-(+b));return {ranked,score,A:[...A].sort().join(''),B:[...B].sort().join(''),poolSize:mode==='A'?A.size:B.size};
}

function canonPair(p){return [...p].sort().join('');}
function pair2Engine(rows,rank,rud,mode){
  const {primary,support}=modeRows(rows,mode),source=[...primary,...support],top=[],seen=new Set();
  for(const r of source){const p=r.top3.slice(-2),c=canonPair(p);if(!seen.has(c)){seen.add(c);top.push(p);}if(top.length===4)break;}
  for(const d of rank.ranked){const p=`${rud.top}${d}`,c=canonPair(p);if(!seen.has(c)){seen.add(c);top.push(p);break;}}
  while(top.length<5){const a=rank.ranked[top.length%rank.ranked.length],b=rank.ranked[(top.length+1)%rank.ranked.length],p=`${a}${b}`,c=canonPair(p);if(!seen.has(c)){seen.add(c);top.push(p);}else top.push(`${a}${a}`);}
  const bottom=[],sb=new Set();for(const d of rank.ranked){const p=`${rud.bottom}${d}`,c=canonPair(p);if(!sb.has(c)){sb.add(c);bottom.push(p);}if(bottom.length===5)break;}return {top:top.slice(0,5),bottom:bottom.slice(0,5)};
}
function tripleKey(s){return [...s].sort().join('');}
function pairKeysOfTriple(t){return [canonPair(t[0]+t[1]),canonPair(t[0]+t[2]),canonPair(t[1]+t[2])];}
function tripleKind(t){const n=new Set([...t]).size;return n===3?'distinct':n===2?'double':'triple';}
function repeatedDigit(t){const c={};for(const d of t)c[d]=(c[d]||0)+1;return Object.keys(c).find(d=>c[d]>=2)||null;}
function pair3Engine(rows,rank,rud,pair2top,mode){
  const {primary,support}=modeRows(rows,mode),source=[...primary,...support],pairWeight=new Map(pair2top.map((p,i)=>[canonPair(p),(pair2top.length-i)/pair2top.length])),pairSupport=new Set(pairWeight.keys()),dna={};
  source.forEach((r,i)=>{const k=tripleKey(r.top3),w=i<3?[4,3,2][i]:.75;dna[k]=(dna[k]||0)+w;});
  const recentTopKeys=new Set(primary.map(r=>tripleKey(r.top3))),hasRecentDouble=source.some(r=>tripleKind(r.top3)==='double'),hasRecentTriple=source.some(r=>tripleKind(r.top3)==='triple'),maxDigit=Math.max(...Object.values(rank.score),1),byKey=new Map();
  for(const basePair of pair2top){const baseKey=canonPair(basePair);for(const d of rank.ranked){const t=`${basePair}${d}`,key=tripleKey(t),kind=tripleKind(t);if(kind==='triple'&&!hasRecentTriple)continue;const ds=[...t],supportedPairs=pairKeysOfTriple(t).filter(p=>pairSupport.has(p)),pairScore=Math.max(0,...supportedPairs.map(p=>pairWeight.get(p)||0)),fusionScore=supportedPairs.length/3,digitScore=ds.reduce((s,x)=>s+(rank.score[x]||0)/maxDigit,0)/3,dnaScore=Math.min((dna[key]||0)/4,1),recentMatch=recentTopKeys.has(key)?1:0,rudScore=ds.includes(rud.top)?1:0,repeatEvidence=kind==='double'&&hasRecentDouble?1:0,score=.30*pairScore+.20*fusionScore+.25*digitScore+.10*dnaScore+.05*recentMatch+.05*rudScore+.05*repeatEvidence,item={t,key,kind,score,baseKey,repeatDigit:repeatedDigit(t)},old=byKey.get(key);if(!old||score>old.score)byKey.set(key,item);}}
  const candidates=[...byKey.values()].sort((a,b)=>b.score-a.score||(+a.t)-(+b.t)),out=[],seen=new Set(),pairUse=new Map(),repeatDigits=new Set();let repeatCount=0,tripleCount=0;
  const accept=(c,strict=true)=>{if(seen.has(c.key))return false;if(strict&&(pairUse.get(c.baseKey)||0)>=2)return false;if(c.kind!=='distinct'){if(strict&&repeatCount>=2)return false;if(strict&&c.repeatDigit&&repeatDigits.has(c.repeatDigit))return false;if(c.kind==='triple'&&tripleCount>=1)return false;}seen.add(c.key);out.push(c.t);pairUse.set(c.baseKey,(pairUse.get(c.baseKey)||0)+1);if(c.kind!=='distinct'){repeatCount++;if(c.repeatDigit)repeatDigits.add(c.repeatDigit);if(c.kind==='triple')tripleCount++;}return true;};
  for(const c of candidates){if(accept(c,true)&&out.length===5)break;}if(out.length<5)for(const c of candidates){if(seen.has(c.key))continue;if(c.kind==='triple'&&tripleCount>=1)continue;if(c.kind!=='distinct'&&c.repeatDigit&&repeatDigits.has(c.repeatDigit))continue;if(accept(c,false)&&out.length===5)break;}if(out.length<5)for(const c of candidates){if(!seen.has(c.key)){seen.add(c.key);out.push(c.t);}if(out.length===5)break;}return out.slice(0,5);
}
function fuseModeBWin(rank,rud,p2,p3){const digitCounts=sets=>{const m=Object.fromEntries(DIGITS.map(d=>[d,0]));for(const s of sets||[])for(const d of String(s))m[d]++;return m;},top=normMap(digitCounts(p2.top)),bottom=normMap(digitCounts(p2.bottom)),triples=normMap(digitCounts(p3)),score={},bonus={};for(const d of DIGITS){const consensus=top[d]>0&&triples[d]>0?1:0,rudHit=(d===rud.top||d===rud.bottom)?1:0;bonus[d]=.10*top[d]+.04*bottom[d]+.14*triples[d]+.08*consensus+.04*rudHit;score[d]=(rank.score[d]||0)+bonus[d];}const ranked=[...DIGITS].sort((a,b)=>score[b]-score[a]||rank.ranked.indexOf(a)-rank.ranked.indexOf(b)||(+a)-(+b));return {ranked,score,bonus};}
function calculate(rows){const clean=(rows||[]).slice(0,10),result={};for(const mode of ['A','B']){const rud=rudEngine(clean,mode),rank=rankMode(clean,mode,rud),p2=pair2Engine(clean,rank,rud,mode),p3=pair3Engine(clean,rank,rud,p2.top,mode),winRank=mode==='B'?fuseModeBWin(rank,rud,p2,p3):{ranked:rank.ranked,score:rank.score,bonus:null};result[mode]={mode,win6:winRank.ranked.slice(0,6).join(''),reserve7:winRank.ranked[6],rudTop:rud.top,rudBottom:rud.bottom,rudSupport:rud.support,pair2Top:p2.top,pair2Bottom:p2.bottom,pair3Top:p3,poolA:rank.A,poolB:rank.B,poolSize:rank.poolSize,rankScores:winRank.score,baseRankScores:rank.score,fusionBonus:winRank.bonus};}return result;}

function render(){if(!outputs)return;const o=outputs[activeMode];$('modeA').classList.toggle('active',activeMode==='A');$('modeB').classList.toggle('active',activeMode==='B');$('modeNote').textContent=activeMode==='A'?'งวด 1–3 เป็นหลัก • งวด 3–5 เป็นตัวสนับสนุน':'งวด 3–5 เป็นหลัก • งวด 1–3 เป็นตัวสนับสนุน';$('win6').textContent=o.win6;$('reserve7').textContent=o.reserve7;$('rudTop').textContent=o.rudTop;$('rudBottom').textContent=o.rudBottom;$('pair2a').textContent=o.pair2Top.join(' • ');$('pair2b').textContent=o.pair2Bottom.join(' • ');$('pair3').textContent=o.pair3Top.join(' • ');$('engineStatus').textContent=`MODE ${activeMode} • Pool ${o.poolSize} ตัว • คำนวณจาก ${history.length} งวดล่าสุด`;if(o.rudTop===o.rudBottom){$('sharedRud').classList.remove('hidden');$('sharedRud').textContent=`รูดบน/ล่าง ${o.rudTop} • ตัวเสริม ${o.rudSupport??'-'}`;}else $('sharedRud').classList.add('hidden');$('copyBtn').disabled=false;$('saveBtn').disabled=false;}
function renderHistory(){$('historyList').innerHTML=history.slice(0,5).map((r,i)=>`<div class="item"><div class="item-head"><span>งวด ${i+1}</span><span>${r.top3}-${r.bottom2}</span></div><div class="item-sub">${r.draw_date||''}</div></div>`).join('');}
async function loadMarkets(){try{const r=await fetch('/api/markets'),j=await r.json();if(!r.ok)throw new Error(j.error||'โหลดตลาดไม่ได้');const opts=(j.markets||[]).map(m=>`<option value="${m.market_key}">${m.market_name}</option>`).join('');$('marketSelect').innerHTML=`<option value="">เลือกตลาด</option>${opts}`;if(!j.markets?.length)$('marketStatus').textContent='ยังไม่มีรายชื่อตลาดใน veltrix_markets';}catch(e){$('marketSelect').innerHTML='<option value="">เชื่อมฐานข้อมูลไม่สำเร็จ</option>';$('marketStatus').textContent=e.message;}}
async function loadHistory(marketKey){outputs=null;history=[];$('saveStatus').textContent='';if(!marketKey){$('win6').textContent='------';$('reserve7').textContent='-';return;}$('engineStatus').textContent='กำลังอ่านงวดล่าสุด...';try{const r=await fetch(`/api/history?market_key=${encodeURIComponent(marketKey)}`),j=await r.json();if(!r.ok)throw new Error(j.error||'อ่านย้อนหลังไม่ได้');currentMarket=j.market;history=j.history||[];renderHistory();if(history.length<5){$('engineStatus').textContent=`มีข้อมูล ${history.length} งวด • ต้องมีอย่างน้อย 5 งวด`;$('copyBtn').disabled=true;$('saveBtn').disabled=true;return;}outputs=calculate(history);render();}catch(e){$('engineStatus').textContent=e.message;}}
function copyOutput(){const o=outputs?.[activeMode];if(!o)return;const rud=o.rudTop===o.rudBottom?`รูดบน/ล่าง ${o.rudTop}\nตัวเสริม ${o.rudSupport}`:`รูดบน ${o.rudTop}\nรูดล่าง ${o.rudBottom}`,text=`${currentMarket?.market_name||''}\nMODE ${activeMode}\n\nWIN\n${o.win6}(${o.reserve7})\n\n${rud}\n\nเจาะ 2\n${o.pair2Top.join(' • ')}\n${o.pair2Bottom.join(' • ')}\n\nเจาะ 3\n${o.pair3Top.join(' • ')}`;navigator.clipboard.writeText(text).then(()=>$('saveStatus').textContent='คัดลอกแล้ว');}
async function saveSnapshots(){if(!outputs||!currentMarket||!history[0])return;$('saveBtn').disabled=true;$('saveStatus').textContent='กำลังล็อก MODE A / B...';try{const payload={market_id:currentMarket.id,source_result_id:history[0].id,predictions:Object.values(outputs)},r=await fetch('/api/snapshot',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}),j=await r.json();if(!r.ok)throw new Error(j.error||'บันทึกไม่ได้');$('saveStatus').textContent=j.already_locked?'Snapshot นี้ถูกล็อกไว้แล้ว':'ล็อก MODE A / B เรียบร้อย';}catch(e){$('saveStatus').textContent=e.message;}finally{$('saveBtn').disabled=false;}}
$('modeA').onclick=()=>{activeMode='A';render();};$('modeB').onclick=()=>{activeMode='B';render();};$('marketSelect').onchange=e=>loadHistory(e.target.value);$('copyBtn').onclick=copyOutput;$('saveBtn').onclick=saveSnapshots;loadMarkets();
