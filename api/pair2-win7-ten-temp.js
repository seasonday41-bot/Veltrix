import {db,json,allow} from '../lib/db.js';
import {calculateVeltrix} from '../lib/veltrix-engine.js';
import {enhanceVeltrixWithRud} from '../lib/rud-ai.js';
import {buildPair2ForwardBattle,settlePair2ForwardBattle} from '../lib/pair2-forward-battle.js';

const KEYS=['market_007','market_035','market_062','market_030','market_002','market_019','market_046','market_048','market_051','market_034'];
const VARIANTS=['v21_a','v21_b','v21_c'];
function bucket(){return {cases:0,top:0,bottom:0,any:0,both:0};}
function add(x,h){x.cases++;if(h?.top)x.top++;if(h?.bottom)x.bottom++;if(h?.any)x.any++;if(h?.both)x.both++;}
function pct(a,b){return b?Math.round(a*10000/b)/100:0;}
function shape(x){return {...x,topPct:pct(x.top,x.cases),bottomPct:pct(x.bottom,x.cases),anyPct:pct(x.any,x.cases),bothPct:pct(x.both,x.cases)};}

export default async function handler(req,res){
  allow(res,'GET');
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  try{
    const all=await db(`veltrix_latest_20?select=market_id,market_key,market_name,draw_date,top3,bottom2,rn&market_key=in.(${KEYS.join(',')})&order=market_id.asc,rn.asc&limit=300`);
    const by=new Map();
    for(const r of all||[]){if(!by.has(r.market_id))by.set(r.market_id,[]);by.get(r.market_id).push(r);}
    const total=Object.fromEntries(VARIANTS.map(v=>[v,bucket()]));
    const markets=[];
    for(const rs0 of by.values()){
      const rs=[...rs0].sort((a,b)=>Number(a.rn)-Number(b.rn));
      const sums=Object.fromEntries(VARIANTS.map(v=>[v,bucket()]));
      const cases=[];
      for(let i=0;i<rs.length-5;i++){
        const target=rs[i],hist=rs.slice(i+1);
        if(hist.length<5)continue;
        const core=calculateVeltrix(hist,{targetDate:target.draw_date});
        const out=enhanceVeltrixWithRud(hist,core);
        const p=out?.A||Object.values(out||{})[0];
        if(!p)continue;
        const battle=buildPair2ForwardBattle(hist,p,'');
        if(!battle)continue;
        const settled=settlePair2ForwardBattle(battle.variants,target);
        const row={date:target.draw_date,actual:`${target.top3}-${target.bottom2}`,win6:battle.win6,reserve7:battle.reserve7,variants:{}};
        for(const v of VARIANTS){const h=settled.results?.[v];add(sums[v],h);add(total[v],h);row.variants[v]={pairs:battle.variants?.[v]?.pairs||[],hit:h};}
        cases.push(row);
      }
      markets.push({market_key:rs[0]?.market_key,market_name:rs[0]?.market_name,cases:cases.length,summary:Object.fromEntries(VARIANTS.map(v=>[v,shape(sums[v])])),detail:cases});
    }
    markets.sort((a,b)=>KEYS.indexOf(a.market_key)-KEYS.indexOf(b.market_key));
    return json(res,200,{ok:true,temporary:true,read_only:true,world_win:false,note:'Historical walk-forward: current daily World WIN is not reused in past dates. A=WIN6 only, B=4 WIN6+1 Reserve7, C=3 WIN6+2 Reserve7.',selected_keys:KEYS,markets_count:markets.length,total:Object.fromEntries(VARIANTS.map(v=>[v,shape(total[v])])),markets});
  }catch(e){return json(res,500,{error:e.message,detail:e.data||null});}
}
