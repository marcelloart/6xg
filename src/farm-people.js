import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';

const ASSETS=typeof FARM_PEOPLE_URLS==='undefined'?{}:FARM_PEOPLE_URLS;
const TYPES=['gardener','neighbor','builder'];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const turn=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const limits={left:1040,right:2170,top:700,bottom:1720};
const trees=[[1408,867],[1788,859],[1050,910],[1108,1650],[2130,870],[2180,1570]];

/** Navigation is visual only. It never writes to a player's farm or inventory. */
export class FarmPeopleNavigation {
 constructor(footprints){this.footprints=footprints;this.step=14;this.columns=Math.floor((limits.right-limits.left)/this.step)+1;this.rows=Math.floor((limits.bottom-limits.top)/this.step)+1;this.blocks=[];this.signature='';}
 update(farm,now){const plots=farm.s.plots.slice(0,farm.unlocked),buildings=farm.s.buildings;
  const signature=JSON.stringify([plots.map(p=>[p.id,p.x,p.y,p.crop]),buildings.map(b=>[b.slot,b.kind,b.x,b.y,b.rotation,b.readyAt<=now])]);if(signature===this.signature)return false;this.signature=signature;
  this.blocks=[{x:1593,y:872,w:154,h:130},...trees.map(([x,y])=>({x,y,w:36,h:36})),...plots.map(p=>({x:p.x,y:p.y,w:76,h:76})),...buildings.map(b=>{let [w,h]=this.footprints[b.kind]||[130,116];if(b.rotation%2)[w,h]=[h,w];return{x:b.x,y:b.y,w:w+18,h:h+18};})];
  this.free=new Uint8Array(this.columns*this.rows);for(let id=0;id<this.free.length;id++)this.free[id]=Number(this.open(this.point(id)));return true;
 }
 open(p){return p.x>=limits.left&&p.x<=limits.right&&p.y>=limits.top&&p.y<=limits.bottom&&!this.blocks.some(b=>Math.abs(p.x-b.x)<b.w/2&&Math.abs(p.y-b.y)<b.h/2);}
 point(id){return{x:limits.left+(id%this.columns)*this.step,y:limits.top+Math.floor(id/this.columns)*this.step};}
 nearest(p){let best=-1,d=Infinity;for(let i=0;i<this.free.length;i++){if(!this.free[i])continue;const q=this.point(i),next=(p.x-q.x)**2+(p.y-q.y)**2;if(next<d){d=next;best=i;}}return best;}
 clear(a,b){const count=Math.max(1,Math.ceil(distance(a,b)/4));for(let i=0;i<=count;i++){const f=i/count;if(!this.open({x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f}))return false;}return true;}
 route(start,target){if(!this.free)return[];const from=this.nearest(start),to=this.nearest(target);if(from<0||to<0)return[];const cost=new Float32Array(this.free.length).fill(Infinity),parent=new Int32Array(this.free.length).fill(-1),closed=new Uint8Array(this.free.length),frontier=[from];cost[from]=0;
  const heuristic=id=>distance(this.point(id),this.point(to));
  while(frontier.length){let best=0;for(let i=1;i<frontier.length;i++)if(cost[frontier[i]]+heuristic(frontier[i])<cost[frontier[best]]+heuristic(frontier[best]))best=i;const id=frontier.splice(best,1)[0];if(id===to){const path=[];for(let n=to;n!==from;n=parent[n])path.unshift(this.point(n));if(this.clear(path.at(-1)||start,target))path.push({...target});return path;}closed[id]=1;
   const x=id%this.columns,y=Math.floor(id/this.columns);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const nx=x+dx,ny=y+dy,n=ny*this.columns+nx;if(nx<0||ny<0||nx>=this.columns||ny>=this.rows||!this.free[n]||closed[n]||dx&&dy&&(!this.free[y*this.columns+nx]||!this.free[ny*this.columns+x]))continue;const score=cost[id]+this.step*Math.hypot(dx,dy);if(score<cost[n]){cost[n]=score;parent[n]=id;if(!frontier.includes(n))frontier.push(n);}}
  }return[];
 }
}

