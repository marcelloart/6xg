const harvestT_farm_3d_js=value=>typeof BaraI18n!=='undefined'?BaraI18n.t(value):value;
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {bridgeBounds,renderScale,farmRoads,renderFrameTime} from './farm-visuals.js';
import {assetUrl,MODEL_IDS,modelInstance,loadModel,loadEnvironment} from './farm-assets.js';
import {FarmPeople} from './farm-people.js';

/* Farm geometry uses the existing 3200 × 2200 save coordinates: x → X, y → Z.
   Only the view is 3D. Planting, prices, deadlines, and account saves stay in BaraFarm. */
const B=window.BaraFarm || BaraFarm;
const TEXTURES=FARM_TEXTURE_URLS;
const TAU=Math.PI*2;
const rng=seed=>()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
const random=rng(60102);
function terrainHeight(x,z){const edge=Math.max(Math.abs(x-1600)-570,Math.abs(z-1170)-580,0),river=640+110*Math.sin(z/270);const blend=Math.min(1,edge/200)*Math.min(1,Math.max(0,Math.abs(x-river)-130)/170);return blend*(16+13*Math.sin(x/330)*Math.cos(z/285)+8*Math.sin((x+z)/180));}
const box=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,18),sphere=new THREE.SphereGeometry(1,24,16),leafGeometry=new THREE.PlaneGeometry(1,1);
const temp=new THREE.Object3D();
function material(color,roughness=.9){return new THREE.MeshStandardMaterial({color,roughness});}
function mesh(geometry,mat,x,y,z,sx=1,sy=sx,sz=sx,rx=0,ry=0,rz=0){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rx,ry,rz);m.castShadow=true;m.receiveShadow=true;if(mat.userData.windDepth)m.customDepthMaterial=mat.userData.windDepth;return m;}
function beam(group,mat,from,to,radius=2){const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),d=b.clone().sub(a),m=mesh(cylinder,mat,0,0,0,radius,d.length(),radius);m.position.copy(a.add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());group.add(m);return m;}
function block(group,mat,x,y,z,w,h,d,rx=0,ry=0,rz=0){const m=mesh(box,mat,x,y,z,w,h,d,rx,ry,rz);group.add(m);return m;}
function mergeStatic(group){const byMaterial=new Map();group.updateMatrixWorld(true);for(const m of [...group.children]){if(!m.isMesh||m.geometry.attributes.position===undefined)continue;let g=m.geometry.clone();if(g.index){const expanded=g.toNonIndexed();g.dispose();g=expanded;}g.applyMatrix4(m.matrix);if(!byMaterial.has(m.material))byMaterial.set(m.material,[]);byMaterial.get(m.material).push(g);group.remove(m);}
 for(const [mat,list]of byMaterial){const merged=mergeGeometries(list,false);if(merged){const m=new THREE.Mesh(merged,mat);m.castShadow=true;m.receiveShadow=true;if(mat.userData.windDepth)m.customDepthMaterial=mat.userData.windDepth;group.add(m);}for(const g of list)g.dispose();}return group;}
