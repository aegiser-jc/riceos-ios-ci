'use strict';
(() => {
  const A=window.NalaArt,{C,parts}=A,reduced=matchMedia('(prefers-reduced-motion: reduce)');
  // Cached painted cutouts attached to local transform nodes.
  class Bone {
    constructor(name,x=0,y=0,px=0,py=0){Object.assign(this,{name,x,y,px,py,angle:0,sx:1,sy:1,children:[]});}
    add(bone){this.children.push(bone);return bone;}
    draw(g){g.save();g.translate(this.x,this.y);g.rotate(this.angle);g.scale(this.sx,this.sy);if(parts[this.name])g.drawImage(parts[this.name],-this.px,-this.py);this.children.forEach(c=>c.draw(g));g.restore();}
  }
  let terrain,living,tg,lg,model,state,scale=1,terrainScale=1,raf=0,start=0,still=false,visible=true,frame=0,patches=[],patchRect=null,lastPaint=0,glow=null,reactionUntil=0,ready=false,cropCaches=new Map(),signature='',lamp=null;
  const active=()=>!document.hidden&&!reduced.matches&&!still&&visible;
  function paintAnimals(g,t){
    const h=model.h,phone=model.phone;
    A.sprite(g,'buffalo-side',phone?220:145,h*(phone?.738:.86), (phone?258:125)*(1+Math.sin(t*1.8)*.008),false,true,state.tod);
    const bt=t%24,bx=(phone?500:470)+Math.sin(t*.23)*190,by=h*(phone?.62:.69);
    g.save();g.translate(bx+Math.sin(t*.45)*22,by-Math.sin(bt/18*Math.PI)*25);g.rotate(Math.sin(t*2)*.035);g.scale(1,.95+Math.sin(t*5)*.05);
    A.sprite(g,'egret-fly',0,0,phone?86:45,false,false,state.tod);g.restore();
    const cheer=reactionUntil>Date.now()||state.screen==='G12';
    const inviting=state.entries.length===0&&state.stage<5&&!model.village;
    A.sprite(g,cheer?'mascot-cheer':inviting?'mascot-point':'mascot-wave',phone?805:640,h*(phone?.735:.86), (phone?200:108)*(1+Math.sin(t*2)*.009),inviting,true,state.tod);
    if(state.water===0){for(let i=0;i<2;i++){const phase=(t*.35+i*.5)%1;g.globalAlpha=(1-phase)*.45;g.strokeStyle=C[27];g.lineWidth=1.1;g.beginPath();g.ellipse(400+i*130,h-37-i*18,8+phase*32,2+phase*7,0,0,6.29);g.stroke();}g.globalAlpha=1;}
  }
  function fieldLook(p){return model.village?{stage:[2,4,5,3,4,5,2,4,3][p.id],health:p.id%3}:{stage:state.stage,health:state.health};}
  function plotCache(p,phase=0){
    const key=p.id+':'+phase;if(cropCaches.has(key))return cropCaches.get(key);
    const look=fieldLook(p),size=p.w/230,x=p.x-p.w-42*size,y=p.y-p.w/2-115*size,w=p.w*2+84*size,h=p.w+145*size;
    const c=A.make(Math.ceil(w*terrainScale),Math.ceil(h*terrainScale)),g=c.getContext('2d');g.setTransform(terrainScale,0,0,terrainScale,-x*terrainScale,-y*terrainScale);
    A.drawRice(g,p,look.stage,look.health,phase*Math.PI/4,p.id===state.selected?1:0,state.tod);
    if(model.village)A.clearYard(g,model,p);
    if((state.tod===0||state.tod===2)&&look.stage>0&&look.stage<6){
      const rim=A.make(c.width,c.height),r=rim.getContext('2d');r.drawImage(c,1,-1);
      r.globalCompositeOperation='source-in';r.fillStyle=C[state.tod===2?31:12];r.fillRect(0,0,rim.width,rim.height);
      r.globalCompositeOperation='destination-out';r.drawImage(c,0,0);
      g.save();g.setTransform(1,0,0,1,0,0);g.globalAlpha=state.tod===2?.48:.32;g.drawImage(rim,0,0);g.restore();
    }
    const cache={c,x,y,w,h};cropCaches.set(key,cache);return cache;
  }
  function plants(g,phase=0){
    for(const p of [...model.fields].sort((a,b)=>a.y-b.y)){
      const a=plotCache(p,p.id===state.selected?phase:0);
      g.drawImage(a.c,a.x,a.y,a.w,a.h); // p15: plots are fully opaque (no ground/olive haze through the rice)
    }
    // Village farmers stand on the bund to the lower-right of their plot, drawn after all crops so no rice covers them.
    if(model.village)A.villageLife(g,model); // p11: houses + farmers on their routes, depth-sorted, above the crops
    if(!model.village){const p=model.fields.find(p=>p.id===state.selected);if(p){
      // p15: crisp selection outline on the bund only -- dark under-stroke + thin gold line, no wide cream wash over the rice.
      A.path(g,A.points(p.x,p.y,p.w+3,p.w/2+1.5),null,'#1f2a1c66',model.phone?4:2.5);
      A.path(g,A.points(p.x,p.y,p.w+3,p.w/2+1.5),null,C[31],model.phone?2.2:1.4);
    }}
  }
  function buildWorld(){
    patches=[];patchRect=null;glow=null;cropCaches.clear();A.prepareTone(state.tod);tg.setTransform(terrainScale,0,0,terrainScale,0,0);A.terrain(tg,model,state);
    const selected=model.fields.find(p=>p.id===state.selected);
    if(selected&&!model.village){
      const w=selected.w+32,h=selected.w/2+32,c=A.make(w*2,h*2),g=c.getContext('2d');
      // p15: glow lives just outside the plot edge (inner side masked out) so it never washes the rice.
      A.path(g,A.points(w,h,selected.w+8,selected.w/2+4),null,C[31]+'55',model.phone?7:4);
      g.globalCompositeOperation='destination-out';A.path(g,A.points(w,h,selected.w+1,selected.w/2+.5),'#000');g.globalCompositeOperation='source-over';
      glow={c,x:selected.x-w,y:selected.y-h,w:w*2,h:h*2};
    }
    if(selected&&!model.village&&state.stage>0&&state.stage<6){
      const rect={x:Math.max(0,Math.floor((selected.x-selected.w-42)*terrainScale)),y:Math.max(0,Math.floor((selected.y-selected.w/2-122)*terrainScale)),w:Math.ceil((selected.w*2+84)*terrainScale),h:Math.ceil((selected.w+158)*terrainScale)};
      rect.w=Math.min(rect.w,terrain.width-rect.x);rect.h=Math.min(rect.h,terrain.height-rect.y);
      const ground=A.make(rect.w,rect.h);ground.getContext('2d').drawImage(terrain,rect.x,rect.y,rect.w,rect.h,0,0,rect.w,rect.h);
      for(let phase=0;phase<3;phase++){
        const c=A.make(rect.w,rect.h),g=c.getContext('2d');g.drawImage(ground,0,0);g.setTransform(terrainScale,0,0,terrainScale,-rect.x,-rect.y);plants(g,phase);patches.push(c);
      }patchRect=rect;
    }
    plants(tg);
    lamp=A.make(180,140);const g=lamp.getContext('2d'),gr=g.createRadialGradient(90,70,3,90,70,85);gr.addColorStop(0,C[31]+'c0');gr.addColorStop(.25,C[31]+'60');gr.addColorStop(1,C[31]+'00');g.fillStyle=gr;g.fillRect(0,0,180,140);
  }
  function draw(t=0){
    if(!lg||!model||!ready)return;
    lg.setTransform(scale,0,0,scale,0,0);lg.clearRect(0,0,1000,model.h);
    if(patchRect){const r=patchRect;lg.drawImage(patches[[0,1,2,1][Math.floor(t*5)%4]],r.x/terrainScale,r.y/terrainScale,r.w/terrainScale,r.h/terrainScale);}
    if(glow){lg.globalAlpha=.30+Math.sin(t*2)*.10;lg.drawImage(glow.c,glow.x,glow.y,glow.w,glow.h);lg.globalAlpha=1;}
    if(reactionUntil>Date.now()&&!model.village){
      const p=model.fields.find(p=>p.id===state.selected),q=1-(reactionUntil-Date.now())/2200;
      lg.globalAlpha=(1-q)*.9;lg.strokeStyle=C[12];lg.lineWidth=5;lg.beginPath();lg.ellipse(p.x,p.y,20+q*p.w,7+q*p.w/2,0,0,6.29);lg.stroke();
      for(let i=0;i<12;i++){const a=i*2.39996,x=p.x+Math.cos(a)*q*140,y=p.y+Math.sin(a)*q*45-q*75;A.line(lg,[[x-4,y],[x+4,y]],C[31],2);A.line(lg,[[x,y-4],[x,y+4]],C[12],2);}lg.globalAlpha=1;
    }
    paintAnimals(lg,t);
    if(state.weather===2||state.weather===3){
      lg.beginPath();lg.strokeStyle=C[27]+'ee';lg.lineWidth=3.2;
      for(let i=0;i<96;i++){const x=(i*139+t*110)%1060-30,y=(i*173+t*690)%model.h;lg.moveTo(x,y);lg.lineTo(x-13,y+43);}lg.stroke();
      lg.beginPath();lg.strokeStyle=C[27]+'80';lg.lineWidth=1.8;
      for(let i=0;i<14;i++){const q=(t*.8+i*.13)%1,x=130+A.noise(i+8)*740,y=model.oy+50+A.noise(i+17)*model.step*2;lg.moveTo(x+q*20,y);lg.ellipse(x,y,q*20,q*6,0,0,6.29);}lg.stroke();
    }
    if(state.weather===5){lg.globalAlpha=.28;lg.strokeStyle=C[31];lg.lineWidth=3;lg.beginPath();for(let i=0;i<6;i++){const x=80+i*160+Math.sin(t*1.2+i)*8,y=model.oy+90+i%3*70;lg.moveTo(x,y);lg.bezierCurveTo(x-10,y-12,x+15,y-26,x+5,y-40);}lg.stroke();lg.globalAlpha=1;}
    if(state.tod===2||state.tod===3){
      const x=model.cx+(model.phone?360:320),y=model.oy+model.step*(model.phone?3.0:2.5)-24;
      lg.globalAlpha=.85+Math.sin(t)*.1;lg.drawImage(lamp,x-90,y-70);A.ellipse(lg,x,y,9,11,C[31]);lg.globalAlpha=1;
      if(state.tod===3)for(let i=0;i<18;i++){const x=130+A.noise(i+2)*750+Math.sin(t*.5+i)*22,y=model.oy+170+A.noise(i+8)*model.step*2+Math.cos(t*.7+i)*12;lg.globalAlpha=.25+Math.max(0,Math.sin(t*1.2+i))*.6;A.ellipse(lg,x,y,2.5,2.5,C[9]);}lg.globalAlpha=1;
    }
  }
  function tick(now){raf=0;if(!active())return;if(!start)start=now;if(now-lastPaint>30){draw((now-start)/1000);lastPaint=now;frame++;}raf=requestAnimationFrame(tick);}
  function wake(){if(!ready)return;if(raf)cancelAnimationFrame(raf);raf=0;draw(0);if(active())raf=requestAnimationFrame(tick);}
  function dimensions(){
    const rect=terrain.getBoundingClientRect();if(!rect.width||!rect.height)return false;
    const dpr=Math.min(2,devicePixelRatio||1),height=Math.round(rect.height/rect.width*1000);
    const liveDpr=Math.min(2,devicePixelRatio||1);/* p16: same density as terrain so the animated selected plot is not softer than its neighbours */terrainScale=rect.width*dpr/1000;scale=rect.width*liveDpr/1000;
    terrain.width=Math.round(rect.width*dpr);terrain.height=Math.round(rect.height*dpr);living.width=Math.round(rect.width*liveDpr);living.height=Math.round(rect.height*liveDpr);
    model=A.sceneModel(height,state.screen==='V01',window.NalaBoard&&window.NalaBoard.slots);return true;
  }
  function sceneKey(){const r=terrain.getBoundingClientRect();return [r.width,r.height,devicePixelRatio,state.stage,state.health,state.water,state.weather,state.tod,state.selected,state.screen==='V01',(window.NalaBoard&&window.NalaBoard.slots||[]).join(',')].join(':');}
  function resize(){
    if(!ready)return;const key=sceneKey();if(signature===key)return;signature=key;
    if(!dimensions())return;buildWorld();draw(0);window.dispatchEvent(new CustomEvent('nalascene',{detail:model}));
  }
  async function mount(s){
    state=s;terrain=document.getElementById('terrain');living=document.getElementById('living');tg=terrain.getContext('2d',{alpha:false});lg=living.getContext('2d');
    if(dimensions()){tg.setTransform(terrainScale,0,0,terrainScale,0,0);A.firstFrame(tg,model,state);window.dispatchEvent(new CustomEvent('nalascene',{detail:model}));}
    // Yield a painted field before image decoding or detailed cache construction.
    await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
    await A.init();ready=true;resize();new ResizeObserver(resize).observe(terrain.parentElement);new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;wake();}).observe(terrain);wake();
  }
  function set(s){state=s;if(ready){resize();wake();}}
  reduced.addEventListener('change',wake);document.addEventListener('visibilitychange',wake);
  window.NalaMotion={mount,set,draw,resize,react(){reactionUntil=Date.now()+2200;wake();},setStill(value){still=value;wake();},get model(){return model;},get frames(){return frame;},Bone};
})();
