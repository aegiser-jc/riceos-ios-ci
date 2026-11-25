'use strict';
(() => {
  const C=['#263b33','#0c5139','#28704a','#507153','#366b3d','#4e843c','#6f9c3b','#8eb13f','#b1c94f','#d4da89','#b8ab6c','#c9b881','#dfcfaa','#eee8d8','#fafaf3','#2f3836','#5f5b4e','#78715e','#8e8269','#ab9676','#645344','#846a4d','#a88a60','#c4a66e','#637e8b','#849fa9','#a7bfcc','#cbd8de','#e4e9e4','#9a6951','#bd815e','#dfba70','#544137','#795d47','#9a7a5a'];
  const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const noise=n=>{const a=Math.sin(n*127.1+311.7)*43758.5453;return a-Math.floor(a);};
  function path(g,pts,fill,stroke,width=1){g.beginPath();pts.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}}
  function ellipse(g,x,y,rx,ry,color,rot=0){g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,rot,0,Math.PI*2);g.fill();}
  function line(g,pts,color,width=1){g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.beginPath();pts.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.stroke();}
  function curve(g,points,color,width=1){g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.beginPath();g.moveTo(points[0],points[1]);g.bezierCurveTo(...points.slice(2));g.stroke();}
  const grainAtlas=[], cellAtlas=[], parts={};
  let riceImage,riceData,riceClumps,clumpData,fieldTiles;
  function buildRice(){
    for(let stage=0;stage<7;stage++){
      grainAtlas[stage]=[];cellAtlas[stage]=[];
      for(let health=0;health<4;health++){
        let cached;
        Object.defineProperty(cellAtlas[stage],health,{get(){
          if(!cached){cached=make(260,184);const g=cached.getContext('2d');path(g,points(130,112,123,61),C[stage===6?34:25]);drawRice(g,{id:4,x:130,y:112,w:123},stage,health);}
          return cached;
        }});
      }
    }
  }
  const sprites={};let materials;
  const loadImage=async src=>{const im=new Image();im.src=src;await im.decode();return im;};
  const spriteFiles={
    'buffalo-front':'assets/buffalo-front.webp','buffalo-side':'assets/buffalo-side.webp','buffalo-back':'assets/buffalo-back.webp',
    'egret-fly':'assets/egret-fly.webp','sala':'assets/sala.webp','palm':'assets/palm.webp',
    'banana':'assets/banana.webp','bush':'assets/bush.webp','hat-post':'assets/hat-post.webp','sheaves':'assets/sheaves.webp','harvest-scene':'assets/harvest-scene.webp',
    'mascot-wave':'assets/mascot-wave.webp','mascot-point':'assets/mascot-point.webp','mascot-cheer':'assets/mascot-cheer.webp',
    'bank':'assets/bank.webp','house-b':'assets/house-b.webp','house-c':'assets/house-c.webp','neighbour-0':'assets/neighbour-0.webp','neighbour-1':'assets/neighbour-1.webp','neighbour-2':'assets/neighbour-2.webp',
    'backdrop-tall':'assets/backdrop-tall.webp','backdrop-wide':'assets/backdrop-wide.webp','field-base':'assets/field-base.webp'
  };
  async function init(){
    const results=await Promise.allSettled([loadImage('assets/ground.webp'),loadImage('assets/rice-fields.webp'),Promise.resolve(null),loadImage('assets/rice-clumps.webp'),fetch('assets/rice-clumps.json').then(r=>r.json()),...Object.entries(spriteFiles).map(async([name,src])=>{sprites[name]=await loadImage(src);})]);
    materials=results[0].value;fieldTiles=results[1].value;riceClumps=results[3].value;clumpData=results[4].value;buildRice();
    // p12: the mascot read pale against the painted bank; a mild contrast/saturation regrade baked once.
    for(const n of ['mascot-wave','mascot-point','mascot-cheer']){const im=sprites[n];if(!im)continue;const c=make(im.width,im.height),q=c.getContext('2d');q.filter='contrast(1.03) saturate(1.08) brightness(.98)';q.drawImage(im,0,0);q.filter='none';q.globalCompositeOperation='source-atop';const u=q.createLinearGradient(0,c.height*.45,0,c.height);u.addColorStop(0,'#2c3f2c00');u.addColorStop(.6,'#2c3f2c3c');u.addColorStop(.9,'#2c3f2c74');u.addColorStop(1,'#2c3f2c94');q.fillStyle=u;q.fillRect(0,0,c.width,c.height);{const w=c.width,h=c.height,t=make(w,h),tq=t.getContext('2d');tq.fillStyle='#21362a';tq.fillRect(0,0,w,h);tq.globalCompositeOperation='destination-out';tq.filter=`blur(${Math.round(w*.04)}px)`;tq.drawImage(im,0,0);tq.filter='none';tq.globalCompositeOperation='destination-in';const v=tq.createLinearGradient(0,0,0,h);v.addColorStop(0,'#0000');v.addColorStop(.4,'#0007');v.addColorStop(1,'#000f');tq.fillStyle=v;tq.fillRect(0,0,w,h);q.globalAlpha=.6;q.drawImage(t,0,0);q.globalAlpha=1;}/* rim occlusion on the lower body = volume */sprites[n]=c;} // p16: restrained underside shade so the mascot sits as heavy as the buffalo
  }
  const spriteTones=new Map();
  function prepareTone(tod){
    if(tod===1)return;
    for(const name of ['buffalo-side','egret-fly','mascot-wave','mascot-point','mascot-cheer']){
      const key=name+':'+tod;if(spriteTones.has(key)||!sprites[name])continue;
      const im=sprites[name],c=make(im.width,im.height),g=c.getContext('2d');g.drawImage(im,0,0);
      g.globalCompositeOperation='source-atop';g.globalAlpha=[.12,0,.22,.55][tod];g.fillStyle=['#efb6b0','','#c96e35','#102b52'][tod];g.fillRect(0,0,c.width,c.height);spriteTones.set(key,c);
    }
  }
  // Soft contact shadow in the field's own shadow colour (multiply), falling lower-right of an upper-left sun.
  function contactShadow(g,x,y,rx,ry,alpha=.5){
    g.save();g.globalCompositeOperation='multiply';g.globalAlpha=alpha;g.translate(x,y);g.scale(1,ry/rx);
    const r=g.createRadialGradient(0,0,0,0,0,rx);r.addColorStop(0,'#4a3c26');r.addColorStop(.4,'#5e4e32c8');r.addColorStop(.75,'#8a7c5250');r.addColorStop(1,'#a0946a00');
    g.fillStyle=r;g.beginPath();g.arc(0,0,rx,0,Math.PI*2);g.fill();g.restore();
  }
  // p14: one light for every grounded figure and house, the same upper-left sun as the rice clumps (compose_clumps): warm key on the
  // upper-left, cool bounce on the shaded lower-right, pond-water colour carried into the lower edge (baked once per image).
  const LIT=/^(buffalo|mascot|sala|house|neighbour|hat-post)/,litCache=new WeakMap(),castCache=new WeakMap();
  function lit(im){
    let c=litCache.get(im);if(c)return c;const w=im.width,h=im.height;c=make(w,h);const q=c.getContext('2d'),m=make(w,h),mq=m.getContext('2d');
    q.drawImage(im,0,0);mq.drawImage(im,0,0);mq.globalCompositeOperation='source-in';
    const d=mq.createLinearGradient(w*.05,h*.05,w*.95,h*.95);d.addColorStop(0,'#ffd88ccc');d.addColorStop(.42,'#ffe6b000');d.addColorStop(.6,'#3c566400');d.addColorStop(1,'#2c4656c0');
    mq.fillStyle=d;mq.fillRect(0,0,w,h);q.globalCompositeOperation='soft-light';q.drawImage(m,0,0);
    q.globalCompositeOperation='source-atop';const b=q.createLinearGradient(0,h*.8,0,h);b.addColorStop(0,'#6c968c00');b.addColorStop(1,'#6c968c66');q.fillStyle=b;q.fillRect(0,h*.8,w,h*.2);
    litCache.set(im,c);return c;
  }
  // p14: cast shadow = the sprite's own blurred silhouette laid flat toward the lower-right, darkest at the feet and fading with height.
  function castShadow(g,im,x,y,width,height,flip=false,alpha=.3){
    let c=castCache.get(im);const pad=Math.ceil(im.height*.04);
    if(!c){c=make(im.width+pad*2,im.height+pad*2);const q=c.getContext('2d');q.filter=`blur(${pad*.5}px)`;q.drawImage(im,pad,pad);q.filter='none';q.globalCompositeOperation='source-in';
      const f=q.createLinearGradient(0,pad,0,im.height+pad);f.addColorStop(0,'#4a3c2633');f.addColorStop(.6,'#4a3c26aa');f.addColorStop(1,'#4a3c26');q.fillStyle=f;q.fillRect(0,0,c.width,c.height);castCache.set(im,c);}
    const k=width/im.width;g.save();g.globalCompositeOperation='multiply';g.globalAlpha=alpha;g.translate(x,y);g.transform(1,0,-.62,-.24,0,0);if(flip)g.scale(-1,1);
    g.drawImage(c,-width/2-pad*k,-height-pad*k,c.width*k,c.height*k);g.restore();
  }
  // p15: tight dark contact under each hoof / foot (x frac, bottom y frac, foot width frac of the sprite), measured from the alpha.
  const FEET={'buffalo-side':[[.321,.974,.123],[.593,.998,.127],[.8,.967,.106]],'mascot-wave':[[.322,.994,.167],[.675,.983,.182]],'mascot-point':[[.3,.992,.163],[.63,.996,.156]],'mascot-cheer':[[.338,.985,.17],[.668,.998,.163]],
    'neighbour-0':[[.326,.997,.159],[.782,.956,.153]],'neighbour-1':[[.329,.977,.2],[.711,.997,.155]],'neighbour-2':[[.207,.964,.18],[.695,.997,.159]],'hat-post':[[.44,.985,.5],[.43,.999,.12]]};
  function footContacts(g,name,x,y,width,height,flip=false,alpha=.6){
    for(const [fx,fy,fw] of FEET[name]||[]){const px=x+(flip?.5-fx:fx-.5)*width,py=y-(1-fy)*height+height*.004,rx=Math.max(2.5,fw*width*.62);
      contactShadow(g,px+rx*.12,py,rx,Math.max(1.2,rx*.26),alpha);}
  }
  function sprite(g,name,x,y,height,flip=false,shadow=true,tod=1){
    let im=spriteTones.get(name+':'+tod)||sprites[name];if(!im)return;const width=height*im.width/im.height;
    if(LIT.test(name))im=lit(im);
    // p10: one sun (upper-left) for every grounded sprite: soft cast to the lower-right + tight contact core under the feet.
    g.save();if(shadow){castShadow(g,im,x,y,width,height,flip,.42);contactShadow(g,x+width*.12,y-height*.004,width*.4,Math.max(5,height*.05),.22);contactShadow(g,x+width*.03,y-height*.008,width*.27,Math.max(3,height*.026),.5);footContacts(g,name,x,y,width,height,flip);}
    g.translate(x,y);if(flip)g.scale(-1,1);g.drawImage(im,-width/2,-height,width,height);g.restore();
  }
  function background(g,w,h,phone,horizon,coverage=1){
    const im=sprites[phone?'backdrop-tall':'backdrop-wide'];
    if(!im){g.fillStyle=C[26];g.fillRect(0,0,w,h);return;}
    const sourceHorizon=im.height*(phone?.623:.58);
    g.fillStyle=C[24];g.fillRect(0,0,w,h);
    const k=Math.max(w/im.width,(h*coverage-horizon)/(im.height-sourceHorizon));
    g.save();g.filter='contrast(1.12) saturate(.92)';g.drawImage(im,(w-im.width*k)/2,horizon-sourceHorizon*k,im.width*k,im.height*k);g.restore();
  }
  const points=(x,y,w=124,h=62)=>[[x,y-h],[x+w,y],[x,y+h],[x-w,y]];
  function texture(g,k,x,y,w=124,h=62){
    g.save();path(g,points(x,y,w,h));g.clip();g.translate(x,y-h);g.transform(w/256,h/256,-w/256,h/256,0,0);
    if(materials?.complete&&materials.naturalWidth)g.drawImage(materials,k*256,0,256,256,0,0,256,256);else{g.fillStyle=C[k===3?25:k===4?18:5];g.fillRect(0,0,256,256);}g.restore();
  }
  function grass(g,x,y,count=15,seed=0,scale=1){for(let i=0;i<count;i++){const xx=x+(noise(i+seed)-.5)*44*scale,yy=y+noise(i*3+seed)*10*scale;curve(g,[xx,yy,xx-4,yy-5*scale,xx+2,yy-11*scale,xx+(noise(i+9)-.5)*10,yy-14*scale],C[4+i%3],1.1*scale);}}
  function palm(g,x,y,s=1){sprite(g,'palm',x,y,190*s);}
  // p10: grounded stilt house: trodden earth pad, cast shadow to the lower-right (same sun as sprites), dark footing under each post.
  // p12: per-homestead variation baked once from sala.webp: edge softened toward the painted landscape, wood tint, weathered roof.
  // p13: three cottage silhouettes: sala (gable + corner porch), house-b (low hip roof, long veranda, side stair), house-c (tall gable, lean-to kitchen, ladder).
  // feet = stilt bottoms, door = where the trodden route starts (fractions of the sprite); k = size trim.
  const HOUSES={sala:{feet:[[.128,.914],[.426,.997],[.726,.857],[.88,.795]],door:[.23,1.035],k:1},'house-b':{feet:[[.433,.899],[.594,.822],[.753,.745],[.913,.668]],door:[.185,.99],k:.94},'house-c':{feet:[[.457,.92],[.655,.849],[.852,.778],[.226,.976],[.403,.912]],door:[.9,.985],k:1}};
  function houseVariant(i,base='sala'){
    const key=base+'-v'+i;if(sprites[key])return key;const im=sprites[base];if(!im)return 'sala';
    const w=im.width,h=im.height,c=make(w,h),q=c.getContext('2d'),R=h*.48;
    q.filter=['blur(1.1px) saturate(.9) contrast(.93)','blur(1.1px) saturate(.8) contrast(.9) brightness(1.04)','blur(1.1px) saturate(.94) contrast(.94) brightness(.94)'][i];q.drawImage(im,0,0);q.filter='none';
    q.globalCompositeOperation='source-atop';
    q.globalAlpha=[.07,.12,.09][i];q.fillStyle=['#b07a40','#7f7f74','#8a5a32'][i];q.fillRect(0,0,w,h);
    const gr=q.createLinearGradient(0,0,0,R);gr.addColorStop(0,'#6d6a5c');gr.addColorStop(1,'#6d6a5c00');q.globalAlpha=[.12,.32,.2][i];q.fillStyle=gr;q.fillRect(0,0,w,R);
    for(let j=0;j<70;j++){const x=noise(j*7+i*91)*w,y=noise(j*3+i*17)*R*.85,l=R*(.06+noise(j+i*5)*.16);q.globalAlpha=(.08+.1*noise(j*11+i))*[.6,1.3,1][i];q.strokeStyle=j%4?'#4a4538':'#66743f';q.lineWidth=1+noise(j+i)*2.2;q.beginPath();q.moveTo(x,y);q.lineTo(x+(noise(j)-.5)*3,y+l);q.stroke();}
    sprites[key]=c;return key;
  }
  function sala(g,x,y,s=1,name='sala',base='sala'){
    const im=sprites[name]||sprites.sala;if(!im)return;const hm=HOUSES[sprites[name]?base:'sala'],H=205*s*im.height/371*hm.k,W=H*im.width/im.height;
    g.save();g.globalAlpha=.5;ellipse(g,x+W*.04,y-H*.06,W*.5,H*.13,'#a3966a');g.restore();
    contactShadow(g,x+W*.2,y-H*.07,W*.52,H*.12,.36);
    for(const [fx,fy] of hm.feet){const px=x+(fx-.5)*W+W*.02,py=y-(1-fy)*H;contactShadow(g,px+W*.02,py,Math.max(4,W*.07),Math.max(2,W*.02),.55);contactShadow(g,px,py,Math.max(3,W*.04),Math.max(1.5,W*.013),.85);}
    if(sprites[name])castShadow(g,lit(sprites[name]),x,y,W,H,false,.38);
    sprite(g,name,x,y,H,false,false);
  }
  function sceneModel(h,village=false,slots=null){
    // p10 desktop: board centred in the field column left of the 360px sidebar (~0..733 of 1000), smaller step for margins.
    // p11 phone farm: camera pulled back (step 228 -> 156) so the outer plot corners sit inside the frame with a water margin;
    // the board centre, horizon and foreground sala keep their p10 screen positions.
    const phone=h>1100,cx=phone?500:366,base=h*.325+26,full=phone?(village?205:228):102,step=phone&&!village?156:full;
    const oy=phone?base+full-step:h*.285,hor=(phone?base:oy)-full*.58,sy=(phone?base:oy)+full*(phone?3.0:2.5);
    const ids=village?[0,1,3,5,7,8]:(Array.isArray(slots)&&slots.length?slots:[0,1,2,3,4,5,6,7,8]); // slots: only the farmer's own plots are drawn
    return {h,oy,hor,sy,phone,cx,step,village,fields:ids.map(id=>({id,u:id%3,v:Math.floor(id/3),x:cx+(id%3-Math.floor(id/3))*step,y:oy+(id%3+Math.floor(id/3))*step/2,w:step*.94}))};
  }
  function terrain(g,model,state){
    const {h,oy,phone,cx,step,village,hor=oy-step*.58,sy=oy+step*(phone?3.0:2.5)}=model;
    g.clearRect(0,0,1000,h);background(g,1000,h,phone,hor,phone?.72:.86);
    const base=sprites['field-base'];
    if(base){const k=step/285.3;g.save();if(!village&&model.fields.length<9){g.beginPath();for(const p of model.fields){points(p.x,p.y,step+2,step/2+1).forEach((q,i)=>i?g.lineTo(...q):g.moveTo(...q));g.closePath();}g.clip();}g.drawImage(base,cx-1024*k,oy+step-576*k,2048*k,1152*k);g.restore();} // spare slots: no painted paddy
    for(const p of model.fields){
      const water=village?p.id%3:state.water,w=p.w,hh=w/2;
      if(base){
        if(water>0||state.stage===6&&!village){g.save();path(g,points(p.x,p.y,w-6,hh-3));g.clip();g.globalAlpha=water===2?.55:.3;texture(g,state.stage===6&&!village?6:water===2?1:2,p.x,p.y,w-6,hh-3);g.globalAlpha=1;
          if(water===2&&state.stage<4){for(let j=0;j<25;j++){const x=p.x-w+noise(j+p.id*32)*w*2,y=p.y-hh+noise(j+31)*hh*2;line(g,[[x-10,y-6],[x,y],[x+6,y+10],[x+19,y+13]],C[16]+'80',1.4);}}
          g.restore();}
      }else{
      g.save();g.globalAlpha=.25;path(g,points(p.x+9,p.y+17,w+7,hh+5),C[15]);g.restore();
      path(g,points(p.x,p.y+5,w+7,hh+5),C[16]);texture(g,4,p.x,p.y,w+3,hh+1.5);texture(g,5,p.x,p.y,w+1,hh+.5);
      path(g,points(p.x,p.y,w,hh),null,C[20],2);line(g,[[p.x-w,p.y],[p.x,p.y-hh],[p.x+w,p.y]],C[12]+'40',1.2);
      texture(g,state.stage===6&&!village?6:water===0?3:water===1||state.stage===5&&state.health<2?2:1,p.x,p.y,w-5,hh-2.5);
      g.save();path(g,points(p.x,p.y,w-5,hh-2.5));g.clip();
      if(water===0){const im=sprites[phone?'backdrop-tall':'backdrop-wide'];if(im)g.drawImage(im,im.width*.20,im.height*(phone?.70:.68),im.width*.58,im.height*.18,p.x-w,p.y-hh,w*2,hh*2);}
      const refl=g.createLinearGradient(p.x,p.y-hh,p.x,p.y+hh);refl.addColorStop(0,C[27]+(water===0?'28':'18'));refl.addColorStop(.5,C[26]+(water===0?'20':'00'));refl.addColorStop(1,C[32]+'35');g.fillStyle=refl;g.fillRect(p.x-w,p.y-hh,w*2,hh*2);
      if(water===0){for(let i=0;i<16;i++){const x=p.x-w+noise(i+p.id*8)*w*2,y=p.y-hh+noise(i+12)*hh*2;line(g,[[x,y],[x+24,y-2]],C[27]+'65',2);}}
      if(water===2&&state.stage<4){for(let j=0;j<25;j++){const x=p.x-w+noise(j+p.id*32)*w*2,y=p.y-hh+noise(j+31)*hh*2;line(g,[[x-10,y-6],[x,y],[x+6,y+10],[x+19,y+13]],C[16]+'80',1.4);}}
      if(state.stage===0&&!village)for(let j=0;j<10;j++)line(g,[[p.x-w*.8+j*w*.085,p.y-hh*.1+j*hh*.085],[p.x+j*w*.085,p.y-hh*.9+j*hh*.085]],C[17]+'90',4);
      path(g,points(p.x,p.y,w-10,hh-5),null,C[16]+'40',4);g.restore();
      for(let j=0;j<14;j++){const t=j/14;grass(g,p.x-w+w*t,p.y+hh*t,4,j+p.id*22,.75);grass(g,p.x+w-w*t,p.y+hh*t,4,j+p.id*40,.75);}
      }
      const tx=p.x+w*.57,ty=p.y+hh*.15;
      ellipse(g,tx+7,ty+4,15,5,C[16]+'70');path(g,[[tx-6,ty],[tx-6,ty-37],[tx+7,ty-37],[tx+7,ty]],C[13]);path(g,[[tx+2,ty],[tx+2,ty-37],[tx+7,ty-37],[tx+7,ty]],C[26]);ellipse(g,tx,ty-37,8,3.5,C[14]);ellipse(g,tx,ty-37,4,1.7,C[16]);for(let j=0;j<5;j++)ellipse(g,tx-1,ty-5-j*6,1.2,1.2,C[17]);
    }
    const fg=phone?h*.745:h*.86;
    const front=model.fields.find(p=>p.id===8)||model.fields.slice().sort((a,b)=>(b.u+b.v)-(a.u+a.v)||b.u-a.u)[0];
    if(front){
      const x=front.x+front.w*.82,y=front.y+front.w*.09,end=phone?h*.70:h*.80;
      line(g,[[x,y],[x+65,y+70],[x+110,end]],C[20],phone?24:16);
      line(g,[[x-2,y-2],[x+63,y+68],[x+108,end-2]],C[19],phone?17:11);
      for(let j=0;j<12;j++){const t=j/11;grass(g,x+112*t,y+(end-y)*t,3,j+817,phone?.8:.5);}
    }

    // Soft earthen landing blends into the painted water instead of a flat green fill.
    const bank=g.createLinearGradient(0,fg-65,0,h);
    // Light grass-edged bund earth (sampled from field-base), not a heavy dark strip.
    bank.addColorStop(0,'#9aa06200');bank.addColorStop(.18,'#9aa062c8');bank.addColorStop(.42,'#a9a068');bank.addColorStop(1,'#8c8054');
    g.fillStyle=bank;g.beginPath();g.moveTo(0,fg-60);g.bezierCurveTo(260,fg-130,740,fg-20,1000,fg-95);g.lineTo(1000,h);g.lineTo(0,h);g.fill();
    if(phone)sprite(g,'bank',500,h*.815,370,false,false);
    else if(sprites.bank)g.drawImage(sprites.bank,0,h*.72,1000,h*.28);
    sala(g,cx+(phone?360:320),sy,phone?.86:.52,houseVariant(0));
    // p11: village homesteads are drawn after the rice (villageLife); the ground layer only carries their trodden landings and paths.
    if(village){bundPaths(g,model);for(const p of model.fields)homeGround(g,model,p);}
    sprite(g,'palm',phone?55:55,fg+25,phone?350:230);
    sprite(g,'banana',phone?-6:6,h*(phone?.91:.98),phone?370:190);
    sprite(g,'bush',phone?92:155,h*(phone?.86:.97),phone?175:95);
    sprite(g,'hat-post',phone?965:915,h*(phone?.82:.97),phone?205:150);
    sprite(g,'bush',1020,h*.95,phone?240:135);
    // Time and atmosphere are baked once into the terrain cache.
    const tints=[['#efb6b0',.18],null,['#c96e35',.28],['#102b52',.72]];
    if(tints[state.tod]){g.save();g.globalAlpha=tints[state.tod][1];g.fillStyle=tints[state.tod][0];g.fillRect(0,0,1000,h);g.restore();}
    if(state.weather===2||state.weather===3){g.fillStyle='#344e6270';g.fillRect(0,0,1000,h);}
    if(state.weather===4){g.fillStyle=C[27]+'75';g.fillRect(0,0,1000,h);}
    if(state.weather===5){g.fillStyle=C[31]+'22';g.fillRect(0,0,1000,h);}
    if(state.tod===2||state.tod===3){
      const lx=cx+(phone?360:320),ly=sy-50;
      path(g,[[lx-9,ly-17],[lx+7,ly-17],[lx+7,ly+4],[lx-9,ly+4]],C[31]);
      line(g,[[lx-11,ly-19],[lx+9,ly-19]],C[20],4);
    }
  }
  // Bases remain inside the bund; standing foliage can rise above its rear edge.
  function hill(g,stage,variant,health,x,y,height,angle=0,phase=0,seed=0){
    if(stage>=4&&riceClumps&&clumpData){
      const m=clumpData.stages[stage-4][variant],k=height/(m.py-3);
      g.save();g.translate(x,y+2);g.scale(seed%2?-k:k,k);g.rotate(angle);
      g.drawImage(riceClumps,m.x,m.y+health*clumpData.healthStride,m.w,m.h,-m.px,-m.py,m.w,m.h);g.restore();return;
    }
    if(!riceImage||!riceData){line(g,[[x,y],[x+height*.18,y-height]],C[health>1?10:7],2);return;}
    const m=riceData.stages[stage-1][variant],k=height/(m.py-3),sy=m.y+health*riceData.healthStride;
    g.save();g.translate(x,y);g.scale(seed%2?-k:k,k);g.rotate(angle);
    g.drawImage(riceImage,m.x,sy,m.w,m.h,-m.px,-m.py,m.w,m.h);
    if(m.heads){
      g.translate(0,m.hy-m.py);g.rotate((stage===5?.22:stage===4?.10:0)+Math.sin(phase-.65)*.035);
      g.drawImage(riceImage,m.x+riceData.headsOffset,sy,m.w,m.h,-m.px,-m.hy,m.w,m.h);
    }g.restore();
  }
  // Whole-plot painted tiles: one Blender blockout per stage (same ortho camera and sun), painted with SDXL+ControlNet+IP-Adapter.
  // Atlas cells 512x384, two seeds per stage; plot diamond centre (256,226.5), half-width 241.35.
  function drawRice(g,p,stage,health,t=0,wind=0,tod=1){
    if(stage===0)return;
    if(fieldTiles){
      const w3=fieldTiles.width>=1536,k=p.w/241.35,v=w3?[0,1,2,2,0,1,1,2,0][p.id%9]:(p.id+Math.floor(p.id/3))%2,W=Math.ceil(512*k),H=Math.ceil(384*k),c=make(W,H),o=c.getContext('2d');
      const sway=stage<6?Math.sin(t)*(wind?.012:.006):0;
      o.save();o.translate(W/2,226.5*k);o.transform(1,0,sway,1,0,0);if(stage>=2&&stage<6){const fs=[[1,1],[.95,1.07],[.97,.9],[1,.94],[.92,1.1],[.98,1],[.95,1.05],[1,.9],[.93,1.02]][p.id%9];o.scale(fs[0],fs[0]*fs[1]);}if((health>=2&&p.id%2)||(w3&&health<2&&[0,0,1,0,1,1,1,0,0][p.id%9]))o.scale(-1,1);const sick=health>=2&&stage>=2&&stage<=5&&fieldTiles.height>=3072;o.filter=health>=2&&stage>=2&&stage<6?(health===3?'hue-rotate(-14deg) saturate(.72) brightness(.97) contrast(.95)':'hue-rotate(-8deg) saturate(.82) brightness(.99)'):stage>=2&&stage<6?['contrast(.93) brightness(1.04) saturate(1.02)','contrast(.98) brightness(1.02) saturate(1.04)','contrast(1.03) brightness(1) saturate(1.06)','contrast(1.09) brightness(.97) saturate(1.08)','contrast(1.14) brightness(.94) saturate(1.1)'][p.u===undefined?2:p.u+p.v]:'none';o.imageSmoothingQuality='high';o.drawImage(fieldTiles,sick?(w3&&(stage-2)%2?1+(p.id+Math.floor(p.id/3))%2:(stage-2)%2)*512:v*512,sick?(6+((stage-2)>>1))*384:(stage-1)*384,512,384,-256*k,-226.5*k,512*k,384*k);o.restore();
      if(health>0){o.globalCompositeOperation='source-atop';o.globalAlpha=sick?[0,0,.04,.16][health]:[0,.10,.24,.36][health];o.fillStyle=['','#d8c25a','#b9973f','#8a6a3a'][health];o.fillRect(0,0,W,H);o.globalAlpha=1;}
      // p14: damaged plots get broad wind-directional swathes of collapsed stems over exposed muddy water.
      if(sick){const sd=p.id*131+stage*7,dir=[.94,.34],sw=[],n=2,P=(u,v)=>[W/2+(u-v)*p.w/2,226.5*k+(u+v)*p.w/4];
        if(health===3)sw.push([-.4+noise(sd+21)*.5,-.2+noise(sd+23)*.5,.55+noise(sd+25)*.3,.05]);for(let s=0;s<n;s++)sw.push([-.95+noise(sd+s*3)*.45,-.75+s*1.45/(n-.4)+(noise(sd+s*5)-.5)*.3,.75+noise(sd+s)*.5,(health===3?.075:.055)*(.8+noise(sd+s*9)*.5)]);
        const blob=fn=>{for(const [u0,v0,len,wid] of sw)for(let i=0;i<=14;i++){const t=i/14,u=u0+dir[0]*len*t,v=v0+dir[1]*len*t;if(Math.abs(u)>.9||Math.abs(v)>.9)continue;fn(...P(u,v),wid*(1-Math.abs(t-.45)*.8)*p.w*(.8+noise(sd+i*7)*.4),i);}};
        o.save();path(o,points(W/2,226.5*k,p.w*.97,p.w*.485));o.clip();
        o.globalCompositeOperation='destination-out';o.globalAlpha=.97;blob((x,y,r)=>ellipse(o,x,y-3*k,r,r*.52,'#000'));
        o.globalCompositeOperation='destination-over';o.globalAlpha=1;blob((x,y,r)=>ellipse(o,x,y,r*1.04,r*.54,'#6e6b57'));
        o.globalCompositeOperation='source-atop';o.globalAlpha=.32;blob((x,y,r,i)=>{if(i%3===1)ellipse(o,x-r*.2,y-r*.08,r*.55,r*.12,'#a9a58c');});
        const dx=(dir[0]-dir[1])/2,dy=(dir[0]+dir[1])/4,dl=Math.hypot(dx,dy),ux=dx/dl,uy=dy/dl;o.globalCompositeOperation='source-over';
        blob((x,y,r,i)=>{for(let j=0;j<11;j++){const q=noise(sd+i*17+j),a=(q-.5)*r*1.6,b=(noise(q*97+j)-.5)*r*.7,cx=x+a*.35-b*uy,cy=y+a*.12+b*ux*.5,L=r*(.75+noise(j*13+i)*.7),bend=(noise(i+j*5)-.5)*.35;
          o.globalAlpha=.85;o.strokeStyle=['#8c7447','#6f5b38','#a88f5c','#7d6a45'][j%4];o.lineWidth=(1.1+noise(j+i*3))*k;o.beginPath();o.moveTo(cx-ux*L*.5,cy-uy*L*.5);o.lineTo(cx+(ux+bend*uy)*L*.5,cy+(uy-bend*ux)*L*.5);o.stroke();}});
        // p15: comb lodged straw over the surviving canopy so no tuft reads as upright mature rice.
        o.globalCompositeOperation='source-atop';for(let j=0;j<170;j++){const u=noise(sd+j*3.1)*1.8-.9,v=noise(sd+j*5.7)*1.8-.9,[x,y]=P(u,v),L=p.w*(.025+noise(sd+j)*.04),bend=(noise(sd+j*9)-.5)*.9;
          o.globalAlpha=.42;o.strokeStyle=['#9b8556','#7e6a43','#b49c66'][j%3];o.lineWidth=(.7+noise(j*7)*.7)*k;o.beginPath();o.moveTo(x-ux*L*.5,y-uy*L*.5-2*k);o.lineTo(x+(ux+bend*uy)*L*.5,y+(uy-bend*ux)*L*.5);o.stroke();}
        o.restore();o.globalAlpha=1;o.globalCompositeOperation='source-over';}
      // p15: every plot gets its own planting gaps -- a wandering water channel, irregular open-water pockets and bund-edge bites -- so neighbours never share one canopy outline.
      if(stage>=2&&stage<6&&!sick){const sd=p.id*977+stage*31,P=(u,v)=>[W/2+(u-v)*p.w/2,226.5*k+(u+v)*p.w/4],sh=[],kind=p.id%4;
        const walk=(u,v,du,dv,len,wid,n)=>{for(let i=0;i<=n;i++){const t=i/n,w=Math.sin(t*5.5+sd)*.07;sh.push([u+du*len*t-dv*w,v+dv*len*t+du*w,wid*(.65+noise(sd+i*5)*.7)]);}};
        if(stage>=3);else if(kind===0)walk(-.95,-.35+noise(sd)*.7,1,0,1.9,.045,22);else if(kind===1)walk(-.35+noise(sd)*.7,-.95,0,1,1.9,.04,22);else if(kind===2)walk(-.95,-.95+noise(sd+1)*.4,.85,.55,1.3,.035,16);
        for(let i=0,m=(stage>=3?0:1)+Math.floor(noise(sd+3)*(stage>=3?1.8:2.6));i<m;i++){const du=noise(sd+i*11)-.5,dv=noise(sd+i*13)-.5;walk(-.55+noise(sd+i*7)*1.1,-.55+noise(sd+i*9)*1.1,du,dv,.45+noise(sd+i*15)*.3,.032+noise(sd+i*17)*.02,8);}
        for(let i=0,m=2+Math.floor(noise(sd+5)*3);i<m;i++){const e=noise(sd+i*19)*1.6-.8,side=Math.floor(noise(sd+i*23)*4),u=side===0?-.97:side===1?.97:e,v=side===2?-.97:side===3?.97:e;sh.push([u,v,.045+noise(sd+i*29)*.04]);}
        const wl=make(W,H),wg=wl.getContext('2d');wg.save();path(wg,points(W/2,226.5*k,p.w*.97,p.w*.485));wg.clip();
        for(const [u,v,r] of sh){const [x,y]=P(u,v);ellipse(wg,x,y,r*p.w*1.08,r*p.w*.56,'#2f4034');}
        for(const [u,v,r] of sh){const [x,y]=P(u,v);ellipse(wg,x,y+r*p.w*.08,r*p.w*.84,r*p.w*.4,'#4a6458');}
        wg.globalAlpha=.28;for(const [u,v,r] of sh){const [x,y]=P(u,v);ellipse(wg,x-r*p.w*.2,y+r*p.w*.1,r*p.w*.5,r*p.w*.05,'#a8c2bb');}wg.restore();
        o.save();path(o,points(W/2,226.5*k,p.w*.97,p.w*.485));o.clip();o.globalCompositeOperation='destination-out';for(const [u,v,r] of sh){const [x,y]=P(u,v);ellipse(o,x,y-2*k,r*p.w,r*p.w*.55,'#000');}o.restore();
        o.globalCompositeOperation='destination-over';o.drawImage(wl,0,0);o.globalCompositeOperation='source-over';}
      const gaps=[];
      if(health>=2&&stage<6&&!sick){
        o.globalCompositeOperation='destination-out';
        for(let row=0;row<7;row++)for(let col=0;col<8;col++){const seed=p.id*817+row*47+col*13,u=-.85+col*1.7/7,v2=-.85+row*1.7/6,patch=Math.sin(u*4+v2*2.1)*.4+Math.cos(v2*5-u*2)*.3;
          if(health===3?(noise(seed+7)<.42||patch>.32):(patch>.18&&noise(seed+7)<.55)){const x=W/2+(u-v2)*p.w/2,y=226.5*k+(u+v2)*p.w/4;gaps.push([x,y]);o.globalAlpha=.9;ellipse(o,x,y-4*k,26*k,13*k,'#000');}}
        o.globalAlpha=1;
      }
      if(tod!==1){o.globalCompositeOperation='source-atop';o.globalAlpha=[.10,0,.18,.60][tod];o.fillStyle=['#f5b7a5','','#e8a650','#102d55'][tod];o.fillRect(0,0,W,H);o.globalAlpha=1;}
      o.globalCompositeOperation='source-over';
      const size=p.w/230;
      for(const [x,y] of gaps){ellipse(o,x,y,11*size,4*size,C[32]+'a0');line(o,[[x-9*size,y-4*size],[x,y],[x+4*size,y+6*size],[x+12*size,y+5*size]],C[32],1.5*size);}
      g.drawImage(c,p.x-W/2,p.y-226.5*k);return;
    }
    const size=p.w/230,rows=stage===1?6:stage>=4?7:9,cols=stage===1||stage>=4?8:10,hills=[];
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const seed=p.id*817+row*47+col*13,u=-.85+col*1.7/(cols-1)+(noise(seed)-.5)*.07,v=-.85+row*1.7/(rows-1)+(noise(seed+4)-.5)*.07;
      if(stage>1&&Math.abs(u-.24*Math.sin(v*4))<.14)continue;
      const x=p.x+(u-v)*p.w/2,y=p.y+(u+v)*p.w/4;
      const patch=Math.sin(u*4+v*2.1)*.4+Math.cos(v*5-u*2)*.3;
      const damaged=health===3?(noise(seed+7)<.50||patch>.28):health===2?(patch>-.12||noise(seed+7)<.22):health===1?noise(seed+7)<.28:false;
      hills.push({x,y,seed,u,v,damaged});
    }
    hills.sort((a,b)=>a.y-b.y);
    g.save();
    // Cracked gaps and flattened clumps interrupt the canopy in poor condition.
    if(health>=2){g.save();path(g,points(p.x,p.y,p.w-13,p.w/2-6.5));g.clip();
      for(const q of hills)if(q.damaged&&noise(q.seed+8)<.6){ellipse(g,q.x,q.y,11*size,4*size,C[32]+'a0');line(g,[[q.x-9*size,q.y-4*size],[q.x,q.y],[q.x+4*size,q.y+6*size],[q.x+12*size,q.y+5*size]],C[32],1.5*size);}g.restore();}
    for(const q of hills){
      const {x,y,seed,damaged}=q;
      if(stage>1&&stage<6){g.globalAlpha=.18;ellipse(g,x+2*size,y+1.5*size,7*size,2.2*size,C[32]);g.globalAlpha=1;}
      if(stage===6){for(let j=0;j<5;j++){const xx=x+(j-2)*1.9*size;line(g,[[xx,y],[xx+(noise(seed+j)-.5)*7*size,y-(5+noise(seed+j+2)*9)*size]],C[j%2?11:12],1.5*size);}continue;}
      if(health===3&&damaged&&noise(seed+3)<.48)continue;
      const h=[0,30,67,77,92,91][stage]*size*([.68,.87,1.08][Math.floor(noise(seed+9)*3)]),phase=t*2+q.u*2.8+q.v*1.9;
      let angle=Math.sin(phase)*.045*wind+(noise(seed+2)-.5)*.38;
      const lodged=health>=2&&damaged&&noise(seed+5)<(health===3?.85:.45);
      if(lodged)angle=1.1+noise(seed+10)*.35;
      if(tod===0||tod===2){g.globalAlpha=.14;ellipse(g,x-h*.55,y+7*size,h*.80,3.2*size,C[32],-.18);g.globalAlpha=1;}
      hill(g,stage,Math.floor(noise(seed+13)*3),damaged?health:health>=2?2:0,x,y,h*(lodged?.75:1),angle,phase,seed);
    }
    // A single tint per cached plot also shades foliage above the back bund.
    if(tod!==1){g.globalCompositeOperation='source-atop';g.globalAlpha=[.10,0,.18,.60][tod];g.fillStyle=['#f5b7a5','', '#e8a650','#102d55'][tod];g.fillRect(p.x-p.w-35,p.y-p.w/2-130,p.w*2+70,p.w+160);g.globalAlpha=1;g.globalCompositeOperation='source-over';}
    g.restore();
  }
  function firstFrame(g,model,state){
    const {h}=model,sky=g.createLinearGradient(0,0,0,h*.35);
    sky.addColorStop(0,state.tod===3?'#142640':state.tod===2?'#865d67':C[25]);sky.addColorStop(1,state.tod===3?'#38546b':state.tod===2?'#edac70':C[27]);g.fillStyle=sky;g.fillRect(0,0,1000,h);
    g.fillStyle=state.tod===3?'#243d43':C[3];g.fillRect(0,h*.26,1000,h*.74);
    for(const p of model.fields){path(g,points(p.x,p.y,p.w,p.w/2),C[19],C[20],7);path(g,points(p.x,p.y,p.w-10,p.w/2-5),C[state.stage===5?11:state.stage===0?25:state.stage===6?34:6]);}
  }
  function depth(model,p){return .86+.28*Math.max(0,Math.min(1,(p.y-model.oy)/(model.step*2)));}
  // p11 homestead: house on the plot's left corner, porch (lower-left face of sala.webp) -> landing -> corner -> front-left bund, farmer on that route.
  function home(model,p){
    const t=['sala','house-c','sala','house-b','sala','sala','sala','house-c','house-b'][p.id],im=sprites[t]?t:'sala',hm=HOUSES[im],sz=sprites[im]||{width:383,height:371};
    const j=[1,.93,1,.9,1,.96,1,.92,.99][p.id],s=(model.phone?.66:.37)*depth(model,p)*j,H=205*s*sz.height/371*hm.k,W=H*sz.width/sz.height,hx=p.x-p.w*(.66+(noise(p.id*5.3)-.5)*.06),hy=p.y-7-noise(p.id*2.1)*6;
    return {s,H,W,hx,hy,t:im,v:[0,1,0,1,0,2,0,0,2][p.id],sd:p.id*13.7,door:[hx+(hm.door[0]-.5)*W,hy-(1-hm.door[1])*H],corner:[p.x-p.w*.97,p.y+2],farmer:[p.x-p.w*.6,p.y+p.w*.2]};
  }
  // p12: irregular smooth blob (yards are trodden earth, not display ovals)
  function blob(g,x,y,rx,ry,seed,n=14){
    const P=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2,r=1+(noise(seed+i*1.7)-.5)*.5+Math.sin(a*2+seed)*.1;P.push([x+Math.cos(a)*rx*r,y+Math.sin(a)*ry*r]);}
    g.beginPath();const m=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];let q=m(P[n-1],P[0]);g.moveTo(...q);for(let i=0;i<n;i++){q=m(P[i],P[(i+1)%n]);g.quadraticCurveTo(...P[i],...q);}g.closePath();
  }
  function yard(g,o,seed,grow=1){
    blob(g,o.door[0]+o.W*.12,o.door[1]-o.H*.02,o.W*.40*grow,o.W*.13*grow,seed);g.fill();
    blob(g,o.hx+o.W*.08,o.hy-o.H*.07,o.W*.47*grow,o.W*.17*grow,seed+40);g.fill();
  }
  // p12: one continuous trodden path along the bund tops; every homestead route lands on it, and it runs on to the foreground jetty path.
  function bundPaths(g,model){
    const {cx,oy,step,phone}=model,G=(u,v)=>[cx+(u-v)*step,oy+(u+v)*step/2],k=phone?1:.62;
    const L=[[[-.5,-.5],[-.5,2.5]],[[-.5,.5],[2.5,.5]],[[-.5,1.5],[2.5,1.5]],[[-.5,2.5],[2.5,2.5]],[[2.5,2.5],[2.5,1.72]]];
    L.forEach(([a,b],li)=>{const n=Math.max(6,Math.round(Math.hypot(b[0]-a[0],b[1]-a[1])*9)),pts=[];
      for(let i=0;i<=n;i++){const t=i/n,[x,y]=G(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t),e=i&&i<n?1:0;pts.push([x+(noise(i+li*31)-.5)*2.4*k*e,y+(noise(i*2+li*7)-.5)*1.8*k*e]);}
      g.save();g.globalAlpha=.42;line(g,pts,'#5f5034',12*k);g.globalAlpha=.95;line(g,pts,'#bba873',8*k);g.globalAlpha=.6;line(g,pts.map(([x,y])=>[x-.7*k,y-1*k]),'#e2d6a8',2.6*k);
      g.globalAlpha=.28;for(let i=1;i<n;i+=2){const [x,y]=pts[i];ellipse(g,x+(noise(i*5+li)-.5)*3*k,y,1.6*k,.8*k,'#5e4f33');}g.restore();});
  }
  function homeGround(g,model,p){
    const o=home(model,p),k=o.s/.66,route=[o.door,o.corner,o.farmer];
    g.save();g.filter=`blur(${Math.max(1,3.2*k)}px)`;g.globalAlpha=.85;g.fillStyle='#9a8a5c';yard(g,o,o.sd,1.1);
    g.filter=`blur(${Math.max(1,2.2*k)}px)`;g.globalAlpha=.8;g.fillStyle='#b4a271';yard(g,o,o.sd+3,.8);g.filter='none';
    g.restore(); // p14: speckle stones removed -- quieter yard
    g.save();g.globalAlpha=.4;line(g,route,'#7d6c45',13*k);g.globalAlpha=.95;line(g,route,'#b4a372',9*k);g.globalAlpha=.45;line(g,route.map(([x,y])=>[x-1.2*k,y-1.4*k]),'#d6c99a',3*k);g.restore();
    g.save();g.globalAlpha=.6;ellipse(g,o.door[0]-1*k,o.door[1]-1*k,o.W*.12,o.W*.035,'#d2c595');g.restore();
    for(let i=0;i<2;i++)line(g,[[o.door[0]-o.W*.07+i*3*k,o.door[1]-o.H*.05+i*o.H*.03],[o.door[0]+o.W*.07+i*3*k,o.door[1]-o.H*.07+i*o.H*.03]],'#6e5536',3.2*k);
    // p13: grass creeps over the yard edge (tufts on and just inside the rim), damp bare-foot prints along the route
    const yc=[[o.door[0]+o.W*.12,o.door[1]-o.H*.02,o.W*.42,o.W*.14],[o.hx+o.W*.08,o.hy-o.H*.07,o.W*.5,o.W*.18]];
    for(let i=0;i<8;i++){const [x,y,rx,ry]=yc[i%2],a=noise(o.sd+i*2.3)*6.28,r=.72+noise(o.sd*3+i)*.38,tx=x+Math.cos(a)*rx*r,ty=y+Math.sin(a)*ry*r;
      if(Math.hypot(tx-o.door[0],(ty-o.door[1])*2)<o.W*.12)continue;grass(g,tx,ty,3+(i%3),o.sd+i*7,(.42+noise(i+o.sd)*.3)*k);}
    g.save();g.globalAlpha=.18;const R=[o.door,o.corner];for(let i=1;i<9;i++){const t=i/9,x=R[0][0]+(R[1][0]-R[0][0])*t,y=R[0][1]+(R[1][1]-R[0][1])*t,sd=(i%2?1:-1)*2.2*k;
      ellipse(g,x,y+sd,1.7*k,.85*k,'#4f412a');ellipse(g,x+2.2*k,y+sd-.4*k,.9*k,.6*k,'#4f412a');}
    g.restore();
  }
  // p13: small household details so each homestead reads as somebody's: water jar, drying line, potted plant, bicycle, basket.
  function prop(g,kind,x,y,k){
    g.save();g.filter=`blur(${Math.max(.3,.45*k)}px)`;
    if(kind==='jar'){contactShadow(g,x+3*k,y,7*k,2.4*k,.55);const r=g.createRadialGradient(x-2.5*k,y-9*k,1,x,y-6*k,8*k);r.addColorStop(0,'#b5774a');r.addColorStop(.55,'#7a4a2a');r.addColorStop(1,'#4d2f1c');g.fillStyle=r;g.beginPath();g.ellipse(x,y-6*k,5.6*k,6.4*k,0,0,6.29);g.fill();ellipse(g,x,y-12*k,3.4*k,1.3*k,'#3b2516');ellipse(g,x,y-12.2*k,2.6*k,.8*k,'#20262a');g.globalAlpha=.5;ellipse(g,x-2.2*k,y-8.5*k,1.1*k,2.2*k,'#e7c9a0');}
    else if(kind==='line'){const L=30*k,dx=L*.86,dy=-L*.42,ph=17*k;contactShadow(g,x+2*k,y,3*k,1.2*k,.5);contactShadow(g,x+dx+2*k,y+dy,3*k,1.2*k,.5);
      line(g,[[x,y],[x,y-ph]],'#6b4d30',1.4*k);line(g,[[x+dx,y+dy],[x+dx,y+dy-ph]],'#6b4d30',1.4*k);
      const P=t=>[x+dx*t,y-ph+dy*t+Math.sin(t*Math.PI)*3*k];curve(g,[...P(0),...P(.33),...P(.66),...P(1)],'#e8dfc8',.6*k);
      [['#b2574a',.18],['#3f6c8c',.45],['#d9cba4',.7]].forEach(([c,t],i)=>{const [a,b]=P(t),[c2,d2]=P(t+.17),h=(8+i*2)*k;g.fillStyle=c;g.globalAlpha=.92;g.beginPath();g.moveTo(a,b);g.lineTo(c2,d2);g.lineTo(c2+.5*k,d2+h);g.lineTo(a-.3*k,b+h*1.05);g.fill();g.globalAlpha=.25;g.fillStyle='#2e2416';g.beginPath();g.moveTo(c2,d2);g.lineTo(c2+.5*k,d2+h);g.lineTo(c2-2*k,d2+h);g.lineTo(c2-2*k,d2+1);g.fill();g.globalAlpha=1;});}
    else if(kind==='pot'){contactShadow(g,x+2*k,y,5*k,1.8*k,.5);g.fillStyle='#a35d3c';g.beginPath();g.moveTo(x-3.4*k,y-6*k);g.lineTo(x+3.4*k,y-6*k);g.lineTo(x+2.5*k,y);g.lineTo(x-2.5*k,y);g.fill();ellipse(g,x,y-6*k,3.8*k,1.2*k,'#7c4229');
      for(let i=0;i<7;i++){const a=-2.6+i*.37;ellipse(g,x+Math.cos(a)*4.2*k,y-8*k+Math.sin(a)*4.6*k,2.6*k,1.3*k,i%2?'#5d8a3c':'#7aa34c');}ellipse(g,x,y-9.5*k,2.4*k,2*k,'#93b85c');}
    else if(kind==='bike'){contactShadow(g,x+8*k,y,13*k,2.4*k,.45);g.strokeStyle='#3a332a';g.lineWidth=1.1*k;for(const w of [0,1]){g.beginPath();g.ellipse(x+w*15*k,y-4.6*k-w*3*k,4.6*k,4.4*k,0,0,6.29);g.stroke();}
      line(g,[[x,y-4.6*k],[x+6*k,y-6.5*k],[x+15*k,y-7.6*k],[x+8.5*k,y-12*k],[x+6*k,y-6.5*k]],'#6b2f2a',1.3*k);line(g,[[x+8.5*k,y-12*k],[x+8*k,y-14*k]],'#3a332a',1.1*k);line(g,[[x+15*k,y-7.6*k],[x+13.5*k,y-15*k],[x+11.5*k,y-15.6*k]],'#3a332a',1.1*k);ellipse(g,x+8*k,y-14.3*k,2*k,.8*k,'#2f2a24');}
    else if(kind==='basket'){contactShadow(g,x+2*k,y,6.5*k,2*k,.5);g.fillStyle='#a8834e';g.beginPath();g.moveTo(x-5.4*k,y-6*k);g.lineTo(x+5.4*k,y-6*k);g.lineTo(x+4.2*k,y);g.lineTo(x-4.2*k,y);g.fill();
      for(let i=0;i<4;i++)line(g,[[x-5.2*k+i*.3*k,y-5*k+i*1.4*k],[x+5.2*k-i*.3*k,y-5*k+i*1.4*k]],'#7d5e34',.6*k);ellipse(g,x,y-6*k,5.6*k,1.6*k,'#c9a46a');ellipse(g,x,y-6*k,4.4*k,1.1*k,'#6e5232');ellipse(g,x+.6*k,y-6.4*k,3*k,.8*k,'#d6c48a');}
    g.restore();
  }
  // p14: one enlarged defining feature per household (washing line / big water jar / bicycle) instead of scattered small props.
  const PROPS={0:[['line',-.62,-.16]],1:[['jar',-.42,-.1]],3:[['line',-.7,-.2]],5:[['bike',.28,-.06]],7:[['line',-.74,-.06]],8:[['jar',.44,-.16]]};
  // Rice is removed under the house, over the yard and along the route (drawn into each plot's crop cache).
  function clearYard(g,model,p){
    const o=home(model,p),k=o.s/.66;
    g.save();g.globalCompositeOperation='destination-out';g.filter=`blur(${Math.max(1,2.5*k)}px)`;g.fillStyle='#000';
    yard(g,o,o.sd,1.0);line(g,[o.door,o.corner,o.farmer],'#000',14*k);
    // p14: clear the whole greeting ring (+margin) so the resident's coloured circle never sits in rice.
    const d=depth(model,p),rw=model.phone?Math.max(48*.46*d,24.3):Math.max(58*.27*d,6.65);ellipse(g,o.farmer[0]+1,o.farmer[1]+2,Math.max(20*k,rw*1.35),Math.max(8*k,rw*.34*1.8),'#000');for(const q of model.fields){const f=home(model,q).farmer,bh=172*(model.phone?.46:.27)*depth(model,q);ellipse(g,f[0]+2,f[1]-bh*.42,bh*.3,bh*.52,'#000');} // p16: no rice behind the resident's silhouette
    g.restore();
  }
  function villageLife(g,model){
    const items=[];for(const p of model.fields){const o=home(model,p),k=o.s/.66;for(const [kind,fx,fy] of PROPS[p.id]||[]){const x=o.hx+fx*o.W,y=o.hy+fy*o.H;items.push([y,()=>prop(g,kind,x,y,k*(kind==='jar'?2.3:2))]);}
      items.push([o.hy,()=>sala(g,o.hx,o.hy,o.s,houseVariant(o.v,o.t),o.t)],[o.farmer[1],()=>avatar(g,o.farmer[0],o.farmer[1],p.id%3,model.phone,depth(model,p))]);}
    items.sort((a,b)=>a[0]-b[0]).forEach(i=>i[1]());
  }
  function avatar(g,x,y,health=0,phone=false,s=1){
    const k=(phone?.46:.27)*s; // p10: person ~1/4 of a stilt house (door ~1.4x the person)
    g.save();g.translate(x,y);g.scale(k,k);
    // Standing on the bund: a small trodden earth patch, soft contact shadow, then the health ring.
    // p11: the advertised greeting circle reads clearly: light fill + solid coloured ring under the feet.
    // p12: greeting circle sized in screen px (phone canvas is ~2.56 units/css px) so it reads at a glance: cream pad, dark keyline, coloured ring, chat bubble above the head.
    const px=(phone?2.56:.7)/k,col=[C[2],C[8],C[29]][health%3],rx=Math.max(phone?48:58,9.5*px),ry=rx*.34;
    g.save();g.globalAlpha=.72;ellipse(g,1,4,rx,ry,'#f6f0d6');
    g.globalAlpha=.32;g.lineWidth=4.4*px;g.strokeStyle='#3b2f1c';g.beginPath();g.ellipse(1,4,rx,ry,0,0,6.29);g.stroke();
    g.globalAlpha=1;g.lineWidth=2.4*px;g.strokeStyle=col;g.beginPath();g.ellipse(1,4,rx,ry,0,0,6.29);g.stroke();
    g.globalAlpha=.6;g.lineWidth=.9*px;g.strokeStyle='#fffbe8';g.beginPath();g.ellipse(1,2.5,rx-3.2*px,ry-1.6*px,0,3.3,6.1);g.stroke();g.restore();
    g.save();const br=(phone?7.3:12)*px,by=-178-br*1.15,bx=br*.55;g.globalAlpha=.94;g.fillStyle='#fbf7e8';g.strokeStyle=col;g.lineWidth=1.3*px;
    g.beginPath();g.arc(bx,by,br,0,6.29);g.moveTo(bx-br*.45,by+br*.82);g.lineTo(bx-br*.85,by+br*1.45);g.lineTo(bx-br*.05,by+br*.95);g.fill();g.stroke();
    g.globalAlpha=1;for(let i=-1;i<2;i++)ellipse(g,bx+i*br*.42,by,br*.14,br*.14,col);g.restore();
    contactShadow(g,20,2,40,10.5,.42);contactShadow(g,4,1,22,6.5,.62);
    {const n='neighbour-'+health%3,im=sprites[n];if(im){const RH=172,RW=RH*im.width/im.height;castShadow(g,lit(im),0,0,RW,RH,false,.42);footContacts(g,n,0,0,RW,RH,false,.72);}} // p15: residents +30%; p16 +18%, same cast as sprite()
    sprite(g,'neighbour-'+health%3,0,0,172,false,false);g.restore();
  }
  function ceremonyPicture(g,w,h){
    const H=h*800/w;g.save();g.scale(w/800,w/800);
    const scene=sprites['harvest-scene'];
    if(scene){ // p8: one painted harvest scene, cover-fit around the farmers, mascot cheering on the stubble, soft fade into the sheet
      const s=Math.max(800/scene.width,H/scene.height),dw=scene.width*s,dh=scene.height*s;
      const b0=.345,b1=.86; // p16: rows of the source that hold both farmers (hat tops .36, carrier's feet .81)
      if(H/dh>=b1-b0)g.drawImage(scene,(800-dw)/2,Math.max(H-dh,Math.min(0,H*.5-dh*.6)),dw,dh);
      else{ // p16: short, wide hero -> scale to the farmers' band (crop, never squash) and widen the field: mirrored stubble left, the empty left field continues right
        const s2=H/((b1-b0)*scene.height),w2=scene.width*s2,h2=scene.height*s2,y0=-b0*h2,x0=(800-w2)*.6,Ws=.26*w2,E=Math.min(44,Ws*.3);
        const strip=(x,flip,side)=>{const o=document.createElement('canvas');o.width=Math.ceil(Ws);o.height=Math.ceil(H);const q=o.getContext('2d');if(flip){q.translate(Ws,0);q.scale(-1,1);}q.drawImage(scene,0,y0,w2,h2);q.setTransform(1,0,0,1,0,0);q.globalCompositeOperation='destination-in';const m=side>0?q.createLinearGradient(0,0,E,0):q.createLinearGradient(Ws,0,Ws-E,0);m.addColorStop(0,'#0000');m.addColorStop(1,'#000');q.fillStyle=m;q.fillRect(0,0,o.width,o.height);g.drawImage(o,x,0);};
        g.drawImage(scene,x0,y0,w2,h2); // strips = the empty left field only (cols 0-26%), cross-faded so no seam or mirror chevron
        for(let x=x0+w2-E,k=0;x<800;x+=Ws-E,k++)strip(x,k%2==1,1);
        for(let x=x0+E-Ws,k=0;x+Ws>0;x-=Ws-E,k++)strip(x,k%2==1,-1);
      } // p10: wide/desktop crop centres lower so the carrier's feet stay in frame
      const fade=g.createLinearGradient(0,H*.88,0,H);fade.addColorStop(0,'#fafaf300');fade.addColorStop(.6,'#fafaf399');fade.addColorStop(1,'#fafaf3');g.fillStyle=fade;g.fillRect(0,H*.88,800,H*.12+1);
      const mh=Math.min(H*.3,170);contactShadow(g,800-mh*.62,H-mh*.16,mh*.34,mh*.08,.45);
      sprite(g,'mascot-cheer',800-mh*.62,H-mh*.14,mh,true,false);
      g.restore();return;
    }
    background(g,800,H,H>600,H*.26);
    g.fillStyle='#c96e3545';g.fillRect(0,0,800,H);
    for(let row=0;row<8;row++)for(let col=0;col<17;col++){
      const seed=row*51+col*17,y=H*.40+row*H*.065,x=col*51-15+(row%2)*20;
      hill(g,5,col%3,0,x,y,(50+row*6)*(1+noise(seed)*.2),Math.sin(seed)*.05,0,seed);
    }
    const earth=g.createLinearGradient(0,H-145,0,H);earth.addColorStop(0,C[33]+'00');earth.addColorStop(.4,C[33]+'ee');earth.addColorStop(1,C[32]);g.fillStyle=earth;g.fillRect(0,H-145,800,145);
    for(let i=0;i<3;i++)sprite(g,'sheaves',100+i*154,H-15-(i%2)*14,92+i*12);
    sprite(g,'mascot-cheer',650,H-18,Math.min(270,H*.43));
    for(let i=0;i<15;i++)ellipse(g,noise(i+9)*800,noise(i+18)*H*.38,2,5,C[31],noise(i)*3);
    g.restore();
  }
  function illustration(g,w,h,stage=4,water=0,level=null,ceremony=false,health=0){
    if(ceremony){ceremonyPicture(g,w,h);return;}
    g.save();g.scale(w/800,h/440);background(g,800,440,false,135);
    const p={id:4,x:380,y:315,w:330};texture(g,water===0?3:2,p.x,p.y,p.w,p.w/2);drawRice(g,p,stage,health,0,0);
    if(level!==null){
      path(g,[[540,440],[800,440],[800,245],[540,245]],C[17]);
      path(g,[[620,90],[701,90],[701,413],[620,413]],C[13],C[20],3);path(g,[[634,109],[687,109],[687,402],[634,402]],C[16]);
      const yy=level===-5?280:355;g.fillStyle=C[25];g.fillRect(634,yy,53,402-yy);line(g,[[625,yy],[695,yy]],C[14],4);
      for(let j=0;j<10;j++)line(g,[[677,135+j*25],[690,135+j*25]],C[19],2);
      path(g,[[579,yy-20],[600,yy],[579,yy+20],[579,yy+7],[546,yy+7],[546,yy-7],[579,yy-7]],C[31]);
    }
    sprite(g,'mascot-point',120,425,160,true);g.restore();
  }

  const motifs={
    farm:'<path d="M3 25.5 18 18.5l15 7-15 7Z" fill="E"/><path d="M9.5 27.8 21.5 22M14.5 30.2l12-5.8" stroke="#d6eab0" stroke-opacity=".75" stroke-width="1.5"/><path d="M18 21.5V12"/><path d="M18 16.5c-5.5 0-8.5-3-8.5-8 5 0 8.5 3 8.5 8Z" fill="E"/><path d="M18 14c0-5 3-8.5 9-8.5 0 5-3.5 8.5-9 8.5Z" fill="G"/>',
    leaf:'<path d="M7 29.5C4 15.5 13.5 5 30.5 5c1 15.5-8 26.5-23.5 24.5Z" fill="E"/><path d="M8 28.5 25 10" stroke="G" stroke-width="2.4"/><path d="M12.5 12c3-2.8 6.8-4 10.5-4.4" stroke="#dcefc6" stroke-opacity=".7" stroke-width="1.5"/>',
    tube:'<rect x="12" y="4" width="12" height="28" rx="3" fill="P"/><rect x="15" y="17" width="6" height="12" rx="1.5" fill="S"/><path d="M24 10h4M24 16h4M24 22h4"/>',
    water:'<path d="M18 3.5C14 10 7.5 15.5 7.5 22a10.5 10.5 0 0 0 21 0c0-6.5-6.5-12-10.5-18.5Z" fill="S"/><path d="M12.6 21.5c-.3 3.3 1.2 5.6 4.4 6.6" stroke="#fff" stroke-opacity=".8" stroke-width="2"/>',
    mission:'<rect x="7" y="6" width="22" height="27" rx="4" fill="G"/><rect x="10.5" y="10" width="15" height="19.5" rx="2" fill="P"/><rect x="13" y="3.5" width="10" height="6" rx="2.5" fill="E"/><path d="m13.5 20 3.5 3.5 6-7.5" stroke="#2f7a4f" stroke-width="2.6"/>',
    village:'<path d="M19.5 15h11.5v16H19.5Z" fill="G"/><path d="M17 16.5 25.2 7l8.3 9.5Z" fill="E"/><path d="M5 19.5h14V31H5Z" fill="G"/><path d="M2.5 20.5 12 10.5l9.5 10Z" fill="E"/><path d="M10 31v-5.5h4V31" fill="#8a6634"/><path d="M2.5 31h31"/>',
    harvest:'<path d="M15.5 21C9.5 18 5 12.5 5 6c5 2 9.5 8 10.5 15Z" fill="G"/><path d="M20.5 21c6-3 10.5-8.5 10.5-15-5 2-9.5 8-10.5 15Z" fill="G"/><path d="M18 19c-1.5-6.5-.5-12 3.5-16 2.3 5 1 11.5-3.5 16Z" fill="G"/><path d="M18 20v13m-2.5-12-3 11.5m8-11.5 3 11.5"/><rect x="12" y="24" width="12" height="4.6" rx="2.3" fill="E"/><path d="M20.2 7.5c.8 2.2.6 4.8-.6 7M8.5 9.8c1.5 1.8 2.8 4 3.6 6.4" stroke="#fff6d2" stroke-opacity=".75" stroke-width="1.4"/>',
    cloud:'<path d="M9.5 27a6.5 6.5 0 0 1-.6-13A8.5 8.5 0 0 1 25 12.5 7.2 7.2 0 0 1 26.5 27Z" fill="W"/><path d="M11 17.5a5 5 0 0 1 4.8-3.8" stroke="#fff" stroke-width="1.8"/>',
    sun:'<path d="M18 3.5v3.5M18 29v3.5M3.5 18H7m22 0h3.5M7.7 7.7l2.5 2.5m15.6 15.6 2.5 2.5M7.7 28.3l2.5-2.5m15.6-15.6 2.5-2.5" stroke="#c8963f" stroke-width="2.4"/><circle cx="18" cy="18" r="8" fill="G"/><path d="M14 14.6a5 5 0 0 1 4-2.1" stroke="#fff6d2" stroke-opacity=".9" stroke-width="1.8"/>',
    person:'<path d="M6 33c0-7 5.5-11 12-11s12 4 12 11Z" fill="E"/><circle cx="18" cy="15.5" r="5.5" fill="#e6c194"/><path d="M4.5 13 18 4.5 31.5 13Z" fill="G"/><path d="M13 12.4 18 9" stroke="#fff6d2" stroke-opacity=".75" stroke-width="1.4"/>',
    heart:'<path d="M18 30.5S4.5 22.5 4.5 13.5A6.5 6.5 0 0 1 18 10a6.5 6.5 0 0 1 13.5 3.5c0 9-13.5 17-13.5 17Z" fill="C"/><path d="M8.6 13.2a3.6 3.6 0 0 1 3.4-3.2" stroke="#fff" stroke-opacity=".7" stroke-width="1.8"/>',
    info:'<circle cx="18" cy="18" r="14" fill="G"/><path d="M9.4 13.2a10 10 0 0 1 5.6-5" stroke="#fff6d2" stroke-opacity=".8" stroke-width="1.6"/><circle cx="18" cy="11.5" r="2.1" fill="#1d5a3d" stroke="none"/><path d="M18 16.8v9" stroke="#1d5a3d" stroke-width="3.4"/>',
    arrow:'<path d="M5 14.5h13V8l13 10-13 10v-6.5H5Z" fill="G"/><path d="M7.5 16.5h11.5" stroke="#fff6d2" stroke-opacity=".7" stroke-width="1.4"/>',
    check:'<circle cx="18" cy="18" r="14" fill="E"/><path d="M9.6 12.8a10 10 0 0 1 5.4-4.6" stroke="#dcefc6" stroke-opacity=".7" stroke-width="1.6"/><path d="m11.5 18.5 4.5 4.5 8.5-9.5" stroke="#fbf2d6" stroke-width="3.2"/>',
    eye:'<path d="M3 18c4-7 9-10.5 15-10.5S29 11 33 18c-4 7-9 10.5-15 10.5S7 25 3 18Z" fill="P"/><circle cx="18" cy="18" r="6.5" fill="E"/><circle cx="18" cy="18" r="2.5" fill="#123a28" stroke="none"/><circle cx="20.4" cy="15.6" r="1.5" fill="#fff" stroke="none"/>',
    sound:'<path d="M3.5 13h6l9.5-8.5v27L9.5 23h-6Z" fill="G"/><path d="M8 15.5h2.5" stroke="#fff6d2" stroke-opacity=".8" stroke-width="1.4"/><path d="M23.5 13a7 7 0 0 1 0 10M28 9a12.5 12.5 0 0 1 0 18" stroke-width="2.3"/>',
    mute:'<path d="M3.5 13h6l9.5-8.5v27L9.5 23h-6Z" fill="G"/><path d="M8 15.5h2.5" stroke="#fff6d2" stroke-opacity=".8" stroke-width="1.4"/><path d="m23.5 13.5 9 9m0-9-9 9" stroke-width="2.5"/>'
  };
  let iconSeq=0;const iconPaint={g:['#f7e3a6','#dcb365','#b5883b'],e:['#78b27f','#3a8455','#1d5a3d'],s:['#d9ecf1','#9cc2d0','#5f93a8'],c:['#efae84','#d27f57','#a95a3a'],w:['#ffffff','#eef4f4','#bcd3dc']};
  function icon(name){let shape=motifs[name]||motifs.leaf;if(name==='rain')shape=motifs.cloud+'<path d="m12 30.2-1.4 3.3m7.4-3.3-1.4 3.3m7.4-3.3-1.4 3.3" stroke="#4f8aa3" stroke-width="2.2"/>';if(name==='storm')shape=motifs.cloud+'<path d="m19 26-3.5 5h4l-2.5 4.5" stroke="#c8963f" stroke-width="2.2"/>';if(name==='fog')shape=motifs.cloud+'<path d="M8 30.5h14m-8 3h16" stroke="#8fa9b4" stroke-width="2"/>';if(name==='hot')shape=motifs.sun;const id='ni'+(++iconSeq),used=new Set();shape=shape.replace(/fill="P"/g,'fill="#fbf5e2"').replace(/(fill|stroke)="([GESCW])"/g,(m,a,k)=>{k=k.toLowerCase();used.add(k);return `${a}="url(#${id}${k})"`;});const defs=[...used].map(k=>`<linearGradient id="${id}${k}" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${iconPaint[k][0]}"/><stop offset=".55" stop-color="${iconPaint[k][1]}"/><stop offset="1" stop-color="${iconPaint[k][2]}"/></linearGradient>`).join('');return `<svg class="icon" viewBox="0 0 36 36" aria-hidden="true"><defs>${defs}</defs><g fill="none" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" style="stroke:var(--ic-line,#1d4a33)">${shape}</g></svg>`;}
  window.NalaArt={villageLife,clearYard,C,make,noise,path,ellipse,line,curve,init,firstFrame,terrain,sceneModel,drawRice,parts,grainAtlas,cellAtlas,icon,palm,sala,avatar,illustration,points,sprite,background,prepareTone,depth};
})();