function disposeGeometry(group){group.traverse(o=>{if((o.isMesh||o.isLine)&&!o.geometry.userData.cc0Shared&&!([box,cylinder,sphere,leafGeometry].includes(o.geometry)))o.geometry.dispose();});}
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
   #ifdef USE_INSTANCING
    ${kind==='grass'?'weight=clamp(position.y+.5,0.0,1.0);':''}
   #endif
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
function terrainRoad(points,width=34){const curve=new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal'),positions=[],uvs=[],indices=[],rows=Math.max(1,Math.ceil(curve.getLength()/12));for(let row=0;row<=rows;row++){const p=curve.getPointAt(row/rows),t=curve.getTangentAt(row/rows);for(let col=0;col<=4;col++){const offset=(col/4-.5)*width,x=p.x+t.z*offset,z=p.z-t.x*offset;positions.push(x,terrainHeight(x,z)+.55,z);uvs.push(x/52,z/52);}}for(let row=0;row<rows;row++)for(let col=0;col<4;col++){const n=row*5+col;indices.push(n,n+5,n+1,n+1,n+5,n+6);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;}
function terrainPath(a,b,width=38){return terrainRoad([a,b],width);}
function riverBedHeight(x,z){const bank=Math.abs(x-(640+110*Math.sin(z/270)))/105;return terrainHeight(x,z)-1-(bank<1?4+34*Math.pow(1-bank,.8):0);}
function makeRiverBedGeometry(){const g=makeRiverGeometry(),p=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<p.count;i++){p.setY(i,riverBedHeight(p.getX(i),p.getZ(i))+.6);uv.setXY(i,p.getX(i)/48,p.getZ(i)/48);}g.computeVertexNormals();return g;}
function riverMaterial(clock){const water=new THREE.MeshPhysicalMaterial({color:'#79b2ad',roughness:.1,metalness:0,ior:1.333,transmission:.42,thickness:22,attenuationColor:'#68a9a2',attenuationDistance:100,clearcoat:.2,clearcoatRoughness:.17,envMapIntensity:1.8});
 water.onBeforeCompile=shader=>{shader.uniforms.baraTime=clock;shader.vertexShader='uniform float baraTime;varying vec3 baraRiverWorld;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 transformed.y+=sin(position.z*.075-baraTime*1.45+position.x*.021)*.28+cos(position.z*.17-baraTime*2.6+position.x*.06)*.12;
 baraRiverWorld=(modelMatrix*vec4(transformed,1.)).xyz;`);shader.fragmentShader=`uniform float baraTime;varying vec3 baraRiverWorld;
 float riverNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=fract(sin(dot(i,vec2(127.1,311.7)))*43758.5453),b=fract(sin(dot(i+vec2(1,0),vec2(127.1,311.7)))*43758.5453),c=fract(sin(dot(i+vec2(0,1),vec2(127.1,311.7)))*43758.5453),d=fract(sin(dot(i+vec2(1,1),vec2(127.1,311.7)))*43758.5453);return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
 `+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float crossStream=baraRiverWorld.x-(640.+110.*sin(baraRiverWorld.z/270.));
 float depth=clamp(1.-abs(crossStream)/105.,0.,1.);
 vec2 flow=vec2(crossStream*.055,baraRiverWorld.z*.04-baraTime*.48);
 float current=riverNoise(flow)*.65+riverNoise(flow*2.7+vec2(5.3,baraTime*.08))*.35;
 diffuseColor.rgb=mix(vec3(.18,.30,.20),vec3(.015,.13,.17),smoothstep(0.,.85,depth))+(current-.5)*.065;
 float bankFoam=smoothstep(90.,102.,abs(crossStream))*(1.-smoothstep(104.,106.,abs(crossStream)))*smoothstep(.46,.76,current);
 float crest=smoothstep(.87,1.,sin(crossStream*.11+baraRiverWorld.z*.15-baraTime*2.1))*smoothstep(.64,.9,current)*.12;
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.6,.68,.62),clamp(bankFoam*.55+crest,0.,.6));
 `);shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
 float across=baraRiverWorld.x-(640.+110.*sin(baraRiverWorld.z/270.));
 vec3 ripple=vec3(sin(across*.11+baraRiverWorld.z*.15-baraTime*2.1)*.19+cos(across*.23+baraRiverWorld.z*.28-baraTime*3.8)*.065,0.,cos(across*.08+baraRiverWorld.z*.12-baraTime*1.9)*.17+sin(baraRiverWorld.z*.32-baraTime*4.3)*.055);
 normal=normalize(normal+mat3(viewMatrix)*ripple);`);};water.customProgramCacheKey=()=> 'bara-hdri-flow-water-2';return water;}

class FarmRenderer3D {
 constructor(canvas,camera,quality){
  this.canvas=canvas;this.camera=camera;this.quality=quality;this.lastFrame=0;this.lastMini=0;this.lastModel='';this.catalogue={};this.width=0;this.height=0;this.lost=false;this.wind=!matchMedia('(prefers-reduced-motion: reduce)').matches;try{const saved=localStorage.getItem('6xg:motion');if(saved!==null)this.wind=saved==='true';}catch{}
  this.webgl=new THREE.WebGLRenderer({canvas,antialias:quality!=='low',alpha:false,powerPreference:'high-performance'});
  this.webgl.outputColorSpace=THREE.SRGBColorSpace;this.webgl.toneMapping=THREE.ACESFilmicToneMapping;this.webgl.toneMappingExposure=1.03;
  this.maxBuffer=Math.min(this.webgl.capabilities.maxTextureSize,this.webgl.getContext().getParameter(this.webgl.getContext().MAX_RENDERBUFFER_SIZE));this.webgl.setPixelRatio(1);this.webgl.shadowMap.enabled=quality!=='low';this.webgl.shadowMap.type=THREE.PCFShadowMap;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#c2cdbb');this.scene.fog=new THREE.Fog('#c2cdbb',3300,4900);
  this.view=new THREE.OrthographicCamera(-1,1,1,-1,10,6200);this.view.up.set(0,1,0);
  const hemisphere=this.hemisphere=new THREE.HemisphereLight('#e6f0ff','#777557',1.15);this.scene.add(hemisphere);
  this.sun=new THREE.DirectionalLight('#fff4de',2.2);this.sun.position.set(710,1300,550);this.sun.target.position.set(1610,0,1120);this.sun.castShadow=quality!=='low';const shadow=this.sun.shadow;shadow.mapSize.set(Math.min(this.maxBuffer,quality==='ultra'?4096:quality==='high'?2048:1024),Math.min(this.maxBuffer,quality==='ultra'?4096:quality==='high'?2048:1024));shadow.camera.left=-1050;shadow.camera.right=1050;shadow.camera.top=850;shadow.camera.bottom=-850;shadow.camera.near=100;shadow.camera.far=3200;shadow.bias=-.0003;shadow.normalBias=1.8;shadow.radius=3;this.scene.add(this.sun,this.sun.target);
  this.moon=new THREE.DirectionalLight('#b6d3ff',0);this.moon.position.set(2110,1050,1450);this.moon.target.position.copy(this.sun.target.position);this.scene.add(this.moon,this.moon.target);
  this.materials={grass:material('#b4bd94'),soil:material('#d2bca4'),wood:material('#aaa185'),darkWood:material('#69543c'),plaster:material('#e1dac5'),stone:material('#a5a698'),roof:material('#847361'),iron:material('#414943',.65),glass:new THREE.MeshStandardMaterial({color:'#314947',metalness:.18,roughness:.25}),leaves:new THREE.MeshStandardMaterial({color:'#d2d9b1',map:new THREE.DataTexture(new Uint8Array([0,0,0,0]),1,1),alphaTest:.4,side:THREE.DoubleSide,roughness:1}),green:material('#607b38'),red:material('#a2422e'),straw:material('#b7a076')};
  this.materials.window=this.materials.glass.clone();this.materials.window.emissive.set('#ffbf70');this.materials.window.emissiveIntensity=0;
  this.materials.path=material('#e4d5b5',1);this.materials.riverbed=material('#9ca999',1);
  const fruitColors={carrot:'#b55d24',tomato:'#aa3627',corn:'#c5a846',strawberry:'#ad2e42',potato:'#8a6a45',chili:'#943225',orange:'#ce8423',apple:'#993524',avocado:'#46682b'};
  this.fruitMaterials=Object.fromEntries(Object.entries(B.CROPS).map(([key,crop])=>[key,material(fruitColors[key]||crop.color,.62)]));
  this.windTime={value:0};this.windStrength={value:this.wind?4.2:0};this.grassStrength={value:this.wind?2.2:0};this.trunkStrength={value:this.wind?3.5:0};windMaterial(this.materials.leaves,this.windTime,this.windStrength);windMaterial(this.materials.green,this.windTime,this.grassStrength,'grass');this.treeWood=windMaterial(this.materials.darkWood.clone(),this.windTime,this.trunkStrength,'trunk');
  this.models={};this.assetRevision=0;this.catalogueDirty=true;this.assetJobs=[];this.loadScanMaterials();
  this.landscape=new THREE.Group();this.farmLayer=new THREE.Group();this.cropLayer=new THREE.Group();this.scene.add(this.landscape,this.farmLayer,this.cropLayer);this.makeLandscape();
  this.labelLayer=document.createElement('div');this.labelLayer.className='world-labels';this.labelLayer.setAttribute('aria-hidden','true');canvas.parentElement.append(this.labelLayer);this.labels=new Map();
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.showLost();});canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;this.lastModel='';this.hideLost();if(this.sky){const pmrem=new THREE.PMREMGenerator(this.webgl);this.environmentTarget?.dispose();this.environmentTarget=pmrem.fromEquirectangular(this.sky);this.scene.environment=this.environmentTarget.texture;pmrem.dispose();this.catalogueDirty=true;}});
  this.mode='3d';
  this.residents=new FarmPeople(this.scene,this.quality,terrainHeight,Object.fromEntries(Object.keys(B.BUILDINGS).map(kind=>{const size=B.footprint(kind,0);return[kind,[size.w,size.h]];})));
  this.loadWorldAssets();
 }
 loadScanMaterials(){
  const m=this.materials,assign=(id,targets,x=1,y=1)=>{
   for(const [suffix,field]of [['color','map'],['normal','normalMap'],['arm','roughnessMap']]){
    const job=new THREE.TextureLoader().loadAsync(assetUrl(id+'/'+suffix+'-ultra.jpg',this.quality)).then(t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(x,y);t.anisotropy=Math.min(8,this.webgl.capabilities.getMaxAnisotropy());if(field==='map')t.colorSpace=THREE.SRGBColorSpace;
     for(const mat of targets){mat[field]=t;if(suffix==='arm'){mat.aoMap=t;mat.aoMapIntensity=.45;if(mat.metalness>0)mat.metalnessMap=t;}if(field==='normalMap')mat.normalScale.set(.6,.6);mat.needsUpdate=true;}this.catalogueDirty=true;
    });this.assetJobs.push(job);
   }
  };
  for(const name of ['grass','soil','wood','plaster','stone','roof','straw'])m[name].color.set('#ffffff');m.darkWood.color.set('#aaa091');
  m.soil.color.set('#b29a7e');assign('Grass005',[m.grass],48,33);assign('Ground112',[m.soil,m.path],2,2);assign('Wood096',[m.wood,m.darkWood]);assign('Bark012',[this.treeWood],1,2);assign('Plaster001',[m.plaster],2,1);assign('Rock064',[m.stone,m.riverbed]);assign('RoofingTiles013A',[m.roof],2,1.6);m.iron.metalness=.85;m.iron.color.set('#ffffff');assign('Metal055A',[m.iron]);assign('ThatchedRoof001A',[m.straw]);
  const atlas=(id,mat)=>{mat.color.set('#ffffff');for(const [suffix,field,extension]of [['color','map','webp'],['normal','normalMap','jpg'],['rough','roughnessMap','jpg']]){
    const job=new THREE.TextureLoader().loadAsync(assetUrl(id+'/'+suffix+'-ultra.'+extension,this.quality)).then(t=>{if(field==='map')t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,this.webgl.capabilities.getMaxAnisotropy());mat[field]=t;mat.needsUpdate=true;if(mat.userData.windDepth&&field==='map'){mat.userData.windDepth.map=t;mat.userData.windDepth.needsUpdate=true;}this.catalogueDirty=true;});this.assetJobs.push(job);
   }};
  atlas('LeafSet004',m.leaves);this.grassCards=windMaterial(new THREE.MeshStandardMaterial({alphaTest:.4,side:THREE.DoubleSide,roughness:1}),this.windTime,this.grassStrength,'grass');atlas('Foliage008',this.grassCards);
  this.meatScan=new THREE.MeshStandardMaterial({alphaTest:.4,side:THREE.DoubleSide,roughness:.7});atlas('ColdCutsSet002',this.meatScan);
  const detailJob=new THREE.TextureLoader().loadAsync(assetUrl('3DApple002/normal-ultra.jpg',this.quality)).then(t=>{for(const mat of Object.values(this.fruitMaterials)){mat.normalMap=t;mat.normalScale.set(.17,.17);mat.needsUpdate=true;}this.catalogueDirty=true;});this.assetJobs.push(detailJob);
  const carrotDetail=new THREE.TextureLoader().loadAsync(assetUrl('FoodCrossSectionSet001/normal-ultra.jpg',this.quality)).then(t=>{this.fruitMaterials.carrot.normalMap=t;this.fruitMaterials.carrot.normalScale.set(.15,.15);this.fruitMaterials.carrot.needsUpdate=true;this.catalogueDirty=true;});this.assetJobs.push(carrotDetail);
 }
 loadWorldAssets(){
  this.assetNotice=document.createElement('span');this.assetNotice.className='asset-loading';this.assetNotice.setAttribute('role','status');this.assetNotice.textContent=harvestT_farm_3d_js('Menyiapkan detail kebun…');this.canvas.parentElement.append(this.assetNotice);
  const modelJobs=Object.entries(MODEL_IDS).map(async([key,id])=>{const model=await loadModel(id,this.quality);if(key==='tree')model.traverse(o=>{if(o.isMesh){windMaterial(o.material,this.windTime,this.trunkStrength,'trunk');o.customDepthMaterial=o.material.userData.windDepth;}});this.models[key]=model;});
  const environmentJob=loadEnvironment(this.webgl).then(({sky,environment,target})=>{this.sky=sky;this.environmentTarget=target;this.scene.environment=environment;this.scene.environmentIntensity=.65;this.scene.background=sky;this.scene.backgroundIntensity=.75;this.catalogueDirty=true;});
  Promise.allSettled(modelJobs).then(results=>{if(results.some(r=>r.status==='fulfilled')){disposeGeometry(this.landscape);this.landscape.clear();this.scene.remove(this.driftingLeaves);this.makeLandscape();this.assetRevision++;this.lastModel='';this.catalogueDirty=true;}});
  this.assetReady=Promise.allSettled([...this.assetJobs,...modelJobs,environmentJob]).then(results=>{const failures=results.filter(r=>r.status==='rejected').length;this.assetNotice.textContent=failures?harvestT_farm_3d_js('Beberapa detail belum termuat. Muat ulang untuk mencoba lagi.'):'';this.assetNotice.hidden=!failures;this.assetErrors=failures;this.catalogueDirty=true;});
 }
 scanned(key,height=1){return this.models?.[key]?modelInstance(this.models[key],key==='rock'?height*2:height,key==='rock'?'span':'height'):null;}

 showLost(){if(this.lostNotice)return;const div=document.createElement('div');div.className='graphics-notice';div.setAttribute('role','status');div.innerHTML=harvestT_farm_3d_js('<p>Tampilan 3D sedang dipulihkan. Progres kebunmu tetap tersimpan.</p><button>Tampilkan dalam 2D</button>');div.querySelector('button').onclick=()=>{try{localStorage.setItem('6xg:graphics','2d');}catch{}location.reload();};this.canvas.parentElement.append(div);this.lostNotice=div;}
 hideLost(){this.lostNotice?.remove();this.lostNotice=null;}
 roof(group,width,depth,baseHeight,peakHeight){const m=this.materials,half=width/2+9,length=Math.hypot(half,peakHeight),angle=Math.atan2(peakHeight,half);for(const side of[-1,1])block(group,m.roof,side*half/2,baseHeight+peakHeight/2,0,length,4,depth+18,0,0,-side*angle);
  // Individual overlapping courses give the roof thickness and readable eaves.
  for(const side of[-1,1])for(let i=0;i<6;i++){const f=(i+.5)/6,x=side*half*f,y=baseHeight+peakHeight*(1-f)+3;block(group,m.darkWood,x,y,0,3,2,depth+20,0,0,-side*angle);}
  block(group,m.darkWood,0,baseHeight+peakHeight+2,0,5,5,depth+24);
 }
 workshopSign(kind){this.workshopSigns??={};if(this.workshopSigns[kind])return this.workshopSigns[kind];const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#e8d8ac';c.fillRect(0,0,512,128);c.strokeStyle='#6a5433';c.lineWidth=12;c.strokeRect(8,8,496,112);c.fillStyle='#455333';c.font='bold 48px Georgia';c.textAlign='center';c.textBaseline='middle';c.fillText({kitchen:harvestT_farm_3d_js('DAPUR KEBUN'),juicery:harvestT_farm_3d_js('RUMAH JUS'),bakery:harvestT_farm_3d_js('RUMAH PAI')}[kind],256,68);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return this.workshopSigns[kind]=new THREE.MeshStandardMaterial({map,roughness:.82});}
 building(kind,finished=true){const group=new THREE.Group(),m=this.materials,workshop=['kitchen','juicery','bakery'].includes(kind),w=kind==='planter'?30:kind==='barn'?108:kind==='shed'?84:96,d=kind==='planter'?30:kind==='barn'?92:74,h=kind==='barn'?68:58;
  if(kind==='planter'){group.add(mesh(new THREE.CylinderGeometry(18,13,22,24),m.soil,0,11,0));group.add(mesh(new THREE.TorusGeometry(17,2,8,28),m.stone,0,22,0,1,1,1,Math.PI/2));if(finished){for(let i=0;i<5;i++){const a=i*2.4,x=Math.sin(a)*9,z=Math.cos(a)*9;beam(group,m.green,[x,22,z],[x,35+i%2*7,z],.7);group.add(mesh(sphere,m.darkWood,x,37+i%2*7,z,2,2,1));for(let p=0;p<8;p++){const angle=p*TAU/8;group.add(mesh(sphere,m.straw,x+Math.cos(angle)*3.5,37+i%2*7+Math.sin(angle)*3.5,z,2,2,1));}group.add(mesh(leafGeometry,m.leaves,x+3,29,z,8,10,1,.4,a,.3));}}return mergeStatic(group);}
  if(['coop','cowshed'].includes(kind)&&finished){const cow=kind==='cowshed',width=cow?148:118,depth=cow?144:124;
   block(group,m.soil,0,1,0,width,2,depth);const shelterW=cow?110:74,shelterD=cow?42:38,z=-depth/2+shelterD/2+4;
   for(const x of[-shelterW/2,shelterW/2])block(group,m.wood,x,29,z,5,58,shelterD);block(group,m.wood,0,29,z-shelterD/2,shelterW,58,4);
   for(const x of[-shelterW/2+4,shelterW/2-4])block(group,m.darkWood,x,32,z+shelterD/2,4,64,4);const roof=new THREE.Group();this.roof(roof,shelterW,shelterD,61,19);roof.position.z=z;group.add(roof);
   for(const x of[-width/2,width/2]){for(let zz=-depth/2;zz<=depth/2;zz+=depth/3)block(group,m.darkWood,x,15,zz,4,30,4);for(const y of[10,23])block(group,m.wood,x,y,0,3,3,depth);}
   for(const zz of[-depth/2,depth/2]){for(let x=-width/2;x<=width/2;x+=width/4)block(group,m.darkWood,x,15,zz,4,30,4);for(const y of[10,23])block(group,m.wood,0,y,zz,width,3,3);}
   block(group,m.darkWood,width/2-18,7,-8,22,14,40);block(group,m.straw,width/2-18,14,-8,18,2,36);
   if(!cow){for(const x of[-22,0,22]){block(group,m.straw,x,5,z+7,18,10,16);block(group,m.wood,x,11,z+7,20,3,18);}for(let i=0;i<4;i++)block(group,m.wood,-28,8-i*1.5,z+25+i*5,20,3,6);}
   return mergeStatic(group);
  }
  if(kind==='bench'&&finished){for(const x of[-30,30]){block(group,m.stone,x,8,0,10,16,28);block(group,m.darkWood,x,26,-13,4,35,4);}for(const z of[-9,0,9])block(group,m.wood,0,18,z,76,4,7);for(const y of[29,39])block(group,m.wood,0,y,-14,76,7,3);for(const x of[-36,36])block(group,m.darkWood,x,28,0,5,4,32);return mergeStatic(group);}
  if(!finished){block(group,m.stone,0,3,0,w+12,6,d+12);for(const x of[-w/2,w/2])for(const z of[-d/2,d/2])block(group,m.wood,x,34,z,5,66,5);for(const z of[-d/2,d/2]){beam(group,m.wood,[-w/2,10,z],[w/2,56,z],2);block(group,m.wood,0,51,z,w+18,4,4);}block(group,m.straw,20,10,0,28,14,26);return mergeStatic(group);}
  if(kind==='well'){group.add(mesh(new THREE.CylinderGeometry(27,30,25,20,1,true),m.stone,0,13,0));group.add(mesh(new THREE.CylinderGeometry(26,26,3,20),m.glass,0,7,0));for(let a=0;a<TAU;a+=Math.PI/9)block(group,m.stone,29*Math.cos(a),27,29*Math.sin(a),11,7,10,0,-a);for(const x of[-36,36])block(group,m.wood,x,38,0,5,76,5);block(group,m.wood,0,59,0,77,7,7);this.roof(group,76,58,78,25);beam(group,m.straw,[0,59,0],[0,20,0],.6);group.add(mesh(cylinder,m.iron,0,20,0,7,12,7));return mergeStatic(group);}
  block(group,m.stone,0,6,0,w+14,12,d+14);block(group,kind==='house'||workshop?m.plaster:m.wood,0,h/2+12,0,w,h,d);
  for(const x of[-w/2,w/2])for(const z of[-d/2,d/2])block(group,m.darkWood,x,h/2+12,z,5,h+3,5);
  // Weatherboard seams and structural timber, doors, frames, and window glass.
  for(let y=19;y<h+12;y+=9)for(const z of[-d/2-.6,d/2+.6])block(group,m.darkWood,0,y,z,w,1,1.1);
  const doorW=kind==='barn'?40:21;block(group,m.darkWood,0,30,d/2+1,doorW+5,39,4);block(group,m.wood,0,30,d/2+4,doorW,35,2);if(kind==='barn'){beam(group,m.plaster,[-18,14,d/2+6],[18,46,d/2+6],1.4);beam(group,m.plaster,[18,14,d/2+6],[-18,46,d/2+6],1.4);}else group.add(mesh(sphere,m.iron,7,30,d/2+7,1.2));
  if(kind!=='shed')for(const x of[-32,32]){block(group,m.darkWood,x,46,d/2+2,21,23,3);block(group,m.window||m.glass,x,46,d/2+4,17,19,2);block(group,m.plaster,x,46,d/2+6,1,19,1);block(group,m.plaster,x,46,d/2+6,17,1,1);block(group,m.wood,x,33,d/2+5,24,3,7);}
  if(kind==='house'){block(group,m.darkWood,-w/2-1,44,-8,3,23,22);block(group,m.window||m.glass,-w/2-3,44,-8,2,18,17);block(group,m.plaster,-w/2-4,44,-8,1,18,1);block(group,m.plaster,-w/2-4,44,-8,1,1,17);}
  this.roof(group,w,d,h+12,32);block(group,m.darkWood,0,13,d/2+17,w+6,5,23);
  if(kind==='house'){block(group,m.stone,27,h+27,-18,14,40,15);block(group,m.darkWood,27,h+48,-18,20,4,21);for(const x of[-40,40])block(group,m.wood,x,31,d/2+23,3,59,3);block(group,m.roof,0,61,d/2+19,96,3,28,.12);for(const x of[-35,35]){group.add(mesh(cylinder,m.soil,x,20,d/2+24,7,11,7));group.add(mesh(sphere,m.green,x,30,d/2+24,9,9,9));}}
  if(workshop){for(const x of[-44,44])block(group,m.darkWood,x,28,d/2+16,3,50,3);for(let i=0;i<9;i++)block(group,i%2?m.plaster:kind==='juicery'?m.green:m.red,(i-4)*12,53,d/2+11,12,3,22,.15);block(group,m.darkWood,0,27,d/2+13,88,6,18);group.add(mesh(new THREE.PlaneGeometry(62,16),this.workshopSign(kind),0,74,d/2+2));
   if(kind==='juicery'){for(const x of[-34,34]){group.add(mesh(cylinder,m.wood,x,12,10,10,18,10));for(const y of[5,18])group.add(mesh(new THREE.TorusGeometry(10,1,6,20),m.iron,x,y,10,1,1,1,Math.PI/2));group.add(mesh(sphere,this.fruitMaterials.orange,x,25,10,4));}}
   else{block(group,m.stone,30,h+19,-18,15,37,15);block(group,m.darkWood,30,h+40,-18,21,4,21);block(group,m.stone,-26,18,d/2+14,18,30,18);block(group,m.iron,-26,20,d/2+24,12,12,2);if(kind==='bakery')for(let i=0;i<3;i++)group.add(mesh(sphere,m.straw,9+i*12,32,d/2+13,5,3,4));else{group.add(mesh(cylinder,m.iron,21,34,d/2+13,8,9,8));group.add(mesh(sphere,this.fruitMaterials.carrot,21,39,d/2+13,5,1,5));}}
  }
  if(kind==='barn'){for(let i=0;i<3;i++){group.add(mesh(cylinder,m.straw,w/2+20,12,-18+i*25,12,25,12,Math.PI/2));}block(group,m.wood,w/2+20,5,35,31,10,28);}
  return mergeStatic(group);
 }
 makeLandscape(){const m=this.materials,g=this.landscape,terrain=new THREE.PlaneGeometry(3200,2200,128,88);terrain.rotateX(-Math.PI/2);const terrainPosition=terrain.attributes.position;for(let i=0;i<terrainPosition.count;i++)terrainPosition.setY(i,riverBedHeight(terrainPosition.getX(i)+1600,terrainPosition.getZ(i)+1100));terrain.computeVertexNormals();const ground=mesh(terrain,m.grass,1600,0,1100);ground.castShadow=false;g.add(ground);
  const paths=new THREE.Group(),bridge=bridgeBounds();for(const road of farmRoads()){const path=new THREE.Mesh(terrainRoad(road.points,road.width),m.path);path.receiveShadow=true;paths.add(path);}mergeStatic(paths);g.add(paths);
  const bed=new THREE.Mesh(makeRiverBedGeometry(),m.riverbed);bed.receiveShadow=true;g.add(bed);
  this.water=riverMaterial(this.windTime);this.river=new THREE.Mesh(makeRiverGeometry(),this.water);this.river.castShadow=false;this.river.receiveShadow=false;g.add(this.river);
  const staticProps=new THREE.Group();const pondok=this.building('house');pondok.position.set(1593,0,872);pondok.userData.building=true;this.pondok=pondok;g.add(pondok);
  // The full deck width overlaps dry ground on both banks of the curved river.
  const {left,right,z,width,deckY}=bridge,length=right-left,count=Math.ceil(length/12),step=length/count;
  for(let i=0;i<count;i++)block(staticProps,m.wood,left+(i+.5)*step,deckY,z,step-.6,6,width);
  for(const side of[-1,1]){const zz=z+side*(width/2+3);for(let i=0;i<=Math.ceil(length/44);i++){const x=left+length*i/Math.ceil(length/44);block(staticProps,m.darkWood,x,deckY+17,zz,4,38,4);}for(const h of[deckY+9,deckY+29])beam(staticProps,m.wood,[left,h,zz],[right,h,zz],2);beam(staticProps,m.darkWood,[left,deckY-4,zz],[right,deckY-4,zz],3);}
  for(const x of[left+15,right-15])for(const zz of[z-width*.38,z+width*.38]){const base=terrainHeight(x,zz);block(staticProps,m.stone,x,base+3,zz,14,6,14);block(staticProps,m.darkWood,x,(base+deckY-3)/2,zz,8,Math.max(3,deckY-3-base),8);}
  for(const side of[-1,1]){const edge=side<0?left:right,outer=edge+side*40,groundY=terrainHeight(outer,z),dy=deckY+3-groundY,angle=-side*Math.atan2(dy,40);block(staticProps,m.wood,(edge+outer)/2,(deckY+3+groundY)/2,z,Math.hypot(40,dy)+3,3,width,0,0,angle);}
  block(staticProps,m.wood,1485,20,888,55,5,15);for(const x of[1464,1506])block(staticProps,m.darkWood,x,10,888,4,19,10);
  for(const [x,z]of[[1470,916],[1488,925],[1461,930]]){const crate=this.scanned('crate',16);if(crate){crate.position.set(x,terrainHeight(x,z),z);g.add(crate);}else block(staticProps,m.wood,x,8,z,15,16,15);}
  const stoneMat=m.stone;for(let i=0;i<180;i++){const z=random()*2200,x=640+110*Math.sin(z/270)+(random()>.5?1:-1)*(107+random()*28),r=5+random()*8;const rock=this.scanned('rock',r);if(rock){rock.position.set(x,terrainHeight(x,z),z);rock.rotation.y=random()*TAU;g.add(rock);}else staticProps.add(mesh(sphere,stoneMat,x,2,z,r,r*.55,r*.8,0,random()*TAU));}for(const[x,z]of[[1120,660],[2150,940],[2170,957],[1030,1390],[2020,1740],[2100,680]]){const y=terrainHeight(x,z);const rock=this.scanned('rock',22);if(rock){rock.position.set(x,y,z);rock.rotation.y=random()*TAU;g.add(rock);}else staticProps.add(mesh(new THREE.DodecahedronGeometry(1,1),stoneMat,x,y+7,z,19,15,23,.3,random()*TAU,.2));}g.add(mergeStatic(staticProps));
  this.makeVegetation();this.makeAtmosphere();
 }
 makeVegetation(){if(this.models?.tree){this.makeScannedForest();return;}const leafTransforms=[],trunks=new THREE.Group(),m=this.materials,forestRandom=rng(1924);
  const tree=(x,z,size,fruit=false)=>{const r=forestRandom,h=70+size*1.5,base=terrainHeight(x,z),spread=30+size*.55;beam(trunks,this.treeWood,[x,base,z],[x+4,base+h*.72,z],4.5);for(let i=0;i<6;i++){const a=i*2.4,px=x+Math.cos(a)*spread*.7,pz=z+Math.sin(a)*spread*.7;beam(trunks,this.treeWood,[x+2,base+h*.4,z],[px,base+h*(.68+r()*.19),pz],1.8);}
   for(let i=0;i<160;i++){const a=r()*TAU,v=2*r()-1,rad=Math.cbrt(r())*spread,xx=x+Math.sqrt(1-v*v)*Math.cos(a)*rad,zz=z+Math.sqrt(1-v*v)*Math.sin(a)*rad,yy=base+h+v*rad*.75;leafTransforms.push([xx,yy,zz,12+r()*10,17+r()*10,(r()-.5)*2,r()*TAU,(r()-.5)*2]);}
   if(fruit)for(let i=0;i<13;i++){const a=r()*TAU;trunks.add(mesh(sphere,m.red,x+Math.cos(a)*spread*.7,base+h-12+r()*25,z+Math.sin(a)*spread*.7,3.2,3.5,3.2));}
  };
  for(let i=0;i<WORLD_DATA.trees.length;i+=2){const[x,z,size]=WORLD_DATA.trees[i];tree(x,z,size);}for(const[x,z,s]of[[1408,867,29],[1788,859,34],[1050,910,42],[1108,1650,33],[2130,870,40],[2180,1570,38]])tree(x,z,s,true);
  this.landscape.add(mergeStatic(trunks));const leaves=new THREE.InstancedMesh(leafGeometry,m.leaves,leafTransforms.length);const color=new THREE.Color();for(let i=0;i<leafTransforms.length;i++){const[x,y,z,w,h,rx,ry,rz]=leafTransforms[i];temp.position.set(x,y,z);temp.rotation.set(rx,ry,rz);temp.scale.set(w,h,1);temp.updateMatrix();leaves.setMatrixAt(i,temp.matrix);color.setHSL(.205+forestRandom()*.035,.22+forestRandom()*.13,.57+forestRandom()*.14);leaves.setColorAt(i,color);}leaves.customDepthMaterial=m.leaves.userData.windDepth;leaves.castShadow=this.quality!=='low';leaves.receiveShadow=true;leaves.computeBoundingSphere();this.landscape.add(leaves);
 }
 makeScannedForest(){const r=rng(1924),trees=[];for(let i=0;i<WORLD_DATA.trees.length;i+=this.quality==='low'?4:2){const[x,z,size]=WORLD_DATA.trees[i];trees.push({x,z,height:70+size*1.5,angle:r()*TAU});}for(const[x,z,size]of[[1408,867,29],[1788,859,34],[1050,910,42],[1108,1650,33],[2130,870,40],[2180,1570,38]])trees.push({x,z,height:70+size*1.5,angle:r()*TAU});
  this.models.tree.traverse(part=>{if(!part.isMesh)return;const instances=new THREE.InstancedMesh(part.geometry,part.material,trees.length);for(let i=0;i<trees.length;i++){const p=trees[i];temp.position.set(p.x,terrainHeight(p.x,p.z),p.z);temp.rotation.set(0,p.angle,0);temp.scale.setScalar(p.height/150);temp.updateMatrix();instances.setMatrixAt(i,temp.matrix);}instances.customDepthMaterial=part.material.userData.windDepth;instances.castShadow=this.quality!=='low';instances.receiveShadow=true;instances.computeBoundingSphere();this.landscape.add(instances);});
  for(const[x,z]of[[1190,810],[2210,1210],[1170,1680]]){const stump=this.scanned('stump',18);if(stump){stump.position.set(x,terrainHeight(x,z),z);this.landscape.add(stump);}}
  const count=this.quality==='low'?450:1500,grass=new THREE.InstancedMesh(leafGeometry,this.grassCards,count);for(let i=0;i<count;i++){let x,z;do{x=60+r()*3080;z=60+r()*2080;}while((x>990&&x<2210&&z>600&&z<1790)||Math.abs(x-(640+110*Math.sin(z/270)))<140);const height=9+r()*11;temp.position.set(x,terrainHeight(x,z)+height/2,z);temp.rotation.set(0,r()*TAU,0);temp.scale.set(height*1.2,height,1);temp.updateMatrix();grass.setMatrixAt(i,temp.matrix);}grass.customDepthMaterial=this.grassCards.userData.windDepth;grass.receiveShadow=true;grass.computeBoundingSphere();this.landscape.add(grass);
 }
 plotGround(p,open){const g=new THREE.Group(),m=this.materials;if(!open)return g;block(g,m.soil,p.x,terrainHeight(p.x,p.y)+1,p.y,57,2,57);for(let i=-20;i<=20;i+=10){const ridge=mesh(cylinder,m.soil,p.x,terrainHeight(p.x,p.y)+2.2,p.y+i,1.6,53,1.6,0,0,Math.PI/2);g.add(ridge);}return mergeStatic(g);}
 makeCrop(key,stage){const g=new THREE.Group(),m=this.materials,r=rng(909+Object.keys(B.CROPS).indexOf(key)),fruit=this.fruitMaterials[key],tree=['apple','orange','avocado'].includes(key),growth=.2+.8*stage;
  if(tree&&this.models?.tree){const orchard=this.scanned('tree',40*growth);g.add(orchard);if(stage>.72)for(let i=0;i<7;i++){const a=i*2.4,height=key==='avocado'?5.4:4.7,model=this.scanned(key,height)||mesh(sphere,fruit,0,0,0,2.6,3,2.6);model.position.set(Math.cos(a)*14*growth,25*growth+i%3*4,Math.sin(a)*14*growth);model.rotation.y=a;g.add(model);}return g;}
  for(const x of[-14,14])for(const z of[-14,14]){const h=(tree?49:key==='corn'?38:20)*growth;
   if(tree){beam(g,m.darkWood,[x,1,z],[x,h,z],1.3*growth);for(let i=0;i<3;i++){const a=i*2.3;beam(g,m.darkWood,[x,h*.6,z],[x+Math.cos(a)*9*growth,h*.95,z+Math.sin(a)*9*growth],.6);}for(let i=0;i<32;i++){const a=r()*TAU,v=r()*2-1,rad=12*growth;const leaf=mesh(leafGeometry,m.leaves,x+Math.cos(a)*rad*Math.sqrt(1-v*v),h+v*rad*.65,z+Math.sin(a)*rad*Math.sqrt(1-v*v),6*growth,9*growth,1,(r()-.5)*2,r()*TAU,(r()-.5));g.add(leaf);}if(stage>.72)for(let i=0;i<5;i++){const a=i*2.4;g.add(mesh(sphere,fruit,x+Math.cos(a)*9*growth,h-3+i%2*7,z+Math.sin(a)*9*growth,2.2,2.7,2.2));}}
   else{beam(g,m.green,[x,1,z],[x,h,z],.6);const n=key==='carrot'?9:8;for(let i=0;i<n;i++){const a=i*2.4,w=(key==='corn'?3:4.5)*growth,length=(key==='carrot'?15:11)*growth;const leaf=mesh(leafGeometry,m.leaves,x+Math.sin(a)*w,h*(.3+i/n*.6),z+Math.cos(a)*w,w,length,1,.6+Math.sin(a)*.8,a,.3);g.add(leaf);}if(stage>.72){if(key==='carrot')g.add(mesh(new THREE.ConeGeometry(2.3,10,8),fruit,x,3,z,1,1,1,Math.PI));else if(key==='corn')g.add(mesh(sphere,fruit,x+2,h*.64,z,2.6,6.3,2.5));else if(key==='chili')for(let i=0;i<3;i++)g.add(mesh(new THREE.ConeGeometry(1.7,7,8),fruit,x+Math.cos(i*2)*4,h*.5,z+Math.sin(i*2)*4,1,1,1,Math.PI+.3));else for(let i=0;i<3;i++)g.add(mesh(sphere,fruit,x+Math.cos(i*2)*4,(key==='potato'?3:h*.45),z+Math.sin(i*2)*4,3.1,key==='potato'?2.1:3.1,3.1));}}
  }return mergeStatic(g);
 }
 setMotion(enabled){this.wind=Boolean(enabled);this.windStrength.value=enabled?4.2:0;this.grassStrength.value=enabled?2.2:0;this.trunkStrength.value=enabled?3.5:0;}
 animalModel(kind){
  this.animalMaterials??={coat:material('#e8e2d3',.92),patch:material('#302e28',.95),horn:material('#d3c298',.85),pink:material('#be9083',.75),comb:material('#a94530',.8),beak:material('#c9a259',.85),feather:material('#ded7c3',.95),eye:material('#171712',.25)};const m=this.animalMaterials,g=new THREE.Group(),cow=kind==='cow';
  const body=new THREE.Group();g.add(body);body.add(mesh(new THREE.SphereGeometry(1,24,16),m.coat,0,cow?30:13,0,cow?17:8,cow?17:10,cow?29:11));const legs=[];
  if(cow){for(let i=0;i<9;i++){const side=i%2?1:-1,z=-20+(i%5)*10,y=24+(i%3)*7;body.add(mesh(sphere,m.patch,side*14,y,z,3.5,6+(i%3)*2,7,.1,0,.3));}for(const x of[-11,11])for(const z of[-20,19]){const leg=new THREE.Group();leg.position.set(x,26,z);leg.add(mesh(cylinder,m.coat,0,-11,0,2.6,22,2.6));leg.add(mesh(box,m.patch,0,-24,1,5.4,5,7));body.add(leg);legs.push(leg);}body.add(mesh(sphere,m.pink,0,15,12,8,5,9));for(const x of[-4,4])for(const z of[8,14])body.add(mesh(cylinder,m.pink,x,11,z,1.1,5,1.1));}
  else{for(const side of[-1,1]){const wing=new THREE.Group();wing.position.set(side*7,15,-1);for(let i=0;i<6;i++)wing.add(mesh(sphere,m.feather,side*.4,0,-3+i,2,5+i*.2,2,.25,0,side*.2));body.add(wing);const leg=new THREE.Group();leg.position.set(side*3,8,0);leg.add(mesh(cylinder,m.beak,0,-4,0,.55,8,.55));for(let i=-1;i<=1;i++)beam(leg,m.beak,[0,-8,0],[i*2,-8,3],.4);body.add(leg);legs.push(leg);}for(let i=0;i<5;i++)body.add(mesh(sphere,m.feather,(i-2)*1.3,21,-10,1.6,9,2,-.7,0,(i-2)*.13));}
  const head=new THREE.Group();head.position.set(0,cow?36:24,cow?24:7);body.add(head);head.add(mesh(sphere,m.coat,0,0,cow?5:1,cow?8:4,cow?10:4,cow?12:4));
  if(cow){head.add(mesh(sphere,m.pink,0,-3,15,7,5,4));for(const x of[-5,5]){head.add(mesh(sphere,m.patch,x,-1,18,1.1,.7,.4));head.add(mesh(sphere,m.coat,x*2.4,4,0,6,2,3,0,0,x*.08));head.add(mesh(new THREE.ConeGeometry(1.8,8,12),m.horn,x,12,0,1,1,1,0,0,-x*.05));}}
  else{head.add(mesh(new THREE.ConeGeometry(1.5,4,12),m.beak,0,-.5,5,1,1,1,Math.PI/2));for(let i=0;i<4;i++)head.add(mesh(sphere,m.comb,0,4+i%2*.5,i-2,1,2,1));head.add(mesh(sphere,m.comb,0,-4,3,1.2,2,1));}
  for(const side of[-1,1])head.add(mesh(sphere,m.eye,side*(cow?7.5:3.6),cow?2:1,cow?8:2,cow?1:.65));const tail=new THREE.Group();tail.position.set(0,cow?37:19,cow?-28:-10);body.add(tail);if(cow){beam(tail,m.coat,[0,0,0],[0,-18,-4],.8);tail.add(mesh(sphere,m.patch,0,-19,-4,2,4,2));}
  g.userData.actor={body,head,legs,tail,cow};return g;
 }
 syncAnimals(farm,now){
  this.animalLayer??=new THREE.Group();if(!this.animalLayer.parent)this.scene.add(this.animalLayer);const signature=farm.s.livestock.animals.map(a=>a.id+':'+a.kind+':'+a.slot).join(',')+'|'+farm.s.buildings.map(b=>b.slot+':'+b.x+':'+b.y+':'+b.rotation+':'+Number(b.readyAt<=now)).join(',');if(signature===this.animalSignature)return;this.animalSignature=signature;disposeGeometry(this.animalLayer);this.animalLayer.clear();this.animalActors=[];
  for(const b of farm.s.buildings){const animals=farm.s.livestock.animals.filter(a=>a.slot===b.slot);if(!animals.length||b.readyAt>now)continue;const pen=new THREE.Group();pen.position.set(b.x,terrainHeight(b.x,b.y),b.y);pen.rotation.y=b.rotation*Math.PI/2;pen.userData.building=true;pen.userData.buildingId=b.slot;this.animalLayer.add(pen);animals.forEach((a,i)=>{const model=this.animalModel(a.kind),cow=a.kind==='cow',x=cow?(i?30:-30):(i%2?24:-24),z=cow?8:Math.floor(i/2)*26+2;model.position.set(x,0,z);model.rotation.y=(i%2?1:-1)*.35;pen.add(model);this.animalActors.push({model,x,z,phase:a.id*2.4,...model.userData.actor});});}
 }
 animateAnimals(time){for(const a of this.animalActors||[]){const t=this.wind?time:0,walk=Math.sin(t*.32+a.phase)>.25;const sway=Math.sin(t*.8+a.phase);a.model.position.x=a.x+(walk?Math.sin(t*.45+a.phase)*4:0);a.model.position.z=a.z+(walk?Math.cos(t*.45+a.phase)*4:0);a.body.position.y=walk?Math.abs(Math.sin(t*3+a.phase))*(a.cow ? .35 : .7):0;a.legs.forEach((leg,i)=>leg.rotation.x=walk?Math.sin(t*3+a.phase+(i%2)*Math.PI)*.22:0);a.head.rotation.x=a.cow?.15+Math.sin(t*.7+a.phase)*.08:Math.max(0,Math.sin(t*1.6+a.phase))*.7;a.head.rotation.y=sway*.08;a.tail.rotation.z=sway*.3;}}
 sunsetConservatory(){
  // Catalog and placement instantiate the same architecture, materials and animated details.
  const g=new THREE.Group(),m=this.materials;
  this.conservatoryMaterials??={frame:new THREE.MeshStandardMaterial({color:'#243e38',roughness:.32,metalness:.65}),brass:new THREE.MeshStandardMaterial({color:'#c3a56c',roughness:.28,metalness:.72}),stone:material('#e4d9bb',.72),jade:material('#547a66',.55),cedar:material('#92704d',.76),pot:material('#ac6847',.84),pink:material('#d59ab4',.75),cream:material('#efe6c4',.76),glass:new THREE.MeshPhysicalMaterial({color:'#d0e6da',roughness:.07,metalness:0,transmission:.18,thickness:.7,ior:1.46,transparent:true,opacity:.27,depthWrite:false,side:THREE.DoubleSide,envMapIntensity:1.2}),water:new THREE.MeshPhysicalMaterial({color:'#94c6c8',roughness:.12,metalness:0,clearcoat:1,ior:1.333,transmission:.12,transparent:true,opacity:.78}),bulb:new THREE.MeshStandardMaterial({color:'#ffd18a',emissive:'#ffab46',emissiveIntensity:1.6,roughness:.2})};
  const f=this.conservatoryMaterials;
  for(const[dest,source]of[[f.stone,m.plaster],[f.cedar,m.wood]])for(const key of['map','normalMap','roughnessMap'])if(source[key]&&dest[key]!==source[key]){dest[key]=source[key];dest.needsUpdate=true;}
  block(g,f.cedar,0,2,0,146,4,124);block(g,f.stone,0,4,0,144,4,122);
  // Individually laid limestone tiles, a dark border and a brass botanical inlay.
  for(let x=-63;x<=63;x+=18)for(let z=-50;z<=50;z+=20)block(g,f.stone,x,6,z,17.3,1.4,19.3);
  for(const x of[-70,70])block(g,f.jade,x,6.5,0,3,1,120);for(const z of[-59,59])block(g,f.jade,0,6.5,z,140,1,3);
  for(let i=0;i<8;i++){const a=i*TAU/8;g.add(mesh(new THREE.SphereGeometry(1,16,8),f.brass,Math.sin(a)*10,7.2,37+Math.cos(a)*10,2.4,.2,6,0,-a,0));}
  // A pitched glass roof, mullions, an arched entrance and decorative ridge finials.
  const left=-52,right=52,front=18,back=-48,eaves=62,peak=89;
  for(const x of[left,right])for(const z of[back,-26,-4,front]){block(g,f.frame,x,34,z,2.5,56,2.5);block(g,f.brass,x,10,z,4,6,4);}
  for(const y of[12,38,eaves]){for(const x of[left,right])block(g,f.frame,x,y,(front+back)/2,2,1.8,front-back);for(const z of[front,back])block(g,f.frame,0,y,z,104,1.8,2);}
  for(const z of[front,back])for(const x of[-34,-17,17,34])block(g,f.frame,x,35,z,1.5,54,1.5);
  for(const side of[-1,1]){
   for(let i=0;i<3;i++){const z=back+(i+.5)*22;const pane=mesh(new THREE.PlaneGeometry(21,48),f.glass,side*52.1,36,z,1,1,1,0,Math.PI/2);pane.castShadow=false;g.add(pane);}
   const width=Math.hypot(52,peak-eaves),angle=Math.atan2(peak-eaves,52);block(g,f.glass,side*26,(eaves+peak)/2,-15,width,.55,68,0,0,-side*angle);
   for(const z of[back,-26,-4,front])beam(g,f.frame,[side*52,eaves,z],[0,peak,z],.9);
   for(const ratio of[.33,.66])block(g,f.frame,side*52*ratio,peak-(peak-eaves)*ratio,-15,1.2,1.2,70,0,0,-side*angle);
  }
  for(const z of[front,back]){
   for(const x of[-43,-25,25,43]){const pane=mesh(new THREE.PlaneGeometry(16,46),f.glass,x,36,z,1,1,1);pane.castShadow=false;g.add(pane);}
   const shape=new THREE.Shape();shape.moveTo(-51,0);shape.lineTo(51,0);shape.lineTo(0,26);shape.closePath();const glass=mesh(new THREE.ShapeGeometry(shape),f.glass,0,eaves,z);glass.castShadow=false;g.add(glass);
   beam(g,f.frame,[-52,eaves,z],[0,peak,z],1);beam(g,f.frame,[52,eaves,z],[0,peak,z],1);beam(g,f.brass,[0,eaves,z],[0,peak-3,z],.55);
   for(const x of[-35,-17,17,35])beam(g,f.frame,[x,eaves,z],[0,peak-2,z],.45);
  }
  const arch=new THREE.CatmullRomCurve3(Array.from({length:25},(_,i)=>{const a=Math.PI*i/24;return new THREE.Vector3(Math.cos(a)*17,44+Math.sin(a)*17,front+1.5);}));g.add(mesh(new THREE.TubeGeometry(arch,32,1.2,8,false),f.brass,0,0,0));
  for(const x of[-17,17])block(g,f.brass,x,26,front+1.5,1.8,36,1.8);
  block(g,f.cedar,-10,27,front+3,13,38,1.6,0,-.22);for(const y of[11,44])block(g,f.brass,-10,y,front+4,13,1,1);g.add(mesh(sphere,f.brass,-5,26,front+5,.7));
  block(g,f.frame,0,peak,-15,3,3,72);for(const z of[back,front]){g.add(mesh(new THREE.SphereGeometry(1,20,12),f.brass,0,peak+3,z,2,3,2));g.add(mesh(new THREE.ConeGeometry(1.2,5,16),f.brass,0,peak+7,z));}
  // Raised botanical beds with real scanned foliage when the CC0 tree is loaded.
  const botanical=(x,z,height)=>{block(g,f.cedar,x,11,z,23,9,22);block(g,f.brass,x,15.6,z,24,.8,23);block(g,m.soil,x,16,z,21,.8,20);const tree=this.scanned('tree',height);if(tree){tree.position.set(x,16,z);g.add(tree);}else{const plant=this.makeCrop('orange',.55);plant.scale.setScalar(.45);plant.position.set(x,17,z);g.add(plant);}};
  for(const x of[-36,36])for(const z of[-32,-8])botanical(x,z,z===-32?38:29);
  for(const x of[-34,34]){block(g,f.frame,x,28,-45,1.5,22,2);block(g,f.cedar,x,29,-41,28,2,10);for(let i=0;i<3;i++){g.add(mesh(new THREE.CylinderGeometry(3.5,2.5,5,20),f.pot,x+(i-1)*8,33,-41));g.add(mesh(sphere,m.green,x+(i-1)*8,39,-41,4,4,3));}}
  // A reading bench and a round terrace table with two woven chairs.
  for(const x of[-16,16]){block(g,f.frame,x,13,-27,2,12,2);block(g,f.frame,x,22,-35,2,29,2);}for(const z of[-32,-27,-22])block(g,f.cedar,0,20,z,37,1.5,4);for(const y of[28,34])block(g,f.cedar,0,y,-35,37,3,1.5);
  for(const[x,z]of[[47,39],[18,47]]){const chair=new THREE.Group();for(const xx of[-5,5])for(const zz of[-5,5])block(chair,f.frame,xx,13,zz,1,13,1);block(chair,f.cedar,0,20,0,12,1.5,12);for(const xx of[-5,5])block(chair,f.frame,xx,27,-5,1,16,1);for(let yy=23;yy<35;yy+=3)block(chair,f.cedar,0,yy,-5,11,1.3,1);chair.position.set(x,0,z);chair.rotation.y=x===47?-.7:.65;g.add(mergeStatic(chair));}
  g.add(mesh(new THREE.CylinderGeometry(10,10,1.6,36),f.cedar,34,23,36));g.add(mesh(cylinder,f.brass,34,14,36,1.2,16,1.2));g.add(mesh(new THREE.CylinderGeometry(4,5,1.5,24),f.frame,34,7,36));g.add(mesh(new THREE.CylinderGeometry(1.8,1.5,2.5,20),f.cream,32,25,36));g.add(mesh(new THREE.TorusGeometry(.8,.3,6,16),f.brass,34,25,36));
  const potProfile=[new THREE.Vector2(5,0),new THREE.Vector2(5.3,1),new THREE.Vector2(8,12),new THREE.Vector2(8.7,13),new THREE.Vector2(8.7,14.5),new THREE.Vector2(7.2,14.5),new THREE.Vector2(7,12),new THREE.Vector2(4,1)];
  for(const x of[-62,62]){g.add(mesh(new THREE.LatheGeometry(potProfile,40),f.pot,x,7,17));g.add(mesh(new THREE.CylinderGeometry(7,7,1,28),m.soil,x,20,17));for(let i=0;i<12;i++){const a=i*2.4,px=x+Math.sin(a)*5,pz=17+Math.cos(a)*5,y=25+i%3*3;beam(g,m.green,[x,20,17],[px,y,pz],.24);g.add(mesh(leafGeometry,m.leaves,px,y-2,pz,5,7,1,.5,a,0));for(let j=0;j<5;j++){const angle=j*TAU/5;g.add(mesh(sphere,i%3?f.cream:f.pink,px+Math.sin(angle)*1.5,y,pz+Math.cos(angle)*1.5,1.6,.65,1.6));}g.add(mesh(sphere,f.brass,px,y+.6,pz,.6));}}
  // A three-tier fountain, flowing streams and droplets running along curved paths.
  const fx=-34,fz=38;g.add(mesh(new THREE.CylinderGeometry(17,18,4,48),f.stone,fx,9,fz));g.add(mesh(new THREE.TorusGeometry(15.5,1.8,12,48),f.stone,fx,12,fz,1,1,1,Math.PI/2));g.add(mesh(new THREE.CylinderGeometry(14,14,.6,48),f.water,fx,12,fz));g.add(mesh(cylinder,f.brass,fx,18,fz,1.8,12,1.8));g.add(mesh(new THREE.CylinderGeometry(8,6,2,32),f.stone,fx,23,fz));g.add(mesh(new THREE.CylinderGeometry(7,7,.5,32),f.water,fx,24.1,fz));g.add(mesh(cylinder,f.brass,fx,27,fz,1,6,1));g.add(mesh(sphere,f.brass,fx,31,fz,2));
  const droplets=[];for(let i=0;i<8;i++){const a=i*TAU/8,curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(fx,30,fz),new THREE.Vector3(fx+Math.sin(a)*10,34,fz+Math.cos(a)*10),new THREE.Vector3(fx+Math.sin(a)*12,13,fz+Math.cos(a)*12));const stream=mesh(new THREE.TubeGeometry(curve,20,.22,5,false),f.water,0,0,0);stream.castShadow=false;g.add(stream);const drop=mesh(sphere,f.water,fx,30,fz,.45);drop.castShadow=false;g.add(drop);droplets.push({mesh:drop,curve,phase:i/8});}
  const fan=new THREE.Group();fan.position.set(0,66,-14);g.add(mesh(cylinder,f.brass,0,73,-14,.6,14,.6));fan.add(mesh(new THREE.CylinderGeometry(2.5,2.5,3,20),f.brass,0,0,0));for(let i=0;i<3;i++){const a=i*TAU/3;fan.add(mesh(new THREE.SphereGeometry(1,20,8),f.cedar,Math.sin(a)*7,0,Math.cos(a)*7,2.6,.35,8,0,a,.06));}g.add(fan);
  const lights=[];for(const x of[-29,29]){beam(g,f.frame,[x,69,-13],[x,53,-13],.32);g.add(mesh(new THREE.CylinderGeometry(3.8,4.8,1.7,24),f.brass,x,52,-13));g.add(mesh(new THREE.SphereGeometry(1,24,16),f.bulb,x,48,-13,2.2,3.7,2.2));for(const z of[-16,-10])block(g,f.frame,x,48,z,.6,7,.6);const light=new THREE.PointLight('#ffbd70',1100,130,2);light.position.set(x,47,-13);g.add(light);lights.push(light);}
  for(const x of[-47,47]){block(g,f.brass,x,37,front+2,5,9,1.5);beam(g,f.frame,[x,41,front+2],[x,42,front+7],.45);g.add(mesh(new THREE.ConeGeometry(3.3,3,16),f.brass,x,40,front+7));g.add(mesh(sphere,f.bulb,x,35.5,front+7,1.6,2.6,1.6));g.add(mesh(new THREE.CylinderGeometry(2.4,2.4,1,20),f.brass,x,32.5,front+7));const light=new THREE.PointLight('#ffbd70',1100,100,2);light.position.set(x,35,front+9);g.add(light);lights.push(light);}
  // Keep animated meshes separate from static batching.
  for(const d of droplets)g.remove(d.mesh);mergeStatic(g);for(const d of droplets)g.add(d.mesh);g.traverse(o=>{if(o.isMesh&&(o.material===f.glass||o.material===f.water||o.material===f.bulb))o.castShadow=false;});
  g.userData.product='sunsetConservatory';g.userData.footprint={w:150,h:128};g.userData.premium={fan,lights,droplets};this.animateConservatory(0,g);return g;
 }
 animateConservatory(time,model){
  const g=model||this.preview?.children.find(o=>o.userData.product==='sunsetConservatory'),actors=g?.userData.premium;if(!actors)return;const t=this.wind===false?0:time;actors.fan.rotation.y=t*.45;for(let i=0;i<actors.lights.length;i++)actors.lights[i].intensity=1100+Math.sin(t*.7+i)*120;for(const d of actors.droplets)d.mesh.position.copy(d.curve.getPoint((t*.55+d.phase)%1));
 }

 updateDaylight(timestamp){
  if(typeof FarmDaylight==='undefined')return;
  const bucket=Math.floor(timestamp/1000);if(this.daylightBucket===bucket)return;this.daylightBucket=bucket;
  const light=this.daylight=FarmDaylight.at(timestamp),night=1-light.daylight;
  this.sun.position.set(1610+light.sun.x,light.sun.y,1120+light.sun.z);this.sun.intensity=light.sunIntensity;
  this.sun.color.set('#fff4de').lerp(new THREE.Color('#ffc27d'),light.golden);
  this.moon.intensity=light.moonIntensity;
  this.hemisphere.intensity=light.hemisphereIntensity;
  this.hemisphere.color.set('#e6f0ff').lerp(new THREE.Color('#96b9e8'),night);
  this.hemisphere.groundColor.set('#777557').lerp(new THREE.Color('#56696b'),night);
  this.scene.environmentIntensity=light.environmentIntensity;this.scene.backgroundIntensity=light.backgroundIntensity;
  this.scene.fog.color.set('#c2cdbb').lerp(new THREE.Color('#172a42'),night);
  if(this.scene.background?.isColor)this.scene.background.copy(this.scene.fog.color);
  this.materials.window.emissiveIntensity=night*.8;
 }
 applyPreviewAmbience(dusk){
  if(!this.sun)return;const hemisphere=this.scene.children.find(o=>o.isHemisphereLight);
  if(dusk){this.previewLighting??={sunColor:this.sun.color.clone(),sunIntensity:this.sun.intensity,environment:this.scene.environmentIntensity,background:this.scene.backgroundIntensity,skyColor:hemisphere?.color.clone(),groundColor:hemisphere?.groundColor.clone(),hemiIntensity:hemisphere?.intensity};this.sun.color.set('#ffb785');this.sun.intensity=.85;this.scene.environmentIntensity=.3;this.scene.backgroundIntensity=.35;if(hemisphere){hemisphere.color.set('#b2bedb');hemisphere.groundColor.set('#485b4c');hemisphere.intensity=.9;}}
  else if(this.previewLighting){const saved=this.previewLighting;this.sun.color.copy(saved.sunColor);this.sun.intensity=saved.sunIntensity;this.scene.environmentIntensity=saved.environment;this.scene.backgroundIntensity=saved.background;if(hemisphere){hemisphere.color.copy(saved.skyColor);hemisphere.groundColor.copy(saved.groundColor);hemisphere.intensity=saved.hemiIntensity;}this.previewLighting=null;}
 }
 makeDecorationCatalogue(){
  const width=900,height=660,scene=new THREE.Scene();scene.environment=this.scene.environment;scene.environmentIntensity=.3;scene.background=new THREE.Color('#233c3c');scene.add(new THREE.HemisphereLight('#b2bedb','#485b4c',.9));
  const sun=new THREE.DirectionalLight('#ffb785',.85);sun.position.set(-120,174,-76);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-170,right:170,top:170,bottom:-170,near:1,far:500});sun.shadow.bias=-.0006;sun.shadow.normalBias=.5;scene.add(sun);
  const floorMaterial=material('#344c46',1),floor=mesh(new THREE.PlaneGeometry(400,400),floorMaterial,0,-.1,0,1,1,1,-Math.PI/2);floor.castShadow=false;scene.add(floor);
  const model=this.sunsetConservatory();scene.add(model);const span=107,view=new THREE.OrthographicCamera(-span,span,span*height/width,-span*height/width,.1,1000);view.position.set(180,160,270);view.lookAt(0,35,0);
  const target=new THREE.WebGLRenderTarget(width,height);target.texture.colorSpace=THREE.SRGBColorSpace;const bytes=new Uint8Array(width*height*4),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d'),picture=context.createImageData(width,height),oldTarget=this.webgl.getRenderTarget(),shadows=this.webgl.shadowMap.enabled,wind=this.windTime.value;
  try{this.windTime.value=0;this.webgl.shadowMap.enabled=true;this.webgl.setRenderTarget(target);this.webgl.render(scene,view);this.webgl.readRenderTargetPixels(target,0,0,width,height,bytes);for(let y=0;y<height;y++)picture.data.set(bytes.subarray((height-1-y)*width*4,(height-y)*width*4),y*width*4);context.putImageData(picture,0,0);this.catalogue.sunsetConservatory=canvas.toDataURL('image/png');}
  finally{this.webgl.setRenderTarget(oldTarget);this.webgl.shadowMap.enabled=shadows;this.windTime.value=wind;target.dispose();disposeGeometry(model);floor.geometry.dispose();floorMaterial.dispose();sun.shadow.dispose();}
 }
 catalogueProduct(kind){const g=new THREE.Group(),m=this.materials,fruit=this.fruitMaterials[kind],round=new THREE.SphereGeometry(1,28,20);
  if(Object.hasOwn(B.ANIMALS,kind))return this.animalModel(kind);
  if(kind==='egg'){for(const x of[-13,12])g.add(mesh(round,(this.eggMaterial??=material('#e8d9bf',.75)),x,18,0,11,16,11));return mergeStatic(g);}
  if(kind==='milk'){g.add(mesh(new THREE.CylinderGeometry(12,13,38,24),m.plaster,0,21,0));g.add(mesh(new THREE.CylinderGeometry(6,12,12,24),m.plaster,0,46,0));g.add(mesh(new THREE.CylinderGeometry(6,6,4,24),m.iron,0,54,0));return mergeStatic(g);}
  const scan=this.scanned(kind,54);if(scan)return scan;if(kind==='stone'&&this.models?.rock){for(let i=0;i<3;i++){const rock=this.scanned('rock',23+i*4);rock.position.set(Math.sin(i*2.4)*18,0,Math.cos(i*2.4)*13);rock.rotation.y=i;g.add(rock);}return g;}if(kind==='meat'&&this.meatScan){g.add(mesh(new THREE.PlaneGeometry(80,70),this.meatScan,0,12,0,1,1,1,-Math.PI/2));return g;}
  const leaf=(x,y,z,w=8,h=16,ry=0)=>g.add(mesh(leafGeometry,m.leaves,x,y,z,w,h,1,-.5,ry,.6));
  if(Object.hasOwn(B.RECIPES,kind)){this.foodMaterials??={ceramic:material('#efe9d8',.25),soup:material('#cb903a',.35),juice:material('#e6a134',.3),jam:material('#9f2f38',.3),pastry:material('#c9a05f',.78),jar:new THREE.MeshPhysicalMaterial({color:'#e0ebd7',transparent:true,opacity:.32,roughness:.08,metalness:0,depthWrite:false})};const f=this.foodMaterials;
   if(kind==='soup'){g.add(mesh(new THREE.CylinderGeometry(25,15,16,32),f.ceramic,0,12,0));g.add(mesh(new THREE.CylinderGeometry(23,23,2,32),f.soup,0,21,0));for(let i=0;i<9;i++)g.add(mesh(sphere,this.fruitMaterials.carrot,Math.sin(i*2.4)*15,23,Math.cos(i*2.4)*15,3,1.8,3));for(let i=0;i<4;i++)leaf(Math.sin(i)*10,25,Math.cos(i)*10,4,7,i);}
   else if(kind==='pie'){g.add(mesh(new THREE.CylinderGeometry(27,24,4,32),f.ceramic,0,3,0));g.add(mesh(new THREE.CylinderGeometry(24,21,10,32),f.pastry,0,10,0));g.add(mesh(new THREE.CylinderGeometry(22,22,1,32),this.fruitMaterials.apple,0,16,0));for(const v of[-14,-7,0,7,14]){const length=Math.sqrt(22*22-v*v)*2;block(g,f.pastry,v,18,0,3,3,length);block(g,f.pastry,0,19,v,length,3,3);}}
   else{const h=kind==='jam'?38:51;g.add(mesh(new THREE.CylinderGeometry(15,15,h,32),f.jar,0,h/2+3,0));g.add(mesh(new THREE.CylinderGeometry(13,13,h-7,32),kind==='jam'?f.jam:f.juice,0,(h-7)/2+4,0));g.add(mesh(new THREE.CylinderGeometry(16,16,4,32),m.iron,0,h+4,0));block(g,f.ceramic,0,h*.5,15,22,15,1);g.add(mesh(sphere,kind==='jam'?this.fruitMaterials.strawberry:this.fruitMaterials.orange,0,h*.5,17,6,6,1));}return mergeStatic(g);
  }
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
 makeCatalogue(){const scene=new THREE.Scene();scene.environment=this.scene.environment;scene.environmentIntensity=.65;scene.background=new THREE.Color('#eeefdf');scene.add(new THREE.HemisphereLight('#f2f5e7','#b6a483',2.5));const light=new THREE.DirectionalLight('#fff0cd',2.4);light.position.set(-150,250,180);scene.add(light);const view=new THREE.OrthographicCamera(-1,1,1,-1,.1,1000),target=new THREE.WebGLRenderTarget(192,192),bytes=new Uint8Array(192*192*4),canvas=document.createElement('canvas');canvas.width=canvas.height=192;const context=canvas.getContext('2d'),image=context.createImageData(192,192),oldTarget=this.webgl.getRenderTarget(),shadow=this.webgl.shadowMap.enabled;this.webgl.shadowMap.enabled=false;
  try{for(const kind of [...Object.keys(B.CROPS),...Object.keys(B.BUILDINGS),...Object.keys(B.MATERIALS),...Object.keys(B.RECIPES),...Object.keys(B.ANIMALS),...Object.keys(B.ANIMAL_PRODUCTS)]){const isBuilding=Object.hasOwn(B.BUILDINGS,kind),model=isBuilding?this.building(kind):this.catalogueProduct(kind),span=kind==='planter'?40:isBuilding?112:48;view.left=-span;view.right=span;view.top=span;view.bottom=-span;view.position.set(-170,210,230);view.lookAt(0,isBuilding?45:33,0);view.updateProjectionMatrix();scene.add(model);this.webgl.setRenderTarget(target);this.webgl.render(scene,view);this.webgl.readRenderTargetPixels(target,0,0,192,192,bytes);for(let y=0;y<192;y++)image.data.set(bytes.subarray((191-y)*192*4,(192-y)*192*4),y*192*4);context.putImageData(image,0,0);this.catalogue[kind]=canvas.toDataURL('image/png');scene.remove(model);disposeGeometry(model);}}finally{this.webgl.setRenderTarget(oldTarget);this.webgl.shadowMap.enabled=shadow;target.dispose();}window.dispatchEvent(new Event('bara:art'));
 }
 makeAtmosphere(){const r=rng(904),count=this.quality==='low'?18:44;this.driftingLeaves=new THREE.InstancedMesh(leafGeometry,this.materials.leaves,count);this.leafSeeds=Array.from({length:count},()=>({x:1120+r()*1070,z:650+r()*1110,height:35+r()*115,phase:r()*TAU,speed:2+r()*3}));this.driftingLeaves.frustumCulled=false;this.driftingLeaves.castShadow=false;this.scene.add(this.driftingLeaves);
  this.animateEnvironment(0);
 }
 animateEnvironment(time){this.windTime.value=this.wind?time:0;this.driftingLeaves.visible=this.wind;if(!this.wind)return;for(let i=0;i<this.leafSeeds.length;i++){const p=this.leafSeeds[i],cycle=(time*p.speed+p.phase*20)%140;temp.position.set(p.x+cycle*.48+Math.sin(time*.7+p.phase)*7,160-cycle,p.z+cycle*.21+Math.cos(time*.6+p.phase)*10);temp.rotation.set(time*.6+p.phase,Math.sin(time*.45+p.phase),time*.3+p.phase);temp.scale.set(3.5,5.5,1);temp.updateMatrix();this.driftingLeaves.setMatrixAt(i,temp.matrix);}this.driftingLeaves.instanceMatrix.needsUpdate=true;

 }
 syncFarm(farm,now){const signature=(this.assetRevision||0)+'|'+farm.unlocked+'|'+farm.s.buildings.map(b=>[b.slot,b.kind,b.x,b.y,b.rotation,b.readyAt<=now].join(':')).join(',')+'|'+farm.s.plots.map(p=>[p.x,p.y,p.crop?`${p.crop}:${Math.floor(30*Math.min(1,(now-p.plantedAt)/(p.readyAt-p.plantedAt)))}`:'-'].join(':')).join(',');if(signature===this.lastModel)return;this.lastModel=signature;
  for(const layer of[this.farmLayer,this.cropLayer]){disposeGeometry(layer);layer.clear();}
  for(const p of farm.s.plots){const soil=this.plotGround(p,p.id<farm.unlocked);soil.userData.plotId=p.id;this.farmLayer.add(soil);if(p.crop&&p.id<farm.unlocked){const stage=Math.max(0,Math.min(1,(now-p.plantedAt)/(p.readyAt-p.plantedAt))),model=this.makeCrop(p.crop,stage);model.position.set(p.x,terrainHeight(p.x,p.y),p.y);model.userData.plotId=p.id;this.cropLayer.add(model);}}
  for(const b of farm.s.buildings){const model=this.building(b.kind,b.readyAt<=now);model.position.set(b.x,terrainHeight(b.x,b.y),b.y);model.rotation.y=b.rotation*Math.PI/2;model.userData.building=true;model.userData.buildingId=b.slot;this.farmLayer.add(model);}
 }
 label(id,x,z,h,text,kind=''){let label=this.labels.get(id);if(!label){label=document.createElement('span');this.labelLayer.append(label);this.labels.set(id,label);}const p=this.camera.worldToScreen(x,z,h);label.textContent=text;label.className='world-label '+kind;label.style.transform=`translate(${Math.round(p.x)}px,${Math.round(p.y)}px) translate(-50%,-100%)`;label.hidden=p.x<0||p.y<0||p.x>this.camera.width||p.y>this.camera.height;label.dataset.visible='1';}
 labelsFor(farm,{selectedPlot,pendingBuild,now,welcome,placement}){for(const l of this.labels.values())l.dataset.visible='0';if(!welcome){for(const p of farm.s.plots.slice(0,farm.unlocked)){if(p.id===placement?.movePlot)continue;const planted=farm.s.plots[p.id];if(planted.crop&&planted.readyAt<=now){const selected=p.id===selectedPlot;this.label('p'+p.id,selected?p.x:p.x+24,selected?p.y:p.y-23,selected?60:4,selected?harvestT_farm_3d_js('✓ Panen ')+B.CROPS[planted.crop].name:'✓',selected?'ready expanded':'ready');}else if(p.id===selectedPlot)this.label('p'+p.id,p.x,p.y,35,planted.crop?B.CROPS[planted.crop].name:harvestT_farm_3d_js('Petak ')+(p.id+1),'selected');}
   for(const b of farm.s.buildings)if(b.slot!==placement?.moveBuilding)this.label('b'+b.slot,b.x,b.y,terrainHeight(b.x,b.y)+115,b.readyAt<=now?B.BUILDINGS[b.kind].name+(farm.s.livestock.animals.some(a=>a.slot===b.slot&&a.fedAt&&a.readyAt<=now)?harvestT_farm_3d_js(' · Hasil ternak siap'):'')+(farm.s.production.jobs.some(j=>j.slot===b.slot&&j.readyAt<=now)?harvestT_farm_3d_js(' · Olahan siap'):''):harvestT_farm_3d_js('Membangun · ')+Math.ceil((b.readyAt-now)/1000)+'d');}
  for(const l of this.labels.values())if(l.dataset.visible!=='1')l.hidden=true;
 }
 updateSelection(farm,options){if(!this.selection){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([-31,3,-31,31,3,-31,31,3,31,-31,3,31,-31,3,-31],3));this.selection=new THREE.Line(geo,new THREE.LineBasicMaterial({color:'#f8d588'}));this.scene.add(this.selection);}const p=farm.s.plots[options.selectedPlot];this.selection.visible=Boolean(p);if(p)this.selection.position.set(p.x,terrainHeight(p.x,p.y),p.y);
  const edit=options.placement;
  for(const layer of [this.farmLayer,this.cropLayer,...(this.animalLayer?[this.animalLayer]:[])])for(const object of layer.children)object.visible=!(edit?.point&&(object.userData.buildingId!==undefined&&object.userData.buildingId===edit.moveBuilding||object.userData.plotId!==undefined&&object.userData.plotId===edit.movePlot));
  if(!this.layoutGuide){this.layoutGuide=new THREE.Group();this.scene.add(this.layoutGuide);}this.layoutGuide.visible=Boolean(edit&&!edit.demoPlaced);const guideSignature=farm.unlocked+'|'+farm.s.plots.map(p=>p.x+':'+p.y).join(',');if(edit&&guideSignature!==this.guideSignature){this.guideSignature=guideSignature;this.layoutGuide.traverse(o=>{if(o.isLine){o.geometry.dispose();o.material.dispose();}});this.layoutGuide.clear();const outline=(x,y,w,h,dashed=false)=>{const points=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2],[-w/2,-h/2]].map(([dx,dz])=>new THREE.Vector3(x+dx,terrainHeight(x+dx,y+dz)+3,y+dz));const material=dashed?new THREE.LineDashedMaterial({color:'#c9d4a8',dashSize:6,gapSize:5,transparent:true,opacity:.55}):new THREE.LineBasicMaterial({color:'#e7dda6',transparent:true,opacity:.25});const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),material);if(dashed)line.computeLineDistances();this.layoutGuide.add(line);};outline(1595,1195,1190,1130);for(const p of farm.s.plots.slice(0,farm.unlocked))outline(p.x,p.y,60,60);}
  const movingPlot=edit?.movePlot===undefined?null:farm.s.plots[edit.movePlot],movingBuilding=farm.s.buildings.find(b=>b.slot===edit?.moveBuilding);
  const stage=movingPlot?.crop?Math.max(0,Math.min(1,(options.now-movingPlot.plantedAt)/(movingPlot.readyAt-movingPlot.plantedAt))):0;
  const signature=edit?.point?JSON.stringify([this.assetRevision||0,edit.kind,edit.product,edit.demoPlaced,edit.rotation,edit.count,edit.movePlot,movingPlot?.crop,Math.floor(stage*30),movingBuilding?.readyAt<=options.now]):'';
  if(signature!==this.previewSignature){
   this.previewSignature=signature;if(this.preview){disposeGeometry(this.preview);for(const material of this.previewOwnedMaterials||[])material.dispose();this.previewOwnedMaterials=null;this.scene.remove(this.preview);this.preview=null;}
   if(edit?.point){
    const g=this.preview=new THREE.Group();this.previewFill=new THREE.MeshBasicMaterial({color:'#99d59b',transparent:true,opacity:.38,depthWrite:false,side:THREE.DoubleSide});this.previewOutline=new THREE.LineBasicMaterial({color:'#99d59b'});this.previewOwnedMaterials=new Set([this.previewFill,this.previewOutline]);
    const rect=(p,w,h)=>{const fill=new THREE.Mesh(new THREE.PlaneGeometry(w,h),this.previewFill);fill.rotation.x=-Math.PI/2;fill.position.set(p.x,4,p.y);fill.visible=!edit.demoPlaced;g.add(fill);const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-w/2,0,-h/2),new THREE.Vector3(w/2,0,-h/2),new THREE.Vector3(w/2,0,h/2),new THREE.Vector3(-w/2,0,h/2)]);const line=new THREE.LineLoop(geo,this.previewOutline);line.position.copy(fill.position);line.position.y+=1;line.visible=!edit.demoPlaced;g.add(line);};
    if(edit.kind==='garden'){for(const point of farm.gardenPoints({x:0,y:0},edit.count,edit.rotation))rect(point,60,60);}else{
     const size=B.footprint(edit.kind,edit.rotation);rect({x:0,y:0},size.w,size.h);let ghost;
     if(edit.kind==='plot'){ghost=new THREE.Group();const soil=this.plotGround({x:0,y:0},true);soil.position.y=-terrainHeight(0,0);ghost.add(soil);if(movingPlot?.crop)ghost.add(this.makeCrop(movingPlot.crop,stage));}
     else{ghost=edit.product==='sunsetConservatory'?this.sunsetConservatory():this.building(edit.kind,!movingBuilding||movingBuilding.readyAt<=options.now);ghost.rotation.y=edit.rotation*Math.PI/2;}
     const clones=new Map();if(!edit.demo)ghost.traverse(o=>{if(o.isMesh){if(!clones.has(o.material)){const material=o.material.clone();material.transparent=true;material.opacity=edit.lifted?0.78:0.55;material.depthWrite=false;clones.set(o.material,material);this.previewOwnedMaterials.add(material);}o.material=clones.get(o.material);o.castShadow=false;}});ghost.position.y=edit.demo?(edit.demoPlaced?0:10):(edit.lifted?18:8);g.add(ghost);
    }
    this.scene.add(g);
   }
  }
  if(this.preview&&edit?.point){this.preview.position.set(edit.point.x,terrainHeight(edit.point.x,edit.point.y),edit.point.y);const color=edit.valid?'#69c27e':'#e26854';this.previewFill.color.set(color);this.previewOutline.color.set(color);}
 }

 updateView(){const c=this.camera;this.view.left=-c.width/(2*c.zoom);this.view.right=-this.view.left;this.view.top=c.height/(2*c.zoom);this.view.bottom=-this.view.top;this.view.updateProjectionMatrix();const distance=3000;this.view.position.set(c.x+Math.sin(c.yaw)*Math.cos(c.tilt)*distance,Math.sin(c.tilt)*distance,c.y+Math.cos(c.yaw)*Math.cos(c.tilt)*distance);this.view.up.set(-Math.sin(c.yaw),0,-Math.cos(c.yaw));this.view.lookAt(c.x,0,c.y);this.view.updateMatrixWorld();}
 pickBuilding(groundPoint){const hit=this.hitObject(groundPoint);for(let o=hit?.object;o;o=o.parent)if(Number.isInteger(o.userData.buildingId))return o.userData.buildingId;return null;}
 hitObject(groundPoint){this.updateView();this.cropLayer.updateMatrixWorld(true);this.farmLayer.updateMatrixWorld(true);this.animalLayer?.updateMatrixWorld(true);this.pondok?.updateMatrixWorld(true);const p=this.camera.worldToScreen(groundPoint.x,groundPoint.y);this.raycaster??=new THREE.Raycaster();this.raycaster.setFromCamera(new THREE.Vector2(p.x/this.camera.width*2-1,1-p.y/this.camera.height*2),this.view);return this.raycaster.intersectObjects([...this.cropLayer.children,...this.farmLayer.children,...(this.animalLayer?.children||[]),this.pondok].filter(Boolean),true)[0];}
 pickPlot(groundPoint){if(this.lost)return null;this.updateView();this.cropLayer.updateMatrixWorld(true);this.farmLayer.updateMatrixWorld(true);this.animalLayer?.updateMatrixWorld(true);this.pondok?.updateMatrixWorld(true);const p=this.camera.worldToScreen(groundPoint.x,groundPoint.y);this.raycaster??=new THREE.Raycaster();this.raycaster.setFromCamera(new THREE.Vector2(p.x/this.camera.width*2-1,1-p.y/this.camera.height*2),this.view);const hit=this.raycaster.intersectObjects([...this.cropLayer.children,...this.farmLayer.children,...(this.animalLayer?.children||[]),this.pondok].filter(Boolean),true)[0];if(!hit)return null;for(let o=hit.object;o;o=o.parent){if(Number.isInteger(o.userData.plotId))return o.userData.plotId;if(o.userData.building)return -1;}return null;}
 draw(farm,options){const tick=performance.now(),frameTime=renderFrameTime(tick,this.lastFrame,this.quality);if(frameTime===null||document.hidden)return;this.lastFrame=frameTime;if(this.lost)return;const c=this.camera;if(this.width!==c.width||this.height!==c.height){this.width=c.width;this.height=c.height;this.webgl.setPixelRatio(renderScale(this.quality,c.width,c.height,devicePixelRatio||1,this.maxBuffer));this.webgl.setSize(c.width,c.height,false);const readout=document.getElementById('graphicsReadout');if(readout)readout.textContent=harvestT_farm_3d_js('Render 3D: ')+this.canvas.width+' × '+this.canvas.height+harvestT_farm_3d_js(' piksel · ')+(this.quality==='ultra'?harvestT_farm_3d_js('Tekstur hingga 4K'):harvestT_farm_3d_js('Kualitas ')+this.quality);}this.updateView();this.syncFarm(farm,options.now);this.syncAnimals(farm,options.now);this.animateAnimals(tick/1000);this.updateSelection(farm,options);this.labelsFor(farm,options);this.animateEnvironment(tick/1000);this.applyPreviewAmbience(Boolean(options.placement?.demo&&options.placement.dusk));if(!options.placement?.demo){this.previewLighting=null;this.updateDaylight(options.lightingNow??options.now);}this.animateConservatory(tick/1000);this.residents?.update(farm,options.now,tick,{...options,motion:this.wind});if((this.catalogueDirty||!Object.keys(this.catalogue).length)&&tick>1800&&tick-(this.lastCatalogue||0)>850&&!this.lost){this.catalogueDirty=false;this.lastCatalogue=tick;this.makeCatalogue();}this.webgl.render(this.scene,this.view);}
 mini(canvas,farm){const tick=performance.now();if(tick-this.lastMini<200)return;this.lastMini=tick;const c=canvas.getContext('2d'),sx=canvas.width/3200,sy=canvas.height/2200;c.setTransform(sx,0,0,sy,0,0);c.fillStyle='#819168';c.fillRect(0,0,3200,2200);c.strokeStyle='#648e8c';c.lineWidth=190;c.beginPath();for(let y=0;y<=2200;y+=40){const x=640+110*Math.sin(y/270);y?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();c.fillStyle='#4b6548';for(const[x,y,size]of WORLD_DATA.trees){c.beginPath();c.arc(x,y,size,0,TAU);c.fill();}for(const p of farm.s.plots.slice(0,farm.unlocked)){c.fillStyle=farm.s.plots[p.id].crop?'#b4bc77':'#bb9870';c.fillRect(p.x-27,p.y-27,54,54);}c.fillStyle='#dad0ae';c.fillRect(1545,827,96,86);for(const b of farm.s.buildings)c.fillRect(b.x-40,b.y-35,80,70);c.strokeStyle='#f5dfa0';c.lineWidth=13;c.beginPath();this.camera.corners.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.stroke();}
}

function create(canvas){let preference='auto';try{preference=localStorage.getItem('6xg:graphics')||'auto';}catch{}const mobile=matchMedia('(max-width: 800px)').matches,quality=['ultra','high','low'].includes(preference)?preference:mobile?'low':'ultra';let supported=false;try{const probe=document.createElement('canvas'),context=probe.getContext('webgl2');supported=Boolean(context);context?.getExtension('WEBGL_lose_context')?.loseContext();}catch{}
 if(preference!=='2d'&&supported){try{const camera=new FarmCamera(),renderer=new FarmRenderer3D(canvas,camera,quality);return{camera,renderer};}catch(error){console.warn('3D graphics unavailable; starting 2D view.',error);const replacement=canvas.cloneNode(true);canvas.replaceWith(replacement);canvas=replacement;}}
 const camera=new MapCamera(),renderer=new FarmRenderer(canvas,camera);renderer.mode='2d';document.getElementById('rotateLeft').hidden=true;document.getElementById('rotateRight').hidden=true;return{camera,renderer};
}
window.Farm3D={create};
