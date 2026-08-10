const DIGITS=[...'0123456789'];
const WORLD_WIN_BONUS=.10;

export function normalizeWorldWin(value=''){
  const raw=String(value??'').replace(/\D/g,'').slice(0,10);
  return [...raw].filter((d,i,a)=>a.indexOf(d)===i).join('');
}

export function applyWorldWinFusion(outputs,worldWinInput=''){
  if(!outputs)return outputs;
  const worldWin=normalizeWorldWin(worldWinInput);
  const worldSet=new Set(worldWin);
  const next={};

  for(const [key,p] of Object.entries(outputs)){
    const originalOrder=[...new Set(`${p.win6||''}${p.reserve7||''}${DIGITS.join('')}`)].filter(d=>DIGITS.includes(d));
    const baseScores=p.rankScores||{};
    const fusedScores=Object.fromEntries(DIGITS.map(d=>[
      d,
      Number(baseScores[d]||0)+(worldSet.has(d)?WORLD_WIN_BONUS:0)
    ]));
    const ranked=[...DIGITS].sort((a,b)=>
      fusedScores[b]-fusedScores[a]||
      originalOrder.indexOf(a)-originalOrder.indexOf(b)||
      Number(a)-Number(b)
    );
    const win6=ranked.slice(0,6);
    const reserve=ranked.find(d=>!win6.includes(d))||'0';

    next[key]={
      ...p,
      win6:win6.join(''),
      reserve7:reserve,
      poolB:win6.join(''),
      rankScores:fusedScores,
      worldWin,
      fusionBonus:{
        ...(p.fusionBonus||{}),
        worldWin:{digits:worldWin,weight:WORLD_WIN_BONUS,forced:false}
      },
      hybridVersion:`${p.hybridVersion||'VELTRIX'}+WORLD_WIN_FUSION_V1`
    };
  }
  return next;
}

export const WORLD_WIN_CONFIG={bonus:WORLD_WIN_BONUS,forced:false,persistent:true};
