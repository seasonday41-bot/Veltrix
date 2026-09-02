import crypto from 'node:crypto';
import importResults from './import-results.js';
import {db,json,allow} from './_db.js';
import {createAdminToken} from '../lib/admin-auth.js';

const WRITER_TOKEN_SHA256='507ac8e650ac8a3a96b0486c6af75a61a9684bd54eae0fdf811d982284688ee3';
const COOKIE_NAME='veltrix_admin_session';
const THAI_MONTHS=['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

function safeEqual(a='',b=''){
  const aa=Buffer.from(String(a));
  const bb=Buffer.from(String(b));
  return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb);
}

function machineAuthorized(req){
  const token=String(req.headers['x-result-writer-token']||'');
  if(!token)return false;
  const digest=crypto.createHash('sha256').update(token).digest('hex');
  return safeEqual(digest,WRITER_TOKEN_SHA256);
}

function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||''));}
function validMarketKey(v){return /^market_\d{3}$/.test(String(v||''));}
function validResult(top3,bottom2){return /^\d{3}$/.test(String(top3||''))&&/^\d{2}$/.test(String(bottom2||''));}

function thaiDateHeader(iso){
  const [y,m,d]=String(iso).split('-').map(Number);
  if(!y||!m||!d||!THAI_MONTHS[m])return null;
  return `วันที่ ${d} ${THAI_MONTHS[m]} ${y+543}`;
}

export default async function handler(req,res){
  allow(res,'POST');
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  if(!machineAuthorized(req))return json(res,401,{error:'Machine authentication required'});

  try{
    const drawDate=String(req.body?.drawDate||'');
    const requested=Array.isArray(req.body?.items)?req.body.items.slice(0,60):[];
    if(!validDate(drawDate))return json(res,400,{error:'drawDate ไม่ถูกต้อง'});
    if(!requested.length)return json(res,400,{error:'ไม่มีผลให้ประมวลผล'});

    const clean=requested.filter(x=>validMarketKey(x?.marketKey)&&validResult(x?.top3,x?.bottom2));
    if(!clean.length)return json(res,400,{error:'ไม่มีรายการที่รูปแบบถูกต้อง'});

    const keys=[...new Set(clean.map(x=>String(x.marketKey)))];
    const keyList=keys.map(k=>`\"${k}\"`).join(',');
    const markets=await db(`veltrix_markets?select=market_key,market_name&active=eq.true&market_key=in.(${keyList})`);
    const marketMap=new Map((markets||[]).map(m=>[m.market_key,m.market_name]));

    const lines=[];
    const rejected=[];
    for(const item of clean){
      const marketName=marketMap.get(String(item.marketKey));
      if(!marketName){
        rejected.push({marketKey:item.marketKey,status:'market_not_found'});
        continue;
      }
      lines.push(`${String(item.top3)}-${String(item.bottom2)} ${marketName}`);
    }
    if(!lines.length)return json(res,400,{error:'ไม่พบตลาดที่ใช้งานได้',rejected});

    const header=thaiDateHeader(drawDate);
    const rawText=[header,...lines].join('\n');

    // Reuse the exact existing admin import pipeline. We only supply an internal,
    // signed admin session for this server-to-server request; engine logic stays untouched.
    const token=createAdminToken();
    const originalBody=req.body;
    const originalCookie=req.headers.cookie;
    req.body={raw_text:rawText,dry_run:false};
    req.headers.cookie=`${COOKIE_NAME}=${encodeURIComponent(token)}${originalCookie?`; ${originalCookie}`:''}`;

    try{
      return await importResults(req,res);
    }finally{
      req.body=originalBody;
      if(originalCookie===undefined)delete req.headers.cookie;
      else req.headers.cookie=originalCookie;
    }
  }catch(error){
    return json(res,500,{error:error?.message||'Machine import failed'});
  }
}
