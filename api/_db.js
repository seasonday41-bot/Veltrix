function env(){
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return {url:url.replace(/\/$/,''),key};
}

export async function db(path,{method='GET',body,prefer,headers={}}={}){
  const {url,key}=env();
  const r=await fetch(`${url}/rest/v1/${path}`,{
    method,
    headers:{
      apikey:key,
      Authorization:`Bearer ${key}`,
      'Content-Type':'application/json',
      ...(prefer?{Prefer:prefer}:{}),
      ...headers
    },
    body:body===undefined?undefined:JSON.stringify(body)
  });
  const text=await r.text();
  let data=null; try{data=text?JSON.parse(text):null;}catch{data=text;}
  if(!r.ok){ const msg=data?.message||data?.hint||data?.details||`Supabase ${r.status}`; const e=new Error(msg); e.status=r.status; e.data=data; throw e; }
  return data;
}

export function json(res,status,data){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.end(JSON.stringify(data));
}

export function allow(res,methods='GET'){
  res.setHeader('Allow',methods);
}

export default function handler(req,res){
  return json(res,404,{error:'Not found'});
}
