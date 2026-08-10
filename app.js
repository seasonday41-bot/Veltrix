const $=id=>document.getElementById(id);
let activeMode='B',currentMarket=null,history=[],outputs=null,allMarkets=[];
const enginePromise=import('/lib/veltrix-engine.js?v=20260810-global-daywin-v11');

function thaiTodayISO(){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const get=t=>parts.find(x=>x.type===t)?.value||'';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function ensureWinAssist(){
  let box=$('winAssist');
  if(box)return box;
  const row=document.querySelector('.hero .win-row');
  if(!row)return null;
  box=document.createElement('div');
  box.id='winAssist';
  box.style.cssText='position:relative;margin:10px auto 2px;padding:8px 11px;width:min(100%,390px);display:grid;grid-template-columns:1fr 1fr;gap:8px;border:1px solid rgba(117,135,235,.38);border-radius:13px;background:rgba(4,8,29,.55);box-shadow:inset 0 0 16px rgba(70,75,180,.08);';
  box.innerHTML='<div style="min-width:0;text-align:left"><div style="font-size:11px;color:#969bb9;margin-bottom:2px">วินประจำวัน</div><div id="dayWinAssist" style="font-size:17px;font-weight:800;letter-spacing:1.2px;color:#e9f4ff;white-space:nowrap">-------</div></div><div style="min-width:0;text-align:left;border-left:1px solid rgba(117,135,235,.22);padding-left:10px"><div style="font-size:11px;color:#969bb9;margin-bottom:2px">วินประจำปี</div><div id="yearWinAssist" style="font-size:17px;font-weight:800;letter-spacing:1.2px;color:#f4e9ff;white-space:nowrap">----</div></div>';
  row.insertAdjacentElement('afterend',box);
  return box;
}

function render(){
  if(!outputs)return;
  const o=outputs[activeMode];
  $('modeA')?.classList.toggle('active',activeMode==='A');
  $('modeB')?.classList.toggle('active',activeMode==='B');
  if($('modeNote'))$('modeNote').textContent=activeMode==='A'?'งวด 1–3 → รูด 2 → WIN7 → เจาะ 2 รวม 10 ชุด':'งวด 3–5 → รูด 2 → WIN7 → เจาะ 2 รวม 10 ชุด';
  if($('win6'))$('win6').textContent=o.win6;
  if($('reserve7'))$('reserve7').textContent=o.reserve7;
  ensureWinAssist();
  if($('dayWinAssist'))$('dayWinAssist').textContent=o.dayWin||'ไม่ได้กำหนด';
  if($('yearWinAssist'))$('yearWinAssist').textContent=o.yearWin||'----';
  if($('rudTop'))$('rudTop').textContent=o.rudTop;
  if($('rudBottom'))$('rudBottom').textContent=o.rudBottom;

  const shared=o.pair2Shared||o.pair2Top||[];
  if($('pair2a'))$('pair2a').textContent=shared.slice(0,5).join(' • ');
  if($('pair2b'))$('pair2b').textContent=shared.slice(5,10).join(' • ');
  if($('pair3'))$('pair3').textContent=o.pair3Top.join(' • ');
  if($('engineStatus'))$('engineStatus').textContent=`MODE ${activeMode} • Pool ${o.poolSize} ตัว • คำนวณจาก ${history.length} งวดล่าสุด`;

  const metricLabels=document.querySelectorAll('.metric span');
  if(metricLabels.length>=2){metricLabels[0].textContent='รูด';metricLabels[1].textContent='รูด';}
  if($('sharedRud')){
    $('sharedRud').classList.remove('hidden');
    $('sharedRud').textContent=`รูด ${o.rudTop} • ${o.rudBottom}`;
  }
  if($('copyBtn'))$('copyBtn').disabled=false;
  if($('saveBtn'))$('saveBtn').disabled=false;
}

function renderHistory(){
  if(!$('historyList'))return;
  $('historyList').innerHTML=history.slice(0,5).map((r,i)=>`<div class="item"><div class="item-head"><span>งวด ${i+1}</span><span>${r.top3}-${r.bottom2}</span></div><div class="item-sub">${r.draw_date||''}</div></div>`).join('');
}

function renderMarketOptions(markets){
  if(!$('marketSelect'))return;
  const current=$('marketSelect').value;
  const opts=markets.map(m=>`<option value="${m.market_key}">${m.market_name}</option>`).join('');
  $('marketSelect').innerHTML=`<option value="">เลือกตลาด</option>${opts}`;
  if(markets.some(m=>m.market_key===current))$('marketSelect').value=current;
}

async function loadMarkets(){
  try{
    const r=await fetch('/api/markets'),j=await r.json();
    if(!r.ok)throw new Error(j.error||'โหลดตลาดไม่ได้');
    allMarkets=j.markets||[];
    renderMarketOptions(allMarkets);
    if(!allMarkets.length&&$('marketStatus'))$('marketStatus').textContent='ยังไม่มีรายชื่อตลาดใน veltrix_markets';
    const search=$('marketSearch')||$('searchInput')||document.querySelector('input.search');
    if(search&&!search.dataset.bound){
      search.dataset.bound='1';
      search.addEventListener('input',()=>{
        const q=search.value.trim().toLowerCase();
        renderMarketOptions(!q?allMarkets:allMarkets.filter(m=>m.market_name.toLowerCase().includes(q)||m.market_key.toLowerCase().includes(q)));
      });
    }
  }catch(e){
    if($('marketSelect'))$('marketSelect').innerHTML='<option value="">เชื่อมฐานข้อมูลไม่สำเร็จ</option>';
    if($('marketStatus'))$('marketStatus').textContent=e.message;
  }
}

async function loadHistory(marketKey){
  outputs=null;history=[];
  if($('saveStatus'))$('saveStatus').textContent='';
  if(!marketKey){if($('win6'))$('win6').textContent='------';if($('reserve7'))$('reserve7').textContent='-';if($('dayWinAssist'))$('dayWinAssist').textContent='ไม่ได้กำหนด';if($('yearWinAssist'))$('yearWinAssist').textContent='----';return;}
  if($('engineStatus'))$('engineStatus').textContent='กำลังอ่านงวดล่าสุด...';
  try{
    const [historyRes,dailyRes]=await Promise.all([
      fetch(`/api/history?market_key=${encodeURIComponent(marketKey)}`),
      fetch('/api/daily-win',{cache:'no-store'})
    ]);
    const [j,daily]=await Promise.all([historyRes.json(),dailyRes.json()]);
    if(!historyRes.ok)throw new Error(j.error||'อ่านย้อนหลังไม่ได้');
    if(!dailyRes.ok)throw new Error(daily.error||'อ่านวินประจำวันไม่ได้');
    currentMarket=j.market;history=j.history||[];renderHistory();
    if(history.length<5){
      if($('engineStatus'))$('engineStatus').textContent=`มีข้อมูล ${history.length} งวด • ต้องมีอย่างน้อย 5 งวด`;
      if($('copyBtn'))$('copyBtn').disabled=true;
      if($('saveBtn'))$('saveBtn').disabled=true;
      return;
    }
    const {calculateVeltrix}=await enginePromise;
    outputs=calculateVeltrix(history,{targetDate:thaiTodayISO(),dayWinOverride:daily.digits||''});
    render();
  }catch(e){if($('engineStatus'))$('engineStatus').textContent=e.message;}
}

function copyOutput(){
  const o=outputs?.[activeMode];if(!o)return;
  const rud=`รูด ${o.rudTop} • ${o.rudBottom}`;
  const pair2=(o.pair2Shared||o.pair2Top||[]).join(' • ');
  const text=`${currentMarket?.market_name||''}\nMODE ${activeMode}\n\nWIN\n${o.win6}(${o.reserve7})\n\n${rud}\n\nเจาะ 2\n${pair2}\n\nเจาะ 3\n${o.pair3Top.join(' • ')}`;
  navigator.clipboard.writeText(text).then(()=>{if($('saveStatus'))$('saveStatus').textContent='คัดลอกแล้ว';});
}

async function saveSnapshots(){
  if(!outputs||!currentMarket||!history[0])return;
  if($('saveBtn'))$('saveBtn').disabled=true;
  if($('saveStatus'))$('saveStatus').textContent='กำลังล็อก MODE A / B...';
  try{
    const payload={market_id:currentMarket.id,source_result_id:history[0].id,predictions:Object.values(outputs)};
    const r=await fetch('/api/snapshot',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}),j=await r.json();
    if(!r.ok)throw new Error(j.error||'บันทึกไม่ได้');
    if($('saveStatus'))$('saveStatus').textContent=j.already_locked?'Snapshot นี้ถูกล็อกไว้แล้ว':'ล็อก MODE A / B เรียบร้อย';
  }catch(e){if($('saveStatus'))$('saveStatus').textContent=e.message;}
  finally{if($('saveBtn'))$('saveBtn').disabled=false;}
}

if($('modeA'))$('modeA').onclick=()=>{activeMode='A';render();};
if($('modeB'))$('modeB').onclick=()=>{activeMode='B';render();};
if($('marketSelect'))$('marketSelect').onchange=e=>loadHistory(e.target.value);
if($('copyBtn'))$('copyBtn').onclick=copyOutput;
if($('saveBtn'))$('saveBtn').onclick=saveSnapshots;
loadMarkets();
