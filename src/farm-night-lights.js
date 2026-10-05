import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {bridgeBounds,riverCenter} from './farm-visuals.js';

const smooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
// The same Jakarta daylight value drives windows, lanterns and local illumination.
export const lanternPower=daylight=>smooth((1-daylight-.12)/.75);

export function lanternSites(farm,now,rules,heightAt){
 const bridge=bridgeBounds(),plots=farm.s.plots.slice(0,farm.unlocked);
 const occupied=[...plots.map(p=>({...p,...rules.footprint('plot')})),...farm.s.buildings.map(b=>({...b,...rules.footprint(b.kind,b.rotation)})),{x:1593,y:872,w:130,h:116}];
 const sites=[],free=(x,z)=>x>25&&x<3175&&z>25&&z<2175&&Math.abs(x-riverCenter(z))>117&&!occupied.some(b=>Math.abs(x-b.x)<b.w/2+12&&Math.abs(z-b.y)<b.h/2+12)&&!sites.some(s=>Math.hypot(x-s.x,z-s.z)<42);
 const place=(id,x,z,owner=null)=>{
  for(const radius of[0,24,48,76])for(let i=0;i<(radius?8:1);i++){
   const xx=x+Math.sin(i*Math.PI/4)*radius,zz=z+Math.cos(i*Math.PI/4)*radius;
   if(free(xx,zz)){sites.push({id,x:xx,z:zz,y:heightAt(xx,zz),owner});return;}
  }
 };
 // Purchased lanterns keep their exact saved position; nearby ambient fixtures move aside.
 for(const b of farm.s.buildings)if(b.kind==='lamp'&&b.readyAt<=now)sites.push({id:'building:'+b.slot,x:b.x,z:b.y,y:heightAt(b.x,b.y),owner:b.slot,fixture:true});
 for(const[id,x,z]of[
  ['home-west',1510,969],['home-east',1676,969],
  ['bridge-west',bridge.left-53,bridge.z+58],['bridge-east',bridge.right+53,bridge.z+58],
  ['path-west',918,1450],['path-southwest',1020,1853],['path-south',1630,1853],['path-east',2358,1788],
 ])place(id,x,z);
 if(plots.length){
  const left=Math.min(...plots.map(p=>p.x))-65,right=Math.max(...plots.map(p=>p.x))+65;
  const north=Math.min(...plots.map(p=>p.y))-65,south=Math.max(...plots.map(p=>p.y))+65;
  for(const[id,x,z]of[['garden-nw',left,north],['garden-ne',right,north],['garden-sw',left,south],['garden-se',right,south]])place(id,x,z);
 }
 for(const b of farm.s.buildings){
  if(b.readyAt>now||['planter','bench','lamp'].includes(b.kind))continue;
  if(b.kind==='pier'){
   // The pier's standing lantern uses the actual deck, on either riverbank.
   const a=(b.rotation||0)*Math.PI/2,dx=-80,dz=-27;
   sites.push({id:'building:'+b.slot,x:b.x+dx*Math.cos(a)+dz*Math.sin(a),z:b.y-dx*Math.sin(a)+dz*Math.cos(a),y:heightAt(b.x,b.y)+17,owner:b.slot,pier:true});
  }else{
   const size=rules.footprint(b.kind,0),a=(b.rotation||0)*Math.PI/2,dz=size.h/2+36;
   place('building:'+b.slot,b.x+Math.sin(a)*dz,b.y+Math.cos(a)*dz,b.slot);
  }
 }
 return sites;
}

