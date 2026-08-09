const historyListFix=document.getElementById('historyList');

function installHistoryFixStyle(){
  if(document.getElementById('veltrix-history-fix-style'))return;
  const style=document.createElement('style');
  style.id='veltrix-history-fix-style';
  style.textContent=`
    .history-columns{
      display:grid;
      grid-template-columns:1.18fr .58fr .48fr .64fr;
      gap:7px;
      align-items:center;
      padding:0 12px 6px;
      color:#777d9f;
      font-size:10px;
      letter-spacing:.25px;
      text-align:center;
    }
    .history-columns span:first-child{text-align:left}
    .history-columns span:last-child{text-align:right}
    .history-row.veltrix-split{
      grid-template-columns:1.18fr .58fr .48fr .64fr!important;
      gap:7px!important;
      min-height:42px!important;
    }
    .history-top3,.history-bottom2{
      text-align:center;
      color:#f7f5ff;
      font-size:16px;
      font-weight:800;
      font-variant-numeric:tabular-nums;
      letter-spacing:.7px;
      white-space:nowrap;
    }
    .history-bottom2{color:#d9e9ff}
    @media(max-width:390px){
      .history-columns,.history-row.veltrix-split{
        grid-template-columns:1.08fr .56fr .46fr .62fr!important;
        gap:5px!important;
      }
      .history-columns{font-size:9px;padding-left:10px;padding-right:10px}
      .history-top3,.history-bottom2{font-size:14px}
    }
  `;
  document.head.appendChild(style);
}

function ensureHistoryHeader(){
  if(!historyListFix||document.getElementById('historyColumns'))return;
  const header=document.createElement('div');
  header.id='historyColumns';
  header.className='history-columns';
  header.innerHTML='<span>วันที่</span><span>3 บน</span><span>2 ล่าง</span><span>โหมด</span>';
  historyListFix.parentElement?.insertBefore(header,historyListFix);
}

function splitHistoryRows(){
  if(!historyListFix)return;
  ensureHistoryHeader();
  for(const row of historyListFix.querySelectorAll('.history-row')){
    if(row.classList.contains('veltrix-split'))continue;
    const date=row.querySelector('.history-date')?.textContent?.trim()||'';
    const resultEl=row.querySelector('.history-result');
    const mode=row.querySelector('.history-mode')?.textContent?.trim()||'MODE B';
    if(!resultEl)continue;
    let digits=(resultEl.textContent||'').replace(/\D/g,'');
    if(!digits)continue;
    digits=digits.padStart(5,'0').slice(-5);
    const top3=digits.slice(0,3);
    const bottom2=digits.slice(3,5);
    row.innerHTML=`<span class="history-date">${date}</span><strong class="history-top3">${top3}</strong><strong class="history-bottom2">${bottom2}</strong><span class="history-mode">${mode}</span>`;
    row.classList.add('veltrix-split');
  }
}

installHistoryFixStyle();
ensureHistoryHeader();
splitHistoryRows();
if(historyListFix){
  new MutationObserver(()=>splitHistoryRows()).observe(historyListFix,{childList:true,subtree:true});
}
