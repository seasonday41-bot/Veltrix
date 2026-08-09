import {db,json,allow} from './_db.js';

export default async function handler(req,res){
  allow(res,'GET');
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  try{
    const rows=await db('veltrix_engine_settings?select=setting_key,setting_value&setting_key=eq.result_reading&limit=1');
    return json(res,200,{ok:true,supabase:true,result_reading:rows?.[0]?.setting_value||null});
  }catch(e){return json(res,500,{ok:false,error:e.message});}
}
