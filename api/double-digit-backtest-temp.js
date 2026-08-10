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
  v2:[.58,.16,.10,.08,.08],
  learnedOnly:[1,0,0,0,0],
  learnedHeavy:[.72,.10,.08,.04,.06],
  learnedLinked:[.60,.10,.06,.04,.20],
  learnedFormula:[.58,.08,.20,.04,.10],
  learnedHistory:[.62,.24,.06,.04,.04],
  learnedRecent:[.60,.10,.06,.18,.06]
};
function rank(comp,w){
  const [wl,wh,wf,wo,wk]=w;
  return [...DIGITS].sort((a,b)=>{
    const sa=wl*comp.learned[a]+wh*comp.historical[a]+wf*comp.formula[a]+wo*comp.hot[a]+wk*comp.linked[a];
    const sb=wl*comp.learned[b]+wh*comp.historical[b]+wf*comp.formula[b]+wo*comp.hot[b]+wk*comp.linked[b];
    return sb-sa||comp.learned[b]-comp.learned[a]||Number(a)-Number(b);
  });
}
function blank(){return Object.fromEntries(Object.keys(CONFIGS).map(k=>[k,{focus2:0,watch3:0,latestFocus2:0,latestWatch3:0}]));}

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
        if(td!=null){topEvents++;if(latest)latestTopEvents++;for(const [name,w] of Object.entries(CONFIGS)){const r=rank(dd.components.top,w);if(r.slice(0,2).includes(td))top[name].focus2++;if(r.slice(0,3).includes(td))top[name].watch3++;if(latest&&r.slice(0,2).includes(td))top[name].latestFocus2++;if(latest&&r.slice(0,3).includes(td))top[name].latestWatch3++;}}
        if(bd!=null){bottomEvents++;if(latest)latestBottomEvents++;for(const [name,w] of Object.entries(CONFIGS)){const r=rank(dd.components.bottom,w);if(r.slice(0,2).includes(bd))bottom[name].focus2++;if(r.slice(0,3).includes(bd))bottom[name].watch3++;if(latest&&r.slice(0,2).includes(bd))bottom[name].latestFocus2++;if(latest&&r.slice(0,3).includes(bd))bottom[name].latestWatch3++;}}
      }
    }
    const shape=(obj,events,latestEvents)=>Object.fromEntries(Object.entries(obj).map(([k,v])=>[k,{focus2:pct(v.focus2,events),watch3:pct(v.watch3,events),latestFocus2:pct(v.latestFocus2,latestEvents),latestWatch3:pct(v.latestWatch3,latestEvents),counts:v}]));
    return json(res,200,{ok:true,read_only:true,markets:by.size,targets,topEvents,bottomEvents,latestTopEvents,latestBottomEvents,randomBaseline:{focus2:20,watch3:30},top:shape(top,topEvents,latestTopEvents),bottom:shape(bottom,bottomEvents,latestBottomEvents)});
  }catch(e){return json(res,500,{error:e.message});}
}
