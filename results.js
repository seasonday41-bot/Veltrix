const $=id=>document.getElementById(id);
let lastPreview=null;

function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function cleanDailyWin(value=''){
  const raw=String(value).replace(/\D/g,'').slice(0,10);
  return [...raw].filter((d,i,a)=>a.indexOf(d)===i).join('');
}

async function loadDailyWin(){
  if(!$('dailyWinInput'))return;
  try{
    const r=await fetch('/api/daily-win',{cache:'no-store'}),j=await r.json();
    if(!r.ok)throw new Error(j.error||'อ่านวินประจำวันไม่ได้');
    $('dailyWinInput').value=j.digits||'';
    $('dailyWinStatus').textContent=j.digits?`ใช้ทั้ง 60 ตลาด • วันที่ ${j.date} • วิน ${j.digits}`:`วันที่ ${j.date} • ยังไม่ได้กำหนดวินประจำวัน`;
    $('dailyWinStatus').className=`status ${j.digits?'good':'muted'}`;
  }catch(e){
    $('dailyWinStatus').textContent=e.message;
    $('dailyWinStatus').className='status bad';
  }
}

async function saveDailyWin(){
  const digits=cleanDailyWin($('dailyWinInput')?.value||'');
  $('dailyWinInput').value=digits;
  $('saveDailyWinBtn').disabled=true;
  $('dailyWinStatus').textContent='กำลังบันทึกวินประจำวัน Global...';
  try{
    const r=await fetch('/api/daily-win',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({digits})}),j=await r.json();
    if(!r.ok)throw new Error(j.error||'บันทึกวินประจำวันไม่ได้');
    $('dailyWinStatus').textContent=digits?`บันทึกแล้ว • ใช้ทั้ง 60 ตลาดตลอดวันที่ ${j.date} • วิน ${digits}`:`ล้างวินประจำวันแล้ว • วันที่ ${j.date} ไม่มีโบนัสวินประจำวัน`;
    $('dailyWinStatus').className=`status ${digits?'good':'muted'}`;
  }catch(e){
    $('dailyWinStatus').textContent=e.message;
    $('dailyWinStatus').className='status bad';
  }finally{$('saveDailyWinBtn').disabled=false;}
}

function renderPreview(j){
  lastPreview=j;
  $('previewCard').classList.remove('hidden');
  $('itemsCard').classList.remove('hidden');
  $('parsedCount').textContent=j.parsed_count||0;
  $('newCount').textContent=j.added_count||0;
  $('duplicateCount').textContent=j.duplicate_count||0;
  $('unknownCount').textContent=j.unknown_market_count||0;
  $('conflictStatus').textContent=(j.conflict_count||0)?`พบ Conflict ${j.conflict_count} รายการ — ระบบจะไม่เขียนทับ`:`วันที่ชุดข้อมูล: ${j.source_date||'-'} • ไม่มี Conflict`;
  $('conflictStatus').className=`status ${(j.conflict_count||0)?'warn':'good'}`;
  $('previewList').innerHTML=(j.items||[]).map(x=>{
    const cls=x.status==='NEW'?'good':x.status==='DUPLICATE'?'muted':x.status==='CONFLICT'?'warn':'bad';
    return `<div class="item"><div class="item-head"><span>${esc(x.market_name||x.raw_market)}</span><span class="${cls}">${esc(x.status)}</span></div><div class="item-sub">${esc(x.top3)}-${esc(x.bottom2)} • ${esc(x.draw_date||'')}</div></div>`;
  }).join('')||'<div class="muted">ไม่พบรายการที่อ่านได้</div>';
  $('saveResultsBtn').disabled=!(j.added_count>0);
}

async function inspect(){
  const raw_text=$('rawText').value.trim(); if(!raw_text)return;
  $('checkBtn').disabled=true; $('checkBtn').textContent='กำลังตรวจ...';
  try{
    const r=await fetch('/api/import-results',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({raw_text,dry_run:true})});
    const j=await r.json(); if(!r.ok)throw new Error(j.error||'ตรวจข้อมูลไม่ได้'); renderPreview(j);
  }catch(e){ $('saveResultStatus').textContent=e.message; }
  finally{$('checkBtn').disabled=false;$('checkBtn').textContent='ตรวจข้อมูล';}
}

async function save(){
  const raw_text=$('rawText').value.trim(); if(!raw_text)return;
  $('saveResultsBtn').disabled=true; $('saveResultStatus').textContent='กำลัง AUTO LOCK → บันทึกผล → ตรวจ Forward...';
  try{
    const r=await fetch('/api/import-results',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({raw_text,dry_run:false})});
    const j=await r.json(); if(!r.ok)throw new Error(j.error||'บันทึกไม่ได้'); renderPreview(j);
    const settled=j.settled_count||0;
    const autoMarkets=j.auto_locked_market_count||0;
    const autoSnapshots=j.auto_locked_snapshot_count||0;
    $('saveResultStatus').textContent=`บันทึกใหม่ ${j.added_count||0} • AUTO LOCK ${autoMarkets} ตลาด / ${autoSnapshots} Snapshot • Forward ${settled}`;
  }catch(e){ $('saveResultStatus').textContent=e.message; }
  finally{$('saveResultsBtn').disabled=false;}
}

if($('dailyWinInput'))$('dailyWinInput').addEventListener('input',e=>{e.target.value=cleanDailyWin(e.target.value);});
if($('saveDailyWinBtn'))$('saveDailyWinBtn').onclick=saveDailyWin;
$('checkBtn').onclick=inspect;
$('saveResultsBtn').onclick=save;
loadDailyWin();
