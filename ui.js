const marketSearch=document.getElementById('marketSearch');
const marketSelect=document.getElementById('marketSelect');
const historyList=document.getElementById('historyList');
const modeA=document.getElementById('modeA');
const modeB=document.getElementById('modeB');
const marketCard=marketSearch?.closest('.market-card');
let allMarkets=[];
let currentMode='B';
let suggestionBox=null;

function normalize(s=''){
  return String(s).trim().toLocaleLowerCase('th-TH').replace(/\s+/g,' ');
}

function installVisualPolish(){
  const style=document.createElement('style');
  style.id='veltrix-ui-polish';
  style.textContent=`
    .card{
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.075),
        inset 0 -18px 36px rgba(62,33,145,.055),
        0 18px 42px rgba(0,0,0,.40),
        0 0 18px rgba(95,79,255,.13),
        0 0 34px rgba(202,55,255,.055)!important;
    }
    .market-card{
      z-index:4;
      overflow:visible!important;
      isolation:auto!important;
      box-shadow:
        inset 0 1px rgba(255,255,255,.08),
        0 18px 42px rgba(0,0,0,.42),
        0 0 22px rgba(92,93,255,.16),
        0 0 40px rgba(220,63,255,.07)!important;
    }
    .market-card.search-open{
      z-index:500!important;
    }
    .market-card.search-open .search-wrap{
      z-index:520!important;
    }
    .mode-card,.hero,.rud-card,.number-card,.history-card,.action-card{
      z-index:1;
    }
    .hero{
      box-shadow:
        inset 0 0 38px rgba(136,67,255,.16),
        inset 0 1px rgba(255,255,255,.09),
        0 16px 38px rgba(0,0,0,.40),
        0 0 16px rgba(227,70,255,.36),
        0 0 34px rgba(78,113,255,.18)!important;
    }
    .metric{
      box-shadow:
        inset 0 0 24px rgba(63,77,178,.12),
        0 14px 29px rgba(0,0,0,.30),
        0 0 15px rgba(44,133,255,.30)!important;
    }
    .metric:nth-child(2){
      box-shadow:
        inset 0 0 24px rgba(174,58,214,.13),
        0 14px 29px rgba(0,0,0,.30),
        0 0 15px rgba(214,64,255,.28)!important;
    }
    .number-card,.history-card{
      box-shadow:
        inset 0 1px rgba(255,255,255,.055),
        inset 0 0 25px rgba(82,60,176,.09),
        0 15px 32px rgba(0,0,0,.32),
        0 0 14px rgba(76,119,255,.16)!important;
    }
    .number-card.three{
      box-shadow:
        inset 0 1px rgba(255,255,255,.055),
        inset 0 0 25px rgba(145,53,192,.10),
        0 15px 32px rgba(0,0,0,.32),
        0 0 14px rgba(192,70,255,.18)!important;
    }
    .section-icon,.number-icon,.metric-icon{
      filter:drop-shadow(0 0 8px rgba(132,83,255,.35));
    }
    .search-wrap{
      position:relative;
      z-index:90;
    }
    .market-suggestions{
      position:absolute;
      left:0;
      right:0;
      top:calc(100% + 8px);
      z-index:9999!important;
      max-height:min(286px,42vh);
      overflow-y:auto;
      overscroll-behavior:contain;
      -webkit-overflow-scrolling:touch;
      padding:7px;
      border:1px solid rgba(116,169,255,.78);
      border-radius:17px;
      background:linear-gradient(180deg,rgba(10,12,42,.995),rgba(5,7,28,.995));
      box-shadow:
        inset 0 1px rgba(255,255,255,.08),
        0 22px 46px rgba(0,0,0,.65),
        0 0 20px rgba(75,139,255,.36),
        0 0 38px rgba(207,69,255,.22);
      backdrop-filter:blur(24px);
      -webkit-backdrop-filter:blur(24px);
      transform-origin:top center;
      animation:veltrixDrop .14s ease-out;
    }
    .market-suggestions.hidden{display:none!important}
    @keyframes veltrixDrop{from{opacity:0;transform:translateY(-5px) scale(.985)}to{opacity:1;transform:none}}
    .market-suggestion{
      width:100%;
      min-height:46px;
      display:flex;
      align-items:center;
      gap:10px;
      padding:10px 13px;
      border:0;
      border-bottom:1px solid rgba(118,130,211,.13);
      border-radius:12px;
      background:transparent;
      color:#f5f4ff;
      text-align:left;
      font-size:16px;
      font-weight:600;
    }
    .market-suggestion:last-child{border-bottom:0}
    .market-suggestion:active,.market-suggestion.selected{
      background:linear-gradient(90deg,rgba(42,111,226,.38),rgba(150,49,218,.34));
      box-shadow:inset 0 0 0 1px rgba(113,177,255,.24),0 0 17px rgba(122,79,255,.18);
    }
    .market-suggestion:before{
      content:'✦';
      color:#8bcaff;
      font-size:11px;
      text-shadow:0 0 8px #7b8fff;
    }
    .market-no-result{
      padding:14px 13px;
      color:#aeb2cf;
      font-size:14px;
      text-align:center;
    }
    .search:focus{
      border-color:#78c9ff!important;
      box-shadow:
        inset 0 0 18px rgba(78,66,180,.14),
        0 0 0 1px rgba(79,179,255,.20),
        0 0 18px rgba(74,153,255,.32),
        0 0 30px rgba(199,68,255,.12)!important;
    }
    body.market-search-open .footer-nav{
      opacity:.16;
      pointer-events:none;
      transform:translateY(12px);
      transition:opacity .14s ease,transform .14s ease;
    }
    .footer-nav{
      transition:opacity .14s ease,transform .14s ease;
    }
    @media(max-width:390px){
      .market-suggestions{max-height:min(245px,39vh)}
      .market-suggestion{min-height:44px;font-size:15px}
    }
  `;
  document.head.appendChild(style);
}

