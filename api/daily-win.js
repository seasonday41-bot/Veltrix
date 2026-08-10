import {db,json,allow} from '../lib/db.js';

function thaiTodayISO(){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const get=t=>parts.find(x=>x.type===t)?.value||'';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function normalizeDigits(value=''){
  const raw=String(value).replace(/\D/g,'').slice(0,10);
  return [...raw].filter((d,i,a)=>a.indexOf(d)===i).join('');
}

export default async function handler(req,res){
  allow(res,'GET, POST');
  if(!['GET','POST'].includes(req.method))return json(res,405,{error:'Method not allowed'});
  try{
    const today=thaiTodayISO();
    const rows=await db('veltrix_engine_settings?select=id,setting_value,updated_at&setting_key=eq.daily_win_global&limit=1');
    const current=rows?.[0]||null;
    const value=current?.setting_value||{};

    if(req.method==='GET'){
      const active=value.date===today;
      return json(res,200,{
        date:today,
        digits:active?normalizeDigits(value.digits||''):'',
        saved_date:value.date||null,
        active,
        updated_at:current?.updated_at||null
      });
    }

    const digits=normalizeDigits(req.body?.digits||'');
    const setting_value={date:today,digits};
    if(current){
      await db('veltrix_engine_settings?setting_key=eq.daily_win_global',{
        method:'PATCH',prefer:'return=minimal',body:{setting_value,description:'Global daily WIN used by all VELTRIX markets for the Thailand date'}
      });
    }else{
      await db('veltrix_engine_settings',{
        method:'POST',prefer:'return=minimal',body:[{setting_key:'daily_win_global',setting_value,description:'Global daily WIN used by all VELTRIX markets for the Thailand date'}]
      });
    }
    return json(res,200,{ok:true,date:today,digits,active:Boolean(digits)});
  }catch(e){return json(res,500,{error:e.message,detail:e.data||null});}
}
