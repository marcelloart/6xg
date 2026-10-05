import * as THREE from 'three';

const TAU=Math.PI*2;
const shared=new Map();
const box=new THREE.BoxGeometry(1,1,1),ball=new THREE.SphereGeometry(1,20,12),tube=new THREE.CylinderGeometry(1,1,1,12);
for(const geometry of[box,ball,tube])geometry.userData.cc0Shared=true;
function add(g,geometry,material,x,y,z,sx=1,sy=sx,sz=sx){const o=new THREE.Mesh(geometry,material);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
const block=(g,m,x,y,z,w,h,d)=>add(g,box,m,x,y,z,w,h,d);
function beam(g,m,a,b,r=1){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),dir=end.clone().sub(start),o=add(g,tube,m,0,0,0,r,dir.length(),r);o.position.copy(start.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());return o;}
function physical(key,color,roughness=.4,metalness=0){if(!shared.has(key))shared.set(key,new THREE.MeshPhysicalMaterial({color,roughness,metalness,clearcoat:.35,clearcoatRoughness:.18}));return shared.get(key);}
function skin(kind){
 if(shared.has('skin:'+kind))return shared.get('skin:'+kind);
 const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');
 const palette={carp:['#433f22','#bd9955','#e4d4a0'],tilapia:['#304a40','#899785','#d0d5b2'],catfish:['#222d2b','#53645b','#adbda2'],snakehead:['#343b28','#828669','#d3d0ac'],gourami:['#4b4731','#a69a70','#e0d7ab'],pacu:['#364449','#a2afaf','#e9cfc0'],pangasius:['#324554','#89b1bd','#e5e5d8'],knifefish:['#5b5b56','#aeb3af','#e4e3d5'],arapaima:['#2e3d32','#7b7d55','#d8b186']}[kind];
 const gradient=x.createLinearGradient(0,0,0,512);gradient.addColorStop(0,palette[0]);gradient.addColorStop(.25,palette[1]);gradient.addColorStop(.5,palette[2]);gradient.addColorStop(.75,palette[1]);gradient.addColorStop(1,palette[0]);x.fillStyle=gradient;x.fillRect(0,0,1024,512);
 for(let row=0;row<24;row++)for(let col=0;col<54;col++){const xx=col*20+(row%2)*10,yy=row*22;const noise=((row*61+col*37)%19)/19;
  if(kind==='catfish'||kind==='pangasius'){x.fillStyle='rgba(185,205,178,'+(.02+noise*.025)+')';x.fillRect(xx,yy,1,1);continue;}
  x.beginPath();x.ellipse(xx,yy,11,13,0,-Math.PI*.4,Math.PI*.4);x.strokeStyle='rgba(22,35,18,'+(.09+noise*.1)+')';x.lineWidth=1.2;x.stroke();
  x.beginPath();x.ellipse(xx+1,yy-1,9,11,0,-Math.PI*.4,Math.PI*.15);x.strokeStyle='rgba(241,230,167,.16)';x.stroke();
 }
 if(kind==='tilapia'){for(let i=0;i<9;i++){x.fillStyle='rgba(24,36,24,.13)';x.fillRect(i*100+25,30,22,450);}}
 if(kind==='snakehead'){for(let i=0;i<40;i++){x.fillStyle='rgba(24,31,14,.27)';x.beginPath();x.ellipse(i*27,60+(i%7)*40,16,8,i,.0,TAU);x.fill();}}
 if(kind==='knifefish'){for(let i=0;i<8;i++){x.beginPath();x.ellipse(80+i*90,330,25,27,0,0,TAU);x.fillStyle='#302f29';x.fill();x.strokeStyle='#ded8ba';x.lineWidth=5;x.stroke();}}
 if(kind==='arapaima'){const red=x.createLinearGradient(0,0,300,0);red.addColorStop(0,'#bc563bcc');red.addColorStop(1,'#9b473000');x.fillStyle=red;x.fillRect(0,0,300,512);}
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;map.userData.cc0Shared=true;
 const m=new THREE.MeshPhysicalMaterial({map,roughness:kind==='catfish'?.38:.48,metalness:kind==='carp'?.22:.12,clearcoat:.7,clearcoatRoughness:.2});shared.set('skin:'+kind,m);return m;
}
function fin(g,kind,points){
 let m=shared.get('fin:'+kind);if(!m){const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle=({carp:'#927142',tilapia:'#747f62',gourami:'#a28f61',pacu:'#989e92',pangasius:'#789199',knifefish:'#858980',arapaima:'#a65e42'})[kind]||'#536358';ctx.fillRect(0,0,128,128);for(let i=-12;i<25;i++){ctx.strokeStyle=i%2?'#a1a98899':'#283b2e99';ctx.beginPath();ctx.moveTo(64,126);ctx.lineTo(i*12,0);ctx.stroke();}const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;m=new THREE.MeshPhysicalMaterial({map,transparent:true,opacity:.8,side:THREE.DoubleSide,roughness:.57,metalness:.1,depthWrite:false});shared.set('fin:'+kind,m);}
 const geo=new THREE.BufferGeometry(),v=[],uv=[];for(let i=1;i<points.length-1;i++)for(const j of[0,i,i+1]){v.push(...points[j]);uv.push(j/(points.length-1),j===0?1:0);}geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();const o=add(g,geo,m,0,0,0);o.castShadow=false;return o;
}
// Continuous body surfaces, forked fins, gill covers and species-specific barbels.
// The same model is used in the water, the catch animation and the fish catalogue.
export function createFish(kind='tilapia'){
 const g=new THREE.Group(),shape={tilapia:[54,12,4.5],carp:[54,10,7],catfish:[64,7,5],snakehead:[64,7,5],gourami:[56,15,5],pacu:[48,18,6],pangasius:[72,10,7],knifefish:[82,14,3.5],arapaima:[104,12,9]}[kind]||[54,12,4.5],length=shape[0],depth=shape[1],width=shape[2];
 const positions=[],uv=[],indices=[],rows=48,around=24;
 for(let i=0;i<=rows;i++){const t=i/rows,profile=Math.pow(Math.sin(Math.PI*t),.58)*(.52+.48*t)+.025;
  for(let j=0;j<=around;j++){const a=j/around*TAU;positions.push((t-.5)*length,Math.cos(a)*depth*profile,Math.sin(a)*width*profile);uv.push(t,j/around);}}
 for(let i=0;i<rows;i++)for(let j=0;j<around;j++){const n=i*(around+1)+j;indices.push(n,n+1,n+around+1,n+1,n+around+2,n+around+1);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();const body=add(g,geometry,skin(kind),0,0,0);
 const tail=new THREE.Group();tail.position.x=-length/2+2;g.add(tail);fin(tail,kind,kind==='arapaima'||kind==='knifefish'?[[0,0,0],[-10,9,0],[-14,4,0],[-14,-4,0],[-10,-9,0]]:[[0,0,0],[-14,11,0],[-10,1,0],[-14,-10,0]]);
 const dorsal=kind==='arapaima'?[[-19,8,0],[-42,5,0],[-39,16,0],[-31,19,0],[-20,16,0]]:kind==='knifefish'?[[13,depth*.55,0],[25,depth*.55,0],[20,depth+7,0],[15,depth+4,0]]:kind==='pangasius'?[[6,depth*.65,0],[21,depth*.55,0],[18,depth+15,0],[13,depth+8,0]]:[[0,depth*.55,0],[-19,depth*.5,0],[-14,depth+7,0],[-7,depth+10,0],[4,depth+4,0],[14,depth*.6,0]];
 fin(g,kind,dorsal);
 fin(g,kind,kind==='knifefish'?[[length*.3,-depth*.5,0],[-length*.43,-depth*.3,0],[-length*.35,-depth-5,0],[-length*.12,-depth-7,0],[length*.18,-depth-4,0]]:kind==='arapaima'?[[-19,-8,0],[-42,-5,0],[-39,-16,0],[-31,-18,0],[-20,-15,0]]:[[1,-depth*.7,0],[-18,-depth*.55,0],[-15,-depth-5,0],[-6,-depth-4,0]]);
 if(kind==='gourami')for(const side of[-1,1]){const feeler=new THREE.CatmullRomCurve3([new THREE.Vector3(7,-8,side*3),new THREE.Vector3(-4,-15,side*4),new THREE.Vector3(-22,-20,side*4)]);add(g,new THREE.TubeGeometry(feeler,16,.22,5,false),physical('gourami-feeler','#cec29b'),0,0,0);}
 const pectorals=[];for(const side of[-1,1]){const f=fin(g,kind,[[length*.2,0,side*width*.7],[length*.05,-7,side*(width+9)],[-length*.1,-4,side*(width+4)]]);pectorals.push(f);}
 const eyebase=physical('eye-silver','#d5c79a',.18,.2),pupil=physical('eye-black','#111a16',.05,.1),mouth=physical('mouth','#68735a',.55);
 for(const side of[-1,1]){add(g,ball,eyebase,length*.34,depth*.22,side*width*.59,1.25,1.25,.55);add(g,ball,pupil,length*.35,depth*.24,side*(width*.59+.42),.72,.78,.23);
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(length*.19,depth*.55,side*width*.52),new THREE.Vector3(length*.21,0,side*width*.83),new THREE.Vector3(length*.16,-depth*.5,side*width*.53)]);add(g,new THREE.TubeGeometry(curve,16,.18,5,false),mouth,0,0,0);
  if(kind==='catfish'||kind==='carp'||kind==='pangasius'){const whisker=new THREE.CatmullRomCurve3([new THREE.Vector3(length*.44,-1,side*1.3),new THREE.Vector3(length*.51,-3,side*6),new THREE.Vector3(length*.4,-4,side*13)]);add(g,new THREE.TubeGeometry(whisker,16,.24,6,false),mouth,0,0,0);}}
 add(g,new THREE.TorusGeometry(1.2,.3,8,20),mouth,length*.5-.4,0,0).rotation.y=Math.PI/2;
 g.userData.fish={body,tail,pectorals,base:new Float32Array(positions),length};return g;
}
export function animateFish(model,time,strength=1){const f=model.userData.fish;if(!f)return;const p=f.body.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=f.base[i*3],tailWeight=Math.max(0,-x/f.length+.22);p.setZ(i,f.base[i*3+2]+Math.sin(time*7.4+x*.11)*tailWeight*3.2*strength);}p.needsUpdate=true;f.tail.rotation.y=Math.sin(time*7.4-2.3)*.3*strength;for(let i=0;i<f.pectorals.length;i++)f.pectorals[i].rotation.x=Math.sin(time*3+i)*.08*strength;}

