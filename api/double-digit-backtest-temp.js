import {db,json,allow} from '../lib/db.js';
import {calculateVeltrix} from '../lib/veltrix-engine.js';
import {enhanceVeltrixWithRud} from '../lib/rud-ai.js';
import {calculateDoubleDigit} from '../lib/double-digit-ai.js';

const clean=v=>String(v??'').replace(/\D/g,'');
const top3=v=>clean(v).padStart(3,'0').slice(-3);
const bottom2=v=>clean(v).padStart(2,'0').slice(-2);
function topDouble(v){const [a,b,c]=[...top3(v)];if(a===b&&b===c)return a;if(a===b)return a;if(a===c)return a;if(b===c)return b;return null;}
function bottomDouble(v){const [a,b]=[...bottom2(v)];return a===b?a:null;}
function pct(a,b){return b?Math.round(a*10000/b)/100:0;}

export default async function handler(req,res){
  allow(res,'GET');if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  try{
    const all=await db('veltrix_latest_20?select=market_id,draw_date,top3,bottom2,rn&order=market_id.asc,rn.asc&limit=2000');
    const by=new Map();for(const r of all||[]){if(!by.has(r.market_id))by.set(r.market_id,[]);by.get(r.market_id).push(r);}
    const stats={targets:0,topEvents:0,bottomEvents:0,topFocus2:0,topWatch3:0,bottomFocus2:0,bottomWatch3:0,latestTopEvents:0,latestTopFocus2:0,latestBottomEvents:0,latestBottomFocus2:0};
    for(const rs0 of by.values()){
      const rs=[...rs0].sort((a,b)=>a.rn-b.rn);
      for(let i=0;i<rs.length-5;i++){
        const target=rs[i],hist=rs.slice(i+1);if(hist.length<5)continue;
        const core=calculateVeltrix(hist,{targetDate:target.draw_date});
        const outputs=enhanceVeltrixWithRud(hist,core);
        const p=outputs?.A||Object.values(outputs||{})[0];if(!p)continue;
        const dd=calculateDoubleDigit(hist,p);if(!dd)continue;stats.targets++;
        const td=topDouble(target.top3),bd=bottomDouble(target.bottom2),latest=Number(target.rn)<=5;
        if(td!=null){stats.topEvents++;if(dd.top.focus.includes(td))stats.topFocus2++;if(dd.top.watch.includes(td))stats.topWatch3++;if(latest){stats.latestTopEvents++;if(dd.top.focus.includes(td))stats.latestTopFocus2++;}}
        if(bd!=null){stats.bottomEvents++;if(dd.bottom.focus.includes(bd))stats.bottomFocus2++;if(dd.bottom.watch.includes(bd))stats.bottomWatch3++;if(latest){stats.latestBottomEvents++;if(dd.bottom.focus.includes(bd))stats.latestBottomFocus2++;}}
      }
    }
    return json(res,200,{ok:true,read_only:true,markets:by.size,...stats,rates:{topFocus2:pct(stats.topFocus2,stats.topEvents),topWatch3:pct(stats.topWatch3,stats.topEvents),bottomFocus2:pct(stats.bottomFocus2,stats.bottomEvents),bottomWatch3:pct(stats.bottomWatch3,stats.bottomEvents),latestTopFocus2:pct(stats.latestTopFocus2,stats.latestTopEvents),latestBottomFocus2:pct(stats.latestBottomFocus2,stats.latestBottomEvents)}});
  }catch(e){return json(res,500,{error:e.message});}
}