export async function loadPerson(type){
 const manager=new THREE.LoadingManager();manager.setURLModifier(url=>{const name=new URL(url,location.href).pathname.split('/').pop();return ASSETS[name]||url;});
 const gltf=await new GLTFLoader(manager).loadAsync(ASSETS[type+'.gltf']||'./assets/people/'+type+'.gltf');
 const model=gltf.scene;model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model);model.userData.height=box.max.y-box.min.y;model.userData.ground=box.min.y;
 model.traverse(o=>{if(o.isMesh){o.geometry.userData.cc0Shared=true;o.castShadow=o.receiveShadow=true;o.frustumCulled=false;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.envMapIntensity=.3;m.roughness=.86;}}});
 return{model,clips:gltf.animations};
}

export function createPerson(asset,height=38){
 const root=new THREE.Group(),model=cloneSkeleton(asset.model);const scale=height/asset.model.userData.height;model.scale.setScalar(scale);model.position.y=-asset.model.userData.ground*scale;root.add(model);
 const mixer=new THREE.AnimationMixer(model),actions=Object.fromEntries(asset.clips.map(c=>[c.name,mixer.clipAction(c)]));actions.idle.play();mixer.update(.01);
 return{root,model,mixer,actions,mode:'idle',path:[],wait:0,task:null};
}

