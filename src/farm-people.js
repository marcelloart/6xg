import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {createGait,updateGait} from './farm-gait.js';

const ASSETS=typeof FARM_PEOPLE_URLS==='undefined'?{}:FARM_PEOPLE_URLS;
export const RESIDENT_TYPES=Object.freeze(['gardener','neighbor','builder']);
const TYPES=RESIDENT_TYPES;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const turn=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export const walkingSpeed=id=>11.5+(id%3)*.5;
const approach=(value,target,amount)=>value+Math.max(-amount,Math.min(amount,target-value));
class Frontier {
 constructor(){this.items=[];}
 push(id,score){const item={id,score},list=this.items;let i=list.length;list.push(item);while(i){const parent=(i-1)>>1;if(list[parent].score<=score)break;list[i]=list[parent];i=parent;}list[i]=item;}
 pop(){const list=this.items,first=list[0],last=list.pop();if(list.length){let i=0;while(i*2+1<list.length){let child=i*2+1;if(child+1<list.length&&list[child+1].score<list[child].score)child++;if(last.score<=list[child].score)break;list[i]=list[child];i=child;}list[i]=last;}return first.id;}
 get length(){return this.items.length;}
}
const limits={left:20,right:3180,top:20,bottom:2180};
const trees=[[1408,867],[1788,859],[1050,910],[1108,1650],[2130,870],[2180,1570]];

