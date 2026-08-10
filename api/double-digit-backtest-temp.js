import {db,json,allow} from '../lib/db.js';
import {calculateVeltrix} from '../lib/veltrix-engine.js';
import {enhanceVeltrixWithRud} from '../lib/rud-ai.js';
import {calculateDoubleDigit} from '../lib/double-digit-ai.js';

const DIGITS=[...'0123456789'];
const clean=v=>String(v??'').replace(/\D/g,'');
const top3=v=>clean(v).padStart(3,'0').slice(-3);
const bottom2=v=>clean(v).padStart(2,'0').slice(-2);
function topDouble(v){const [a,b,c]=[...top3(v)];if(a===b&&b===c)return a;if(a===b)return a;if(a===c)return a;if(b===c)return b;return null;}
function bottomDouble(v){const [a,b]=[...bottom2(v)];return a===b?a:null;}
function pct(a,b){return b?Math.round(a*10000/b)/100:0;}
const CONFIGS={
  balanced:[.38,.22,.20,.20],
  historyHeavy:[.58,.14,.14,.14],
  formulaHeavy:[.24,.42,.14,.20],
  hotHeavy:[.24,.18,.42,.16],
  linkedHeavy:[.24,.18,.14,.44],
  historyLinked:[.46,.12,.10,.32],
  formulaLinked:[.18,.36,.10,.36],
  hotLinked:[.18,.14,.34,.34],
  historyFormula:[.44,.34,.10,.12]
};
function rank(comp,w){
  const [wh,wf,wo,wl]=w;
  return [...DIGITS].sort((a,b)=>{
    const sa=wh*comp.historical[a]+wf*comp.formula[a]+wo*comp.hot[a]+wl*comp.linked[a];
    const sb=wh*comp.historical[b]+wf*comp.formula[b]+wo*comp.hot[b]+wl*comp.linked[b];
    return sb-sa||Number(a)-Number(b);
  });
}
function blank(){return Object.fromEntries(Object.keys(CONFIGS).map(k=>[k,{focus2:0,watch3:0,latestFocus2:0}]));}

export default async function handler(req,res){
  allow(res,'GET');if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  try{
    const all=await db('veltrix_latest_20?select=market_id,draw_date,top3,bottom2,rn&order=market_id.asc,rn.asc&limit=2000');
    const by=new Map();for(const r of all||[]){if(!by.has(r.market_id))by.set(r.market_id,[]);by.get(r.market_id).push(r);}
    let targets=0,topEvents=0,bottomEvents=0,latestTopEvents=0,latestBottomEvents=0;const top=blank(),bottom=blank();
    for(const rs0 of by.values()){
      const rs=[...rs0].sort((a,b)=>a.rn-b.rn);
      for(let i=0;i<rs.length-5;i++){
        const target=rs[i],hist=rs.slice(i+1);if(hist.length<5)continue;
        const core=calculateVeltrix(hist,{targetDate:target.draw_date});
        const outputs=enhanceVeltrixWithRud(hist,core);
        const p=outputs?.A||Object.values(outputs||{})[0];if(!p)continue;
        const dd=calculateDoubleDigit(hist,p);if(!dd)continue;targets++;
        const td=topDouble(target.top3),bd=bottomDouble(target.bottom2),latest=Number(target.rn)<=5;
        if(td!=null){topEvents++;if(latest)latestTopEvents++;for(const [name,w] of Object.entries(CONFIGS)){const r=rank(dd.components.top,w);if(r.slice(0,2).includes(td))top[name].focus2++;if(r.slice(0,3).includes(td))top[name].watch3++;if(latest&&r.slice(0,2).includes(td))top[name].latestFocus2++;}}
        if(bd!=null){bottomEvents++;if(latest)latestBottomEvents++;for(const [name,w] of Object.entries(CONFIGS)){const r=rank(dd.components.bottom,w);if(r.slice(0,2).includes(bd))bottom[name].focus2++;if(r.slice(0,3).includes(bd))bottom[name].watch3++;if(latest&&r.slice(0,2).includes(bd))bottom[name].latestFocus2++;}}
      }
    }
    const shape=(obj,events,latestEvents)=>Object.fromEntries(Object.entries(obj).map(([k,v])=>[k,{focus2:pct(v.focus2,events),watch3:pct(v.watch3,events),latestFocus2:pct(v.latestFocus2,latestEvents),counts:v}]));
    return json(res,200,{ok:true,read_only:true,markets:by.size,targets,topEvents,bottomEvents,latestTopEvents,latestBottomEvents,randomBaseline:{focus2:20,watch3:30},top:shape(top,topEvents,latestTopEvents),bottom:shape(bottom,bottomEvents,latestBottomEvents)});
  }catch(e){return json(res,500,{error:e.message});}
}