function lanternFrame(){
 const parts=[];
 const part=(geometry,x,y,z,sx=1,sy=sx,sz=sx)=>{const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion(),new THREE.Vector3(sx,sy,sz));let g=geometry.toNonIndexed();geometry.dispose();g.applyMatrix4(matrix);parts.push(g);};
 part(new THREE.CylinderGeometry(9,11,5,12),0,2.5,0);
 part(new THREE.CylinderGeometry(1.5,2.3,57,12),0,33.5,0);
 part(new THREE.CylinderGeometry(6.5,7.5,3,12),0,62,0);
 for(const x of[-4.5,4.5])for(const z of[-4.5,4.5])part(new THREE.CylinderGeometry(.65,.65,16,6),x,71,z);
 part(new THREE.CylinderGeometry(7.5,6.5,2,12),0,79,0);
 part(new THREE.ConeGeometry(9,7,12),0,83.5,0);
 part(new THREE.SphereGeometry(1.6,8,6),0,88,0);
 const geometry=mergeGeometries(parts,false);for(const p of parts)p.dispose();return geometry;
}

function glowTexture(){
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const radius=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2)),i=(y*size+x)*4;
  data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(255*Math.pow(Math.max(0,1-radius),3));
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.needsUpdate=true;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;return texture;
}

