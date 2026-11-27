'use strict';
(() => {
  const A=window.NalaArt,M=window.NalaMotion,$=s=>document.querySelector(s),icon=A.icon;
  /* RiceOS Android app copy (bundled in www/game/, https://localhost): API at the site with the app's Bearer token; back goes to the app '/'; no service worker. Same file on the web (NATIVE=false there). */
  const NATIVE=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
  const STORE='riceos-nalamun2-v1',STAMP='2026-11-07T12:00:00Z';
  const stageNames=['เตรียมดิน / หว่าน','กล้า','แตกกอ','ตั้งท้อง','ออกรวง','รวงเหลือง / สุกแก่','เก็บเกี่ยว'];
  const shortStages=['เตรียมดิน','กล้า','แตกกอ','ตั้งท้อง','ออกรวง','สุกแก่','เก็บเกี่ยว'];
  const healthNames=['ดี','เฝ้าระวัง','เสี่ยง','เสียหาย'],healthValues=[82,63,38,16],healthColors=['#507153','#8e8269','#9a6951','#9a6951'];
  const waterNames=['ขังน้ำ','ชื้น · เปียกสลับแห้ง','แห้ง'];
  const weatherNames=['แดดอ่อน','เมฆครึ้ม','ฝน','พายุ','หมอก / ควัน','ร้อนจัด'],weatherIcons=['sun','cloud','rain','storm','fog','hot'];
  const codes=['G01','G02','G03','G04','G06','G08','G09','G10','V01','G12'];
  const names=['นาริมตาล','นาลมเย็น','นาปลายคลอง','นาข้างศาลา','นาลมอ่อน','นาดอกหญ้า','นานกยาง','นาละอองฝน','นารวงอุ่น'];
  // Board = the user's own plots from /api/me (names verbatim). Without them (logged out, offline, no plots) the 9-slot sample board is shown and labelled "ข้อมูลตัวอย่าง".
  const SLOT_SETS=[[],[4],[4,1],[4,1,3],[4,1,3,0],[4,1,3,0,5],[4,1,3,0,5,7],[4,1,3,0,5,7,2],[4,1,3,0,5,7,2,6],[4,1,3,0,5,7,2,6,8]],SAMPLE='ข้อมูลตัวอย่าง';
  let user=null; // account from /api/me {uid,plots}
  let board=null; // {slots:[slot..], plots:{slot:{id,name,sow}}}
  window.NalaBoard={slots:null};
  const slotName=id=>board?(board.plots[id]?board.plots[id].name:''):names[id];
  const slotLabel=id=>board?slotName(id):names[id]+' ('+SAMPLE+')';
  const missions=[{id:'awd',title:'แวะอ่านท่อวัดน้ำ',detail:'ดูระดับน้ำจริง แล้วจดค่าที่เห็น',icon:'water',value:20},{id:'crop',title:'เดินดูใบและรวง',detail:'สังเกตต้นข้าว และจดสิ่งที่พบ',icon:'leaf',value:15},{id:'harvest',title:'เก็บข้าว เก็บฟางไว้',detail:'จดวันเกี่ยว และแผนดูแลฟางไม่เผา',icon:'harvest',value:200}];
  const stageFromDate=date=>{const days=Math.max(0,(Date.parse(STAMP)-Date.parse(date))/86400000);return [10,25,45,65,85,110].filter(n=>days>=n).length;};
  const base=()=>({version:1,selected:4,stage:stageFromDate('2026-08-24'),health:0,water:0,weather:1,tod:1,screen:'G02',plantedAt:'2026-08-24',updatedAt:STAMP,waterAt:STAMP,sound:false,intro:false,accepted:{},entries:[],cheers:[],points:0});
  function validTime(v){return typeof v==='string'&&/^\d{4}-\d\d-\d\dT/.test(v)&&Number.isFinite(Date.parse(v));}
  function inRange(v,a,b,fallback){return Number.isInteger(v)&&v>=a&&v<=b?v:fallback;}
  function restore(key=STORE){const s=base();try{const d=JSON.parse(localStorage.getItem(key)||'null');if(!d||d.version!==1)return s;for(const [k,max] of [['selected',8],['stage',6],['health',3],['water',2],['weather',5],['tod',3]])s[k]=inRange(d[k],0,max,s[k]);s.intro=d.intro===true;s.sound=d.sound===true;s.entries=Array.isArray(d.entries)?d.entries.filter(e=>e&&missions.some(m=>m.id===e.mission)&&validTime(e.at)&&typeof e.key==='string'&&e.key.length<60).slice(-90).map(e=>({key:e.key.slice(0,60),mission:e.mission,at:e.at,reading:typeof e.reading==='number'?Math.max(-50,Math.min(50,e.reading)):null,note:typeof e.note==='string'?e.note.slice(0,180):'',source:'self_report',confidence:1,status:'pending'})):[];s.accepted=d.accepted&&typeof d.accepted==='object'?Object.fromEntries(missions.filter(m=>validTime(d.accepted[m.id])).map(m=>[m.id,d.accepted[m.id]])):{};s.cheers=Array.isArray(d.cheers)?d.cheers.filter(v=>Number.isInteger(v)&&v>=0&&v<9).slice(0,9):[];s.updatedAt=validTime(d.updatedAt)?d.updatedAt:STAMP;s.waterAt=validTime(d.waterAt)?d.waterAt:STAMP;return s;}catch{return s;}}
  const params=new URLSearchParams(location.search);
  // Optional plot link (see game-dev2/PLOT-LINK.md): v, a, s, g, p from query or hash. Absent => no effect.
  const plotParams=new URLSearchParams(String(location.hash||'').replace(/^#\??/,''));
  const plotRaw=k=>params.has(k)?params.get(k):plotParams.get(k);
  // Back button to the app (same origin, path must start with /next/; anything else is ignored => no button)
  (function(){const b=params.get('back');if(!b||!/^\/(next\/)?[A-Za-z0-9_#\/%.\-]*$/.test(b)||b.indexOf('//')>-1||b.indexOf('..')>-1)return;
    const bar=document.querySelector('.topbar');if(!bar)return;const a=document.createElement('a');a.id='game-back';a.className='game-back';a.href=NATIVE?b.replace(/^\/next\//,'/'):b;a.setAttribute('aria-label','กลับหน้าแอป');a.innerHTML='<span aria-hidden="true">\u2039</span> กลับหน้าแอป';bar.insertBefore(a,bar.firstChild);document.body.classList.add('has-back');})();
  function readPlot(){const o={};
    const v=plotRaw('v');if(v!==null){const t=v.normalize('NFC').replace(/[^\w\u0E00-\u0E7F .\-]/g,'').trim().slice(0,24);if(t)o.variety=t;}
    const a=plotRaw('a');if(a!==null&&/^\d{1,4}(\.\d{1,2})?$/.test(a)){const n=Number(a);if(n>=0.1&&n<=1000)o.area=n;}
    const s=plotRaw('s');if(s!==null&&/^\d{4}-\d\d-\d\d$/.test(s)){const t=Date.parse(s+'T00:00:00+07:00');if(Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)>='2000'&&t<=Date.now()+86400000&&t>=Date.now()-400*86400000)o.sow=s;}
    const g=plotRaw('g');if(g!==null&&/^[0-6]$/.test(g))o.stage=Number(g);
    const p=plotRaw('p');if(p!==null&&/^[A-Za-z0-9_-]{1,32}$/.test(p))o.id=p;
    return Object.keys(o).length?o:null;}
  let plot=readPlot();
  const linked=['stage','health','water','weather','tod','screen','skipintro'].some(k=>params.has(k))||!!plot;
  let state=linked?base():restore(),savedStage=state.stage,savedHealth=state.health,preview=false,missionId='awd',introStep=0,lastFocus=null;
  for(const [key,max] of [['stage',6],['health',3],['water',2],['weather',5],['tod',3]]){const raw=params.get(key);if(raw!==null&&/^\d+$/.test(raw))state[key]=inRange(Number(raw),0,max,state[key]);}
  if(plot){if(plot.sow){state.plantedAt=plot.sow;const d=Math.max(0,(Date.now()-Date.parse(plot.sow+'T00:00:00+07:00'))/86400000);state.stage=[10,25,45,65,85,110].filter(n=>d>=n).length;}
    if(plot.stage!==undefined)state.stage=plot.stage;savedStage=state.stage;}
  // Missions survive leaving the page: a linked game starts from base(), so the mission part is kept per user (from /api/me) or per plot link, never shared with another user.
  let storeKey=STORE;const MISSION_KEYS=['entries','accepted','water','waterAt','cheers','intro','sound'];
  function useStore(key){storeKey=key;const d=restore(key);for(const k of MISSION_KEYS)state[k]=d[k];}
  if(plot&&plot.id)useStore(STORE+':p:'+plot.id);
  const requested=({village:'V01',harvest:'G12',farm:'G02',missions:'G08'})[params.get('screen')]||params.get('screen');
  const route=codes.includes(requested)?requested:null;
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const time=iso=>new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso))+' น.';
  const provenance=(source='ภาพจัดวางในเครื่อง',at=STAMP)=>`<div class="provenance">ที่มา: ${esc(source)} · เวลา ${time(at)}</div>`;
  function save(){state.updatedAt=new Date().toISOString();try{localStorage.setItem(storeKey,JSON.stringify({...state,stage:preview?savedStage:state.stage,health:preview?savedHealth:state.health,screen:'G02',points:0}));}catch{toast('พื้นที่บันทึกไม่พร้อม · เก็บได้เฉพาะรอบนี้');}}
  let toastTimer,audio,artReady=false,pendingArt=null;
  function toast(msg){const sh=$('#sheet'),host=sh?.open?sh:document.body;if(host?.appendChild&&$('#toast').parentNode!==host)host.appendChild($('#toast'));$('#toast').textContent=msg;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200);}
  function sound(harvest=false){if(!state.sound)return;if(audio){audio.pause();audio.currentTime=0;}audio=new Audio(harvest?'assets/sfx-harvest.wav':'assets/sfx-tap.wav');audio.volume=.3;audio.play().catch(()=>{});}
  function ring(big=false){return `<div class="health-ring" style="--value:${healthValues[state.health]};--ring:${healthColors[state.health]}${big?';width:132px;height:132px':''}"><div><strong>${healthValues[state.health]}</strong><small>/ 100</small></div></div>`;}
  const todayKey=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok'}).format(new Date());
  const COIN='<svg class="coin" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#e9b94a" stroke="#a9772a" stroke-width="2"/><circle cx="16" cy="16" r="10" fill="#f6d57a" stroke="#c99235" stroke-width="1.2"/><path d="M16 8.5c-3 2.4-3.4 6.4-.6 9.2 2.6-2.8 3.1-6.8.6-9.2zM16 17.5v6" fill="#7a9b3e" stroke="#4d6a24" stroke-width="1.6" stroke-linecap="round"/></svg>';
  function ordersHTML(){const day=todayKey(),pending=state.entries.filter(e=>e.status==='pending').reduce((n,e)=>n+((missions.find(m=>m.id===e.mission)||{}).value||0),0);
    const tokens=missions.map(m=>{const done=state.entries.some(e=>e.key===`${m.id}:${day}`),later=m.id==='harvest'&&state.stage<5&&!done;
      const attr=done?'data-action="order-done"':later?'data-action="order-later"':`data-accept="${m.id}"`;
      const label=(done?'จดแล้ววันนี้: ':later?'ยังไม่ถึงเวลา: ':'รับงาน: ')+m.title+' · +'+m.value+' แต้มเมื่อตรวจยืนยัน';
      return `<button class="order-token${done?' done':''}${later?' later':''}" ${attr} aria-label="${label}">${icon(m.icon)}<b>+${m.value}</b></button>`;}).join('');
    return `<section class="orders-strip" aria-label="ใบสั่งงานวันนี้"><div class="orders-title"><strong>ใบสั่งงาน</strong><span>วันนี้</span></div><div class="orders-row">${tokens}</div><button class="coin-pill" data-screen="G08" aria-label="แต้มรอตรวจ ${pending} ดูรายการงาน">${COIN}<span><b>${pending}</b><small>รอตรวจ</small></span></button></section>`;}
  function updateHUD(){
    const village=state.screen==='V01';
    $('#page-title').textContent=village?'หมู่บ้านเล็ก ๆ ที่ดูแลกัน':'แวะมาดูนา วันนี้เป็นอย่างไร';$('#eyebrow').textContent=village?'บ้านปลายคลอง · เติบโตไปด้วยกัน':(plot&&(plot.variety||plot.area)?['ข้าว '+(plot.variety||''),plot.area?plot.area+' ไร่':''].filter(Boolean).join(' · ').replace('ข้าว ','ข้าว'+' '):'บ้านปลายคลอง · ฤดูข้าวของเรา');
    {const pf=$('#plot-facts');if(pf){const mine=!!(user&&board&&board.mine),has=(mine||!!(plot&&(plot.variety||plot.area||plot.sow||plot.stage!==undefined)))&&!village;pf.hidden=!has;document.body.classList.toggle('has-plot',has);document.body.classList.toggle('has-switch',has&&mine&&user.plots.length>1);pf.classList.toggle('pf-mine',has&&mine);if(has){const f=[plot&&plot.variety?'ข้าว '+esc(plot.variety):'',plot&&plot.area?esc(plot.area)+' ไร่':''].filter(Boolean).join(' · ');
      if(mine){const cur=user.plots[board.cur],kr=board.n+' กระทง'+(board.n>board.shown?' (ภาพแสดง '+board.shown+')':''),line=[kr,f].filter(Boolean).join(' · '),lineHtml=[['kr',esc(kr)],['var',plot&&plot.variety?'ข้าว '+esc(plot.variety):''],['area',plot&&plot.area?esc(plot.area)+' ไร่':''],['stg',shortStages[state.stage]]].filter(x=>x[1]).map(x=>'<span class="nw pm-'+x[0]+'">'+x[1]+'</span>').join('');
        const pick=user.plots.length>1?'<div class="pf-pick pf-chips" role="group" aria-label="เลือกแปลง มี '+user.plots.length+' แปลง">'+user.plots.map((p,i)=>'<button type="button" class="pf-chip" data-plot="'+i+'" aria-pressed="'+(i===board.cur)+'"><span class="pc-n">'+esc(p.name)+'</span><span class="pc-k">'+p.kr+' กระทง</span></button>').join('')+'</div>':'<strong class="pf-name">'+esc(cur.name)+'</strong>';
        pf.innerHTML='<span class="pf-label">'+icon('farm')+(user.plots.length>1?'แปลงของคุณ '+(board.cur+1)+'/'+user.plots.length:'แปลงของคุณ')+'</span><span class="pf-stage">ระยะ: '+shortStages[state.stage]+'</span>'+pick+'<span class="pf-meta">'+lineHtml+'</span>';
        pf.setAttribute('aria-label','แปลง '+cur.name+' '+line+' ระยะ: '+shortStages[state.stage]);}
      else{pf.innerHTML='<span class="pf-label">'+icon('farm')+'แปลงของคุณ</span><span class="pf-stage">ระยะ: '+shortStages[state.stage]+'</span><strong>'+(f||'ข้าวในแปลง')+'</strong>';pf.setAttribute('aria-label','แปลงของคุณ '+(f||'')+' ระยะ: '+shortStages[state.stage]);}
      requestAnimationFrame(()=>document.documentElement.style.setProperty('--pf-h',Math.ceil(pf.getBoundingClientRect().height)+'px'));}}}
    $('#plot-name').textContent=village?'บ้านปลายคลอง':slotName(state.selected);$('#stage-label').textContent=village?'ข้าวต่างวัย ใจเดียวกัน':stageNames[state.stage];$('#stage-source').textContent='อิงวันปลูก';
    $('#scene-weather').innerHTML=`${icon(weatherIcons[state.weather])}<div><strong>${weatherNames[state.weather]}</strong><small>บรรยากาศในภาพ</small></div>`;
    $('#friend').setAttribute('aria-label','น้องละมุนชวนอ่านท่อวัดน้ำ');
    $('#plot-invite').hidden=true;
    document.body.classList.toggle('new-farmer',!state.intro&&state.entries.length===0);
    document.body.classList.toggle('village',village);
    if(village){$('#care-panel').innerHTML=`<section class="village-card"><h2>เพื่อนข้างคันนา</h2><p>แตะวงสี เพื่อแวะทักทายกัน</p><button class="primary" data-screen="G02">กลับนาของเรา ${icon('farm')}</button></section>`;}
    else{$('#care-panel').innerHTML=`<section class="health-card" data-screen="G04" role="button" tabindex="0" aria-label="สุขภาพแปลง ${healthValues[state.health]} จาก 100 ${healthNames[state.health]} ดูที่มา"><div class="health-body">${ring()}<div><div class="health-word" style="--ring:${healthColors[state.health]}">${healthNames[state.health]}</div><div class="health-note">ค่าภาพในเครื่อง<br>ยังไม่ใช่ผลตรวจ</div></div></div><div class="status-crop"><strong>สุขภาพนา · <b class="status-word" style="--ring:${healthColors[state.health]}">${healthNames[state.health]}</b></strong><span>${shortStages[state.stage]} · อิงวันปลูก</span><span class="status-health">ภาพในเครื่อง</span></div><span class="status-weather" aria-label="${weatherNames[state.weather]} · บรรยากาศในภาพ">${icon(weatherIcons[state.weather])}<span>${weatherNames[state.weather]}</span></span>${provenance()}<div class="compact-source">ที่มา: ภาพในเครื่อง<br>เวลา ${time(STAMP)}</div></section><section class="mission-card"><div class="eyebrow">${icon('mission')} วันนี้ ค่อย ๆ ดูแล</div><h2>${state.stage>=5?'เก็บข้าว เก็บฟางไว้':'วัดระดับน้ำที่แปลง'}</h2><p>${state.stage>=5?'จดวันเกี่ยว และสิ่งที่ทำกับฟาง':'อ่านขีดในท่อ · จดค่าจากนาจริง<br>เก็บไว้เทียบกับครั้งหน้า'}</p><p class="task-line">${state.stage>=5?'ข้าวสุกแล้ว · เก็บข้าว เก็บฟางไว้':['นายังดี · วัดระดับน้ำที่แปลง','นาต้องเฝ้าดู · วัดระดับน้ำที่แปลง','นาไม่สบาย · วัดน้ำ แล้วเดินดูใบ','นาไม่สบาย · วัดน้ำ แล้วเดินดูใบ'][state.health]}</p><button class="primary" data-action="${state.stage>=5?'harvest-task':'measure'}">${state.stage>=5?icon('harvest'):''} ${state.stage>=5?'เก็บเกี่ยว':'วัดน้ำในนา · ประมาณ 1 นาที'}</button>${provenance(state.waterAt!==STAMP?'บันทึกเอง · รอยืนยัน':'ภาพจัดวางในเครื่อง',state.waterAt)}<div class="compact-source">ที่มา: ${state.waterAt!==STAMP?'จดเอง · รอยืนยัน':'ภาพในเครื่อง'} · ${time(state.waterAt)}</div></section>`+ordersHTML();}
    {const hb=$('#harvest-bubble');if(hb)hb.hidden=village||state.stage!==5;document.body.classList.toggle('ripe-bubble',!village&&state.stage===5);}
    typeof requestAnimationFrame==='function'&&requestAnimationFrame(()=>{const hc=$('.health-card'),os=$('.orders-strip');if(hc&&os&&window.innerWidth<701)document.documentElement.style.setProperty('--os-top',Math.round(hc.getBoundingClientRect().bottom+8)+'px');});
    $('#world-source').textContent=!village&&board&&board.mine?`ที่มา: แปลง ${user.plots[board.cur].name} ในบัญชี RiceOS · ${board.n} กระทง · ภาพนาจัดวางในเครื่อง`:`ที่มา: ภาพ${village?'หมู่บ้าน':'นา'}จัดวางในเครื่อง · เวลา ${time(STAMP)} · ยังไม่เชื่อมแปลงจริง`;
    for(const b of document.querySelectorAll('.bottom-nav button')){const code=b.dataset.screen;b.classList.toggle('active',code===(village?'V01':['G08','G09','G10'].includes(state.screen)?'G08':state.screen==='G12'?'G12':'G02'));b.setAttribute('aria-current',b.classList.contains('active')?'page':'false');}
    $('#sound').innerHTML=icon(state.sound?'sound':'mute');$('#sound').setAttribute('aria-pressed',String(state.sound));$('#sound').setAttribute('aria-label',state.sound?'ปิดเสียง':'เปิดเสียง');
  }
  function targets(model){$('#field-targets').innerHTML=model.fields.map(p=>`<button class="field-target ${!model.village&&p.id===state.selected?'selected':''}" style="left:${Math.max(14,Math.min(86,p.x/10))}%;top:${(p.y+p.w*.20)/model.h*100}%" data-plot="${p.id}" aria-label="${model.village?'แวะทักเพื่อนบ้าน · '+esc(names[p.id]):esc(slotLabel(p.id))} · ${stageNames[state.stage]} · ${healthNames[state.health]}"><span>${esc(model.village?names[p.id]:slotName(p.id))}${!model.village&&!board?'<small class="smp">'+SAMPLE+'</small>':''}</span></button>`).join('');}
  function refresh(){updateHUD();M.set(state);}
  window.addEventListener('nalascene',e=>targets(e.detail));
  function showSheet(content,code){lastFocus=document.activeElement;const d=$('#sheet');$('#sheet-content').innerHTML=content;if(!d.open)d.showModal();if(code)d.dataset.screen=code;$('#sheet-content').scrollTop=0;d.scrollTop=0;}
  function close(){const d=$('#sheet');d.close();if(lastFocus?.isConnected)lastFocus.focus();if(state.screen!=='V01')state.screen='G02';updateHUD();M.set(state);}
  function footer(source='ภาพจัดวางในเครื่อง',at=STAMP){return `<div class="sheet-source">ที่มา: ${esc(source)} · เวลา ${time(at)}<br>บันทึกในอุปกรณ์นี้ · ยังไม่เชื่อมระบบตรวจหลักฐาน</div>`;}
  // sheet eyebrow = the bottom-menu section the sheet belongs to (same name + icon as the menu), so every page reads as one app
  const SECTION={G08:['mission','ภารกิจ'],G09:['mission','ภารกิจ'],G10:['mission','ภารกิจ'],V01:['village','หมู่บ้าน'],G12:['harvest','บันทึกฤดู'],RiceOS:['info','ที่มาข้อมูล']};
  function title(code,label,subtitle=''){const sec=SECTION[code]||['farm','นาของเรา'];return `<span class="eyebrow sheet-section">${icon(sec[0])}${sec[1]}</span><h2 id="sheet-title">${label}</h2>${subtitle?`<p class="sheet-subtitle">${subtitle}</p>`:''}`;}
  function tube(level=-15){return `<div class="tube-art" role="img" aria-label="ท่อวัดน้ำ ระดับ ${Math.abs(level)} เซนติเมตรใต้ผิวดิน"><span class="soil-line">ผิวดิน</span><div class="pipe" style="--water-height:${level===-5?68:33}%"></div><span class="level-line" style="top:${level===-5?53:58}%" id="tube-value">−${Math.abs(level)} ซม.</span></div>`;}
  function animateTube(){
    if(typeof requestAnimationFrame!=='function'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const el=$('#tube-value'),start=performance.now();
    function tick(now){if(!el?.isConnected)return;const q=Math.min(1,(now-start)/1800);el.textContent='−'+Math.round(5+10*q)+' ซม.';if(q<1)requestAnimationFrame(tick);}
    requestAnimationFrame(tick);
  }
  function beginMeasure(){
    state.intro=true;missionId='awd';if(!state.accepted.awd)state.accepted.awd=new Date().toISOString();save();M.react?.();sound();open('G06');
  }
  function open(code){
    if(!artReady&&['G01','G03','G12'].includes(code)){pendingArt=code;return;}
    pendingArt=null;
    if(code==='G01'){introStep=0;onboard();return;}
    if(code==='G02'||code==='V01'){if($('#sheet').open)$('#sheet').close();state.screen=code;refresh();return;}
    state.screen=code;updateHUD();
    if(code==='G03'){
      showSheet(title(code,'ข้าวเติบโตทีละระยะ','ดูใบ กอ และรวงที่เปลี่ยนไป')+`<div class="stage-grid">${shortStages.map((n,i)=>`<button class="stage-item ${state.stage===i?'active':''}" data-stage="${i}" aria-pressed="${state.stage===i}"><canvas width="260" height="184" data-preview="${i}" aria-hidden="true"></canvas>${n}</button>`).join('')}</div><p class="previews-label">สภาพต้นข้าวในภาพ</p><div class="condition-row">${healthNames.map((n,i)=>`<button class="condition ${state.health===i?'active':''}" data-health="${i}" aria-pressed="${state.health===i}">${n}</button>`).join('')}</div><div class="notice">ภาพวงจรสำหรับอ่านระยะ · ไม่เปลี่ยนวันปลูกหรือให้แต้ม<br>ระยะปัจจุบัน: อิงวันปลูก · ยังไม่มี GDD / NDVI</div><button class="primary" data-action="close" style="margin-top:18px">กลับไปชมทุ่งข้าว ${icon('arrow')}</button>`+footer(),code);
      document.querySelectorAll('[data-preview]').forEach(c=>{const ctx=c.getContext('2d');ctx.drawImage(A.cellAtlas[Number(c.dataset.preview)][state.health],0,0);});
    }
    if(code==='G04')showSheet(title(code,'สุขภาพแปลง','มองสี แล้วค่อยดูเหตุผล')+`<div class="health-body" style="justify-content:center;margin:20px 0">${ring(true)}<div><div class="health-word" style="--ring:${healthColors[state.health]}">${healthNames[state.health]}</div><p>ค่าภาพในเครื่อง<br>รอข้อมูลแปลงจริง</p></div></div><p>น้ำ · ปุ๋ย · โรค · บันทึก · ดิน</p>${[['น้ำ',30],['ปุ๋ย',25],['ไม่มีโรค',20],['บันทึก',15],['ดิน',10]].map(([n,w])=>`<div class="weight-row"><span>${n}</span><div class="bar"><i style="width:${w/30*100}%"></i></div><small>เต็ม ${w}</small></div>`).join('')}<div class="notice">น้ำหนักคะแนนตามเอกสาร RiceOS v1.0<br>ค่าที่เห็นยังไม่คำนวณจากเซ็นเซอร์หรือผลตรวจ<br>เกณฑ์สีในภาพ: ดี ≥70 · เฝ้าระวัง ≥40 · เสี่ยง ≥20 · เสียหาย &lt;20</div>`+footer(),code);
    if(code==='G06'){
      missionId='awd';
      showSheet(title(code,'วัดระดับน้ำ','อ่านขีดในท่อ แล้วจดค่าที่นาจริง')+tube()+`<form id="observation-form" class="measure-form"><label class="field-label" for="reading">ระดับน้ำเทียบผิวดิน (ซม.)</label><div class="measure-entry"><input id="reading" name="reading" type="number" inputmode="decimal" min="-50" max="50" step="1" placeholder="เช่น −15" required><button class="primary" type="submit">จดระดับน้ำ ${icon('check')}</button></div></form><details><summary>วิธีอ่านและจุดเติมน้ำ</summary><p>ต่ำกว่าผิวดินใช้ค่าลบ · ช่วงที่เหมาะกับ AWD เติมน้ำเมื่อในท่ออยู่ราว 15 ซม. ใต้ผิวดิน ดูระยะข้าว ฝน และคำแนะนำเจ้าหน้าที่ร่วมด้วย</p><p>ช่วงออกรวงควรสอบถามการรักษาระดับน้ำเฉพาะแปลง</p></details>`+footer(state.waterAt!==STAMP?'บันทึกเอง · รอยืนยัน':'ภาพในเครื่อง · แนวทาง AWD จากขอบเขตงาน',state.waterAt),code);animateTube();
    }
    if(code==='G08')showSheet(title(code,'งานเล็ก ๆ ของวันนี้','ทำที่นา แล้วกลับมาจดไว้')+'<div class="orders-board">'+missions.map(m=>{const done=state.entries.some(e=>e.key===`${m.id}:${todayKey()}`);return `<div class="row-card order${done?' done':''}">${icon(m.icon)}<div><strong>${m.title}</strong><p>${m.detail}</p><span class="reward">${COIN}+${m.value} แต้ม · รอตรวจ</span></div><button ${done?'data-action="order-done"':`data-accept="${m.id}"`}>${done?'จดแล้ว ✓':state.accepted[m.id]?'จดงาน':'รับงาน'}</button></div>`;}).join('')+'</div>'+`<div class="notice">รับภารกิจยังไม่ได้แต้ม<br>บันทึกเอง = ระดับ 1 · รอยืนยัน<br>แต้มที่ผ่านการตรวจในเครื่องนี้: <strong>0</strong></div>`+footer('รายการงานในเครื่องตาม RiceOS v1.0'),code);
    if(code==='G09')observation();
    if(code==='G10')receipt();
    if(code==='G12')season();
  }
  function observation(){
    const m=missions.find(m=>m.id===missionId)||missions[0];state.screen='G09';showSheet(title('G09',m.title,'จดเฉพาะสิ่งที่ทำหรือเห็นที่นาจริง')+`<form id="observation-form">${m.id==='awd'?`<label class="field-label" for="reading">ระดับน้ำเทียบผิวดิน (ซม.)</label><input id="reading" name="reading" type="number" inputmode="decimal" step="1" min="-50" max="50" placeholder="เช่น −15" required><p class="tiny" style="margin-top:6px">ต่ำกว่าผิวดินใช้ค่าลบ · เหนือผิวดินใช้ค่าบวก</p>`:''}<label class="field-label" for="note">สิ่งที่สังเกต${m.id==='awd'?' (ไม่บังคับ)':''}</label><input id="note" name="note" type="text" maxlength="180" placeholder="จดสั้น ๆ ไว้ให้ตัวเอง" ${m.id==='awd'?'':'required'}><div class="notice">บันทึกเอง · หลักฐานระดับ 1<br>เก็บเวลาในเครื่อง · ไม่ส่งรูปหรือพิกัด<br>รอการตรวจจากระบบ RiceOS ก่อนรับแต้ม</div><button class="primary" type="submit" style="margin-top:20px">บันทึกสิ่งที่พบ ${icon('check')}</button></form>`+footer('ผู้เล่นกรอกเอง',new Date().toISOString()),'G09');
  }
  function receipt(){
    const e=state.entries.at(-1),previous=e?.mission==='awd'?state.entries.filter(x=>x.mission==='awd'&&x!==e).at(-1):null;state.screen='G10';
    showSheet(title('G10',e?'จดไว้ให้แล้วนะ':'ยังไม่มีบันทึกใหม่')+`<div class="receipt-reading">${icon('check')}<strong>${e?.reading!==null&&e?.reading!==undefined?`ระดับน้ำ ${previous?String(previous.reading).replace('-','−')+' → ':''}${String(e.reading).replace('-','−')} ซม.`:e?missions.find(m=>m.id===e.mission).title:'ไปเลือกงานที่ทำจริง'}</strong></div>${e?.note?`<p>${esc(e.note)}</p>`:''}<p class="provenance">บันทึกเอง · รอยืนยัน · ระดับ 1<br>ที่มา: ผู้เล่น · ${time(e?.at||STAMP)} · แต้มที่ผ่านการตรวจ: 0</p><button class="primary" data-screen="G02">กลับคันนา ${icon('arrow')}</button>`,'G10');
  }
  function season(){
    if(!artReady){pendingArt='G12';return;}
    const harvest=state.entries.find(e=>e.mission==='harvest');state.screen='G12';const day=iso=>new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short'}).format(new Date(iso));
    showSheet(`<div class="season-art"><div class="season-heading">${title('G12',harvest?'เกี่ยวข้าวแล้ว':state.stage>=5?'ข้าวพร้อมเกี่ยว':'รอวันเกี่ยวข้าว')}</div><canvas id="season-picture" width="800" height="440" aria-label="ชาวนาเกี่ยวข้าวสีทองยามเย็น น้องละมุนเชียร์อยู่ข้างคันนา"></canvas><div id="season-grains" aria-hidden="true"></div></div><div class="record-card season-summary ${harvest?'is-done':'is-pending'}"><strong>${harvest?'ขอบคุณที่ดูแลกันทั้งฤดู':'พร้อมจดวันเกี่ยว'}</strong><p class="season-note">${harvest?'จดวันเกี่ยวแล้ว · รอยืนยัน':'เกี่ยวเสร็จวันไหน กดจดไว้ได้เลย'}</p><div class="season-stats"><div><b>${state.entries.length} ครั้ง</b><span>บันทึกในฤดู</span></div><div><b>${shortStages[state.stage]}</b><span>${harvest?'ระยะข้าว':'ระยะข้าวตอนนี้'}</span></div><div><b>${harvest?day(harvest.at):'รอจด'}</b><span>วันเกี่ยว</span></div></div></div><div class="sheet-actions"><button class="secondary" data-screen="G02">กลับคันนา</button><button class="primary" data-${harvest?'action="celebrate"':'accept="harvest"'}>${harvest?'ฉลองรวงข้าว':'จดวันเกี่ยว'} ${icon('harvest')}</button></div><details class="sheet-source season-source"><summary>ที่มา: บันทึกในเครื่อง · ${time(harvest?.at||state.updatedAt)}</summary><p>${harvest?'งานเกี่ยวรอยืนยัน · ':''}ระยะข้าวอิงวันปลูก · ยังไม่มีข้อมูลตาชั่ง · แต้มที่ผ่านการตรวจ 0</p></details>`,'G12');
    const c=$('#season-picture'),r=c.getBoundingClientRect();c.height=Math.round(800*(r.height/r.width||.95));A.illustration(c.getContext('2d'),800,c.height,state.stage,state.water,null,true,state.health);
  }
  function onboard(){
    state.screen='G01';const entries=[['มาเดินดูนากัน','แตะแปลงที่ส่องแสง แล้วอ่านท่อวัดน้ำ','ไปดูน้ำกัน'],['น้ำลด ดินยังชื้น','อ่านระดับน้ำในท่อ แทนการดูแค่ผิวนา','ดูจุดเติมน้ำ'],['ดูขีด −15 ซม.','เติมน้ำตามเกณฑ์ AWD และระยะข้าวในพื้นที่','ไปเดินดูนากัน']];
    const [head,copy,button]=entries[introStep];
    showSheet(`<span class="eyebrow">รู้จักนา · ${introStep+1} / 3</span><h2 id="sheet-title" class="intro-lead">${head}</h2>${introStep?`<div class="step-picture"><canvas id="intro-picture" width="800" height="440" aria-label="ท่อวัดน้ำ ลดถึง ${introStep===1?'−5 ซม.':'−15 ซม.'}"></canvas></div>`:''}<p>${copy}</p><div class="onboard-count">${[0,1,2].map(i=>`<i class="${i<=introStep?'active':''}"></i>`).join('')}</div><button class="primary" data-action="intro-next">${button} ${icon('arrow')}</button>`,'G01');
    if(introStep){const c=$('#intro-picture');A.illustration(c.getContext('2d'),800,440,state.stage,state.water,introStep===1?-5:-15);}
  }
  function neighbour(id){
    state.screen='V01';const h=id%3;
    showSheet(title('V01',names[id],'เพื่อนข้างคันนา')+`<div class="row-card">${icon('person')}<div><strong>${healthNames[h]} · ${[82,63,38][h]} / 100</strong><p>ระยะข้าวในภาพ · อิงวันปลูก</p></div></div><p>ฝากกำลังใจให้กัน แล้วกลับไปดูแลนาของเรา</p><div class="sheet-actions"><button class="secondary" data-action="close">กลับหมู่บ้าน</button><button class="primary" data-cheer="${id}">${state.cheers.includes(id)?'ฝากใจไว้แล้ว':'ส่งกำลังใจ'} ${icon('heart')}</button></div>`+footer('ภาพหมู่บ้านในเครื่อง · ยังไม่มีสมาชิกยืนยัน'),'V01');
  }
  function about(){showSheet(title('RiceOS','ที่มาและความสบายตา','ภาพนานี้เป็นข้อมูลในเครื่อง')+`<p>ไม่มีเซ็นเซอร์ อากาศสด หรือข้อมูลเพื่อนบ้านเชื่อมต่อ ภาพแปลงจัดวางเพื่อเล่าเรื่องนาไทย</p><div class="row-card">${icon('leaf')}<div><strong>ระยะข้าว: อิงวันปลูก</strong><p>วันปลูกตั้งต้น 24 ส.ค. 2569<br>ยังไม่มี GDD / NDVI ยืนยัน</p></div></div><div class="row-card">${icon('water')}<div><strong>น้ำ: ${waterNames[state.water]}</strong><p>ที่มา: ${state.waterAt===STAMP?'ภาพในเครื่อง':'บันทึกเอง · รอยืนยัน'}<br>เวลา ${time(state.waterAt)}</p></div></div><div class="row-card">${icon('cloud')}<div><strong>อากาศ: บรรยากาศในภาพ</strong><p>ไม่ใช่พยากรณ์หรือรายงานอากาศสด<br>ที่มา: ภาพในเครื่อง · ${time(STAMP)}</p></div></div><div class="condition-row"><button class="condition" data-screen="G03">ดูแปลงข้าว</button><button class="condition" data-screen="G06">อ่านท่อวัดน้ำ</button><button class="condition" data-action="large">ปรับตัวหนังสือใหญ่</button><button class="condition" data-action="still">เปิด / ปิดการเคลื่อนไหว</button></div><details><summary>เลือกบรรยากาศของภาพ</summary><label class="field-label" for="weather-look">ท้องฟ้าในภาพ</label><select id="weather-look">${weatherNames.map((n,i)=>`<option value="${i}" ${i===state.weather?'selected':''}>${n}</option>`).join('')}</select><label class="field-label" for="time-look">แสงข้างคันนา</label><select id="time-look">${['เช้า','กลางวัน','เย็น','ค่ำ'].map((n,i)=>`<option value="${i}" ${i===state.tod?'selected':''}>${n}</option>`).join('')}</select><p>ปรับเฉพาะภาพ ไม่เปลี่ยนข้อมูลอากาศจริง</p></details><details><summary>เสียงและสิทธิ์แบบอักษร</summary><p>ภาพและเสียงสร้างสำหรับนาละมุน เสียงสองจังหวะนำมาจากรุ่นก่อน แบบอักษร Sarabun และ Prompt ใช้ตาม SIL Open Font License 1.1</p><p id="font-license"></p></details>`+footer(),'about');Promise.all(['assets/fonts/Sarabun-OFL.txt','assets/fonts/Prompt-OFL.txt'].map(u=>fetch(u).then(r=>r.text()))).then(t=>{if($('#font-license'))$('#font-license').textContent=t.join('\n\n');}).catch(()=>{});}
  function burst(){sound(true);if((typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches)||document.body.classList.contains('still'))return;const root=$('#celebration'),from=$('#harvest-bubble').getBoundingClientRect(),to=($('.coin-pill')||$('#harvest-bubble')).getBoundingClientRect();root.replaceChildren();const fx=from.left+from.width/2,fy=from.top+from.height/2,tx=to.left+to.width/2-fx,ty=to.top+to.height/2-fy;for(let i=0;i<10;i++){const e=document.createElement('i');e.className='collect-grain';e.style.left=fx+'px';e.style.top=fy+'px';e.style.setProperty('--x',tx+'px');e.style.setProperty('--y',ty+'px');e.style.setProperty('--r',(Math.cos(i*2.4)*60)+'px');e.style.animationDelay=(i*45)+'ms';root.append(e);}setTimeout(()=>root.replaceChildren(),1200);}
  function celebrate(){sound(true);toast('ขอบคุณที่ดูแลข้าว และเก็บฟางไว้ให้ดิน');if(matchMedia('(prefers-reduced-motion: reduce)').matches||document.body.classList.contains('still'))return;const root=$('#season-grains')||$('#celebration');root.replaceChildren();for(let i=0;i<28;i++){const e=document.createElement('i');e.className='grain';e.style.left='50%';e.style.top='55%';e.style.setProperty('--x',`${Math.cos(i*2.39996)*(Math.min(160,root.getBoundingClientRect().width*.40||140))}px`);e.style.setProperty('--y',`${Math.sin(i*2.39996)*Math.min(120,root.getBoundingClientRect().height*.35||100)-25}px`);root.append(e);}setTimeout(()=>root.replaceChildren(),1700);}
  document.addEventListener('click',e=>{
    const b=e.target.closest('button,[role="button"]');if(!b)return;
    if(b.dataset.screen){sound();open(b.dataset.screen);}
    if(b.dataset.plot!==undefined){if(state.screen==='V01'){neighbour(Number(b.dataset.plot));}else{state.selected=Number(b.dataset.plot);stageForSelected();save();updateHUD();M.set(state);if(state.stage<5)beginMeasure();else{missionId='harvest';observation();}}}
    if(b.dataset.accept){missionId=b.dataset.accept;if(!state.accepted[missionId]){state.accepted[missionId]=new Date().toISOString();save();toast('รับงานไว้แล้ว · ยังไม่ได้แต้ม');}observation();}
    if(b.dataset.stage!==undefined){state.stage=Number(b.dataset.stage);preview=true;M.set(state);updateHUD();open('G03');}
    if(b.dataset.health!==undefined){state.health=Number(b.dataset.health);preview=true;M.set(state);updateHUD();open('G03');}
    if(b.dataset.cheer!==undefined){const id=Number(b.dataset.cheer);if(!state.cheers.includes(id)){state.cheers.push(id);save();updateHUD();toast('ฝากกำลังใจไว้ในเครื่องแล้ว');}else toast('ฝากกำลังใจไว้แล้ว');}
    const act=b.dataset.action;if(act==='order-done')toast('งานนี้จดไว้แล้ววันนี้ · พรุ่งนี้มีงานใหม่');if(act==='order-later')toast('ข้าวยังไม่สุก · รอถึงระยะเก็บเกี่ยวก่อนนะ');if(act==='collect'){burst();if(!state.accepted.harvest){state.accepted.harvest=new Date().toISOString();save();}missionId='harvest';M.react?.();setTimeout(observation,650);}if(act==='measure')beginMeasure();if(act==='harvest-task'){missionId='harvest';if(!state.accepted.harvest){state.accepted.harvest=new Date().toISOString();save();}M.react?.();observation();}if(act==='about')about();if(act==='close')close();if(act==='intro-next'){introStep++;if(introStep<3)onboard();else{state.intro=true;save();open('G02');}}if(act==='large')document.body.classList.toggle('large');if(act==='still'){const still=document.body.classList.toggle('still');M.setStill(still);}if(act==='celebrate')celebrate();
  });
  document.addEventListener('keydown',e=>{if(e.target.matches('[role="button"]')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.target.click();}});
  document.addEventListener('submit',e=>{if(e.target.id!=='observation-form')return;e.preventDefault();const now=new Date().toISOString(),today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok'}).format(new Date(now)),key=`${missionId}:${today}`;if(state.entries.some(e=>e.key===key)){toast('งานนี้จดไว้แล้ววันนี้ · ไม่มีแต้มซ้ำ');receipt();return;}const form=new FormData(e.target),reading=missionId==='awd'?Number(form.get('reading')):null,note=String(form.get('note')||'').trim().slice(0,180);if(missionId==='awd'&&(!Number.isFinite(reading)||reading< -50||reading>50))return;const entry={key,mission:missionId,at:now,reading,note,source:'self_report',confidence:1,status:'pending'};state.entries.push(entry);if(missionId==='awd'){state.water=reading>=0?0:reading>=-15?1:2;state.waterAt=now;}if(missionId==='harvest'){state.stage=6;savedStage=6;preview=false;}save();M.set(state);M.react?.();if(missionId==='harvest'){season();celebrate();}else receipt();});
  document.addEventListener('change',e=>{if(e.target.id==='weather-look'){state.weather=Number(e.target.value);refresh();}if(e.target.id==='time-look'){state.tod=Number(e.target.value);refresh();}});
  $('#close-sheet').addEventListener('click',close);$('#sheet').addEventListener('cancel',()=>{if(state.screen!=='V01')state.screen='G02';updateHUD();M.set(state);});$('#sheet').addEventListener('click',e=>{if(e.target===$('#sheet')){const r=$('#sheet').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
  $('#sound').addEventListener('click',()=>{state.sound=!state.sound;save();updateHUD();sound();});
  const nav=[['G02','farm','นาของเรา'],['G08','mission','ภารกิจ'],['V01','village','หมู่บ้าน'],['G12','harvest','บันทึกฤดู']];nav.forEach(([code,i,t])=>{$(`.bottom-nav [data-screen="${code}"]`).innerHTML=icon(i)+`<span>${t}</span>`;});
  $('.header-right [data-action="about"]').innerHTML=icon('info');$('.round-button[data-screen="G03"]').innerHTML=icon('eye');
  function stageForSelected(){const bp=board&&board.plots[state.selected];if(!bp||!bp.sow)return;const d=(Date.now()-Date.parse(bp.sow+'T00:00:00+07:00'))/86400000;if(!Number.isFinite(d)||d<0||d>400)return;state.stage=[10,25,45,65,85,110].filter(n=>d>=n).length;savedStage=state.stage;}
  async function loadUser(){
    if(params.get('tv')==='1'||typeof fetch!=='function')return null;
    try{const ctl=typeof AbortController==='function'?new AbortController():null,t=setTimeout(()=>ctl&&ctl.abort(),3500);
      let tk=null;if(NATIVE){try{tk=localStorage.getItem('riceos.token');}catch{}if(!tk)return null;}
      const r=await fetch((NATIVE?'https://riceos.donaus.com':'')+'/api/me',NATIVE?{headers:{Authorization:'Bearer '+tk},cache:'no-store',signal:ctl?ctl.signal:undefined}:{credentials:'same-origin',cache:'no-store',signal:ctl?ctl.signal:undefined});clearTimeout(t);
      if(!r.ok)return null;const j=await r.json(),u=j&&j.user,ps=(Array.isArray(j&&j.plots)?j.plots:[]).filter(p=>p&&typeof p.id==='string'&&p.id).slice(0,50);
      if(!u||!u.public_id)return null;
      return {uid:String(u.public_id).replace(/[^\w-]/g,'').slice(0,40),plots:ps.map((p,i)=>({id:p.id,name:typeof p.name==='string'&&p.name!==''?p.name:'แปลงที่ '+(i+1),sow:typeof p.sow_date==='string'&&/^\d{4}-\d\d-\d\d/.test(p.sow_date)?p.sow_date.slice(0,10):'',kr:Number.isInteger(p.kratong_count)&&p.kratong_count>0?Math.min(30,p.kratong_count):1,variety:typeof p.variety==='string'?p.variety.slice(0,24):'',rai:Number.isFinite(Number(p.rai))&&Number(p.rai)>0?Math.round(Number(p.rai)*100)/100:0}))};
    }catch{return null;}
  }
  // 24 Nov (PingEris): one plot at a time. A switcher picks the plot; the board shows that plot's kratongs (kratong_count from the database, up to 9 drawn).
  // Missions are kept per user + plot (the first plot keeps the older per-user record).
  const selKey=()=>STORE+':sel:'+user.uid;
  function setPlot(i,first){
    const cur=user.plots[i],n=cur.kr,shown=Math.min(9,n),slots=SLOT_SETS[shown],pid=cur.id.replace(/-/g,'');
    board={slots,plots:{},byId:{},mine:true,cur:i,n,shown};slots.forEach((sl,k)=>{board.plots[sl]={name:'กระทง '+(k+1),sow:cur.sow};});board.byId[pid]=slots[0];
    window.NalaBoard.slots=slots;
    const linkedHere=!!(first&&plot&&plot.id===pid);
    plot={id:pid,variety:cur.variety||(linkedHere?plot.variety:undefined),area:cur.rai||(linkedHere?plot.area:undefined),sow:cur.sow||undefined,stage:linkedHere?plot.stage:undefined};
    const key=STORE+':u:'+user.uid+':p:'+pid;let has=false;try{has=localStorage.getItem(key)!==null;}catch{}
    if(!has&&i===0)useStore(STORE+':u:'+user.uid);else useStore(key);storeKey=key;
    try{localStorage.setItem(selKey(),pid);}catch{}
    state.selected=slots[0];
    if(cur.sow){stageForSelected();state.plantedAt=cur.sow;}else if(plot.stage!==undefined){state.stage=plot.stage;savedStage=state.stage;}else if(!first){state.stage=base().stage;savedStage=state.stage;}
    if(!first){save();updateHUD();M.set(state);}
  }
  function applyUser(u){
    if(!u||!u.uid)return;
    useStore(STORE+':u:'+u.uid);
    if(!u.plots.length)return;
    user=u;
    let i=plot&&plot.id?u.plots.findIndex(p=>p.id.replace(/-/g,'')===plot.id):-1;
    if(i<0){let sv=null;try{sv=localStorage.getItem(selKey());}catch{}i=Math.max(0,u.plots.findIndex(p=>p.id.replace(/-/g,'')===sv));}
    setPlot(i,true);
  }
  // plot chips (no native select; 25 Nov): tap a chip -> that plot, board = its kratong_count from /api/me
  document.addEventListener('click',e=>{const c=e.target.closest&&e.target.closest('[data-plot]');if(!c||!user)return;const i=Number(c.dataset.plot);if(Number.isInteger(i)&&i>=0&&i<user.plots.length&&(!board||i!==board.cur)){sound();setPlot(i,false);const n=document.querySelector('.pf-chip[data-plot="'+i+'"]');if(n){if(e.detail===0)n.focus({preventScroll:true});n.scrollIntoView({block:'nearest',inline:'nearest'});}}});
  async function boot(){applyUser(await loadUser());updateHUD();await M.mount(state);artReady=true;if(pendingArt)open(pendingArt);else if(route)open(route);}
  boot();if(!NATIVE&&'serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
