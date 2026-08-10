import {db,json,allow} from '../lib/db.js';
import {calculateVeltrix} from '../lib/veltrix-engine.js';
import {enhanceVeltrixWithRud} from '../lib/rud-ai.js';
import {calculateDoubleDigit} from '../lib/double-digit-ai.js';
import {calculateDoublePattern} from '../lib/double-pattern-ai.js';

const clean=v=>String(v??'').replace(/\D/g,'');
const top3=v=>clean(v).padStart(3,'0').slice(-3);
const bottom2=v=>clean(v).padStart(2,'0').slice(-2);
function topDouble(v){const [a,b,c]=[...top3(v)];if(a===b&&b===c)return a;if(a===b)return a;if(a===c)return a;if(b===c)return b;return null;}
function bottomDouble(v){const [a,b]=[...bottom2(v)];return a===b?a:null;}
function pct(a,b){return b?Math.round(a*10000/b)/100:0;}
function bucket(){return {signals:0,events:0,focus2:0,watch3:0,latestSignals:0,latestEvents:0,latestFocus2:0,latestWatch3:0};}
function add(x,signal,event,digit,focus,watch,latest){
  if(!signal)return;x.signals++;if(latest)x.latestSignals++;
  if(digit==null)return;x.events++;if(focus.includes(digit))x.focus2++;if(watch.includes(digit))x.watch3++;
  if(latest){x.latestEvents++;if(focus.includes(digit))x.latestFocus2++;if(watch.includes(digit))x.latestWatch3++;}
}
function shape(x){return {...x,eventRate:pct(x.events,x.signals),focus2GivenEvent:pct(x.focus2,x.events),watch3GivenEvent:pct(x.watch3,x.events),combinedFocus2:pct(x.focus2,x.signals),latestEventRate:pct(x.latestEvents,x.latestSignals),latestFocus2GivenEvent:pct(x.latestFocus2,x.latestEvents),latestWatch3GivenEvent:pct(x.latestWatch3,x.latestEvents),latestCombinedFocus2:pct(x.latestFocus2,x.latestSignals)};}

export default async function handler(req,res){
  allow(res,'GET');if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  try{
    const all=await db('veltrix_latest_20?select=market_id,draw_date,top3,bottom2,rn&order=market_id.asc,rn.asc&limit=2000');
    const by=new Map();for(const r of all||[]){if(!by.has(r.market_id))by.set(r.market_id,[]);by.get(r.market_id).push(r);}
    const top50=bucket(),top57=bucket(),bottom21=bucket(),bottom27=bucket();let targets=0;
    for(const rs0 of by.values()){
      const rs=[...rs0].sort((a,b)=>a.rn-b.rn);
      for(let i=0;i<rs.length-5;i++){
        const target=rs[i],hist=rs.slice(i+1);if(hist.length<5)continue;
        const core=calculateVeltrix(hist,{targetDate:target.draw_date}),outputs=enhanceVeltrixWithRud(hist,core),p=outputs?.A||Object.values(outputs||{})[0];if(!p)continue;
        const dd=calculateDoubleDigit(hist,p),dp=calculateDoublePattern(hist);if(!dd||!dp)continue;targets++;
        const td=topDouble(target.top3),bd=bottomDouble(target.bottom2),latest=Number(target.rn)<=5;
        add(top50,dp.top.chance>=50,td!=null,td,dd.top.focus,dd.top.watch,latest);
        add(top57,dp.top.chance>=57,td!=null,td,dd.top.focus,dd.top.watch,latest);
        add(bottom21,dp.bottom.chance>=21,bd!=null,bd,dd.bottom.focus,dd.bottom.watch,latest);
        add(bottom27,dp.bottom.chance>=27,bd!=null,bd,dd.bottom.focus,dd.bottom.watch,latest);
      }
    }
    return json(res,200,{ok:true,read_only:true,markets:by.size,targets,randomDigitBaseline:{focus2:20,watch3:30},top50:shape(top50),top57:shape(top57),bottom21:shape(bottom21),bottom27:shape(bottom27)});
  }catch(e){return json(res,500,{error:e.message});}
}
