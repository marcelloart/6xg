import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/* Farm geometry uses the existing 3200 × 2200 save coordinates: x → X, y → Z.
   Only the view is 3D. Planting, prices, deadlines, and account saves stay in BaraFarm. */
const B=window.BaraFarm || BaraFarm;
const TEXTURES=FARM_TEXTURE_URLS;
const TAU=Math.PI*2;
const rng=seed=>()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
const random=rng(60102);
function terrainHeight(x,z){const edge=Math.max(Math.abs(x-1600)-570,Math.abs(z-1170)-580,0),river=640+110*Math.sin(z/270);const blend=Math.min(1,edge/200)*Math.min(1,Math.max(0,Math.abs(x-river)-130)/170);return blend*(16+13*Math.sin(x/330)*Math.cos(z/285)+8*Math.sin((x+z)/180));}
const box=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,9),sphere=new THREE.SphereGeometry(1,10,7),leafGeometry=new THREE.PlaneGeometry(1,1);
const temp=new THREE.Object3D();
function material(color,roughness=.9){return new THREE.MeshStandardMaterial({color,roughness});}
function mesh(geometry,mat,x,y,z,sx=1,sy=sx,sz=sx,rx=0,ry=0,rz=0){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rx,ry,rz);m.castShadow=true;m.receiveShadow=true;if(mat.userData.windDepth)m.customDepthMaterial=mat.userData.windDepth;return m;}
function beam(group,mat,from,to,radius=2){const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),d=b.clone().sub(a),m=mesh(cylinder,mat,0,0,0,radius,d.length(),radius);m.position.copy(a.add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());group.add(m);return m;}
function block(group,mat,x,y,z,w,h,d,rx=0,ry=0,rz=0){const m=mesh(box,mat,x,y,z,w,h,d,rx,ry,rz);group.add(m);return m;}
function mergeStatic(group){const byMaterial=new Map();group.updateMatrixWorld(true);for(const m of [...group.children]){if(!m.isMesh||m.geometry.attributes.position===undefined)continue;let g=m.geometry.clone();if(g.index){const expanded=g.toNonIndexed();g.dispose();g=expanded;}g.applyMatrix4(m.matrix);if(!byMaterial.has(m.material))byMaterial.set(m.material,[]);byMaterial.get(m.material).push(g);group.remove(m);}
 for(const [mat,list]of byMaterial){const merged=mergeGeometries(list,false);if(merged){const m=new THREE.Mesh(merged,mat);m.castShadow=true;m.receiveShadow=true;if(mat.userData.windDepth)m.customDepthMaterial=mat.userData.windDepth;group.add(m);}for(const g of list)g.dispose();}return group;}
function disposeGeometry(group){group.traverse(o=>{if((o.isMesh||o.isLine)&&!([box,cylinder,sphere,leafGeometry].includes(o.geometry)))o.geometry.dispose();});}
function leafTexture(){const canvas=document.createElement('canvas');canvas.width=96;canvas.height=160;const c=canvas.getContext('2d');const gradient=c.createLinearGradient(15,0,85,160);gradient.addColorStop(0,'#a5b57c');gradient.addColorStop(.4,'#6f8f47');gradient.addColorStop(1,'#344e25');c.fillStyle=gradient;c.beginPath();c.moveTo(49,3);c.bezierCurveTo(90,47,91,112,49,156);c.bezierCurveTo(6,113,10,42,49,3);c.fill();c.strokeStyle='#b1bd826b';c.lineWidth=1.2;c.beginPath();c.moveTo(49,150);c.quadraticCurveTo(41,78,49,7);c.stroke();for(let y=35;y<141;y+=15){c.beginPath();c.moveTo(47,y+12);c.lineTo(21,y-6);c.moveTo(47,y+12);c.lineTo(74,y-6);c.stroke();}const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;}
function grainTexture(base){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle=base;c.fillRect(0,0,128,128);const noise=rng(408);for(let i=0;i<6500;i++){c.fillStyle=noise()>.5?'#ffffff0d':'#00000013';c.fillRect(noise()*128,noise()*128,1+noise()*3,1+noise()*3);}const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;}


