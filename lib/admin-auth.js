import crypto from 'node:crypto';

const COOKIE_NAME='veltrix_admin_session';
const SESSION_SECONDS=60*60*12;

function configured(){
  return Boolean(process.env.VELTRIX_ADMIN_PASSWORD&&process.env.VELTRIX_ADMIN_SESSION_SECRET);
}

function safeEqual(a='',b=''){
  const aa=Buffer.from(String(a));
  const bb=Buffer.from(String(b));
  if(aa.length!==bb.length)return false;
  return crypto.timingSafeEqual(aa,bb);
}

function sign(payload){
  return crypto.createHmac('sha256',process.env.VELTRIX_ADMIN_SESSION_SECRET||'').update(payload).digest('base64url');
}

function parseCookies(header=''){
  const out={};
  for(const part of String(header).split(';')){
    const i=part.indexOf('=');
    if(i<0)continue;
    const k=part.slice(0,i).trim();
    const v=part.slice(i+1).trim();
    if(k)out[k]=decodeURIComponent(v);
  }
  return out;
}

export function adminAuthConfigured(){return configured();}

export function checkAdminPassword(password=''){
  return configured()&&safeEqual(password,process.env.VELTRIX_ADMIN_PASSWORD);
}

export function createAdminToken(){
  if(!configured())throw new Error('Admin auth is not configured');
  const payload=Buffer.from(JSON.stringify({v:1,exp:Math.floor(Date.now()/1000)+SESSION_SECONDS})).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminToken(token=''){
  if(!configured())return false;
  const [payload,sig,...rest]=String(token).split('.');
  if(!payload||!sig||rest.length)return false;
  if(!safeEqual(sig,sign(payload)))return false;
  try{
    const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    return data?.v===1&&Number(data.exp)>Math.floor(Date.now()/1000);
  }catch{return false;}
}

export function isAdminRequest(req){
  const cookies=parseCookies(req?.headers?.cookie||'');
  return verifyAdminToken(cookies[COOKIE_NAME]||'');
}

export function adminSessionCookie(){
  const token=createAdminToken();
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearAdminSessionCookie(){
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export function requireAdmin(req,res){
  if(!configured()){
    res.statusCode=503;
    res.setHeader('content-type','application/json; charset=utf-8');
    res.end(JSON.stringify({error:'Admin auth is not configured'}));
    return false;
  }
  if(!isAdminRequest(req)){
    res.statusCode=401;
    res.setHeader('content-type','application/json; charset=utf-8');
    res.end(JSON.stringify({error:'Admin authentication required'}));
    return false;
  }
  return true;
}
