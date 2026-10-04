import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createPerson,FarmPeopleNavigation,FarmPeople,walkingSpeed} from '../src/farm-people.js';
globalThis.ProgressEvent=class {constructor(type,init){Object.assign(this,init);}};
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('assets/js/farm-engine.js','utf8')+';this.F=BaraFarm;',context);const F=context.F,farm=new F.Farm({clock:()=>1791106939676}),before=JSON.stringify(farm.s);
const assets={};
for(const id of ['gardener','neighbor','builder']){
 const gltf=JSON.parse(fs.readFileSync('assets/people/'+id+'.gltf','utf8'));gltf.images=[];gltf.textures=[];for(const material of gltf.materials){delete material.pbrMetallicRoughness.baseColorTexture;delete material.normalTexture;}
 for(const buffer of gltf.buffers)buffer.uri='data:application/octet-stream;base64,'+fs.readFileSync('assets/people/'+buffer.uri).toString('base64');
 const asset=await new GLTFLoader().parseAsync(JSON.stringify(gltf),'');const bounds=new THREE.Box3().setFromObject(asset.scene);asset.scene.userData.height=bounds.max.y-bounds.min.y;asset.scene.userData.ground=bounds.min.y;
 assets[id]={model:asset.scene,clips:asset.animations};const a=createPerson(assets[id]),b=createPerson(assets[id]);let skins=0,triangles=0;asset.scene.traverse(o=>{if(o.isSkinnedMesh){skins++;assert(o.skeleton.bones.length>=50);triangles+=o.geometry.index.count/3;}});assert(skins>0);assert(triangles<12000);
 const skinA=[],skinB=[];a.model.traverse(o=>{if(o.isSkinnedMesh)skinA.push(o);});b.model.traverse(o=>{if(o.isSkinnedMesh)skinB.push(o);});assert.notEqual(skinA[0].skeleton,skinB[0].skeleton);assert.equal(skinA[0].geometry,skinB[0].geometry);
 for(const name of ['idle','walk','tend','work']){a.mixer.stopAllAction();a.actions[name].enabled=true;a.actions[name].setEffectiveWeight(1).play();a.mixer.update(.1);a.model.updateMatrixWorld(true);const hand=a.model.getObjectByName('Bip01_R_Hand'),start=hand.getWorldPosition(new THREE.Vector3());a.mixer.update(.7);a.model.updateMatrixWorld(true);assert(hand.getWorldPosition(new THREE.Vector3()).distanceTo(start)>.001,name+' is skeletal motion');const pose=new THREE.Box3().setFromObject(a.model);assert(pose.min.y>-12&&pose.min.y<10,'feet near ground '+id+' '+name+':'+pose.min.y);assert(pose.max.y<65,'No stretched limbs '+id+' '+name);}
 assert.equal(b.mode,'idle');console.log(id,triangles+' triangles, 4 skeletal clips, independent skeletons');
}
const sizes=Object.fromEntries(Object.keys(F.BUILDINGS).map(kind=>{const p=F.footprint(kind,0);return[kind,[p.w,p.h]];}));
const nav=new FarmPeopleNavigation(sizes);nav.update(farm,Date.now());for(const target of [{x:1350,y:1130},{x:1820,y:1250},{x:1640,y:1440}]){const path=nav.route({x:1490,y:960},target);assert(path.length);for(let i=1;i<path.length;i++)assert(nav.clear(path[i-1],path[i]),'Avoids farm objects and diagonal corner clipping');}
farm.s.buildings.push({kind:'barn',slot:0,x:1840,y:1260,rotation:1,readyAt:Date.now()+10000});assert(nav.update(farm,Date.now()));assert(!nav.open({x:1840,y:1260}));const routed=nav.route({x:1760,y:1260},{x:1920,y:1260});assert(routed.length>=2);assert(!nav.clear({x:1760,y:1260},{x:1920,y:1260}));for(let i=1;i<routed.length;i++)assert(nav.clear(routed[i-1],routed[i]));farm.s.buildings.pop();assert.equal(JSON.stringify(farm.s),before,'Visual residents do not change economy or player saves');
console.log('People navigation passed: plots, rotated buildings, obstacle reroutes, and unchanged farm state.');
const people=Object.create(FarmPeople.prototype);Object.assign(people,{navigation:nav,heightAt:()=>0,lastTick:null,clock:0,people:[],assets});
for(let i=0;i<3;i++){const type=['gardener','neighbor','builder'][i],person=createPerson(assets[type]);Object.assign(person,{id:i,type,cycle:i,wait:0,speed:walkingSpeed(i)});assert(person.speed<=12.5);person.root.position.set(1450+i*22,0,975);people.people.push(person);}
const states=new Set();for(let frame=0;frame<900;frame++){people.update(farm,1791106939676,frame*40);for(const p of people.people){states.add(p.mode);assert(nav.open({x:p.root.position.x,y:p.root.position.z}),'Residents remain on walkable land');}}
assert(states.has('walk')&&states.has('work'));assert.equal(JSON.stringify(farm.s),before);
const p=people.people[0],frozen=p.root.position.clone(),time=p.mixer.time;people.update(farm,1791106939676,1000000,{motion:false});assert(p.root.position.equals(frozen));assert.equal(p.mixer.time,time);people.update(farm,1791106939676,2000000);assert(p.root.position.distanceTo(frozen)<2,'Returning to a hidden tab does not teleport villagers');
farm.s.buildings.push({kind:'barn',slot:0,x:1840,y:1260,rotation:1,readyAt:1791107000000});nav.update(farm,1791106939676);const builder=people.people.find(p=>p.type==='builder');assert(people.tasks(farm,1791106939676,builder).every(t=>t.construction));
console.log('Resident lifecycle passed: walking and working, construction priority, motion controls, and safe tab resume.');
farm.s.buildings.pop();nav.update(farm,1791106939676);people.jobs={};
for(const plot of farm.s.plots.slice(0,farm.unlocked)){
 people.jobs.gardener={key:'plant:'+plot.id,action:'plant',targetKind:'plot',id:plot.id,mode:'tend',seconds:3};
 const targets=people.tasks(farm,1791106939676,people.people[0]);
 assert(targets.some(target=>nav.route({x:1485,y:964},target).length),'Every unlocked plot has a reachable work edge, including the middle plot');
}
const gardener=people.people[0],plot=farm.s.plots[0];let completed=0;
gardener.root.position.set(1485,0,964);gardener.path=[];gardener.task=null;gardener.wait=0;
people.jobs.gardener={key:'plant:'+plot.id,action:'plant',targetKind:'plot',id:plot.id,mode:'tend',seconds:3};
people.onWork=async job=>{assert.equal(job.id,plot.id);completed++;};people.lastTick=null;
for(let frame=0;frame<1200&&completed===0;frame++){people.update(farm,1791106939676,frame*1000/60,{residentJobs:people.jobs});await Promise.resolve();}
assert.equal(completed,1,'Farmer reaches the plot, performs work and submits exactly one action');
console.log('Role work passed: all plot edges are reachable and the farmer completes a real job callback.');
people.jobs={};people.lastTick=null;people.onWork=null;
for(const resident of people.people){resident.path=[];resident.task=null;resident.wait=0;resident.currentSpeed=0;}
gardener.root.position.set(1460,0,964);people.people[1].root.position.set(1740,0,965);builder.root.position.set(1529,0,964);
for(let frame=0;frame<1800;frame++)people.update(farm,1791106939676,frame*1000/60,{residentJobs:people.jobs});
assert(builder.root.position.distanceTo(new THREE.Vector3(1440,0,947))<5,'An idle farmer does not permanently block the builder: walk around stationary residents');
console.log('Pedestrian avoidance passed: stationary residents cannot trap another worker.');
for(const type of ['gardener','builder','neighbor'])for(const hz of [30,60,120]){
 const actor=createPerson(assets[type]),controller=Object.create(FarmPeople.prototype),bones=[];actor.currentSpeed=12;actor.model.traverse(o=>{if(o.isBone)bones.push(o);});const last=bones.map(b=>b.quaternion.clone());
 for(let frame=0;frame<hz*6;frame++){
  // Interrupt fades before they finish, as job changes, arrival and pause can do in a live game.
  if(frame%Math.max(1,Math.round(hz*.07))===0)controller.setAction(actor,['walk','tend','work','idle'][Math.floor(frame/Math.max(1,Math.round(hz*.07)))%4]);
  controller.updateAnimation(actor,1/hz);
  const total=Object.values(actor.actions).reduce((n,a)=>n+a.getEffectiveWeight(),0);assert(Math.abs(total-1)<1e-6,'Interrupted animation weights stay normalized');
  for(let i=0;i<bones.length;i++){assert(last[i].angleTo(bones[i].quaternion)<=6/hz+1e-4,'No one-frame skeletal pose snap: '+type+' at '+hz+' Hz');last[i].copy(bones[i].quaternion);}
  const yaw=actor.root.rotation.y;controller.faceDirection(actor,frame%hz<hz/2?Math.PI:0,1/hz);assert(Math.abs(actor.root.rotation.y-yaw)<=2.4/hz+1e-6,'Turning has a bounded continuous speed');
 }
}
console.log('Animation continuity passed: all three rigs, interrupted tasks, normalized blending and smooth body turns at 30/60/120 Hz.');
for(const type of ['gardener','builder','neighbor'])for(const hz of [30,60,120]){
 const asset=assets[type],track=asset.clips.find(c=>c.name==='walk').tracks.find(t=>t.name==='Bip01.position');
 assert(new THREE.Vector3().fromArray(track.values,0).distanceTo(new THREE.Vector3().fromArray(track.values,track.values.length-3))<1e-4,'Walking pelvis translation closes its loop: '+type);
 const z=[];for(let i=2;i<track.values.length;i+=3)z.push(track.values[i]);assert(Math.max(...z)-Math.min(...z)<1e-4,'Navigation owns forward displacement; walking capture cannot accumulate a second forward movement');
 assert(asset.model.userData.walkSpeed>130&&asset.model.userData.walkSpeed<150,'Stride speed comes from the original motion capture');
 const actor=createPerson(asset),controller=Object.create(FarmPeople.prototype),navigation=new FarmPeopleNavigation(sizes);navigation.update(farm,1791106939676);actor.id=0;actor.type=type;actor.speed=11.5;actor.root.position.set(1250,0,1600);actor.root.rotation.y=Math.PI/2;actor.path=[{x:2050,y:1600}];actor.task={face:{x:2050,y:1600},mode:'idle'};
 Object.assign(controller,{people:[actor],navigation,heightAt:()=>0,lastTick:null,clock:0});controller.setAction(actor,'walk');const hip=actor.model.getObjectByName('Bip01'),last=new THREE.Vector3();let maximum=0,loops=0,clipTime=0;
 for(let frame=0;frame<hz*10;frame++){controller.update(farm,1791106939676,frame*1000/hz);actor.root.updateMatrixWorld(true);const current=hip.getWorldPosition(new THREE.Vector3());if(frame>hz)maximum=Math.max(maximum,current.distanceTo(last));last.copy(current);if(actor.actions.walk.time<clipTime)loops++;clipTime=actor.actions.walk.time;}
 assert(loops>=3,'The test covers repeated walk-cycle boundaries');assert(maximum<.4*60/hz,'World-space body position cannot jump back on a walk loop: '+type+' at '+hz+' Hz, '+maximum);
 assert(Math.abs(actor.walkRate-actor.currentSpeed/actor.walkStrideSpeed)<1e-5,'Footstep playback matches actual movement distance');
}
console.log('Walking displacement passed: every rig at 30/60/120 Hz, repeated capture loops, continuous world position and captured stride timing.');
