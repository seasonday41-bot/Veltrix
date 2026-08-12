const style=document.createElement('style');
style.id='veltrix-punk-theme-v1';
style.textContent=`
:root{
  --punk-cyan:#08d9ff;
  --punk-blue:#0787ff;
  --punk-pink:#ff2bcf;
  --punk-magenta:#ff00ad;
  --punk-purple:#8a2bff;
  --punk-ink:#03030a;
  --punk-panel:#080713;
  --punk-white:#fff7ff;
}
html{background:#020207!important}
body{
  background:
    radial-gradient(circle at 10% 8%,rgba(255,0,173,.22),transparent 22%),
    radial-gradient(circle at 88% 12%,rgba(0,193,255,.18),transparent 24%),
    radial-gradient(circle at 82% 56%,rgba(105,24,255,.15),transparent 27%),
    repeating-linear-gradient(112deg,rgba(255,255,255,.014) 0 1px,transparent 1px 8px),
    linear-gradient(180deg,#020207 0%,#05030c 46%,#020208 100%)!important;
  background-attachment:fixed!important;
}
body:before{
  opacity:.34!important;
  background:
    radial-gradient(circle at 8% 19%,rgba(255,38,196,.9) 0 1px,transparent 1.6px),
    radial-gradient(circle at 76% 9%,rgba(39,206,255,.9) 0 1px,transparent 1.7px),
    radial-gradient(circle at 92% 48%,rgba(255,32,195,.7) 0 1px,transparent 1.5px),
    radial-gradient(circle at 21% 69%,rgba(31,191,255,.7) 0 1px,transparent 1.5px),
    repeating-radial-gradient(circle at 20% 30%,rgba(255,255,255,.02) 0 1px,transparent 1px 7px)!important;
  background-size:181px 173px,239px 227px,211px 199px,263px 241px,100% 100%!important;
}
body:after{
  content:"";
  position:fixed;
  inset:0;
  z-index:0;
  pointer-events:none;
  opacity:.31;
  mix-blend-mode:screen;
  background:
    linear-gradient(105deg,transparent 0 7%,rgba(255,42,200,.16) 7.2% 7.5%,transparent 7.8% 100%),
    linear-gradient(76deg,transparent 0 87%,rgba(0,200,255,.12) 87.2% 87.5%,transparent 87.8% 100%),
    repeating-linear-gradient(0deg,transparent 0 5px,rgba(255,255,255,.018) 6px,transparent 7px 13px);
}
.app{z-index:1!important;padding-top:14px!important;isolation:isolate}
.app:before,.app:after{
  position:absolute;
  z-index:-1;
  pointer-events:none;
  font-family:Impact,"Arial Black",sans-serif;
  font-weight:900;
  line-height:.8;
  opacity:.12;
  filter:blur(.2px);
}
.app:before{content:"A";left:-13px;top:118px;font-size:86px;color:var(--punk-pink);transform:rotate(-18deg)}
.app:after{content:"XX";right:-14px;top:184px;font-size:55px;color:var(--punk-cyan);transform:rotate(12deg)}
.brand{padding:13px 4px 18px!important;position:relative}
.brand h1{
  position:relative;
  display:inline-block;
  margin:0!important;
  font-family:Impact,Haettenschweiler,"Arial Black",sans-serif!important;
  font-size:clamp(52px,16vw,82px)!important;
  font-style:italic;
  font-weight:950!important;
  line-height:.86!important;
  letter-spacing:-1px!important;
  transform:skew(-8deg) rotate(-1deg);
  background:linear-gradient(102deg,#ff1bc8 0%,#ff35b4 32%,#963aff 53%,#00d6ff 78%,#33b9ff 100%)!important;
  -webkit-background-clip:text!important;
  color:transparent!important;
  filter:drop-shadow(-4px 4px 0 rgba(255,0,153,.13)) drop-shadow(4px -2px 0 rgba(0,200,255,.12));
  text-shadow:0 0 8px rgba(255,32,195,.55),0 0 19px rgba(0,196,255,.28)!important;
}
.brand h1:before,.brand h1:after{
  content:"";
  position:absolute;
  height:5px;
  bottom:-7px;
  transform:skew(-28deg);
  filter:drop-shadow(0 0 6px currentColor);
}
.brand h1:before{left:3%;width:43%;background:var(--punk-pink);color:var(--punk-pink)}
.brand h1:after{right:1%;width:36%;background:var(--punk-cyan);color:var(--punk-cyan)}
.brand p{
  margin-top:15px!important;
  color:#d9faff!important;
  font-weight:650!important;
  text-shadow:0 0 8px rgba(0,210,255,.55)!important;
}
.brand p:before{background:linear-gradient(90deg,transparent,var(--punk-pink))!important;box-shadow:0 0 10px var(--punk-pink)!important}
.brand p:after{background:linear-gradient(90deg,transparent,var(--punk-cyan))!important;box-shadow:0 0 10px var(--punk-cyan)!important}
.card{
  border-radius:13px 4px 13px 4px!important;
  border:1px solid rgba(219,61,255,.72)!important;
  background:
    linear-gradient(107deg,transparent 0 7%,rgba(255,255,255,.025) 7.2% 7.6%,transparent 7.8% 100%),
    repeating-linear-gradient(165deg,rgba(255,255,255,.014) 0 1px,transparent 1px 9px),
    linear-gradient(145deg,rgba(7,8,19,.98),rgba(9,5,24,.97))!important;
  box-shadow:
    inset 0 0 0 1px rgba(0,205,255,.12),
    inset 0 0 28px rgba(101,35,178,.12),
    0 0 0 1px rgba(255,0,184,.10),
    0 0 12px rgba(255,0,184,.24),
    -5px 0 15px rgba(0,193,255,.12),
    0 15px 30px rgba(0,0,0,.44)!important;
}
.card:after{
  border-radius:inherit!important;
  box-shadow:inset 3px 0 0 rgba(0,207,255,.62),inset -3px 0 0 rgba(255,25,194,.56),inset 0 1px rgba(255,255,255,.07)!important;
}
.market-card{
  border-color:rgba(255,45,207,.78)!important;
  background:
    radial-gradient(circle at 3% 15%,rgba(255,16,190,.14),transparent 23%),
    radial-gradient(circle at 98% 78%,rgba(0,193,255,.10),transparent 24%),
    repeating-linear-gradient(165deg,rgba(255,255,255,.014) 0 1px,transparent 1px 9px),
    linear-gradient(145deg,rgba(7,7,17,.98),rgba(9,5,24,.98))!important;
}
.market-card>.section-head .label{
  font-size:21px!important;
  font-weight:900!important;
  position:relative;
  text-shadow:2px 2px 0 rgba(255,0,171,.18),0 0 8px rgba(255,255,255,.08);
}
.market-card>.section-head .label:after{content:"";position:absolute;left:0;right:-9px;height:3px;bottom:-5px;background:linear-gradient(90deg,var(--punk-pink),transparent);transform:rotate(-3deg);box-shadow:0 0 7px var(--punk-pink)}
.section-icon,.number-icon,.metric-icon{
  border-width:1px!important;
  background:radial-gradient(circle at 45% 35%,rgba(40,20,63,.98),rgba(4,4,13,.98))!important;
  filter:none!important;
}
.section-icon{border-color:#ff43d4!important;color:#fff2ff!important;box-shadow:0 0 5px #ff37cd,0 0 17px rgba(255,18,194,.45),inset 0 0 15px rgba(255,32,199,.18)!important}
.search,.select{
  border-radius:8px 2px 8px 2px!important;
  border-color:rgba(180,62,255,.75)!important;
  background-color:rgba(4,5,14,.96)!important;
  box-shadow:inset 0 0 18px rgba(93,29,155,.15),0 0 11px rgba(103,40,255,.12)!important;
}
.search:focus,.select:focus{border-color:#ff43d0!important;box-shadow:0 0 4px #ff39cf,0 0 14px rgba(255,35,194,.32),inset 0 0 18px rgba(39,168,255,.08)!important}
.search-icon{color:#ba80ff!important;text-shadow:0 0 9px #a83eff}
.select{background-image:linear-gradient(45deg,transparent 50%,#ff50d5 50%),linear-gradient(135deg,#ff50d5 50%,transparent 50%)!important}
.mode-card{border-color:rgba(51,179,255,.55)!important}
.mode-btn{border-radius:8px 2px 8px 2px!important;background:linear-gradient(180deg,rgba(12,10,27,.96),rgba(4,6,17,.98))!important}
.mode-btn.active{border-color:#16d6ff!important;background:linear-gradient(105deg,rgba(0,112,187,.72),rgba(113,26,167,.76),rgba(255,16,176,.58))!important;box-shadow:0 0 5px #08cfff,0 0 16px rgba(0,199,255,.30),0 0 19px rgba(255,0,184,.20)!important}
.hero{
  overflow:hidden!important;
  min-height:154px;
  border:1px solid #ff37d1!important;
  background:
    radial-gradient(circle at 8% 84%,rgba(255,0,178,.20),transparent 28%),
    radial-gradient(circle at 92% 22%,rgba(0,196,255,.16),transparent 26%),
    repeating-linear-gradient(164deg,rgba(255,255,255,.018) 0 1px,transparent 1px 8px),
    linear-gradient(133deg,rgba(11,5,20,.98),rgba(5,5,15,.99) 54%,rgba(16,4,23,.98))!important;
  box-shadow:inset 0 0 36px rgba(134,20,188,.13),0 0 7px #ff25ca,0 0 20px rgba(255,0,183,.32),-5px 0 15px rgba(0,190,255,.18),0 17px 34px rgba(0,0,0,.48)!important;
}
.hero:before{
  width:155px!important;height:155px!important;left:-28px!important;top:5px!important;
  opacity:.36;
  background:repeating-radial-gradient(circle,transparent 0 9px,rgba(255,19,196,.18) 10px 11px,transparent 12px 18px)!important;
  filter:none!important;
}
.hero:after{
  content:"WIN"!important;
  display:block!important;
  position:absolute!important;
  left:12px!important;
  top:25px!important;
  right:auto!important;
  bottom:auto!important;
  width:auto!important;
  height:auto!important;
  color:rgba(255,24,190,.18)!important;
  font-family:Impact,"Arial Black",sans-serif!important;
  font-size:46px!important;
  font-style:italic;
  letter-spacing:-2px;
  transform:rotate(-12deg);
  text-shadow:0 0 8px rgba(255,0,181,.12)!important;
  box-shadow:none!important;
}
.hero .label{
  font-family:Impact,"Arial Black",sans-serif!important;
  font-style:italic;
  font-size:21px!important;
  letter-spacing:1.3px!important;
  text-shadow:2px 2px 0 rgba(255,0,179,.24),-1px -1px 0 rgba(0,199,255,.18),0 0 10px rgba(255,255,255,.12)!important;
}
.win{font-family:Impact,"Arial Black",sans-serif!important;font-style:italic;font-weight:900!important;color:#fff7ff!important;text-shadow:0 0 5px #fff,0 0 12px #ff29ce,0 0 22px rgba(255,0,185,.46)!important}
.reserve{border:2px solid #12cfff!important;background:radial-gradient(circle,#080813 55%,#12021b 100%)!important;box-shadow:0 0 0 3px rgba(255,28,201,.42),0 0 7px #08d9ff,0 0 16px #ff27cd,0 0 29px rgba(0,190,255,.35),inset 0 0 18px rgba(255,0,190,.16)!important}
.rud-card{overflow:visible!important}
.metric{
  min-height:109px!important;
  border-radius:12px 3px 12px 3px!important;
  border-color:#12cfff!important;
  background:repeating-linear-gradient(160deg,rgba(255,255,255,.012) 0 1px,transparent 1px 8px),linear-gradient(145deg,rgba(3,15,28,.98),rgba(4,5,15,.99))!important;
  box-shadow:inset 0 0 20px rgba(0,184,255,.08),0 0 6px #00c8ff,0 0 16px rgba(0,185,255,.25),0 14px 28px rgba(0,0,0,.35)!important;
}
.metric:nth-child(2){border-color:#ff32cf!important;background:repeating-linear-gradient(160deg,rgba(255,255,255,.012) 0 1px,transparent 1px 8px),linear-gradient(145deg,rgba(24,3,23,.98),rgba(8,4,15,.99))!important;box-shadow:inset 0 0 20px rgba(255,0,186,.08),0 0 6px #ff2bcf,0 0 16px rgba(255,0,180,.25),0 14px 28px rgba(0,0,0,.35)!important}
.metric .metric-icon{color:#2bdcff!important;border-color:#1bd8ff!important;box-shadow:0 0 5px #0ed8ff,0 0 15px rgba(0,198,255,.45),inset 0 0 12px rgba(0,198,255,.12)!important}
.metric:nth-child(2) .metric-icon{color:#ff66dc!important;border-color:#ff3fd2!important;box-shadow:0 0 5px #ff31cd,0 0 15px rgba(255,0,190,.45),inset 0 0 12px rgba(255,0,190,.12)!important}
.metric span:not(.metric-icon){font-weight:750!important;color:#eee9f3!important}
.metric:first-child:after{content:"⚡";position:absolute;right:10px;bottom:4px;font-size:34px;color:rgba(0,202,255,.18);transform:rotate(8deg)}
.metric:nth-child(2):after{content:"♛";position:absolute;right:9px;bottom:1px;font-size:31px;color:rgba(255,32,200,.17);transform:rotate(-9deg)}
.number-card{
  overflow:hidden;
  border-color:#933aff!important;
  background:radial-gradient(circle at 92% 18%,rgba(255,0,186,.11),transparent 26%),repeating-linear-gradient(163deg,rgba(255,255,255,.014) 0 1px,transparent 1px 9px),linear-gradient(145deg,rgba(6,6,18,.99),rgba(11,4,20,.98))!important;
  box-shadow:inset 0 0 22px rgba(113,35,215,.10),0 0 5px #8c34ff,0 0 16px rgba(151,38,255,.22),0 14px 29px rgba(0,0,0,.35)!important;
}
.number-card:not(.three){border-left-color:#13cbff!important;border-right-color:#ff34d0!important}
.number-card.three{border-color:#7728d8!important;border-left-color:#b736ff!important}
.number-card:not(.three):after{content:"✕"!important;display:block!important;position:absolute!important;right:11px!important;top:5px!important;left:auto!important;bottom:auto!important;width:auto!important;height:auto!important;font-size:42px!important;font-family:Impact,"Arial Black",sans-serif;color:rgba(255,26,202,.12)!important;transform:rotate(12deg);box-shadow:none!important}
.number-card.three:after{content:"◇"!important;display:block!important;position:absolute!important;right:13px!important;top:4px!important;left:auto!important;bottom:auto!important;width:auto!important;height:auto!important;font-size:48px!important;color:rgba(0,190,255,.10)!important;transform:rotate(-9deg);box-shadow:none!important}
.number-icon{color:#d9b7ff!important;border-color:#a951ff!important;box-shadow:0 0 5px #9740ff,0 0 13px rgba(139,45,255,.35),inset 0 0 11px rgba(109,29,216,.14)!important}
.number-card .section-title{font-size:16px!important;font-weight:750!important;color:#f1ebf7!important}
.number-line{font-family:"Arial Narrow",-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif!important;font-weight:800!important;text-shadow:0 0 8px rgba(255,255,255,.10),0 0 12px rgba(161,56,255,.20)!important}
#copyBtn{
  border:1px solid #12cfff!important;
  border-radius:10px 3px 10px 3px!important;
  background:linear-gradient(112deg,rgba(0,114,169,.72),rgba(47,13,91,.82),rgba(255,0,174,.42))!important;
  box-shadow:0 0 6px #0ccfff,0 0 15px rgba(0,194,255,.30),0 0 19px rgba(255,0,185,.22),inset 0 0 17px rgba(255,255,255,.05)!important;
  font-family:Impact,"Arial Black",sans-serif!important;
  font-size:20px!important;
  font-style:italic;
  letter-spacing:1.5px!important;
}
.history-card{border-color:rgba(114,48,209,.62)!important}
.list{border-radius:7px!important;background:rgba(2,4,11,.78)!important;border-color:rgba(119,54,197,.36)!important}
.footer-nav{background:linear-gradient(180deg,transparent,rgba(2,2,7,.97) 34%)!important}
.footer-nav .inner{
  border:1px solid #ff34ce!important;
  border-left-color:#10d0ff!important;
  border-radius:11px 3px 11px 3px!important;
  background:repeating-linear-gradient(165deg,rgba(255,255,255,.014) 0 1px,transparent 1px 8px),linear-gradient(100deg,rgba(4,9,18,.98),rgba(16,4,23,.98))!important;
  box-shadow:0 0 7px #ff25ca,0 0 16px rgba(255,0,186,.27),-4px 0 14px rgba(0,199,255,.23),0 -10px 28px rgba(0,0,0,.42)!important;
}
.nav-btn.active{
  position:relative;
  border:0!important;
  border-radius:7px!important;
  background:linear-gradient(95deg,rgba(0,164,218,.18),rgba(137,29,174,.19),rgba(255,0,175,.19))!important;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.04)!important;
  font-family:Impact,"Arial Black",sans-serif!important;
  font-size:23px!important;
  font-style:italic;
  letter-spacing:1.8px!important;
  text-shadow:-2px 1px 0 rgba(0,203,255,.27),2px -1px 0 rgba(255,0,184,.30),0 0 9px rgba(255,255,255,.20)!important;
}
.nav-btn.active:before{content:"";position:absolute;left:10%;right:10%;bottom:7px;height:2px;background:linear-gradient(90deg,var(--punk-cyan),var(--punk-pink));box-shadow:0 0 8px #ff22c8;transform:rotate(-1deg)}
.market-suggestions{border-radius:9px 2px 9px 2px!important;border-color:#9b3cff!important;background:linear-gradient(180deg,rgba(5,5,15,.995),rgba(11,4,20,.995))!important;box-shadow:0 0 6px #9738ff,0 0 20px rgba(255,0,184,.20),0 22px 45px rgba(0,0,0,.68)!important}
.market-suggestion:before{content:"✕"!important;color:#ff4fd7!important;text-shadow:0 0 8px #ff20c9!important}
@media(max-width:430px){
  .brand h1{font-size:clamp(54px,17vw,74px)!important}
  .brand p{letter-spacing:2.3px!important}
  .card{margin-bottom:11px!important}
  .metric:first-child:after,.metric:nth-child(2):after{opacity:.9}
}
@media(max-width:370px){
  .brand h1{font-size:51px!important}
  .brand p{font-size:10px!important;letter-spacing:1.55px!important}
  .hero .label{font-size:18px!important}
}
@media(prefers-reduced-motion:no-preference){
  .brand h1{animation:punkLogoPulse 4.5s ease-in-out infinite}
  .reserve{animation:punkReservePulse 3.2s ease-in-out infinite}
  @keyframes punkLogoPulse{0%,100%{filter:drop-shadow(-4px 4px 0 rgba(255,0,153,.13)) drop-shadow(4px -2px 0 rgba(0,200,255,.12))}50%{filter:drop-shadow(-4px 4px 5px rgba(255,0,153,.22)) drop-shadow(4px -2px 5px rgba(0,200,255,.20))}}
  @keyframes punkReservePulse{0%,100%{transform:scale(1)}50%{transform:scale(1.025)}}
}
`;
document.head.appendChild(style);
document.body.classList.add('veltrix-punk-v1');

// Cosmetic text only; calculation IDs and data flow stay untouched.
const metrics=document.querySelectorAll('.metric > span:not(.metric-icon)');
if(metrics[0])metrics[0].textContent='รูดหลัก';
if(metrics[1])metrics[1].textContent='รูดรอง';
