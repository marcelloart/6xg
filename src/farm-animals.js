import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';

const URLS=typeof FARM_ANIMAL_URLS==='undefined'?{}:FARM_ANIMAL_URLS;
export const ANIMAL_KINDS=['chicken','cow'];
export async function loadAnimal(kind){
 const manager=new THREE.LoadingManager();manager.setURLModifier(url=>URLS[new URL(url,location.href).pathname.split('/').pop()]||url);
 const gltf=await new GLTFLoader(manager).loadAsync(URLS[kind+'.gltf']||'./assets/animals/'+kind+'.gltf'),model=gltf.scene;
 model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model);model.userData.height=bounds.max.y-bounds.min.y;model.userData.ground=bounds.min.y;
 model.traverse(o=>{if(!o.isMesh)return;o.geometry.userData.cc0Shared=true;o.castShadow=o.receiveShadow=true;o.frustumCulled=false;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.envMapIntensity=.45;}});
 return{model,clips:gltf.animations,kind};
}
export function createAnimal(asset,height=asset.kind==='cow'?39:15,id=0){
 const root=new THREE.Group(),model=cloneSkeleton(asset.model),scale=height/asset.model.userData.height;
 model.scale.setScalar(scale);model.position.y=-asset.model.userData.ground*scale;root.add(model);
 const mixer=new THREE.AnimationMixer(model),actions=Object.fromEntries(asset.clips.map(c=>[c.name,mixer.clipAction(c)])),weights={};
 for(const[name,action]of Object.entries(actions)){weights[name]=name==='idle'?1:0;action.play().setEffectiveWeight(weights[name]);action.time=(id*.731)%action.getClip().duration;}
 mixer.update(0);const actor={root,model,mixer,actions,weights,kind:asset.kind,id,mode:'idle',speed:0,wait:1+(id%5)*.7,clock:0,target:null,cell:null};root.userData.actor=actor;return actor;
}
const approach=(v,target,step)=>v+Math.max(-step,Math.min(step,target-v));
export function updateAnimal(actor,delta,motion=true){
 if(!motion||!delta)return;delta=Math.max(0,Math.min(.06,delta));actor.clock+=delta;
 const p=actor.root.position,cow=actor.kind==='cow',maximum=cow?3.8:4.6,acceleration=8;
 if(actor.target){
  const dx=actor.target.x-p.x,dz=actor.target.z-p.z,distance=Math.hypot(dx,dz),heading=Math.atan2(dx,dz),angle=Math.atan2(Math.sin(heading-actor.root.rotation.y),Math.cos(heading-actor.root.rotation.y));
  actor.root.rotation.y+=Math.max(-delta*1.5,Math.min(delta*1.5,angle));
  const aligned=Math.max(0,Math.cos(angle));actor.speed=approach(actor.speed,Math.min(maximum,Math.sqrt(2*acceleration*distance))*aligned,acceleration*delta);
  const step=Math.min(distance,actor.speed*delta);if(distance){p.x+=dx/distance*step;p.z+=dz/distance*step;}
  actor.mode='walk';if(distance<.15){actor.target=null;actor.mode='eat';actor.wait=5+(actor.id%4)*1.4;}
 }else{
  actor.speed=approach(actor.speed,0,acceleration*delta);actor.wait-=delta;
  if(actor.wait<=0&&actor.cell){
   if(actor.mode==='eat'){actor.mode='idle';actor.wait=2.5+(actor.id%3);}
   else{const phase=actor.id*2.399+actor.clock*.91;actor.target={x:actor.cell.x+Math.sin(phase)*actor.cell.rx,z:actor.cell.z+Math.cos(phase)*actor.cell.rz};}
  }
 }
 const locomotion=Math.min(1,actor.speed/1.6),alpha=1-Math.exp(-delta/ .32);
 let total=0;for(const name of Object.keys(actor.actions)){const goal=actor.mode==='walk'?(name==='walk'?locomotion:name==='idle'?1-locomotion:0):Number(name===actor.mode);actor.weights[name]+=(goal-actor.weights[name])*alpha;total+=actor.weights[name];}
 for(const[name,action]of Object.entries(actor.actions)){action.setEffectiveWeight(actor.weights[name]/(total||1));action.setEffectiveTimeScale(name==='walk'?Math.max(.15,actor.speed/(cow?4.2:5.5)):name==='eat'?.7:.8);}
 actor.mixer.update(delta);actor.root.updateMatrixWorld(true);
}
export function animalCells(kind,count){
 const cow=kind==='cow',columns=Math.min(cow?3:4,Math.ceil(Math.sqrt(count))),rows=Math.ceil(count/columns),width=cow?103:85,depth=cow?63:68;
 return Array.from({length:count},(_,i)=>{const w=width/columns,d=depth/rows;return{x:-width/2+w*(i%columns+.5),z:-4+d*(Math.floor(i/columns)+.5),rx:Math.max(1,w*.14),rz:Math.max(1,d*.13),height:cow?Math.min(39,d/.94,w/.5):Math.min(16,d*1.2,w*.95)};});
}
export class FarmAnimalAssets{
 constructor(onReady=()=>{}){this.assets={};this.revision=0;this.ready=Promise.allSettled(ANIMAL_KINDS.map(async kind=>{this.assets[kind]=await loadAnimal(kind);this.revision++;onReady();}));}
 create(kind,height,id=0){const asset=this.assets[kind];return asset?createAnimal(asset,height,id):null;}
}