/** Navigation is visual only. It never writes to a player's farm or inventory. */
export class FarmPeopleNavigation {
 constructor(footprints){this.footprints=footprints;this.step=16;this.columns=Math.floor((limits.right-limits.left)/this.step)+1;this.rows=Math.floor((limits.bottom-limits.top)/this.step)+1;this.blocks=[];this.signature='';}
 update(farm,now){const plots=farm.s.plots.slice(0,farm.unlocked),buildings=farm.s.buildings;
  const signature=JSON.stringify([plots.map(p=>[p.id,p.x,p.y]),buildings.map(b=>[b.slot,b.kind,b.x,b.y,b.rotation])]);if(signature===this.signature)return false;this.signature=signature;
  this.blocks=[{x:1593,y:872,w:154,h:130},...trees.map(([x,y])=>({x,y,w:36,h:36})),...plots.map(p=>({x:p.x,y:p.y,w:60,h:60})),...buildings.map(b=>{let [w,h]=this.footprints[b.kind]||[130,116];if(b.rotation%2)[w,h]=[h,w];return{x:b.x,y:b.y,w:w+18,h:h+18};})];
  this.free=new Uint8Array(this.columns*this.rows);for(let id=0;id<this.free.length;id++)this.free[id]=Number(this.open(this.point(id)));return true;
 }
 open(p){const river=640+110*Math.sin(p.y/270),bridge=Math.abs(p.y-1115)<25&&p.x>375&&p.x<795;return p.x>=limits.left&&p.x<=limits.right&&p.y>=limits.top&&p.y<=limits.bottom&&(Math.abs(p.x-river)>118||bridge)&&!this.blocks.some(b=>Math.abs(p.x-b.x)<b.w/2&&Math.abs(p.y-b.y)<b.h/2);}
 point(id){return{x:limits.left+(id%this.columns)*this.step,y:limits.top+Math.floor(id/this.columns)*this.step};}
 nearest(p,visible=false){let best=-1,d=Infinity;const candidates=[];for(let i=0;i<this.free.length;i++){if(!this.free[i])continue;const q=this.point(i),next=(p.x-q.x)**2+(p.y-q.y)**2;if(next<d){d=next;best=i;}if(visible)candidates.push([next,i]);}if(!visible||best<0||this.clear(p,this.point(best)))return best;candidates.sort((a,b)=>a[0]-b[0]);return candidates.find(([,id])=>this.clear(p,this.point(id)))?.[1]??-1;}
 clear(a,b){const count=Math.max(1,Math.ceil(distance(a,b)/4));for(let i=0;i<=count;i++){const f=i/count;if(!this.open({x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f}))return false;}return true;}
 smooth(start,path){const route=[];let point=start,index=0;while(index<path.length){let next=path.length-1;while(next>index&&!this.clear(point,path[next]))next--;if(!this.clear(point,path[next]))return[];route.push(path[next]);point=path[next];index=next+1;}return route;}
 route(start,target,avoid=[]){if(!this.free)return[];if(avoid.length){const nav=Object.create(FarmPeopleNavigation.prototype);Object.assign(nav,this,{blocks:[...this.blocks,...avoid.map(p=>({x:p.x,y:p.y,w:28,h:28}))],free:this.free.slice()});for(let id=0;id<nav.free.length;id++)if(nav.free[id]&&!nav.open(nav.point(id)))nav.free[id]=0;return nav.route(start,target);}const from=this.nearest(start,true),to=this.nearest(target);if(from<0||to<0)return[];const cost=new Float64Array(this.free.length).fill(Infinity),parent=new Int32Array(this.free.length).fill(-1),closed=new Uint8Array(this.free.length),frontier=new Frontier();cost[from]=0;
  const tx=to%this.columns,ty=Math.floor(to/this.columns),heuristic=id=>this.step*Math.hypot(id%this.columns-tx,Math.floor(id/this.columns)-ty);frontier.push(from,heuristic(from));
  while(frontier.length){const id=frontier.pop();if(closed[id])continue;if(id===to){const path=[];for(let n=to;n!==from;n=parent[n])path.unshift(this.point(n));if(this.clear(path.at(-1)||start,target))path.push({...target});if(path.length&&!this.clear(start,path[0]))path.unshift(this.point(from));return this.smooth(start,path);}closed[id]=1;
   const x=id%this.columns,y=Math.floor(id/this.columns);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const nx=x+dx,ny=y+dy,n=ny*this.columns+nx;if(nx<0||ny<0||nx>=this.columns||ny>=this.rows||!this.free[n]||closed[n]||dx&&dy&&(!this.free[y*this.columns+nx]||!this.free[ny*this.columns+x]))continue;const score=cost[id]+this.step*Math.hypot(dx,dy);if(score<cost[n]){cost[n]=score;parent[n]=id;frontier.push(n,score+heuristic(n));}}
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
 const mixer=new THREE.AnimationMixer(model),actions=Object.fromEntries(asset.clips.map(c=>[c.name,mixer.clipAction(c)])),animationWeights={},animationVelocity={};for(const [name,action]of Object.entries(actions)){animationWeights[name]=name==='idle'?1:0;animationVelocity[name]=0;action.setEffectiveWeight(animationWeights[name]);action.enabled=name==='idle';}actions.idle.play();mixer.update(.01);
 const pose=[];model.traverse(bone=>{if(bone.isBone)pose.push({bone,rotation:bone.quaternion.clone(),displayRotation:bone.quaternion.clone()});});
 return{root,model,mixer,actions,animationWeights,animationVelocity,pose,gait:createGait(root,model),walkStrideSpeed:(asset.model.userData.walkSpeed||140.2373)*scale,walkRate:.72,turnSpeed:0,mode:'idle',path:[],wait:0,task:null,currentSpeed:0,yieldTime:0};
}

export class FarmPeople {
 constructor(scene,quality,heightAt,footprints){this.layer=new THREE.Group();this.layer.name='farm-residents';scene.add(this.layer);this.quality=quality;this.heightAt=heightAt;this.navigation=new FarmPeopleNavigation(footprints);this.people=[];this.assets={};this.clock=0;this.lastTick=null;this.pending=[];
  // A small shared set of detailed skinned meshes keeps mobile memory bounded.
  this.ready=Promise.allSettled(TYPES.map(async type=>{this.assets[type]=await loadPerson(type);})).then(()=>{for(let i=0;i<TYPES.length;i++){const type=TYPES[i],asset=this.assets[type];if(!asset)continue;const person=createPerson(asset,36+(i%3)*1.4);Object.assign(person,{id:i,type,cycle:i,wait:i*.8,speed:walkingSpeed(i)});person.root.position.set(1485+i*22,this.heightAt(1485+i*22,964),964);person.root.rotation.y=Math.PI;this.layer.add(person.root);this.people.push(person);}});
 }
 setAction(person,name){if(!person.actions[name])name='idle';if(person.mode===name)return;const next=person.actions[name];if((person.animationWeights[name]||0)<.0001&&name!=='walk')next.reset();next.stopFading().stopWarping().play();person.mode=name;}
 faceDirection(person,heading,delta){const angle=turn(person.root.rotation.y,heading),target=Math.sign(angle)*Math.min(2.4,Math.sqrt(12*Math.abs(angle)));person.turnSpeed=approach(person.turnSpeed,target,6*delta);let step=person.turnSpeed*delta;if(Math.sign(step)===Math.sign(angle)&&Math.abs(step)>Math.abs(angle)){step=angle;person.turnSpeed=0;}person.root.rotation.y+=step;}
 updateAnimation(person,delta){
  // A new target starts from the current mixture, even when a previous transition is interrupted.
  // Restarting Three's fade clocks restores old weights and causes a visible one-frame pose jump.
  const weights=person.animationWeights,velocities=person.animationVelocity,omega=10,decay=Math.exp(-omega*delta);let sum=0;
  const movement=Math.min(1,Math.max(0,person.currentSpeed/4)),locomotion=movement*movement*(3-2*movement);
  for(const name of Object.keys(person.actions)){const target=person.mode==='walk'?(name==='walk'?locomotion:name==='idle'?1-locomotion:0):Number(name===person.mode),error=weights[name]-target,change=(velocities[name]+omega*error)*delta;const next=target+(error+change)*decay;weights[name]=Math.max(0,Math.min(1,next));velocities[name]=next===weights[name]?(velocities[name]-omega*change)*decay:0;sum+=weights[name];}
  person.walkRate+=(Math.max(.72,person.currentSpeed/person.walkStrideSpeed)-person.walkRate)*(1-Math.exp(-delta/.12));
  for(const [name,action]of Object.entries(person.actions)){const weight=weights[name]/sum;action.stopFading().stopWarping().setEffectiveWeight(weight);action.enabled=weight>.0001||name===person.mode;action.setEffectiveTimeScale(name==='walk'?person.walkRate:name==='work'?.82:1);}
  person.mixer.update(delta);
  // Filter capture noise without replacing the imported skeletal motion. A short visual delay
  // keeps interrupted transitions and fast wrist keyframes within a continuous angular speed.
  const alpha=1-Math.exp(-delta/.035);for(const joint of person.pose){const angle=joint.rotation.angleTo(joint.bone.quaternion),blend=Math.min(alpha,angle?6*delta/angle:1);joint.rotation.slerp(joint.bone.quaternion,blend);joint.bone.quaternion.copy(joint.rotation);}
  updateGait(person,delta,this.heightAt);
  for(const joint of person.pose){const angle=joint.displayRotation.angleTo(joint.bone.quaternion);joint.displayRotation.slerp(joint.bone.quaternion,angle?Math.min(1,6*delta/angle):1);joint.bone.quaternion.copy(joint.displayRotation);}
  person.root.updateMatrixWorld(true);
 }
 tasks(farm,now,person){const tasks=[];
  if(this.jobs){const job=this.jobs[person.type];if(job){const target=job.targetKind==='plot'?farm.s.plots.find(p=>p.id===job.id):farm.s.buildings.find(b=>b.slot===job.slot);if(target){let [w,h]=job.targetKind==='plot'?[60,60]:this.navigation.footprints[target.kind]||[130,116];if(target.rotation%2)[w,h]=[h,w];const margin=job.targetKind==='plot'?4:14;for(const [dx,dy]of [[0,h/2+margin],[w/2+margin,0],[0,-h/2-margin],[-w/2-margin,0]]){const point={x:target.x+dx,y:target.y+dy};if(this.navigation.open(point))tasks.push({...point,face:{x:target.x,y:target.y},mode:job.mode,key:job.key,workJob:job,construction:job.construction});}}return tasks;}
   const rest={gardener:{x:1460,y:964},builder:{x:1440,y:947},neighbor:{x:1740,y:965}}[person.type];return this.navigation.open(rest)?[{...rest,face:{x:1593,y:920},mode:'idle',key:'rest:'+person.type}]:[];
  }
  for(const p of farm.s.plots.slice(0,farm.unlocked)){for(const [dx,dy]of [[0,45],[45,0],[0,-45],[-45,0]]){const point={x:p.x+dx,y:p.y+dy};if(this.navigation.open(point))tasks.push({...point,face:{x:p.x,y:p.y},mode:p.crop?'tend':'work',key:'plot:'+p.id});}}
  for(const b of farm.s.buildings){let [w,h]=this.navigation.footprints[b.kind]||[130,116];if(b.rotation%2)[w,h]=[h,w];const unfinished=b.readyAt>now;for(const [dx,dy]of [[0,h/2+22],[w/2+22,0],[0,-h/2-22],[-w/2-22,0]]){const point={x:b.x+dx,y:b.y+dy};if(this.navigation.open(point))tasks.push({...point,face:{x:b.x,y:b.y},mode:unfinished?'work':person.type==='neighbor'?'idle':'work',key:'building:'+b.slot,construction:unfinished});}}
  const priority=person.type==='builder'?tasks.filter(t=>t.construction):tasks.filter(t=>t.key.startsWith('plot:'));const preferred=priority.length?priority:tasks;if(person.type==='builder'&&priority.length)return priority;
  return[...preferred,...[{x:1490,y:969,face:{x:1593,y:930},mode:'idle',key:'home'},{x:1720,y:1280,face:{x:1610,y:1170},mode:'idle',key:'walk'},{x:1360,y:1260,face:{x:1500,y:1140},mode:'idle',key:'walk-west'}].filter(t=>this.navigation.open(t))];
 }
 chooseTask(person,farm,now){const tasks=this.tasks(farm,now,person);if(!tasks.length){person.wait=3;return;}const current={x:person.root.position.x,y:person.root.position.z};person.cycle++;
  if(this.jobs)tasks.sort((a,b)=>distance(current,a)-distance(current,b));
  for(let i=0;i<tasks.length;i++){const task=tasks[this.jobs?i:(person.id*7+person.cycle*5+i)%tasks.length];if(!task.workJob&&distance(current,task)<28||this.people.some(other=>other!==person&&other.task&&distance(other.task,task)<12))continue;const path=this.navigation.route(current,task);if(!path.length)continue;person.task=task;person.path=path;this.setAction(person,'walk');return;}person.wait=2;this.setAction(person,'idle');
 }
 update(farm,now,tick,options={}){const delta=this.lastTick===null?0:Math.min(.08,Math.max(0,(tick-this.lastTick)/1000));this.lastTick=tick;this.clock+=delta;if(!this.people.length)return;
  this.jobs=options.residentJobs||null;const changed=this.navigation.update(farm,now);if(changed){for(const p of this.people){const point={x:p.root.position.x,y:p.root.position.z};if(!this.navigation.open(point)){const nearest=this.navigation.nearest(point);if(nearest>=0){const safe=this.navigation.point(nearest);p.root.position.set(safe.x,this.heightAt(safe.x,safe.y),safe.y);}}p.path=[];p.task=null;p.currentSpeed=0;p.yieldTime=0;p.wait=.3+p.id*.3;this.setAction(p,'idle');}}
  for(const person of this.people){const p=person.root.position;person.root.visible=!(options.placement?.demo);if(options.motion===false)continue;if(this.jobs&&person.task?.workJob&&(person.task.workJob.key!==this.jobs[person.type]?.key||person.task.workJob.owner!==this.jobs[person.type]?.owner)&&!person.inFlight){person.path=[];person.task=null;person.wait=0;this.setAction(person,'idle');}if(person.path.length){const target=person.path[0],dx=target.x-p.x,dz=target.y-p.z,length=Math.hypot(dx,dz),heading=Math.atan2(dx,dz),probeTravel=Math.min(length,person.speed*delta),probe={x:p.x+(length?dx/length*probeTravel:0),y:p.z+(length?dz/length*probeTravel:0)};
    const yielding=this.people.some(other=>other!==person&&other.id<person.id&&distance(probe,{x:other.root.position.x,y:other.root.position.z})<12&&distance(probe,{x:other.root.position.x,y:other.root.position.z})<distance({x:p.x,y:p.z},{x:other.root.position.x,y:other.root.position.z}));
    person.yieldTime=yielding?.4:Math.max(0,person.yieldTime-delta);const paused=person.yieldTime>0;
    person.blockedFor=yielding?(person.blockedFor||0)+delta:0;if(person.blockedFor>.8&&person.task&&length){const start={x:p.x,y:p.z},avoid=this.people.filter(other=>other!==person&&other.currentSpeed<1).map(other=>({x:other.root.position.x,y:other.root.position.z}));for(const side of [1,-1]){const aside={x:p.x-dz/length*22*side,y:p.z+dx/length*22*side};if(!this.navigation.clear(start,aside)||avoid.some(other=>(aside.x-start.x)*(start.x-other.x)+(aside.y-start.y)*(start.y-other.y)<0||distance(aside,other)<20))continue;const route=this.navigation.route(aside,person.task,avoid);if(route.length){person.path=[aside,...route];break;}}person.blockedFor=0;}
    this.faceDirection(person,heading,delta);
    const aligned=Math.max(0,Math.cos(turn(person.root.rotation.y,heading))),braking=person.path.length===1?Math.sqrt(2*14*length):person.speed;
    person.currentSpeed=approach(person.currentSpeed,paused?0:Math.min(person.speed,braking)*aligned,14*delta);
    const travel=paused?0:Math.min(length,person.currentSpeed*delta);p.x+=length?dx/length*travel:0;p.z+=length?dz/length*travel:0;
    if(length<.01||travel>=length){if(!paused){p.x=target.x;p.z=target.y;person.path.shift();}}
    if(person.path.length){this.setAction(person,paused&&person.currentSpeed<.4?'idle':'walk');}
    else{person.currentSpeed=0;const task=person.task;this.setAction(person,task?.mode||'idle');person.wait=task?.workJob?.seconds??(task?.mode==='idle'?3+person.id%3:7+(person.id%3)*3);}
   }else{person.currentSpeed=0;if(person.task){this.faceDirection(person,Math.atan2(person.task.face.x-p.x,person.task.face.y-p.z),delta);}person.wait-=delta;if(person.wait<=0&&!person.inFlight){const task=person.task;if(task?.workJob?.action&&this.onWork){person.inFlight=true;Promise.resolve().then(()=>this.onWork(task.workJob)).catch(()=>false).finally(()=>{person.inFlight=false;if(person.task===task){person.task=null;person.path=[];person.wait=2;this.setAction(person,'idle');}});}else if(task?.workJob){person.wait=1;}else this.chooseTask(person,farm,now);}}
   p.y=this.heightAt(p.x,p.z);this.updateAnimation(person,delta);
  }
 }
 dispose(){for(const p of this.people){p.mixer.stopAllAction();p.mixer.uncacheRoot(p.model);}this.layer.removeFromParent();for(const a of Object.values(this.assets)){const geometries=new Set(),materials=new Set(),textures=new Set();a.model.traverse(o=>{if(!o.isMesh)return;geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const t of Object.values(m))if(t?.isTexture)textures.add(t);}});for(const t of textures)t.dispose();for(const m of materials)m.dispose();for(const g of geometries)g.dispose();}this.people=[];}
}
