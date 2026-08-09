function env(){
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return {url:url.replace(/\/$/,''),key:key.trim()};
}

function authHeaders(key){
  const h={apikey:key};
  // New sb_secret_* API keys are opaque keys, not JWTs. Send them as apikey only.
  // Legacy service_role keys are JWTs and may be sent as Bearer tokens.
  if(!key.startsWith('sb_secret_')&&!key.startsWith('sb_publishable_')){
    h.Authorization=`Bearer ${key}`;
  }
  return h;
}

export async function db(path,{method='GET',body,prefer,headers={}}={}){
  const {url,key}=env();
  const r=await fetch(`${url}/rest/v1/${path}`,{
    method,
    headers:{
      ...authHeaders(key),
      'Content-Type':'application/json',
      ...(prefer?{Prefer:prefer}:{}),
      ...headers
    },
    body:body===undefined?undefined:JSON.stringify(body)
  });
  const text=await r.text();
  let data=null; try{data=text?JSON.parse(text):null;}catch{data=text;}
  if(!r.ok){
    const msg=data?.message||data?.hint||data?.details||`Supabase ${r.status}`;
    const e=new Error(msg); e.status=r.status; e.data=data; throw e;
  }
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
