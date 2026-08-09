import {db,json,allow} from '../lib/db.js';

function projectHost(){
  try{return new URL(process.env.SUPABASE_URL||'').host||null;}catch{return null;}
}

export default async function handler(req,res){
  allow(res,'GET');
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  const host=projectHost();
  try{
    const [markets,settings]=await Promise.all([
      db('veltrix_markets?select=id&limit=1'),
      db('veltrix_engine_settings?select=setting_key,setting_value&setting_key=eq.result_reading&limit=1')
    ]);
    return json(res,200,{
      ok:true,
      supabase:true,
      project_host:host,
      veltrix_markets_visible:Array.isArray(markets),
      result_reading:settings?.[0]?.setting_value||null
    });
  }catch(e){
    return json(res,500,{
      ok:false,
      project_host:host,
      error:e.message,
      hint:"If veltrix_markets exists in Supabase, verify Vercel SUPABASE_URL points to the same project and redeploy. Then run NOTIFY pgrst, 'reload schema'; if needed."
    });
  }
}
