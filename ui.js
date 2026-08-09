const marketSearch=document.getElementById('marketSearch');
const marketSelect=document.getElementById('marketSelect');
const historyList=document.getElementById('historyList');
const modeA=document.getElementById('modeA');
const modeB=document.getElementById('modeB');
let allMarkets=[];
let currentMode='B';

function normalize(s=''){
  return String(s).trim().toLocaleLowerCase('th-TH').replace(/\s+/g,' ');
}

function captureMarkets(){
  allMarkets=[...marketSelect.options]
    .filter(o=>o.value)
    .map(o=>({value:o.value,label:o.textContent}));
  if(allMarkets.length){
    marketSearch.disabled=false;
    marketSearch.placeholder=`ค้นหาตลาด... (${allMarkets.length})`;
  }
}

function filterMarkets(){
  if(!allMarkets.length)return;
  const q=normalize(marketSearch.value);
  const selected=marketSelect.value;
  const matched=q?allMarkets.filter(m=>normalize(m.label).includes(q)):allMarkets;
  const frag=document.createDocumentFragment();
  const first=document.createElement('option');
  first.value='';
  first.textContent=matched.length?'เลือกตลาด':`ไม่พบตลาด “${marketSearch.value.trim()}”`;
  first.disabled=!matched.length;
  frag.appendChild(first);
  for(const m of matched){
    const o=document.createElement('option');
    o.value=m.value;
    o.textContent=m.label;
    if(m.value===selected)o.selected=true;
    frag.appendChild(o);
  }
  marketSelect.replaceChildren(frag);
}

marketSearch?.addEventListener('input',filterMarkets);
marketSearch?.addEventListener('search',filterMarkets);
marketSearch?.addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;
  const choices=[...marketSelect.options].filter(o=>o.value);
  if(choices.length===1){
    marketSelect.value=choices[0].value;
    marketSelect.dispatchEvent(new Event('change',{bubbles:true}));
    marketSearch.blur();
  }
});

const marketWait=setInterval(()=>{
  if(marketSelect?.options?.length>1){
    captureMarkets();
    clearInterval(marketWait);
  }
},100);
setTimeout(()=>clearInterval(marketWait),15000);

function formatDateISO(iso=''){
  const m=String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return iso;
  const months=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return `${Number(m[3])} ${months[Number(m[2])-1]} ${Number(m[1])+543}`;
}

function decorateHistory(){
  if(!historyList)return;
  for(const item of [...historyList.querySelectorAll('.item')]){
    if(item.dataset.veltrixUi==='1')continue;
    const spans=item.querySelectorAll('.item-head span');
    const sub=item.querySelector('.item-sub');
    if(spans.length<2||!sub)continue;
    const result=spans[1].textContent.trim().replace('-','');
    const date=formatDateISO(sub.textContent.trim());
    item.innerHTML=`<div class="history-row"><span class="history-date">${date}</span><strong class="history-result">${result}</strong><span class="history-mode">MODE ${currentMode}</span></div>`;
    item.dataset.veltrixUi='1';
  }
}

function updateHistoryMode(){
  document.querySelectorAll('.history-mode').forEach(el=>el.textContent=`MODE ${currentMode}`);
}

modeA?.addEventListener('click',()=>{currentMode='A';updateHistoryMode();});
modeB?.addEventListener('click',()=>{currentMode='B';updateHistoryMode();});

if(historyList){
  new MutationObserver(()=>decorateHistory()).observe(historyList,{childList:true,subtree:true});
  decorateHistory();
}

// Prevent iOS double-tap zoom on controls in addition to the locked viewport.
document.addEventListener('dblclick',e=>{
  if(e.target.closest('button,input,select,a'))e.preventDefault();
},{passive:false});