function pierRoof(g,m,cx,width,depth,eaves,rise){
 const points=[[cx-width/2,eaves,-depth/2],[cx+width/2,eaves,-depth/2],[cx+width/2,eaves,depth/2],[cx-width/2,eaves,depth/2]],positions=[],uv=[];
 for(let i=0;i<4;i++){positions.push(...points[(i+1)%4],...points[i],cx,eaves+rise,0);uv.push(0,0,width/40,0,width/80,depth/80);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();geo.userData.buildingOwned=true;add(g,geo,m,0,0,0);
 for(let i=0;i<4;i++)beam(g,m,points[i],points[(i+1)%4],1.5);
}
function pierArchitecture(g,m,level,metal){
 const stone=m.stone,brass=physical('pier-brass','#b09251',.35,.7);
 // All tiers keep the same landing, water access and collision footprint.
 if(level>=2){
  for(const x of[-86,-22,48])for(const z of[-38,38]){block(g,stone,x,-15,z,14,45,14);block(g,metal,x,8,z,15,2,15);}
  for(const z of[-46,46])for(const x of[-98,-45,8,58]){block(g,m.darkWood,x,62,z,4,12,4);add(g,ball,brass,x,68,z,2.2);}
  for(const z of[-46,46])block(g,m.wood,-21,64,z,164,3,4);
  block(g,m.darkWood,30,27,-31,36,18,22);block(g,m.wood,30,37,-31,38,3,24);block(g,brass,30,31,-43,4,2,1);
 }
 if(level===3){
  for(const x of[-30,54])for(const z of[-34,34]){block(g,m.darkWood,x,61,z,5,86,5);beam(g,m.wood,[x,83,z],[x+(x<0?15:-15),102,z],1.6);}
  for(const z of[-34,34])block(g,m.wood,12,103,z,90,6,6);
  pierRoof(g,m.roof||m.darkWood,12,106,86,105,22);
 }
 if(level>=4){
  const top=level===5?132:112,cx=level===5?-20:-4,w=level===5?170:140,left=cx-w/2+8,right=cx+w/2-8;
  for(const x of[left,right])for(const z of[-35,35]){block(g,stone,x,30,z,11,24,11);block(g,m.darkWood,x,(top+42)/2,z,6,top-42,6);block(g,brass,x,43,z,9,3,9);block(g,m.wood,x,top,z,11,6,11);beam(g,m.wood,[x,top-20,z],[x+(x<cx?18:-18),top,z],2);}
  for(const z of[-35,35])block(g,m.wood,cx,top,z,w-10,6,7);
  for(const x of[left,right])block(g,m.wood,x,top,0,7,6,78);
  pierRoof(g,m.roof||m.darkWood,cx,w,94,top+3,level===5?26:30);
  for(const z of[-46,46])for(let x=-88;x<54;x+=23){beam(g,m.darkWood,[x,30,z],[x+20,58,z],.9);beam(g,m.darkWood,[x,58,z],[x+20,30,z],.9);}
  for(const x of[right])for(const z of[-35,35]){beam(g,brass,[x,top-4,z],[x,top-16,z],.55);add(g,ball,physical('pier-warm-lamp','#ffe2a1',.3),x,top-20,z,3,5,3);}
  if(level===5){
   pierRoof(g,m.roof||m.darkWood,cx,94,58,top+29,20);
   add(g,ball,brass,cx,top+52,0,3);beam(g,brass,[cx,top+48,0],[cx,top+60,0],.8);
   for(const z of[-32,32]){block(g,stone,45,25,z,15,14,15);block(g,m.soil,45,33,z,12,1,12);for(let i=0;i<5;i++)add(g,ball,m.green||m.darkWood,45+Math.sin(i*2)*4,38+i%2*3,z+Math.cos(i*2)*4,3,6,3);}
   for(const z of[-44,44])block(g,brass,-21,65,z,164,1,1);
  }
 }
}
export function createPier(materials,finished=true,level=1,upgrading=false,merge=null){
 const g=new THREE.Group(),m=materials,metal=physical('pier-bolt','#727c76',.36,.65);
 for(const x of[-86,-22,48])for(const z of[-38,38]){block(g,m.darkWood,x,-5,z,9,64,9);add(g,new THREE.CylinderGeometry(6,6,2,16),metal,x,27,z);}
 for(const z of[-35,35])block(g,m.darkWood,-17,9,z,176,9,8);
 const boards=finished?19:5;for(let i=0;i<boards;i++){const x=-100+i*10.5;block(g,m.wood,x,16,0,9.8,4,92);for(const z of[-35,35])add(g,new THREE.CylinderGeometry(.75,.75,.8,8),metal,x,18.3,z);}
 if(!finished){block(g,m.wood,50,28,18,65,8,24);g.userData.roofHeight=30;return g;}
 for(const z of[-46,46]){for(const x of[-98,-45,8,58]){block(g,m.darkWood,x,36,z,4,40,4);add(g,new THREE.CylinderGeometry(3,3,1.5,12),metal,x,57,z);}block(g,m.wood,-21,51,z,164,4,4);block(g,m.wood,-21,36,z,164,2,3);}
 const rampGroup=new THREE.Group();g.add(rampGroup);const ramp=block(rampGroup,m.wood,89,10,0,62,4,88);ramp.rotation.z=-.28;const rampSteps=[];for(let i=0;i<6;i++)rampSteps.push(block(rampGroup,m.darkWood,63+i*10,18-i*3,0,2,1,88));g.userData.pierRamp={ramp,steps:rampSteps};
 for(const z of[-12,12])for(const x of[-9,9])block(g,m.darkWood,x+5,28,z+17,2,22,2);for(let i=0;i<5;i++)block(g,m.wood,i*5-5,39,17,4.5,2,30);block(g,m.wood,5,53,3,25,4,3);
 const orange=physical('lifebuoy','#c86729',.62),rope=physical('rope','#d5c9a9',.92);
 const buoy=add(g,new THREE.TorusGeometry(10,3,12,36),orange,30,42,45);for(let i=0;i<4;i++){const a=i*TAU/4;const band=add(g,new THREE.TorusGeometry(3.2,.9,8,12),materials.plaster,30+Math.cos(a)*10,42+Math.sin(a)*10,45);band.rotation.set(Math.PI/2,a,0);}
 const loop=new THREE.CatmullRomCurve3([new THREE.Vector3(30,57,46),new THREE.Vector3(24,46,49),new THREE.Vector3(30,42,49)]);add(g,new THREE.TubeGeometry(loop,16,.55,5,false),rope,0,0,0);
 for(const x of[-72,-48])beam(g,metal,[x,22,44],[x,-20,48.5],1.1);for(let i=0;i<6;i++)beam(g,metal,[-72,18-i*6,46+i*.5],[-48,18-i*6,46+i*.5],.9);
 block(g,m.darkWood,42,25,-17,24,15,18);block(g,m.wood,42,33,-17,26,2,20);for(const x of[31,53])block(g,metal,x,28,-17,1,12,20);
 const lantern=physical('pier-lantern','#fff0c0',.32);block(g,metal,-80,30,-27,10,2,10);for(const x of[-84,-76])for(const z of[-31,-23])beam(g,metal,[x,31,z],[x,43,z],.6);add(g,ball,lantern,-80,37,-27,3,5,3);add(g,new THREE.ConeGeometry(8,5,16),metal,-80,45,-27);
 pierArchitecture(g,m,level,metal);g.userData.buildingKind='pier';g.userData.buildingLevel=level;g.userData.roofHeight=new THREE.Box3().setFromObject(g).max.y;
 if(upgrading){const top=g.userData.roofHeight+8;for(const x of[-107,58])for(const z of[-43,43]){block(g,m.darkWood,x,(18+top)/2,z,3,top-18,3);beam(g,m.wood,[x,27,z],[x===-107?58:-107,top-2,z],.7);}for(const z of[-43,43])block(g,m.wood,-24.5,top,z,168,2,4);}
 // Keep the ramp unbatched: its slope follows the height of either riverbank.
 return merge?merge(g):g;
}
export function createRod(level=1){
 const g=new THREE.Group(),graphite=physical('rod:'+level,level===3?'#34596e':level===2?'#574b37':'#343f38',.3,.15),cork=physical('cork','#b69862',.95),metal=physical('reel-metal','#99a7a3',.24,.8);
 beam(g,cork,[0,0,0],[12,8,0],1.1);const rod=new THREE.CatmullRomCurve3([new THREE.Vector3(11,7,0),new THREE.Vector3(24,19,0),new THREE.Vector3(39,31,0),new THREE.Vector3(54,39,0)]);add(g,new THREE.TubeGeometry(rod,32,.45,9,false),graphite,0,0,0);
 for(const t of[.18,.4,.65,.88,1]){const p=rod.getPoint(t),ring=add(g,new THREE.TorusGeometry(.8,.14,6,12),metal,p.x,p.y-.7,p.z);ring.rotation.y=Math.PI/2;}
 add(g,new THREE.CylinderGeometry(2.5,2.5,4,16),metal,10,2,-3).rotation.x=Math.PI/2;beam(g,graphite,[10,3,-2],[12,6,0],.5);beam(g,metal,[10,2,-5],[14,2,-6],.45);add(g,ball,cork,14,2,-6,.8,.8,1.3);
 const hookModel=createHook();hookModel.position.set(54,29,0);g.add(hookModel);g.userData.tip=new THREE.Vector3(54,39,0);return g;
}
export function createHook(){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(1,3,0),new THREE.Vector3(1,-1,0),new THREE.Vector3(-1.2,-1.8,0),new THREE.Vector3(-1.6,.4,0)]),hook=new THREE.Mesh(new THREE.TubeGeometry(curve,22,.16,7,false),physical('reel-metal','#99a7a3',.24,.8));hook.name='hook';return hook;}
export function fitPierRamp(model,b,height){const ramp=model.userData.pierRamp;if(!ramp)return;const direction=b.rotation===2?-1:1,end=height(b.x+direction*120,b.y)-height(b.x,b.y)+.5,angle=Math.atan2(end-18,62);ramp.ramp.position.set(89,(18+end)/2-2,0);ramp.ramp.scale.x=Math.hypot(62,end-18);ramp.ramp.rotation.z=angle;for(let i=0;i<ramp.steps.length;i++){const x=63+i*10,r=ramp.steps[i];r.position.set(x,18+(end-18)*(x-58)/62+.7,0);r.rotation.z=angle;}}
export class FishingScene{
 constructor(scene,height,rules){this.scene=scene;this.height=height;this.rules=rules;this.group=new THREE.Group();scene.add(this.group);this.lineMaterial=new THREE.LineBasicMaterial({color:'#d4ded1',transparent:true,opacity:.85});this.rippleMaterial=new THREE.MeshBasicMaterial({color:'#c5e3d8',transparent:true,opacity:.45,depthWrite:false,side:THREE.DoubleSide});this.rods=new Map();this.slot=null;this.catchFish=null;}
 update(farm,now,time,selection){
  const c=farm.s.fishing?.cast,last=farm.s.fishing?.records[0],celebrating=last&&now-last.at<5500;
  const slot=c?.slot??selection?.slot??(celebrating?this.slot:null),b=farm.s.buildings.find(b=>b.slot===slot&&b.kind==='pier'&&b.readyAt<=now);
  this.group.visible=Boolean(b);if(!b)return;this.slot=b.slot;
  const level=c?.rod??farm.s.fishing.rod,key=b.slot+':'+level;
  if(this.key!==key){this.clear();this.key=key;this.rod=createRod(level);this.rod.rotation.y=Math.PI;this.rod.position.set(-63,23,-13);this.group.add(this.rod);this.line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:36},()=>new THREE.Vector3())),this.lineMaterial);this.group.add(this.line);
   const holder=physical('rod-holder','#65736c',.35,.7);beam(this.group,holder,[-66,18,-13],[-66,25,-13],.6);beam(this.group,holder,[-69,25,-13],[-66,23,-13],.45);beam(this.group,holder,[-66,23,-13],[-63,25,-13],.45);
   this.bobber=new THREE.Group();add(this.bobber,new THREE.CylinderGeometry(1.1,.6,4,12),physical('bobber-red','#be4b2e',.35),0,2,0);add(this.bobber,ball,physical('bobber-cream','#ece9d2',.38),0,.2,0,1.5,1.7,1.5);beam(this.bobber,physical('hook-metal','#9ba7a1',.25,.8),[0,3,0],[0,7,0],.2);this.group.add(this.bobber);
   const castHook=createHook();castHook.position.y=-7;this.bobber.add(castHook);this.bobber.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-1,0),new THREE.Vector3(0,-4,0)]),this.lineMaterial));
   this.ripples=Array.from({length:3},()=>{const r=add(this.group,new THREE.RingGeometry(.9,1,48),this.rippleMaterial.clone(),0,0,0);r.rotation.x=-Math.PI/2;r.castShadow=false;return r;});
  }
  this.group.position.set(b.x,this.height(b.x,b.y),b.y);this.group.rotation.y=b.rotation*Math.PI/2;
  const stage=this.rules.fishingStage(c,now),elapsed=c?(now-c.startedAt)/1000:0,casting=c?Math.min(1,elapsed/1.1):0,worldWater=1.6-this.group.position.y;
  if(this.castKey!==c?.id){this.castKey=c?.id;this.reelOffset=0;}const delta=Math.max(0,Math.min(.06,time-(this.lastTime??time)));this.lastTime=time;this.reelOffset+=((c?.reels||0)*18-this.reelOffset)*(1-Math.exp(-delta*5));
  const target=new THREE.Vector3(-142+this.reelOffset,worldWater,-10),tip=this.rod.localToWorld(this.rod.userData.tip.clone());this.group.worldToLocal(tip);
  const float=c?new THREE.Vector3().lerpVectors(tip,target,casting):new THREE.Vector3(-109,23,-13);if(casting<1&&c)float.y+=Math.sin(casting*Math.PI)*28;
  const bite=stage==='bite'||stage==='pull';float.y+=(bite?-1.4:0)+Math.sin(time*(bite?9:2.2))*(bite?.7:.23);float.z+=Math.sin(time*1.4)*.6;this.bobber.position.copy(float);this.bobber.visible=Boolean(c&&stage!=='landed'&&stage!=='escaped');
  const pulling=c?.hookedAt>0;this.rod.rotation.z=pulling?Math.sin(time*3)*.025:Math.sin(time*.8)*.006;this.rod.getObjectByName('hook').visible=!c||stage==='escaped';
  const curve=new THREE.QuadraticBezierCurve3(tip,tip.clone().lerp(float,.5).add(new THREE.Vector3(0,pulling?-3:-13,0)),float),p=this.line.geometry.attributes.position;
  for(let i=0;i<p.count;i++){const v=curve.getPoint(i/(p.count-1));p.setXYZ(i,v.x,v.y,v.z);}p.needsUpdate=true;this.line.geometry.computeBoundingSphere();this.line.visible=Boolean(c&&stage!=='escaped'&&stage!=='landed');
  for(let i=0;i<this.ripples.length;i++){const progress=(time*.5+i/3)%1,r=this.ripples[i];r.visible=Boolean(c&&casting===1&&stage!=='escaped'&&stage!=='landed');r.position.set(float.x,worldWater+.2,float.z);r.scale.setScalar(3+progress*(bite?18:10));r.material.opacity=(1-progress)*(bite?.4:.2);}
  const swimming=c&&casting===1&&['bite','reeling','pull'].includes(stage);
  if(swimming){if(this.swimKey!==c.id){if(this.swimFish){this.group.remove(this.swimFish);this.dispose(this.swimFish);}const outcome=this.rules.fishingOutcome(c.seed,c.bait,c.rod,c.conditions,this.rules.buildingLevel(b,now),c.poolVersion??1);this.swimFish=createFish(outcome.kind);this.swimFish.scale.setScalar(.32);this.group.add(this.swimFish);this.swimKey=c.id;}this.swimFish.visible=true;this.swimFish.position.set(float.x-this.swimFish.userData.fish.length*.16+Math.sin(time*1.6)*(pulling?1:4),float.y-7+Math.sin(time*2)*.6,float.z+Math.cos(time*1.6)*(pulling?1:4));this.swimFish.rotation.set(.06,Math.sin(time*1.6)*.15,.05);animateFish(this.swimFish,time,pulling?1.25:.6);}else if(this.swimFish)this.swimFish.visible=false;
  if(celebrating){if(this.catchKey!==last.at){if(this.catchFish){this.group.remove(this.catchFish);this.dispose(this.catchFish);}this.catchFish=createFish(last.kind);this.catchFish.scale.setScalar(.37);this.group.add(this.catchFish);this.catchKey=last.at;}const age=(now-last.at)/1000;this.catchFish.position.set(-112+Math.min(1,age/2)*48,worldWater+Math.sin(Math.min(1,age/2)*Math.PI)*48+Math.min(1,age/2)*26,-10);this.catchFish.rotation.set(.15,time*.5,.2);animateFish(this.catchFish,time,1.5);this.catchFish.visible=true;}else if(this.catchFish)this.catchFish.visible=false;
 }
 dispose(o){o.traverse(v=>{if(v.geometry&&!v.geometry.userData.cc0Shared)v.geometry.dispose();});}
 clear(){for(const r of this.ripples||[])r.material.dispose();for(const o of [...this.group.children]){this.group.remove(o);this.dispose(o);}this.catchFish=null;this.catchKey=null;this.swimFish=null;this.swimKey=null;}
}
