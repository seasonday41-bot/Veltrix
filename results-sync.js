const el=id=>document.getElementById(id);

function esc(value=''){
  return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderState(state){
  if(el('syncProcessedCount'))el('syncProcessedCount').textContent=String(state?.processed_count||0);
  if(el('syncPendingCount'))el('syncPendingCount').textContent=String(state?.pending_count||0);
  const host=el('syncSharedList');
  if(!host)return;
  const rows=(state?.pending_count?state?.pending:state?.recent)||[];
  if(!rows.length){host.classList.add('hidden');host.innerHTML='';return;}
  host.classList.remove('hidden');
  host.innerHTML=rows.slice(0,12).map(row=>{
    const waiting=Boolean(state?.pending_count&&state?.pending?.some(x=>x.id===row.id));
    return `<div class="item"><div class="item-head"><span>${esc(row.market_name||row.market_key||'ตลาด')}</span><span class="${waiting?'warn':'good'}">${waiting?'รอซิงก์':'พร้อม'}</span></div><div class="item-sub">${esc(row.draw_date||'')} • ${esc(row.top3||'---')}-${esc(row.bottom2||'--')}</div></div>`;
  }).join('');
}

async function request(method='GET',body){
  const r=await fetch('/api/sync-shared-results',{
    method,
    headers:method==='POST'?{'content-type':'application/json'}:undefined,
    body:method==='POST'?JSON.stringify(body||{}):undefined,
    cache:'no-store'
  });
  const j=await r.json().catch(()=>({}));
  if(r.status===401){location.replace('/admin.html');throw new Error('Admin session หมดอายุ');}
  if(!r.ok)throw new Error(j.error||'ซิงก์ผลจากฐานกลางไม่สำเร็จ');
  return j;
}

async function syncSharedResults(auto=false){
  const btn=el('syncSharedBtn'),status=el('syncSharedStatus');
  if(btn)btn.disabled=true;
  if(status){status.textContent=auto?'กำลังตรวจผลใหม่จาก Supabase กลางอัตโนมัติ...':'กำลังตรวจผลใหม่จาก Supabase กลาง...';status.className='status muted';}
  try{
    let state=await request('GET');
    renderState(state);
    if(!state.pending_count){
      if(status){status.textContent=`พร้อม • ตรวจพบผลจาก Finder ${state.scanned||0} รายการ • ไม่มีผลค้างประมวลผล`;status.className='status good';}
      return;
    }

    const startPending=Number(state.pending_count||0);
    let rounds=0,totalProcessed=0;
    while(state.pending_count>0&&rounds<12){
      const before=Number(state.pending_count||0);
      if(status)status.textContent=`กำลังประมวลผลจากฐานกลาง • คงเหลือ ${before} รายการ...`;
      const next=await request('POST',{limit:3});
      totalProcessed+=Number(next.processed_now||0);
      state=next;
      renderState(state);
      rounds++;
      if(Number(state.pending_count||0)>=before)break;
    }

    if(state.pending_count===0){
      if(status){status.textContent=`ซิงก์เรียบร้อย • อัปเดต ${startPending} รายการ • Forward / Error Memory พร้อม`;status.className='status good';}
    }else{
      if(status){status.textContent=`ซิงก์ได้ ${Math.max(0,startPending-state.pending_count)} รายการ • ยังเหลือ ${state.pending_count} รายการ กดซิงก์อีกครั้งได้`;status.className='status warn';}
    }
  }catch(error){
    if(status){status.textContent=error.message;status.className='status bad';}
  }finally{
    if(btn)btn.disabled=false;
  }
}

function boot(){
  const btn=el('syncSharedBtn');
  if(btn)btn.onclick=()=>syncSharedResults(false);
  // The Results page is admin-only. Opening it is enough to reconcile any Finder
  // inserts that have not yet been settled by VELTRIX.
  setTimeout(()=>syncSharedResults(true),120);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
