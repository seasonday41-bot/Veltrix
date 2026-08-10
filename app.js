const $=id=>document.getElementById(id);
let activeMode='A',currentMarket=null,history=[],outputs=null,allMarkets=[];
const enginePromise=import('/lib/veltrix-engine.js?v=20260810-adaptive-v14');

function thaiTodayISO(){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const get=t=>parts.find(x=>x.type===t)?.value||'';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function hideLegacyMode(){
  const card=document.querySelector('.mode-card');
  if(card)card.style.display='none';
  if($('modeNote'))$('modeNote').style.display='none';
}

function ensureAdaptiveAssist(){
  let box=$('adaptiveAssist');
  if(box)return box;
  const row=document.querySelector('.hero .win-row');
  if(!row)return null;
  box=document.createElement('div');
  box.id='adaptiveAssist';
  box.style.cssText='position:relative;margin:10px auto 2px;padding:9px 10px;width:min(100%,430px);display:grid;grid-template-columns:1fr 1fr 1.25fr;gap:7px;border:1px solid rgba(117,135,235,.38);border-radius:13px;background:rgba(4,8,29,.58);box-shadow:inset 0 0 16px rgba(70,75,180,.08);';
  box.innerHTML='<div style="min-width:0;text-align:left"><div style="font-size:10px;color:#969bb9;margin-bottom:3px">DRIFT</div><div id="driftAssist" style="font-size:14px;font-weight:800;color:#e9f4ff;white-space:nowrap">-</div></div><div style="min-width:0;text-align:left;border-left:1px solid rgba(117,135,235,.22);padding-left:8px"><div style="font-size:10px;color:#969bb9;margin-bottom:3px">BASE / 5 งวด</div><div id="mixAssist" style="font-size:14px;font-weight:800;color:#f4e9ff;white-space:nowrap">-</div></div><div style="min-width:0;text-align:left;border-left:1px solid rgba(117,135,235,.22);padding-left:8px"><div style="font-size:10px;color:#969bb9;margin-bottom:3px">เบิ้ลเฝ้า</div><div id="doubleAssist" style="font-size:14px;font-weight:800;color:#ffd9ff;white-space:nowrap">-</div></div>';
  row.insertAdjacentElement('afterend',box);
  return box;
}

function polishRudCards(){
  const cards=[...document.querySelectorAll('.rud-card .metric')];
  if(cards.length<2)return;

  const setup=(card,label,icon)=>{
    const iconEl=card.querySelector('.metric-icon');
    const labelEl=card.querySelector('span:not(.metric-icon)');
    if(iconEl){
      iconEl.textContent=icon;
      iconEl.style.fontSize='24px';
      iconEl.style.fontWeight='800';
      iconEl.style.lineHeight='1';
    }
    if(labelEl){
      labelEl.textContent=label;
      labelEl.style.whiteSpace='nowrap';
    }
  };

  setup(cards[0],'รูดหลัก','↑');
  setup(cards[1],'รูดรอง','↓');

  if($('sharedRud')){
    $('sharedRud').textContent='';
    $('sharedRud').classList.add('hidden');
    $('sharedRud').style.display='none';
  }
}

function render(){
  if(!outputs)return;
  const o=outputs[activeMode]||outputs.A||Object.values(outputs)[0];
  hideLegacyMode();
  if($('win6'))$('win6').textContent=o.win6;
  if($('reserve7'))$('reserve7').textContent=o.reserve7;
  ensureAdaptiveAssist();
  if($('driftAssist'))$('driftAssist').textContent=`${o.driftScore ?? 0}% ${o.driftLevel||''}`;
  if($('mixAssist'))$('mixAssist').textContent=`${o.baseWeight ?? 100}/${o.recentWeight ?? 0}`;
  if($('doubleAssist'))$('doubleAssist').textContent=`${o.doubleChance ?? 0}% • ${(o.doubleWatch||[]).join(' • ')}`;
  if($('rudTop'))$('rudTop').textContent=o.rudTop;
  if($('rudBottom'))$('rudBottom').textContent=o.rudBottom;
  polishRudCards();

  const shared=o.pair2Shared||o.pair2Top||[];
  if($('pair2a'))$('pair2a').textContent=shared.slice(0,5).join(' • ');
  if($('pair2b')){$('pair2b').textContent='';$('pair2b').style.display='none';}
  if($('pair3'))$('pair3').textContent=(o.pair3Top||[]).slice(0,3).join(' • ');
  if($('engineStatus'))$('engineStatus').textContent=`Adaptive 5 Draw • เลือกน้ำหนักจาก ${o.adaptiveWindow||3} การทำนายล่าสุด • Drift ${o.driftScore}% • Memory ${o.errorMemorySamples||0} • ย้อนหลัง ${history.length} งวด`;

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
  if(!marketKey){
    if($('win6'))$('win6').textContent='------';
    if($('reserve7'))$('reserve7').textContent='-';
    if($('driftAssist'))$('driftAssist').textContent='-';
    if($('mixAssist'))$('mixAssist').textContent='-';
    if($('doubleAssist'))$('doubleAssist').textContent='-';
    polishRudCards();
    return;
  }
  if($('engineStatus'))$('engineStatus').textContent='กำลังอ่านย้อนหลัง...';
  try{
    const r=await fetch(`/api/history?market_key=${encodeURIComponent(marketKey)}`,{cache:'no-store'}),j=await r.json();
    if(!r.ok)throw new Error(j.error||'อ่านย้อนหลังไม่ได้');
    currentMarket=j.market;history=j.history||[];renderHistory();
    if(history.length<5){
      if($('engineStatus'))$('engineStatus').textContent=`มีข้อมูล ${history.length} งวด • ต้องมีอย่างน้อย 5 งวด`;
      if($('copyBtn'))$('copyBtn').disabled=true;
      if($('saveBtn'))$('saveBtn').disabled=true;
      return;
    }
    const {calculateVeltrix}=await enginePromise;
    outputs=calculateVeltrix(history,{targetDate:thaiTodayISO(),errorMemory:j.errorMemory||null});
    render();
  }catch(e){if($('engineStatus'))$('engineStatus').textContent=e.message;}
}

function copyOutput(){
  const o=outputs?.[activeMode]||outputs?.A;if(!o)return;
  const pair2=(o.pair2Shared||o.pair2Top||[]).slice(0,5).join(' • ');
  const pair3=(o.pair3Top||[]).slice(0,3).join(' • ');
  const doubleWatch=(o.doubleWatch||[]).join(' • ');
  const text=`${currentMarket?.market_name||''}\n\nWIN6 ${o.win6}\nรูดหลัก ${o.rudTop} • รูดรอง ${o.rudBottom}\n\nเจาะ 2\n${pair2}\n\nเจาะ 3\n${pair3}\n\nเบิ้ล ${o.doubleChance ?? 0}%\nเฝ้าเบิ้ล ${doubleWatch}\n\nDrift ${o.driftScore ?? 0}% • ${o.baseWeight ?? 100}/${o.recentWeight ?? 0}`;
  navigator.clipboard.writeText(text).then(()=>{if($('saveStatus'))$('saveStatus').textContent='คัดลอกแล้ว';});
}

async function saveSnapshots(){
  if(!outputs||!currentMarket||!history[0])return;
  if($('saveBtn'))$('saveBtn').disabled=true;
  if($('saveStatus'))$('saveStatus').textContent='กำลังล็อก Snapshot...';
  try{
    const payload={market_id:currentMarket.id,source_result_id:history[0].id,predictions:Object.values(outputs)};
    const r=await fetch('/api/snapshot',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}),j=await r.json();
    if(!r.ok)throw new Error(j.error||'บันทึกไม่ได้');
    if($('saveStatus'))$('saveStatus').textContent=j.already_locked?'Snapshot นี้ถูกล็อกไว้แล้ว':'ล็อก Adaptive Snapshot เรียบร้อย';
  }catch(e){if($('saveStatus'))$('saveStatus').textContent=e.message;}
  finally{if($('saveBtn'))$('saveBtn').disabled=false;}
}

if($('modeA'))$('modeA').onclick=()=>{activeMode='A';render();};
if($('modeB'))$('modeB').onclick=()=>{activeMode='A';render();};
if($('marketSelect'))$('marketSelect').onchange=e=>loadHistory(e.target.value);
if($('copyBtn'))$('copyBtn').onclick=copyOutput;
if($('saveBtn'))$('saveBtn').onclick=saveSnapshots;
hideLegacyMode();
polishRudCards();
loadMarkets();