function ensureSuggestionBox(){
  if(suggestionBox||!marketSearch)return suggestionBox;
  suggestionBox=document.createElement('div');
  suggestionBox.id='marketSuggestions';
  suggestionBox.className='market-suggestions hidden';
  suggestionBox.setAttribute('role','listbox');
  marketSearch.closest('.search-wrap')?.appendChild(suggestionBox);
  return suggestionBox;
}

function setSearchLayer(open){
  marketCard?.classList.toggle('search-open',open);
  document.body.classList.toggle('market-search-open',open);
}

function matchedMarkets(){
  const q=normalize(marketSearch?.value||'');
  return q?allMarkets.filter(m=>normalize(m.label).includes(q)):allMarkets;
}

function renderSuggestions(forceOpen=false){
  if(!marketSearch||!allMarkets.length)return;
  const box=ensureSuggestionBox();
  const q=normalize(marketSearch.value);
  if(!forceOpen&&!q){
    closeSuggestions();
    return;
  }

  const matched=matchedMarkets();
  box.replaceChildren();

  if(!matched.length){
    const empty=document.createElement('div');
    empty.className='market-no-result';
    empty.textContent=`ไม่พบตลาด “${marketSearch.value.trim()}”`;
    box.appendChild(empty);
  }else{
    for(const m of matched){
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='market-suggestion';
      btn.setAttribute('role','option');
      btn.dataset.value=m.value;
      btn.textContent=m.label;
      if(m.value===marketSelect.value)btn.classList.add('selected');
      btn.addEventListener('pointerdown',e=>e.preventDefault());
      btn.addEventListener('click',()=>selectMarket(m));
      box.appendChild(btn);
    }
  }

  box.classList.remove('hidden');
  setSearchLayer(true);
}

function closeSuggestions(){
  suggestionBox?.classList.add('hidden');
  setSearchLayer(false);
}

function selectMarket(m){
  if(!m)return;
  marketSelect.value=m.value;
  marketSearch.value=m.label;
  closeSuggestions();
  marketSelect.dispatchEvent(new Event('change',{bubbles:true}));
  marketSearch.blur();
}

function captureMarkets(){
  allMarkets=[...marketSelect.options]
    .filter(o=>o.value)
    .map(o=>({value:o.value,label:o.textContent}));
  if(allMarkets.length){
    marketSearch.disabled=false;
    marketSearch.placeholder=`ค้นหาตลาด... (${allMarkets.length})`;
    ensureSuggestionBox();
  }
}

marketSearch?.addEventListener('focus',()=>renderSuggestions(true));
marketSearch?.addEventListener('input',()=>renderSuggestions(true));
marketSearch?.addEventListener('search',()=>renderSuggestions(true));
marketSearch?.addEventListener('blur',()=>{
  setTimeout(()=>{
    if(document.activeElement!==marketSearch)closeSuggestions();
  },120);
});
marketSearch?.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    closeSuggestions();
    marketSearch.blur();
    return;
  }
  if(e.key!=='Enter')return;
  const choices=matchedMarkets();
  if(choices.length){
    e.preventDefault();
    selectMarket(choices[0]);
  }
});

marketSelect?.addEventListener('change',()=>{
  const selected=allMarkets.find(m=>m.value===marketSelect.value);
  if(selected)marketSearch.value=selected.label;
  closeSuggestions();
});

document.addEventListener('pointerdown',e=>{
  if(!e.target.closest('.search-wrap'))closeSuggestions();
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

installVisualPolish();
