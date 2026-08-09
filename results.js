const $=id=>document.getElementById(id);
let lastPreview=null;

function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
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
  $('saveResultsBtn').disabled=true; $('saveResultStatus').textContent='กำลังบันทึกและตรวจ Forward...';
  try{
    const r=await fetch('/api/import-results',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({raw_text,dry_run:false})});
    const j=await r.json(); if(!r.ok)throw new Error(j.error||'บันทึกไม่ได้'); renderPreview(j);
    const settled=j.settled_count||0;
    $('saveResultStatus').textContent=`บันทึกใหม่ ${j.added_count||0} • ซ้ำ ${j.duplicate_count||0} • Forward ตรวจแล้ว ${settled}`;
  }catch(e){ $('saveResultStatus').textContent=e.message; }
  finally{$('saveResultsBtn').disabled=false;}
}

$('checkBtn').onclick=inspect;
$('saveResultsBtn').onclick=save;