export class FarmNightLights{
 constructor(scene,quality,heightAt,rules){
  this.scene=scene;this.heightAt=heightAt;this.rules=rules;this.sites=[];this.previousTick=null;this.power=0;this.signature='';this.temp=new THREE.Object3D();
  this.group=new THREE.Group();this.group.name='Farm lanterns';scene.add(this.group);
  const capacity=rules.MAX_BUILDINGS+16;
  this.frameMaterial=new THREE.MeshStandardMaterial({color:'#39453f',roughness:.65,metalness:.55});
  this.bulbMaterial=new THREE.MeshStandardMaterial({color:'#fff0d1',emissive:'#ffbb64',emissiveIntensity:0,roughness:.35});
  this.texture=glowTexture();
  this.haloMaterial=new THREE.MeshBasicMaterial({color:'#ffe1a2',map:this.texture,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  this.groundMaterial=new THREE.MeshBasicMaterial({color:'#ffc879',map:this.texture,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,toneMapped:false});
  this.frames=new THREE.InstancedMesh(lanternFrame(),this.frameMaterial,capacity);
  this.bulbs=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,8),this.bulbMaterial,capacity);
  this.halos=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),this.haloMaterial,capacity);
  this.pools=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1,12,12),this.groundMaterial,capacity);
  // Light pools conform to uneven ground; buildings still receive real point lights.
  this.pools.material.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vec4 world=(modelMatrix*instanceMatrix)*vec4(transformed,1.);
    float edge=max(max(abs(world.x-1600.)-570.,abs(world.z-1170.)-580.),0.);
    float river=640.+110.*sin(world.z/270.);
    float blend=min(1.,edge/200.)*min(1.,max(0.,abs(world.x-river)-130.)/170.);
    float ground=blend*(16.+13.*sin(world.x/330.)*cos(world.z/285.)+8.*sin((world.x+world.z)/180.));
    float base=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).y;
    transformed.z+=ground-base+.85;`);
  };
  this.pools.material.customProgramCacheKey=()=> 'farm-lantern-ground-1';
  for(const batch of[this.frames,this.bulbs,this.halos,this.pools]){batch.count=0;batch.frustumCulled=false;batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.group.add(batch);}
  this.lights=Array.from({length:quality==='low'?2:quality==='ultra'?6:4},()=>{
   const light=new THREE.PointLight('#ffd193',0,240,2);light.castShadow=false;scene.add(light);return{light,id:null,desired:null,gain:0};
  });
 }
 sync(farm,now){
  const signature=farm.unlocked+'|'+farm.s.plots.slice(0,farm.unlocked).map(p=>p.x+':'+p.y).join(',')+'|'+farm.s.buildings.map(b=>[b.slot,b.kind,b.x,b.y,b.rotation,b.readyAt<=now].join(':')).join(',');
  if(signature===this.signature)return;this.signature=signature;
  this.sites=lanternSites(farm,now,this.rules,this.heightAt);
 }
 update(farm,now,tick,daylight,view,options={}){
  this.sync(farm,now);
  const dt=this.previousTick===null?0:Math.min(.08,Math.max(0,(tick-this.previousTick)/1000));this.previousTick=tick;
  this.power=lanternPower(daylight?.daylight??1);
  this.bulbMaterial.emissiveIntensity=this.power*2.2;
  this.haloMaterial.opacity=this.power*.56;this.groundMaterial.opacity=this.power*.32;
  const sites=this.sites.filter(s=>!(options.placement?.point&&s.owner!==null&&s.owner===options.placement.moveBuilding));
  if(options.placement?.kind==='lamp'&&options.placement.point&&options.placement.valid){const p=options.placement.point;sites.push({id:'lamp-preview',x:p.x,z:p.y,y:this.heightAt(p.x,p.y),owner:null,fixture:true});}
  for(let i=0;i<sites.length;i++){
   const s=sites[i],t=this.temp,bulbHeight=s.pier?20:71;
   // A pier already has a lantern model; illuminate it without duplicating it.
   t.position.set(s.x,s.y,s.z);t.rotation.set(0,0,0);t.scale.setScalar(s.pier||s.fixture?0:1);t.updateMatrix();this.frames.setMatrixAt(i,t.matrix);
   t.position.y=s.y+bulbHeight;t.scale.set(3.2,5.5,3.2);t.updateMatrix();this.bulbs.setMatrixAt(i,t.matrix);
   t.quaternion.copy(view.quaternion);t.scale.setScalar(s.pier?18:24);t.updateMatrix();this.halos.setMatrixAt(i,t.matrix);
  }
  this.frames.count=this.bulbs.count=this.halos.count=sites.length;
  // Deck light pools must not be projected into the river. Real lights illuminate it.
  let n=0;for(const s of sites)if(!s.pier){const t=this.temp;t.position.set(s.x,s.y+.8,s.z);t.rotation.set(-Math.PI/2,0,0);t.scale.set(215,215,1);t.updateMatrix();this.pools.setMatrixAt(n++,t.matrix);}this.pools.count=n;
  for(const batch of[this.frames,this.bulbs,this.halos,this.pools])batch.instanceMatrix.needsUpdate=true;
  this.halos.visible=this.pools.visible=this.power>.001;
  const cameraPosition=new THREE.Vector3();view.getWorldDirection(cameraPosition);
  const target=new THREE.Vector3(view.position.x,0,view.position.z);if(Math.abs(cameraPosition.y)>.001)target.addScaledVector(cameraPosition,-view.position.y/cameraPosition.y);
  const priority=sites.map(s=>({...s,distance:Math.hypot(s.x-target.x,s.z-target.z)})).sort((a,b)=>a.distance-b.distance);
  const selected=new Set();
  // Keep nearby assignments stable while panning; fade before moving a light.
  for(const slot of this.lights){const old=priority.find(s=>s.id===(slot.desired??slot.id)&&!selected.has(s.id)),best=priority.find(s=>!selected.has(s.id));const s=old&&best&&old.distance<best.distance+90?old:best;slot.desired=s?.id??null;if(s)selected.add(s.id);}
  for(const slot of this.lights){
   const source=sites.find(s=>s.id===slot.id),changing=slot.id!==slot.desired||!source;
   const goal=changing?0:this.power;slot.gain+=(goal-slot.gain)*(1-Math.exp(-dt*9));
   if(changing&&slot.gain<.015){slot.id=slot.desired;slot.gain=0;}
   const s=sites.find(s=>s.id===slot.id);if(s)slot.light.position.set(s.x,s.y+(s.pier?20:71),s.z);
   slot.light.intensity=s?6500*slot.gain:0;
  }
 }
 dispose(){
  this.group.removeFromParent();for(const slot of this.lights)slot.light.removeFromParent();
  for(const batch of[this.frames,this.bulbs,this.halos,this.pools])batch.geometry.dispose();
  for(const m of[this.frameMaterial,this.bulbMaterial,this.haloMaterial,this.groundMaterial])m.dispose();this.texture.dispose();
 }
}