// One wind clock drives foliage, grass, crops and their matching shadow silhouettes.
function windMaterial(mat,clock,strength,kind='leaf'){
 const patch=shader=>{shader.uniforms.baraWindTime=clock;shader.uniforms.baraWindStrength=strength;
  shader.vertexShader='uniform float baraWindTime;\nuniform float baraWindStrength;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vec3 windAnchor=position;
   #ifdef USE_INSTANCING
    windAnchor=(instanceMatrix*vec4(position,1.0)).xyz;
   #endif
   windAnchor=(modelMatrix*vec4(windAnchor,1.0)).xyz;
   float gust=sin(windAnchor.x*.013+windAnchor.z*.009+baraWindTime*1.45)*.65+sin(windAnchor.z*.021-baraWindTime*.83)*.35;
   float weight=${kind==='grass'?'clamp(position.y/6.8,0.0,1.0)':kind==='trunk'?'smoothstep(10.0,145.0,position.y)':`1.0;
   #ifndef USE_INSTANCING
    weight=smoothstep(0.0,42.0,position.y);
   #endif
   float ignored=0.0`} ;
   vec3 breeze=vec3(gust, sin(baraWindTime*2.3+windAnchor.x*.09)*.16,gust*.48)*baraWindStrength*weight;
   #ifdef USE_INSTANCING
    transformed+=inverse(mat3(instanceMatrix))*breeze;
   #else
    transformed+=breeze;
   #endif`);
 };
 mat.onBeforeCompile=patch;mat.customProgramCacheKey=()=>`bara-wind-${kind}-1`;
 const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:mat.map,alphaTest:mat.alphaTest,side:mat.side});depth.onBeforeCompile=patch;depth.customProgramCacheKey=mat.customProgramCacheKey;mat.userData.windDepth=depth;return mat;
}
function makeRiverGeometry(){const positions=[],uvs=[],indices=[],across=12,along=160;for(let row=0;row<=along;row++){const z=row*2200/along,center=640+110*Math.sin(z/270);for(let col=0;col<=across;col++){positions.push(center-105+210*col/across,1.2,z);uvs.push(col/across,z/2200);} }for(let row=0;row<along;row++)for(let col=0;col<across;col++){const n=row*(across+1)+col;indices.push(n,n+across+1,n+1,n+1,n+across+1,n+across+2);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;}
function riverMaterial(clock){return new THREE.ShaderMaterial({uniforms:{baraTime:clock},vertexShader:`
 uniform float baraTime;varying vec3 riverWorld;varying vec2 riverUV;
 void main(){vec3 p=position;p.y+=sin(p.x*.048+baraTime*1.3)*.55+cos(p.z*.037-baraTime*1.05)*.35;riverWorld=(modelMatrix*vec4(p,1.)).xyz;riverUV=uv;gl_Position=projectionMatrix*viewMatrix*vec4(riverWorld,1.);}
 `,fragmentShader:`
 uniform float baraTime;varying vec3 riverWorld;varying vec2 riverUV;
 void main(){float x=riverWorld.x,z=riverWorld.z;
 float a=x*.048+baraTime*1.3,b=z*.037-baraTime*1.05;
 float fine=sin(x*.24+z*.16-baraTime*3.1)*.03;vec3 normal=normalize(vec3(-cos(a)*.0264+fine,1.,sin(b)*.01295+fine*.55));
 vec3 eye=normalize(cameraPosition-riverWorld);
 float fresnel=pow(1.-max(0.,dot(normal,eye)),3.);
 float stream=sin(z*.16-x*.07-baraTime*2.7)*sin(z*.035+x*.03-baraTime*.8);
 float shore=pow(abs(riverUV.x-.5)*2.,7.);
 vec3 deep=vec3(.035,.19,.245),shallow=vec3(.14,.37,.35),sky=vec3(.50,.68,.74);
 vec3 water=mix(mix(deep,shallow,shore*.65),sky,fresnel*.72);
 float sparkle=pow(max(0.,dot(reflect(-normalize(vec3(-.55,1.,-.45)),normal),eye)),80.);
 water+=stream*.018+vec3(.83,.83,.66)*sparkle*.8;
 float foam=smoothstep(.97,1.,abs(riverUV.x-.5)*2.)*(.12+.06*sin(z*.25-baraTime*1.8));
 water=mix(water,vec3(.75,.83,.75),foam);gl_FragColor=vec4(water,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});}

class FarmRenderer3D {
 constructor(canvas,camera,quality){
  this.canvas=canvas;this.camera=camera;this.quality=quality;this.lastFrame=0;this.lastMini=0;this.lastModel='';this.catalogue={};this.width=0;this.height=0;this.lost=false;this.wind=!matchMedia('(prefers-reduced-motion: reduce)').matches;try{const saved=localStorage.getItem('6xg:motion');if(saved!==null)this.wind=saved==='true';}catch{}
  this.webgl=new THREE.WebGLRenderer({canvas,antialias:quality!=='low',alpha:false,powerPreference:'high-performance'});
  this.webgl.outputColorSpace=THREE.SRGBColorSpace;this.webgl.toneMapping=THREE.ACESFilmicToneMapping;this.webgl.toneMappingExposure=1.12;
  this.webgl.setPixelRatio(Math.min(devicePixelRatio||1,quality==='high'?1.5:1));this.webgl.shadowMap.enabled=quality!=='low';this.webgl.shadowMap.type=THREE.PCFShadowMap;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#c2cdbb');this.scene.fog=new THREE.Fog('#c2cdbb',3300,4900);
  this.view=new THREE.OrthographicCamera(-1,1,1,-1,10,6200);this.view.up.set(0,1,0);
  const hemisphere=new THREE.HemisphereLight('#e6f0ff','#625f3f',2.25);this.scene.add(hemisphere);
  this.sun=new THREE.DirectionalLight('#ffe7bd',2.6);this.sun.position.set(710,1300,550);this.sun.target.position.set(1610,0,1120);this.sun.castShadow=quality!=='low';const shadow=this.sun.shadow;shadow.mapSize.set(quality==='high'?2048:1024,quality==='high'?2048:1024);shadow.camera.left=-1050;shadow.camera.right=1050;shadow.camera.top=850;shadow.camera.bottom=-850;shadow.camera.near=100;shadow.camera.far=3200;shadow.bias=-.0003;shadow.normalBias=1.8;shadow.radius=3;this.scene.add(this.sun,this.sun.target);
  this.materials={grass:material('#b4bd94'),soil:material('#d2bca4'),wood:material('#aaa185'),darkWood:material('#69543c'),plaster:material('#e1dac5'),stone:material('#a5a698'),roof:material('#847361'),iron:material('#414943',.65),glass:new THREE.MeshStandardMaterial({color:'#314947',metalness:.18,roughness:.25}),leaves:new THREE.MeshStandardMaterial({color:'#abbc83',map:leafTexture(),alphaTest:.4,side:THREE.DoubleSide,roughness:1}),green:material('#607b38'),red:material('#a2422e'),straw:material('#b7a076')};
  const fruitColors={carrot:'#b55d24',tomato:'#aa3627',corn:'#c5a846',strawberry:'#ad2e42',potato:'#8a6a45',chili:'#943225',orange:'#ce8423',apple:'#993524',avocado:'#46682b'};
  this.fruitMaterials=Object.fromEntries(Object.entries(B.CROPS).map(([key,crop])=>[key,material(fruitColors[key]||crop.color,.62)]));
  this.windTime={value:0};this.windStrength={value:this.wind?4.2:0};this.grassStrength={value:this.wind?2.2:0};this.trunkStrength={value:this.wind?3.5:0};windMaterial(this.materials.leaves,this.windTime,this.windStrength);windMaterial(this.materials.green,this.windTime,this.grassStrength,'grass');this.treeWood=windMaterial(this.materials.darkWood.clone(),this.windTime,this.trunkStrength,'trunk');
  this.materials.plaster.map=grainTexture('#dedacc');this.materials.roof.map=grainTexture('#aaa28e');
  this.materials.grass.map=grainTexture('#9aab78');this.materials.grass.map.repeat.set(48,33);
  this.materials.soil.map=grainTexture('#74563c');this.materials.wood.map=grainTexture('#8d7753');
  this.loadMaterial('Grass005',this.materials.grass,48,33);this.loadMaterial('Ground112',this.materials.soil,2,2);this.loadMaterial('Wood096',this.materials.wood,1,1);
  this.landscape=new THREE.Group();this.farmLayer=new THREE.Group();this.cropLayer=new THREE.Group();this.scene.add(this.landscape,this.farmLayer,this.cropLayer);this.makeLandscape();
  this.labelLayer=document.createElement('div');this.labelLayer.className='world-labels';this.labelLayer.setAttribute('aria-hidden','true');canvas.parentElement.append(this.labelLayer);this.labels=new Map();
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.showLost();});canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;this.lastModel='';this.hideLost();});
  this.mode='3d';document.getElementById('cameraPosition').textContent='DUNIA 3D · KEBUN MILIKMU';
 }
 loadMaterial(id,mat,x,y){const loader=new THREE.TextureLoader(),configure=t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(x,y);t.anisotropy=Math.min(8,this.webgl.capabilities.getMaxAnisotropy());};loader.load(TEXTURES[id+'_1K-JPG_Color.jpg'],t=>{configure(t);t.colorSpace=THREE.SRGBColorSpace;mat.map=t;mat.needsUpdate=true;},undefined,()=>{});loader.load(TEXTURES[id+'_1K-JPG_NormalGL.jpg'],t=>{configure(t);mat.normalMap=t;mat.normalScale.set(.55,.55);mat.needsUpdate=true;},undefined,()=>{});}
 showLost(){if(this.lostNotice)return;const div=document.createElement('div');div.className='graphics-notice';div.setAttribute('role','status');div.innerHTML='<p>Tampilan 3D sedang dipulihkan. Progres kebunmu tetap tersimpan.</p><button>Tampilkan dalam 2D</button>';div.querySelector('button').onclick=()=>{try{localStorage.setItem('6xg:graphics','2d');}catch{}location.reload();};this.canvas.parentElement.append(div);this.lostNotice=div;}
 hideLost(){this.lostNotice?.remove();this.lostNotice=null;}
 roof(group,width,depth,baseHeight,peakHeight){const m=this.materials,half=width/2+9,length=Math.hypot(half,peakHeight),angle=Math.atan2(peakHeight,half);for(const side of[-1,1])block(group,m.roof,side*half/2,baseHeight+peakHeight/2,0,length,4,depth+18,0,0,-side*angle);
  // Individual overlapping courses give the roof thickness and readable eaves.
  for(const side of[-1,1])for(let i=0;i<6;i++){const f=(i+.5)/6,x=side*half*f,y=baseHeight+peakHeight*(1-f)+3;block(group,m.darkWood,x,y,0,3,2,depth+20,0,0,-side*angle);}
  block(group,m.darkWood,0,baseHeight+peakHeight+2,0,5,5,depth+24);
 }
 building(kind,finished=true){const group=new THREE.Group(),m=this.materials,w=kind==='barn'?108:kind==='shed'?84:96,d=kind==='barn'?92:74,h=kind==='barn'?68:58;
  if(!finished){block(group,m.stone,0,3,0,w+12,6,d+12);for(const x of[-w/2,w/2])for(const z of[-d/2,d/2])block(group,m.wood,x,34,z,5,66,5);for(const z of[-d/2,d/2]){beam(group,m.wood,[-w/2,10,z],[w/2,56,z],2);block(group,m.wood,0,51,z,w+18,4,4);}block(group,m.straw,20,10,0,28,14,26);return mergeStatic(group);}
  if(kind==='well'){group.add(mesh(new THREE.CylinderGeometry(27,30,25,20,1,true),m.stone,0,13,0));group.add(mesh(new THREE.CylinderGeometry(26,26,3,20),m.glass,0,7,0));for(let a=0;a<TAU;a+=Math.PI/9)block(group,m.stone,29*Math.cos(a),27,29*Math.sin(a),11,7,10,0,-a);for(const x of[-36,36])block(group,m.wood,x,38,0,5,76,5);block(group,m.wood,0,59,0,77,7,7);this.roof(group,76,58,78,25);beam(group,m.straw,[0,59,0],[0,20,0],.6);group.add(mesh(cylinder,m.iron,0,20,0,7,12,7));return mergeStatic(group);}
  block(group,m.stone,0,6,0,w+14,12,d+14);block(group,kind==='house'?m.plaster:m.wood,0,h/2+12,0,w,h,d);
  for(const x of[-w/2,w/2])for(const z of[-d/2,d/2])block(group,m.darkWood,x,h/2+12,z,5,h+3,5);
  // Weatherboard seams and structural timber, doors, frames, and window glass.
  for(let y=19;y<h+12;y+=9)for(const z of[-d/2-.6,d/2+.6])block(group,m.darkWood,0,y,z,w,1,1.1);
  const doorW=kind==='barn'?40:21;block(group,m.darkWood,0,30,d/2+1,doorW+5,39,4);block(group,m.wood,0,30,d/2+4,doorW,35,2);if(kind==='barn'){beam(group,m.plaster,[-18,14,d/2+6],[18,46,d/2+6],1.4);beam(group,m.plaster,[18,14,d/2+6],[-18,46,d/2+6],1.4);}else group.add(mesh(sphere,m.iron,7,30,d/2+7,1.2));
  if(kind!=='shed')for(const x of[-32,32]){block(group,m.darkWood,x,46,d/2+2,21,23,3);block(group,m.glass,x,46,d/2+4,17,19,2);block(group,m.plaster,x,46,d/2+6,1,19,1);block(group,m.plaster,x,46,d/2+6,17,1,1);block(group,m.wood,x,33,d/2+5,24,3,7);}
  if(kind==='house'){block(group,m.darkWood,-w/2-1,44,-8,3,23,22);block(group,m.glass,-w/2-3,44,-8,2,18,17);block(group,m.plaster,-w/2-4,44,-8,1,18,1);block(group,m.plaster,-w/2-4,44,-8,1,1,17);}
  this.roof(group,w,d,h+12,32);block(group,m.darkWood,0,13,d/2+17,w+6,5,23);
  if(kind==='house'){block(group,m.stone,27,h+27,-18,14,40,15);block(group,m.darkWood,27,h+48,-18,20,4,21);for(const x of[-40,40])block(group,m.wood,x,31,d/2+23,3,59,3);block(group,m.roof,0,61,d/2+19,96,3,28,.12);for(const x of[-35,35]){group.add(mesh(cylinder,m.soil,x,20,d/2+24,7,11,7));group.add(mesh(sphere,m.green,x,30,d/2+24,9,9,9));}}
  if(kind==='barn'){for(let i=0;i<3;i++){group.add(mesh(cylinder,m.straw,w/2+20,12,-18+i*25,12,25,12,Math.PI/2));}block(group,m.wood,w/2+20,5,35,31,10,28);}
  return mergeStatic(group);
 }
 makeLandscape(){const m=this.materials,g=this.landscape,terrain=new THREE.PlaneGeometry(3200,2200,128,88);terrain.rotateX(-Math.PI/2);const terrainPosition=terrain.attributes.position;for(let i=0;i<terrainPosition.count;i++)terrainPosition.setY(i,terrainHeight(terrainPosition.getX(i)+1600,terrainPosition.getZ(i)+1100)-1);terrain.computeVertexNormals();const ground=mesh(terrain,m.grass,1600,0,1100);ground.castShadow=false;g.add(ground);
  const paths=new THREE.Group(),pathMaterial=material('#c3b193');pathMaterial.map=m.soil.map;const points=[[770,1115],[1080,1130],[1280,1300],[1940,1300],[2250,1530],[2600,1620]];for(let i=1;i<points.length;i++){const[a,b]=[points[i-1],points[i]],dx=b[0]-a[0],dz=b[1]-a[1];block(paths,pathMaterial,(a[0]+b[0])/2,0,(a[1]+b[1])/2,38,.7,Math.hypot(dx,dz)+30,0,Math.atan2(dx,dz));}block(paths,pathMaterial,1593,0,939,25,.8,115);mergeStatic(paths);g.add(paths);
  this.water=riverMaterial(this.windTime);this.river=new THREE.Mesh(makeRiverGeometry(),this.water);this.river.castShadow=false;this.river.receiveShadow=false;g.add(this.river);
  const staticProps=new THREE.Group();const pondok=this.building('house');pondok.position.set(1593,0,872);pondok.userData.building=true;this.pondok=pondok;g.add(pondok);
  // Split-rail fence around the expandable garden, with a south gate.
  const rail=(x1,z1,x2,z2)=>{const length=Math.hypot(x2-x1,z2-z1),count=Math.ceil(length/46);for(let i=0;i<=count;i++){const t=i/count;block(staticProps,m.wood,x1+(x2-x1)*t,13,z1+(z2-z1)*t,3,26,3);}for(const h of[9,21])beam(staticProps,m.wood,[x1,h,z1],[x2,h,z2],1.8);};

  // Bridge planks are individual meshes batched into a few draw calls.
  for(let i=0;i<18;i++)block(staticProps,m.wood,548+i*13,8,1115,12,6,78);for(const z of[1070,1160]){rail(540,z,785,z);}
  block(staticProps,m.wood,1485,20,888,55,5,15);for(const x of[1464,1506])block(staticProps,m.darkWood,x,10,888,4,19,10);
  for(const [x,z]of[[1470,916],[1488,925],[1461,930]]){block(staticProps,m.wood,x,8,z,15,16,15);for(const yy of[4,12])block(staticProps,m.darkWood,x,yy,z+8,16,1,1);}
  const stoneMat=m.stone;for(let i=0;i<180;i++){const z=random()*2200,x=640+110*Math.sin(z/270)+(random()>.5?1:-1)*(107+random()*28),r=5+random()*8;staticProps.add(mesh(sphere,stoneMat,x,2,z,r,r*.55,r*.8,0,random()*TAU));}for(const[x,z]of[[1120,660],[2150,940],[2170,957],[1030,1390],[2020,1740],[2100,680]]){const y=terrainHeight(x,z);staticProps.add(mesh(new THREE.DodecahedronGeometry(1,1),stoneMat,x,y+7,z,19,15,23,.3,random()*TAU,.2));}g.add(mergeStatic(staticProps));
  this.makeVegetation();this.makeAtmosphere();
 }
 makeVegetation(){const leafTransforms=[],trunks=new THREE.Group(),m=this.materials,forestRandom=rng(1924);
  const tree=(x,z,size,fruit=false)=>{const r=forestRandom,h=70+size*1.5,base=terrainHeight(x,z),spread=30+size*.55;beam(trunks,this.treeWood,[x,base,z],[x+4,base+h*.72,z],4.5);for(let i=0;i<6;i++){const a=i*2.4,px=x+Math.cos(a)*spread*.7,pz=z+Math.sin(a)*spread*.7;beam(trunks,this.treeWood,[x+2,base+h*.4,z],[px,base+h*(.68+r()*.19),pz],1.8);}
   for(let i=0;i<160;i++){const a=r()*TAU,v=2*r()-1,rad=Math.cbrt(r())*spread,xx=x+Math.sqrt(1-v*v)*Math.cos(a)*rad,zz=z+Math.sqrt(1-v*v)*Math.sin(a)*rad,yy=base+h+v*rad*.75;leafTransforms.push([xx,yy,zz,12+r()*10,17+r()*10,(r()-.5)*2,r()*TAU,(r()-.5)*2]);}
   if(fruit)for(let i=0;i<13;i++){const a=r()*TAU;trunks.add(mesh(sphere,m.red,x+Math.cos(a)*spread*.7,base+h-12+r()*25,z+Math.sin(a)*spread*.7,3.2,3.5,3.2));}
  };
  for(let i=0;i<WORLD_DATA.trees.length;i+=2){const[x,z,size]=WORLD_DATA.trees[i];tree(x,z,size);}for(const[x,z,s]of[[1408,867,29],[1788,859,34],[1050,910,42],[1108,1650,33],[2130,870,40],[2180,1570,38]])tree(x,z,s,true);
  this.landscape.add(mergeStatic(trunks));const leaves=new THREE.InstancedMesh(leafGeometry,m.leaves,leafTransforms.length);const color=new THREE.Color();for(let i=0;i<leafTransforms.length;i++){const[x,y,z,w,h,rx,ry,rz]=leafTransforms[i];temp.position.set(x,y,z);temp.rotation.set(rx,ry,rz);temp.scale.set(w,h,1);temp.updateMatrix();leaves.setMatrixAt(i,temp.matrix);color.setHSL(.205+forestRandom()*.035,.22+forestRandom()*.13,.57+forestRandom()*.14);leaves.setColorAt(i,color);}leaves.customDepthMaterial=m.leaves.userData.windDepth;leaves.castShadow=this.quality!=='low';leaves.receiveShadow=true;leaves.computeBoundingSphere();this.landscape.add(leaves);
 }
 plotGround(p,open){const g=new THREE.Group(),m=this.materials;if(!open)return g;block(g,m.soil,p.x,terrainHeight(p.x,p.y)+1,p.y,57,2,57);for(let i=-20;i<=20;i+=10){const ridge=mesh(cylinder,m.soil,p.x,terrainHeight(p.x,p.y)+2.2,p.y+i,1.6,53,1.6,0,0,Math.PI/2);g.add(ridge);}return mergeStatic(g);}
 makeCrop(key,stage){const g=new THREE.Group(),m=this.materials,r=rng(909+Object.keys(B.CROPS).indexOf(key)),fruit=this.fruitMaterials[key],tree=['apple','orange','avocado'].includes(key),growth=.2+.8*stage;
  for(const x of[-14,14])for(const z of[-14,14]){const h=(tree?49:key==='corn'?38:20)*growth;
   if(tree){beam(g,m.darkWood,[x,1,z],[x,h,z],1.3*growth);for(let i=0;i<3;i++){const a=i*2.3;beam(g,m.darkWood,[x,h*.6,z],[x+Math.cos(a)*9*growth,h*.95,z+Math.sin(a)*9*growth],.6);}for(let i=0;i<32;i++){const a=r()*TAU,v=r()*2-1,rad=12*growth;const leaf=mesh(leafGeometry,m.leaves,x+Math.cos(a)*rad*Math.sqrt(1-v*v),h+v*rad*.65,z+Math.sin(a)*rad*Math.sqrt(1-v*v),6*growth,9*growth,1,(r()-.5)*2,r()*TAU,(r()-.5));g.add(leaf);}if(stage>.72)for(let i=0;i<5;i++){const a=i*2.4;g.add(mesh(sphere,fruit,x+Math.cos(a)*9*growth,h-3+i%2*7,z+Math.sin(a)*9*growth,2.2,2.7,2.2));}}
   else{beam(g,m.green,[x,1,z],[x,h,z],.6);const n=key==='carrot'?9:8;for(let i=0;i<n;i++){const a=i*2.4,w=(key==='corn'?3:4.5)*growth,length=(key==='carrot'?15:11)*growth;const leaf=mesh(leafGeometry,m.leaves,x+Math.sin(a)*w,h*(.3+i/n*.6),z+Math.cos(a)*w,w,length,1,.6+Math.sin(a)*.8,a,.3);g.add(leaf);}if(stage>.72){if(key==='carrot')g.add(mesh(new THREE.ConeGeometry(2.3,10,8),fruit,x,3,z,1,1,1,Math.PI));else if(key==='corn')g.add(mesh(sphere,fruit,x+2,h*.64,z,2.6,6.3,2.5));else if(key==='chili')for(let i=0;i<3;i++)g.add(mesh(new THREE.ConeGeometry(1.7,7,8),fruit,x+Math.cos(i*2)*4,h*.5,z+Math.sin(i*2)*4,1,1,1,Math.PI+.3));else for(let i=0;i<3;i++)g.add(mesh(sphere,fruit,x+Math.cos(i*2)*4,(key==='potato'?3:h*.45),z+Math.sin(i*2)*4,3.1,key==='potato'?2.1:3.1,3.1));}}
  }return mergeStatic(g);
 }
 setMotion(enabled){this.wind=Boolean(enabled);this.windStrength.value=enabled?4.2:0;this.grassStrength.value=enabled?2.2:0;this.trunkStrength.value=enabled?3.5:0;}
 catalogueProduct(kind){const g=new THREE.Group(),m=this.materials,fruit=this.fruitMaterials[kind],round=new THREE.SphereGeometry(1,28,20);
  const leaf=(x,y,z,w=8,h=16,ry=0)=>g.add(mesh(leafGeometry,m.leaves,x,y,z,w,h,1,-.5,ry,.6));
  if(kind==='wood'){for(let i=0;i<3;i++){const log=mesh(new THREE.CylinderGeometry(9,10,65,20),m.wood,(i-1)*14,i===1?21:9,0,1,1,1,Math.PI/2);g.add(log);for(const z of[-33,33])g.add(mesh(new THREE.CircleGeometry(8,24),m.straw,(i-1)*14,i===1?21:9,z,1,1,1,z<0?Math.PI:0));}}
  else if(kind==='stone'){for(let i=0;i<5;i++)g.add(mesh(new THREE.DodecahedronGeometry(1,2),m.stone,Math.sin(i*2.4)*20,10+i%2*9,Math.cos(i*2.4)*16,13+i%3*3,11+i%2*4,14+i%2*3,.3,i,.2));}
  else if(kind==='meat'){const raw=material('#aa5352',.5),fat=material('#e9cfb5',.6);g.add(mesh(round,raw,0,8,0,30,8,21));g.add(mesh(new THREE.TorusGeometry(9,3,12,30),fat,7,16,0,1,1,1,-Math.PI/2));g.add(mesh(new THREE.TorusGeometry(25,1.6,8,40),fat,0,11,0,1,1,.78,-Math.PI/2));}
  else if(kind==='carrot'){g.add(mesh(new THREE.ConeGeometry(8,54,24),fruit,0,28,0,1,1,1,Math.PI));for(let i=0;i<7;i++){const a=i*2.4;beam(g,m.green,[0,54,0],[Math.sin(a)*12,73,Math.cos(a)*12],.6);leaf(Math.sin(a)*12,71,Math.cos(a)*12,9,24,a);}}
  else if(kind==='corn'){g.add(mesh(round,fruit,0,28,0,10,27,10));const kernel=material('#e1c26f',.6);for(let row=0;row<12;row++)for(let col=0;col<9;col++){const a=col*TAU/9,y=5+row*4,rad=9*Math.sqrt(Math.max(.1,1-Math.pow((y-28)/28,2)));g.add(mesh(round,kernel,Math.cos(a)*rad,y,Math.sin(a)*rad,2.4,2.3,2.1));}for(const a of[.4,2.4,4.6])leaf(Math.cos(a)*8,28,Math.sin(a)*8,14,62,a);}
  else if(kind==='chili'){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-19,5,0),new THREE.Vector3(-2,10,2),new THREE.Vector3(12,23,0),new THREE.Vector3(18,42,0)]);g.add(mesh(new THREE.TubeGeometry(curve,26,5,12,false),fruit,0,0,0));beam(g,m.green,[18,42,0],[12,53,0],2);leaf(10,51,0,7,15,.5);}
  else if(kind==='strawberry'){g.add(mesh(new THREE.ConeGeometry(19,34,28),fruit,0,24,0,1,1,1,Math.PI));g.add(mesh(round,fruit,0,39,0,19,8,19));const seed=material('#debb71');for(let row=0;row<5;row++)for(let i=0;i<10;i++){const a=i*TAU/10+row*.22,y=13+row*6,rad=5+row*3;g.add(mesh(round,seed,Math.sin(a)*rad,y,Math.cos(a)*rad,.9,1.4,.7));}for(let i=0;i<6;i++)leaf(Math.sin(i)*7,46,Math.cos(i)*7,7,16,i);}
  else if(kind==='avocado'){g.add(mesh(round,fruit,0,28,0,18,27,17));beam(g,m.darkWood,[0,54,0],[2,61,0],1.2);leaf(8,58,0,9,18);}
  else{const radius=kind==='potato'?20:23;g.add(mesh(round,fruit,0,24,0,radius,kind==='apple'?22:kind==='potato'?16:23,kind==='potato'?15:23));if(kind!=='potato'){beam(g,m.darkWood,[0,44,0],[2,54,0],1.4);leaf(9,51,1,10,18,.8);}else{for(let i=0;i<11;i++){const a=i*2.4;g.add(mesh(round,m.darkWood,Math.cos(a)*18,25+Math.sin(i)*8,Math.sin(a)*14,.8,.5,.7));}}}
  return mergeStatic(g);
 }
 makeCatalogue(){const scene=new THREE.Scene();scene.background=new THREE.Color('#eeefdf');scene.add(new THREE.HemisphereLight('#f2f5e7','#b6a483',2.5));const light=new THREE.DirectionalLight('#fff0cd',2.4);light.position.set(-150,250,180);scene.add(light);const view=new THREE.OrthographicCamera(-1,1,1,-1,.1,1000),target=new THREE.WebGLRenderTarget(192,192),bytes=new Uint8Array(192*192*4),canvas=document.createElement('canvas');canvas.width=canvas.height=192;const context=canvas.getContext('2d'),image=context.createImageData(192,192),oldTarget=this.webgl.getRenderTarget(),shadow=this.webgl.shadowMap.enabled;this.webgl.shadowMap.enabled=false;
  try{for(const kind of [...Object.keys(B.CROPS),...Object.keys(B.BUILDINGS),...Object.keys(B.MATERIALS)]){const isBuilding=Object.hasOwn(B.BUILDINGS,kind),model=isBuilding?this.building(kind):this.catalogueProduct(kind),span=isBuilding?112:48;view.left=-span;view.right=span;view.top=span;view.bottom=-span;view.position.set(-170,210,230);view.lookAt(0,isBuilding?45:33,0);view.updateProjectionMatrix();scene.add(model);this.webgl.setRenderTarget(target);this.webgl.render(scene,view);this.webgl.readRenderTargetPixels(target,0,0,192,192,bytes);for(let y=0;y<192;y++)image.data.set(bytes.subarray((191-y)*192*4,(192-y)*192*4),y*192*4);context.putImageData(image,0,0);this.catalogue[kind]=canvas.toDataURL('image/png');scene.remove(model);disposeGeometry(model);}}finally{this.webgl.setRenderTarget(oldTarget);this.webgl.shadowMap.enabled=shadow;target.dispose();}window.dispatchEvent(new Event('bara:art'));
 }
 makeAtmosphere(){const r=rng(904),count=this.quality==='low'?18:44;this.driftingLeaves=new THREE.InstancedMesh(leafGeometry,this.materials.leaves,count);this.leafSeeds=Array.from({length:count},()=>({x:1120+r()*1070,z:650+r()*1110,height:35+r()*115,phase:r()*TAU,speed:2+r()*3}));this.driftingLeaves.frustumCulled=false;this.driftingLeaves.castShadow=false;this.scene.add(this.driftingLeaves);
  this.animateEnvironment(0);
 }
 animateEnvironment(time){this.windTime.value=this.wind?time:0;this.driftingLeaves.visible=this.wind;if(!this.wind)return;for(let i=0;i<this.leafSeeds.length;i++){const p=this.leafSeeds[i],cycle=(time*p.speed+p.phase*20)%140;temp.position.set(p.x+cycle*.48+Math.sin(time*.7+p.phase)*7,160-cycle,p.z+cycle*.21+Math.cos(time*.6+p.phase)*10);temp.rotation.set(time*.6+p.phase,Math.sin(time*.45+p.phase),time*.3+p.phase);temp.scale.set(3.5,5.5,1);temp.updateMatrix();this.driftingLeaves.setMatrixAt(i,temp.matrix);}this.driftingLeaves.instanceMatrix.needsUpdate=true;

 }
 syncFarm(farm,now){const signature=farm.unlocked+'|'+farm.s.buildings.map(b=>[b.slot,b.kind,b.x,b.y,b.rotation,b.readyAt<=now].join(':')).join(',')+'|'+farm.s.plots.map(p=>[p.x,p.y,p.crop?`${p.crop}:${Math.floor(30*Math.min(1,(now-p.plantedAt)/(p.readyAt-p.plantedAt)))}`:'-'].join(':')).join(',');if(signature===this.lastModel)return;this.lastModel=signature;
  for(const layer of[this.farmLayer,this.cropLayer]){disposeGeometry(layer);layer.clear();}
  for(const p of farm.s.plots){const soil=this.plotGround(p,p.id<farm.unlocked);soil.userData.plotId=p.id;this.farmLayer.add(soil);if(p.crop&&p.id<farm.unlocked){const stage=Math.max(0,Math.min(1,(now-p.plantedAt)/(p.readyAt-p.plantedAt))),model=this.makeCrop(p.crop,stage);model.position.set(p.x,terrainHeight(p.x,p.y),p.y);model.userData.plotId=p.id;this.cropLayer.add(model);}}
  for(const b of farm.s.buildings){const model=this.building(b.kind,b.readyAt<=now);model.position.set(b.x,terrainHeight(b.x,b.y),b.y);model.rotation.y=b.rotation*Math.PI/2;model.userData.building=true;model.userData.buildingId=b.slot;this.farmLayer.add(model);}
 }
 label(id,x,z,h,text,kind=''){let label=this.labels.get(id);if(!label){label=document.createElement('span');this.labelLayer.append(label);this.labels.set(id,label);}const p=this.camera.worldToScreen(x,z,h);label.textContent=text;label.className='world-label '+kind;label.style.transform=`translate(${Math.round(p.x)}px,${Math.round(p.y)}px) translate(-50%,-100%)`;label.hidden=p.x<0||p.y<0||p.x>this.camera.width||p.y>this.camera.height;label.dataset.visible='1';}
 labelsFor(farm,{selectedPlot,pendingBuild,now,welcome,placement}){for(const l of this.labels.values())l.dataset.visible='0';if(!welcome){for(const p of farm.s.plots.slice(0,farm.unlocked)){if(p.id===placement?.movePlot)continue;const planted=farm.s.plots[p.id];if(planted.crop&&planted.readyAt<=now){const selected=p.id===selectedPlot;this.label('p'+p.id,selected?p.x:p.x+24,selected?p.y:p.y-23,selected?60:4,selected?'✓ Panen '+B.CROPS[planted.crop].name:'✓',selected?'ready expanded':'ready');}else if(p.id===selectedPlot)this.label('p'+p.id,p.x,p.y,35,planted.crop?B.CROPS[planted.crop].name:'Petak '+(p.id+1),'selected');}
   for(const b of farm.s.buildings)if(b.slot!==placement?.moveBuilding)this.label('b'+b.slot,b.x,b.y,terrainHeight(b.x,b.y)+115,b.readyAt<=now?B.BUILDINGS[b.kind].name:'Membangun · '+Math.ceil((b.readyAt-now)/1000)+'d');}
  for(const l of this.labels.values())if(l.dataset.visible!=='1')l.hidden=true;
 }
 updateSelection(farm,options){if(!this.selection){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([-31,3,-31,31,3,-31,31,3,31,-31,3,31,-31,3,-31],3));this.selection=new THREE.Line(geo,new THREE.LineBasicMaterial({color:'#f8d588'}));this.scene.add(this.selection);}const p=farm.s.plots[options.selectedPlot];this.selection.visible=Boolean(p);if(p)this.selection.position.set(p.x,terrainHeight(p.x,p.y),p.y);
  const edit=options.placement;
  for(const layer of [this.farmLayer,this.cropLayer])for(const object of layer.children)object.visible=!(edit?.point&&(object.userData.buildingId!==undefined&&object.userData.buildingId===edit.moveBuilding||object.userData.plotId!==undefined&&object.userData.plotId===edit.movePlot));
  if(!this.layoutGuide){this.layoutGuide=new THREE.Group();this.scene.add(this.layoutGuide);}this.layoutGuide.visible=Boolean(edit);const guideSignature=farm.unlocked+'|'+farm.s.plots.map(p=>p.x+':'+p.y).join(',');if(edit&&guideSignature!==this.guideSignature){this.guideSignature=guideSignature;this.layoutGuide.traverse(o=>{if(o.isLine){o.geometry.dispose();o.material.dispose();}});this.layoutGuide.clear();const outline=(x,y,w,h,dashed=false)=>{const points=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2],[-w/2,-h/2]].map(([dx,dz])=>new THREE.Vector3(x+dx,terrainHeight(x+dx,y+dz)+3,y+dz));const material=dashed?new THREE.LineDashedMaterial({color:'#c9d4a8',dashSize:6,gapSize:5,transparent:true,opacity:.55}):new THREE.LineBasicMaterial({color:'#e7dda6',transparent:true,opacity:.25});const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),material);if(dashed)line.computeLineDistances();this.layoutGuide.add(line);};outline(1595,1195,1190,1130);for(const p of farm.s.plots)outline(p.x,p.y,60,60,p.id>=farm.unlocked);}
  const movingPlot=edit?.movePlot===undefined?null:farm.s.plots[edit.movePlot],movingBuilding=farm.s.buildings.find(b=>b.slot===edit?.moveBuilding);
  const stage=movingPlot?.crop?Math.max(0,Math.min(1,(options.now-movingPlot.plantedAt)/(movingPlot.readyAt-movingPlot.plantedAt))):0;
  const signature=edit?.point?JSON.stringify([edit.kind,edit.rotation,edit.count,edit.movePlot,movingPlot?.crop,Math.floor(stage*30),movingBuilding?.readyAt<=options.now]):'';
  if(signature!==this.previewSignature){
   this.previewSignature=signature;if(this.preview){disposeGeometry(this.preview);const materials=new Set();this.preview.traverse(o=>{if(o.isMesh||o.isLine)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});for(const material of materials)material.dispose();this.scene.remove(this.preview);this.preview=null;}
   if(edit?.point){
    const g=this.preview=new THREE.Group();this.previewFill=new THREE.MeshBasicMaterial({color:'#99d59b',transparent:true,opacity:.38,depthWrite:false,side:THREE.DoubleSide});this.previewOutline=new THREE.LineBasicMaterial({color:'#99d59b'});
    const rect=(p,w,h)=>{const fill=new THREE.Mesh(new THREE.PlaneGeometry(w,h),this.previewFill);fill.rotation.x=-Math.PI/2;fill.position.set(p.x,4,p.y);g.add(fill);const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-w/2,0,-h/2),new THREE.Vector3(w/2,0,-h/2),new THREE.Vector3(w/2,0,h/2),new THREE.Vector3(-w/2,0,h/2)]);const line=new THREE.LineLoop(geo,this.previewOutline);line.position.copy(fill.position);line.position.y+=1;g.add(line);};
    if(edit.kind==='garden'){for(const point of farm.gardenPoints({x:0,y:0},edit.count,edit.rotation))rect(point,60,60);}else{
     const size=B.footprint(edit.kind,edit.rotation);rect({x:0,y:0},size.w,size.h);let ghost;
     if(edit.kind==='plot'){ghost=new THREE.Group();const soil=this.plotGround({x:0,y:0},true);soil.position.y=-terrainHeight(0,0);ghost.add(soil);if(movingPlot?.crop)ghost.add(this.makeCrop(movingPlot.crop,stage));}
     else{ghost=this.building(edit.kind,!movingBuilding||movingBuilding.readyAt<=options.now);ghost.rotation.y=edit.rotation*Math.PI/2;}
     const clones=new Map();ghost.traverse(o=>{if(o.isMesh){if(!clones.has(o.material)){const material=o.material.clone();material.transparent=true;material.opacity=edit.lifted?0.78:0.55;material.depthWrite=false;clones.set(o.material,material);}o.material=clones.get(o.material);o.castShadow=false;}});ghost.position.y=edit.lifted?18:8;g.add(ghost);
    }
    this.scene.add(g);
   }
  }
  if(this.preview&&edit?.point){this.preview.position.set(edit.point.x,terrainHeight(edit.point.x,edit.point.y),edit.point.y);const color=edit.valid?'#69c27e':'#e26854';this.previewFill.color.set(color);this.previewOutline.color.set(color);}
 }

 updateView(){const c=this.camera;this.view.left=-c.width/(2*c.zoom);this.view.right=-this.view.left;this.view.top=c.height/(2*c.zoom);this.view.bottom=-this.view.top;this.view.updateProjectionMatrix();const distance=3000;this.view.position.set(c.x+Math.sin(c.yaw)*Math.cos(c.tilt)*distance,Math.sin(c.tilt)*distance,c.y+Math.cos(c.yaw)*Math.cos(c.tilt)*distance);this.view.lookAt(c.x,0,c.y);this.view.updateMatrixWorld();}
 pickBuilding(groundPoint){const hit=this.hitObject(groundPoint);for(let o=hit?.object;o;o=o.parent)if(Number.isInteger(o.userData.buildingId))return o.userData.buildingId;return null;}
 hitObject(groundPoint){this.updateView();this.cropLayer.updateMatrixWorld(true);this.farmLayer.updateMatrixWorld(true);this.pondok?.updateMatrixWorld(true);const p=this.camera.worldToScreen(groundPoint.x,groundPoint.y);this.raycaster??=new THREE.Raycaster();this.raycaster.setFromCamera(new THREE.Vector2(p.x/this.camera.width*2-1,1-p.y/this.camera.height*2),this.view);return this.raycaster.intersectObjects([...this.cropLayer.children,...this.farmLayer.children,this.pondok].filter(Boolean),true)[0];}
 pickPlot(groundPoint){if(this.lost)return null;this.updateView();this.cropLayer.updateMatrixWorld(true);this.farmLayer.updateMatrixWorld(true);this.pondok?.updateMatrixWorld(true);const p=this.camera.worldToScreen(groundPoint.x,groundPoint.y);this.raycaster??=new THREE.Raycaster();this.raycaster.setFromCamera(new THREE.Vector2(p.x/this.camera.width*2-1,1-p.y/this.camera.height*2),this.view);const hit=this.raycaster.intersectObjects([...this.cropLayer.children,...this.farmLayer.children,this.pondok].filter(Boolean),true)[0];if(!hit)return null;for(let o=hit.object;o;o=o.parent){if(Number.isInteger(o.userData.plotId))return o.userData.plotId;if(o.userData.building)return -1;}return null;}
 draw(farm,options){const tick=performance.now(),interval=this.quality==='high'?20:33;if(tick-this.lastFrame<interval||document.hidden)return;this.lastFrame=tick;if(this.lost)return;const c=this.camera;if(this.width!==c.width||this.height!==c.height){this.width=c.width;this.height=c.height;this.webgl.setSize(c.width,c.height,false);}this.updateView();this.syncFarm(farm,options.now);this.updateSelection(farm,options);this.labelsFor(farm,options);this.animateEnvironment(tick/1000);if(!Object.keys(this.catalogue).length&&tick>1800)this.makeCatalogue();this.webgl.render(this.scene,this.view);}
 mini(canvas,farm){const tick=performance.now();if(tick-this.lastMini<200)return;this.lastMini=tick;const c=canvas.getContext('2d'),sx=canvas.width/3200,sy=canvas.height/2200;c.setTransform(sx,0,0,sy,0,0);c.fillStyle='#819168';c.fillRect(0,0,3200,2200);c.strokeStyle='#648e8c';c.lineWidth=190;c.beginPath();for(let y=0;y<=2200;y+=40){const x=640+110*Math.sin(y/270);y?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();c.fillStyle='#4b6548';for(const[x,y,size]of WORLD_DATA.trees){c.beginPath();c.arc(x,y,size,0,TAU);c.fill();}for(const p of farm.s.plots.slice(0,farm.unlocked)){c.fillStyle=farm.s.plots[p.id].crop?'#b4bc77':'#bb9870';c.fillRect(p.x-27,p.y-27,54,54);}c.fillStyle='#dad0ae';c.fillRect(1545,827,96,86);for(const b of farm.s.buildings)c.fillRect(b.x-40,b.y-35,80,70);c.strokeStyle='#f5dfa0';c.lineWidth=13;c.beginPath();this.camera.corners.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.stroke();}
}

function create(canvas){let preference='auto';try{preference=localStorage.getItem('6xg:graphics')||'auto';}catch{}const mobile=matchMedia('(max-width: 800px)').matches,quality=['high','low'].includes(preference)?preference:mobile?'low':'balanced';let supported=false;try{const probe=document.createElement('canvas'),context=probe.getContext('webgl2');supported=Boolean(context);context?.getExtension('WEBGL_lose_context')?.loseContext();}catch{}
 if(preference!=='2d'&&supported){try{const camera=new FarmCamera(),renderer=new FarmRenderer3D(canvas,camera,quality);return{camera,renderer};}catch(error){console.warn('3D graphics unavailable; starting 2D view.',error);const replacement=canvas.cloneNode(true);canvas.replaceWith(replacement);canvas=replacement;}}
 const camera=new MapCamera(),renderer=new FarmRenderer(canvas,camera);renderer.mode='2d';document.getElementById('cameraPosition').textContent='TAMPILAN 2D';document.getElementById('rotateLeft').hidden=true;document.getElementById('rotateRight').hidden=true;return{camera,renderer};
}
window.Farm3D={create};
