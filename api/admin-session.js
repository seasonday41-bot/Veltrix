import {adminAuthConfigured,checkAdminPassword,isAdminRequest,adminSessionCookie,clearAdminSessionCookie} from '../lib/admin-auth.js';

function send(res,status,body){
  res.statusCode=status;
  res.setHeader('content-type','application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export default async function handler(req,res){
  if(req.method==='GET'){
    return send(res,200,{configured:adminAuthConfigured(),authenticated:isAdminRequest(req)});
  }
  if(req.method==='POST'){
    if(!adminAuthConfigured())return send(res,503,{error:'Admin auth is not configured'});
    const password=String(req.body?.password||'');
    if(!checkAdminPassword(password))return send(res,401,{error:'รหัส Admin ไม่ถูกต้อง'});
    res.setHeader('set-cookie',adminSessionCookie());
    return send(res,200,{ok:true,authenticated:true});
  }
  if(req.method==='DELETE'){
    res.setHeader('set-cookie',clearAdminSessionCookie());
    return send(res,200,{ok:true,authenticated:false});
  }
  res.setHeader('allow','GET, POST, DELETE');
  return send(res,405,{error:'Method not allowed'});
}