export class FarmPeople {
 constructor(scene,quality,heightAt,footprints){this.layer=new THREE.Group();this.layer.name='farm-residents';scene.add(this.layer);this.quality=quality;this.heightAt=heightAt;this.navigation=new FarmPeopleNavigation(footprints);this.people=[];this.assets={};this.clock=0;this.lastTick=null;this.pending=[];
  // A small shared set of detailed skinned meshes keeps mobile memory bounded.
  this.ready=Promise.allSettled(TYPES.map(async type=>{this.assets[type]=await loadPerson(type);})).then(()=>{const mobile=typeof matchMedia!=='undefined'&&matchMedia('(max-width: 800px)').matches;const count=mobile||quality==='low'?3:7;for(let i=0;i<count;i++){const type=TYPES[i%TYPES.length],asset=this.assets[type];if(!asset)continue;const person=createPerson(asset,36+(i%3)*1.4);Object.assign(person,{id:i,type,cycle:i,wait:i*.8,speed:19+(i%3)*1.2});person.root.position.set(1485+i*22,this.heightAt(1485+i*22,976),976);person.root.rotation.y=Math.PI;this.layer.add(person.root);this.people.push(person);}});
 }
 setAction(person,name){if(person.mode===name)return;const next=person.actions[name]||person.actions.idle,old=person.actions[person.mode];next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();old?.crossFadeTo(next,.3,true);person.mode=name;}
 tasks(farm,now,person){const tasks=[];
  for(const p of farm.s.plots.slice(0,farm.unlocked)){for(const [dx,dy]of [[0,45],[45,0],[0,-45],[-45,0]]){const point={x:p.x+dx,y:p.y+dy};if(this.navigation.open(point))tasks.push({...point,face:{x:p.x,y:p.y},mode:p.crop?'tend':'work',key:'plot:'+p.id});}}
  for(const b of farm.s.buildings){let [w,h]=this.navigation.footprints[b.kind]||[130,116];if(b.rotation%2)[w,h]=[h,w];const unfinished=b.readyAt>now;for(const [dx,dy]of [[0,h/2+22],[w/2+22,0],[0,-h/2-22],[-w/2-22,0]]){const point={x:b.x+dx,y:b.y+dy};if(this.navigation.open(point))tasks.push({...point,face:{x:b.x,y:b.y},mode:unfinished?'work':person.type==='neighbor'?'idle':'work',key:'building:'+b.slot,construction:unfinished});}}
  const priority=person.type==='builder'?tasks.filter(t=>t.construction):tasks.filter(t=>t.key.startsWith('plot:'));const preferred=priority.length?priority:tasks;if(person.type==='builder'&&priority.length)return priority;
  return[...preferred,...[{x:1490,y:969,face:{x:1593,y:930},mode:'idle',key:'home'},{x:1720,y:1280,face:{x:1610,y:1170},mode:'idle',key:'walk'},{x:1360,y:1260,face:{x:1500,y:1140},mode:'idle',key:'walk-west'}].filter(t=>this.navigation.open(t))];
 }
 chooseTask(person,farm,now){const tasks=this.tasks(farm,now,person);if(!tasks.length){person.wait=3;return;}const current={x:person.root.position.x,y:person.root.position.z};person.cycle++;
  for(let i=0;i<tasks.length;i++){const task=tasks[(person.id*7+person.cycle*5+i)%tasks.length];if(distance(current,task)<28||this.people.some(other=>other!==person&&other.task&&distance(other.task,task)<22))continue;const path=this.navigation.route(current,task);if(!path.length)continue;person.task=task;person.path=path;this.setAction(person,'walk');return;}person.wait=2;this.setAction(person,'idle');
 }
 update(farm,now,tick,options={}){const delta=this.lastTick===null?0:Math.min(.08,Math.max(0,(tick-this.lastTick)/1000));this.lastTick=tick;this.clock+=delta;if(!this.people.length)return;
  const changed=this.navigation.update(farm,now);if(changed){for(const p of this.people){const point={x:p.root.position.x,y:p.root.position.z};if(!this.navigation.open(point)){const nearest=this.navigation.nearest(point);if(nearest>=0){const safe=this.navigation.point(nearest);p.root.position.set(safe.x,this.heightAt(safe.x,safe.y),safe.y);}}p.path=[];p.task=null;p.wait=.3+p.id*.3;this.setAction(p,'idle');}}
  for(const person of this.people){const p=person.root.position;person.root.visible=!(options.placement?.demo);if(options.motion===false)continue;if(person.path.length){const target=person.path[0],dx=target.x-p.x,dz=target.y-p.z,length=Math.hypot(dx,dz),travel=Math.min(length,person.speed*delta),next={x:p.x+(length?dx/length*travel:0),y:p.z+(length?dz/length*travel:0)};
    const yielding=this.people.some(other=>other!==person&&other.id<person.id&&distance(next,{x:other.root.position.x,y:other.root.position.z})<12&&distance(next,{x:other.root.position.x,y:other.root.position.z})<distance({x:p.x,y:p.z},{x:other.root.position.x,y:other.root.position.z}));
    if(!yielding){p.x=next.x;p.z=next.y;if(length<1||travel>=length)person.path.shift();person.root.rotation.y+=turn(person.root.rotation.y,Math.atan2(dx,dz))*Math.min(1,delta*8);person.actions.walk.setEffectiveTimeScale(person.speed/19);}else this.setAction(person,'idle');
    if(!yielding&&person.path.length)this.setAction(person,'walk');if(!person.path.length){const task=person.task;this.setAction(person,task?.mode||'idle');person.wait=task?.mode==='idle'?3+person.id%3:7+(person.id%3)*3;}
   }else{if(person.task){person.root.rotation.y+=turn(person.root.rotation.y,Math.atan2(person.task.face.x-p.x,person.task.face.y-p.z))*Math.min(1,delta*6);}person.wait-=delta;if(person.wait<=0)this.chooseTask(person,farm,now);}
   p.y=this.heightAt(p.x,p.z);person.mixer.update(delta);
  }
 }
 dispose(){for(const p of this.people){p.mixer.stopAllAction();p.mixer.uncacheRoot(p.model);}this.layer.removeFromParent();for(const a of Object.values(this.assets)){const geometries=new Set(),materials=new Set(),textures=new Set();a.model.traverse(o=>{if(!o.isMesh)return;geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const t of Object.values(m))if(t?.isTexture)textures.add(t);}});for(const t of textures)t.dispose();for(const m of materials)m.dispose();for(const g of geometries)g.dispose();}this.people=[];}
}
