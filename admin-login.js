// Preview redeploy marker: admin environment variables loaded after setup.
const password=document.getElementById('adminPassword');
const button=document.getElementById('adminLoginBtn');
const status=document.getElementById('adminStatus');

function setStatus(text,kind=''){
  status.textContent=text;
  status.className=`status ${kind}`.trim();
}

async function checkSession(){
  try{
    const r=await fetch('/api/admin-session',{cache:'no-store'});
    const j=await r.json();
    if(j.authenticated){location.replace('/results.html');return;}
    if(!j.configured){
      setStatus('ยังไม่ได้ตั้งค่า VELTRIX_ADMIN_PASSWORD และ VELTRIX_ADMIN_SESSION_SECRET ใน Vercel','bad');
      button.disabled=true;
      return;
    }
    setStatus('พร้อมเข้าสู่ระบบ');
  }catch(e){setStatus(e.message||'ตรวจสถานะ Admin ไม่สำเร็จ','bad');}
}

async function login(){
  const value=String(password.value||'');
  if(!value){setStatus('กรอกรหัสผ่าน Admin','bad');return;}
  button.disabled=true;
  setStatus('กำลังตรวจรหัส...');
  try{
    const r=await fetch('/api/admin-session',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({password:value})
    });
    const j=await r.json();
    if(!r.ok)throw new Error(j.error||'เข้าสู่ระบบไม่สำเร็จ');
    setStatus('เข้าสู่ระบบแล้ว','good');
    location.replace('/results.html');
  }catch(e){
    password.select();
    setStatus(e.message,'bad');
    button.disabled=false;
  }
}

button.addEventListener('click',login);
password.addEventListener('keydown',e=>{if(e.key==='Enter')login();});
checkSession();
