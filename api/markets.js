import {db,json,allow} from './_db.js';

export default async function handler(req,res){
  allow(res,'GET');
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  try{
    const markets=await db('veltrix_markets?select=id,market_key,market_name,country_code&active=eq.true&order=market_name.asc');
    return json(res,200,{markets:markets||[]});
  }catch(e){return json(res,500,{error:e.message});}
}
