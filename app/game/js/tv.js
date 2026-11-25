'use strict';
// ?tv=1 booth TV mode (station A). Own overlay: the phone layout and game.js are untouched.
(()=>{
  const q=new URLSearchParams(location.search);
  if(q.get('tv')!=='1')return;
  const num=(k,d,lo,hi)=>{const v=Number(q.get(k));return Number.isFinite(v)&&q.has(k)?Math.min(hi,Math.max(lo,v)):d;};
  const IDLE_MS=num('tvidle',60,1,600)*1000,CYCLE_MS=num('tvcycle',60,7,600)*1000;
  const STAGES=['เตรียมดิน','กล้า','แตกกอ','ตั้งท้อง','ออกรวง','สุกแก่','เก็บเกี่ยว'];
  const QR_URL=location.hostname==='riceos.donaus.com'?location.origin+'/game/':'https:/'+'/riceos.donaus.com/game/';
  const SHOW_URL='riceos.donaus.com/game/';
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const link=document.createElement('link');link.rel='stylesheet';link.href='css/tv.css';document.head.appendChild(link);
  document.documentElement.classList.add('tv-mode');
  let seed=null,mode='idle',lastInput=Date.now(),attractAt=0,shown=[],stage;
  const root=document.createElement('div');root.id='tv';root.setAttribute('aria-label','จอแสดงฟาร์มรวม');
  root.innerHTML=`<div class="tv-stage" id="tv-stage">
  <header class="tv-head"><img class="tv-logo" src="assets/sheaves.webp" alt=""><div><h1>นาละมุน<svg class="tv-stalk" viewBox="0 0 60 64" aria-hidden="true"><path d="M30 62C30 40 32 22 44 4" fill="none" stroke="#e6b840" stroke-width="4" stroke-linecap="round"/><g fill="#e6b840"><ellipse cx="36" cy="26" rx="6" ry="11" transform="rotate(28 36 26)"/><ellipse cx="25" cy="30" rx="5.5" ry="10" transform="rotate(-30 25 30)"/><ellipse cx="40" cy="42" rx="5.5" ry="10" transform="rotate(30 40 42)"/><ellipse cx="22" cy="46" rx="5" ry="9" transform="rotate(-32 22 46)"/><ellipse cx="42" cy="12" rx="4.5" ry="9" transform="rotate(25 42 12)"/></g></svg></h1><p id="tv-sub"></p></div><span class="tv-badge" id="tv-badge"></span></header>
  <img class="tv-mascot" id="tv-mascot" src="assets/mascot-wave.webp" alt="">
  <section class="tv-farm" id="tv-farm" aria-label="แปลงนาทั้งหมด"></section>
  <section class="tv-focal" id="tv-focal" aria-label="แปลงสาธิตวงจรข้าว" hidden><canvas width="1260" height="693" aria-hidden="true"></canvas><div class="tv-focal-card"><b id="tv-fnum"></b><div><span id="tv-fof"></span><strong id="tv-fname"></strong></div></div><div class="tv-progress" id="tv-progress" hidden></div></section>
  <aside class="tv-qr"><h2>สแกนเพื่อเริ่มเล่น<br>บนมือถือ</h2><div class="tv-code" id="tv-code" role="img" aria-label="คิวอาร์โค้ดเปิดเกมนาละมุนบนมือถือ"></div><p class="tv-url">${SHOW_URL}</p></aside>
  <section class="tv-board" aria-label="คะแนนสะสมเพื่อรางวัล"><div class="tv-board-title"><img src="assets/sheaves.webp" alt=""><div><strong>ทำภารกิจ สะสมคะแนน</strong><span id="tv-goal"></span></div></div><ol id="tv-rank"></ol></section>
  </div>`;
  document.body.appendChild(root);
  stage=root.querySelector('#tv-stage');
  function fit(){const s=Math.min(innerWidth/1920,innerHeight/1080);stage.style.setProperty('--s',s);}
  fit();addEventListener('resize',fit);
  // QR (vendored generator js/qr.js, no network)
  function drawQr(){
    try{const m=qrcode(0,'M');m.addData(QR_URL);m.make();const n=m.getModuleCount(),z=4;let d='';
      for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(m.isDark(r,c))d+=`M${c+z} ${r+z}h1v1h-1z`;
      root.querySelector('#tv-code').innerHTML=`<svg viewBox="0 0 ${n+2*z} ${n+2*z}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#14301f"/></svg>`;
      return true;}catch{return false;}
  }
  const qs=document.createElement('script');qs.src='js/qr.js';qs.onload=drawQr;document.head.appendChild(qs);
  // tiles: the phone game's own scene renderer (NalaArt.illustration), drawn at the displayed size
  const PLOTS=6;
  function tileHtml(p,i){return `<article class="tv-tile" data-i="${i}"><canvas width="405" height="223" aria-hidden="true"></canvas><div class="tv-tile-info"><strong>${esc(p.name)}</strong><span class="tv-stage-txt"></span><span class="tv-dots" aria-hidden="true"></span></div></article>`;}
  // light unsharp mask: the plant bitmaps are enlarged, so restore edge contrast at display size
  function sharpen(cv){const g=cv.getContext('2d'),w=cv.width,h=cv.height,im=g.getImageData(0,0,w,h),d=im.data,o=new Uint8ClampedArray(d),k=.28;
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=(y*w+x)*4;for(let c=0;c<3;c++){const v=d[i+c]*(1+4*k)-k*(d[i+c-4]+d[i+c+4]+d[i+c-w*4]+d[i+c+w*4]);o[i+c]=v;}}
    im.data.set(o);g.putImageData(im,0,0);}
  // one scene for tiles and the focal plot: watercolour backdrop of the phone game, a clearly bounded level paddy, the game's own rice art
  const IMG={};['backdrop-wide','palm','buffalo-side','egret-fly','bush','sheaves'].forEach(n=>{const i=new Image();i.src='assets/'+n+'.webp';IMG[n]=i;});
  const WATER=['#7fa9b4','#86b3a0','#6f9a5a','#5f9040','#6a9a3a','#8aa23a','#d3b455'];
  function scene(c,s,h,big){
    const A=window.NalaArt;if(!A||!A.cellAtlas||!A.cellAtlas[s]||A.cellAtlas[s].length<4||!IMG['backdrop-wide'].complete)return false;
    try{const W=c.width,H=c.height,t=document.createElement('canvas');t.width=W;t.height=H;const g=t.getContext('2d');
      g.save();g.scale(W/800,H/440);
      const bd=IMG['backdrop-wide'],bw=800,bh=bw*bd.height/bd.width;g.drawImage(bd,0,Math.min(0,(440-bh)/2),bw,bh);
      const gr=g.createLinearGradient(0,170,0,440);gr.addColorStop(0,'#a8c96e');gr.addColorStop(1,'#7fae52');g.fillStyle=gr;g.fillRect(0,175,800,265);
      const cx=big?400:400,cy=big?290:292,hw=big?280:290,hh=big?132:136;
      A.path(g,A.points(cx,cy+16,hw+34,hh+20),'#7a8a3a');            // shadow side of the bund
      A.path(g,A.points(cx,cy,hw+34,hh+20),'#e2e6a8','#8a8f48',3);   // raised bund
      A.path(g,A.points(cx,cy,hw,hh),WATER[s],'#4c6a3a',3);           // level paddy
      if(s<2){g.strokeStyle='#ffffff88';g.lineWidth=3;for(let i=0;i<4;i++){g.beginPath();g.moveTo(cx-120+i*30,cy-22+i*18);g.lineTo(cx-60+i*30,cy-22+i*18);g.stroke();}}
      A.drawRice(g,{id:4,x:cx,y:cy,w:hw},s,h);
      const spr=(n,x,y,w)=>{const i=IMG[n];if(i&&i.complete)g.drawImage(i,x,y-w*i.height/i.width,w,w*i.height/i.width);};
      spr('palm',big?12:6,300,big?110:130);spr('bush',big?650:660,425,big?120:100);
      if(big){spr('buffalo-side',650,440,92);spr('egret-fly',590,150,70);}
      g.restore();sharpen(t);c.getContext('2d').drawImage(t,0,0);c.dataset.art='1';return true;}catch{return false;}
  }
  function paint(i,s,h){const c=root.querySelectorAll('.tv-tile canvas')[i];if(!c||!scene(c,s,h,false))return false;c.parentNode.dataset.art='1';return true;}
  function render(){
    root.querySelectorAll('.tv-tile').forEach((t,i)=>{const s=seed.plots[i].stage,h=seed.plots[i].health,key=s+'/'+h;
      t.querySelector('.tv-stage-txt').textContent=`ระยะ ${s+1} · ${STAGES[s]}`;t.querySelector('.tv-dots').innerHTML=STAGES.map((_,j)=>`<i${j<=s?' class="on"':''}></i>`).join('');t.dataset.s=s;
      if(shown[i]!==key&&paint(i,s,h))shown[i]=key;});
  }
  let focalKey='';
  function renderFocal(s){
    root.querySelector('#tv-fnum').textContent=s+1;root.querySelector('#tv-fof').textContent=`ระยะที่ ${s+1} จาก 7`;root.querySelector('#tv-fname').textContent=STAGES[s];
    const c=root.querySelector('#tv-focal canvas');root.dataset.s=s;
    if(focalKey!==String(s)&&scene(c,s,0,true))focalKey=String(s);
  }
  function buildBoard(){
    const sorted=[...seed.plots].sort((a,b)=>b.points-a.points).slice(0,3),goal=seed.rewardGoal;
    root.querySelector('#tv-goal').textContent=`ครบ ${goal} รับรางวัลแรก`;
    root.querySelector('#tv-rank').innerHTML=sorted.map((p,i)=>`<li><b>${i+1}</b><span class="n">${esc(p.name)}</span><span class="pt">${p.points} / ${goal}</span><span class="bar"><i style="width:${Math.min(100,Math.round(p.points/goal*100))}%"></i></span></li>`).join('');
  }
  function setMode(m){
    mode=m;root.dataset.mode=m;const b=root.querySelector('#tv-badge'),pr=root.querySelector('#tv-progress'),f=root.querySelector('#tv-focal'),fm=root.querySelector('#tv-farm');
    b.textContent=m==='attract'?'วงจรการปลูกข้าว 7 ระยะ':'บัญชีสมมติของบูธ';
    root.querySelector('#tv-sub').textContent=m==='attract'?'ดูข้าวเติบโตทีละระยะ':'ภาพรวมฟาร์ม';
    pr.hidden=m!=='attract';f.hidden=m!=='attract';fm.hidden=m==='attract';
    if(m==='attract'){attractAt=Date.now();focalKey='';pr.innerHTML=STAGES.map((n,i)=>`<span data-i="${i}">${i+1}</span>`).join('');tick(true);}
    if(m==='idle'&&seed){shown=[];render();}
  }
  function tick(force){
    if(!seed)return;const now=Date.now();
    if(mode==='idle'){if(now-lastInput>=IDLE_MS)setMode('attract');else render();}
    if(mode==='attract'){
      const s=Math.min(6,Math.floor(((now-attractAt)%CYCLE_MS)/(CYCLE_MS/7)));renderFocal(s);
      root.querySelectorAll('#tv-progress span').forEach((e,i)=>{e.classList.toggle('on',i===s);e.classList.toggle('done',i<s);});}
  }
  function input(){lastInput=Date.now();if(mode!=='idle')setMode('idle');
    try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{});}catch{}}
  for(const ev of ['pointerdown','touchstart','keydown','mousedown'])addEventListener(ev,input,true);
  root.addEventListener('contextmenu',e=>e.preventDefault());
  fetch('assets/booth-seed.json').then(r=>r.json()).then(d=>{
    seed={rewardGoal:d.rewardGoal,rewardLabel:d.rewardLabel,plots:d.plots.slice(0,PLOTS)};
    root.querySelector('#tv-farm').innerHTML=seed.plots.map(tileHtml).join('');
    buildBoard();setMode('idle');setInterval(()=>tick(),400);
    window.__tv={get mode(){return mode;},attract:()=>setMode('attract')};
  }).catch(()=>{root.querySelector('#tv-farm').textContent='';});
})();
