import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createPerson,FarmPeopleNavigation,FarmPeople} from '../src/farm-people.js';
globalThis.ProgressEvent=class {constructor(type,init){Object.assign(this,init);}};
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('assets/js/farm-engine.js','utf8')+';this.F=BaraFarm;',context);const F=context.F,farm=new F.Farm({clock:()=>1791106939676}),before=JSON.stringify(farm.s);
const assets={};
for(const id of ['gardener','neighbor','builder']){
 const gltf=JSON.parse(fs.readFileSync('assets/people/'+id+'.gltf','utf8'));gltf.images=[];gltf.textures=[];for(const material of gltf.materials){delete material.pbrMetallicRoughness.baseColorTexture;delete material.normalTexture;}
 for(const buffer of gltf.buffers)buffer.uri='data:application/octet-stream;base64,'+fs.readFileSync('assets/people/'+buffer.uri).toString('base64');
 const asset=await new GLTFLoader().parseAsync(JSON.stringify(gltf),'');const bounds=new THREE.Box3().setFromObject(asset.scene);asset.scene.userData.height=bounds.max.y-bounds.min.y;asset.scene.userData.ground=bounds.min.y;
 assets[id]={model:asset.scene,clips:asset.animations};const a=createPerson(assets[id]),b=createPerson(assets[id]);let skins=0,triangles=0;asset.scene.traverse(o=>{if(o.isSkinnedMesh){skins++;assert(o.skeleton.bones.length>=50);triangles+=o.geometry.index.count/3;}});assert(skins>0);assert(triangles<12000);
 const skinA=[],skinB=[];a.model.traverse(o=>{if(o.isSkinnedMesh)skinA.push(o);});b.model.traverse(o=>{if(o.isSkinnedMesh)skinB.push(o);});assert.notEqual(skinA[0].skeleton,skinB[0].skeleton);assert.equal(skinA[0].geometry,skinB[0].geometry);
 for(const name of ['idle','walk','tend','work']){a.mixer.stopAllAction();a.actions[name].play();a.mixer.update(.1);a.model.updateMatrixWorld(true);const hand=a.model.getObjectByName('Bip01_R_Hand'),start=hand.getWorldPosition(new THREE.Vector3());a.mixer.update(.7);a.model.updateMatrixWorld(true);assert(hand.getWorldPosition(new THREE.Vector3()).distanceTo(start)>.001,name+' is skeletal motion');const pose=new THREE.Box3().setFromObject(a.model);assert(pose.min.y>-12&&pose.min.y<10,'feet near ground '+id+' '+name+':'+pose.min.y);assert(pose.max.y<65,'No stretched limbs '+id+' '+name);}
 assert.equal(b.mode,'idle');console.log(id,triangles+' triangles, 4 skeletal clips, independent skeletons');
}
const sizes=Object.fromEntries(Object.keys(F.BUILDINGS).map(kind=>{const p=F.footprint(kind,0);return[kind,[p.w,p.h]];}));
const nav=new FarmPeopleNavigation(sizes);nav.update(farm,Date.now());for(const target of [{x:1350,y:1130},{x:1820,y:1250},{x:1640,y:1440}]){const path=nav.route({x:1490,y:976},target);assert(path.length);for(let i=1;i<path.length;i++)assert(nav.clear(path[i-1],path[i]),'Avoids farm objects and diagonal corner clipping');}
farm.s.buildings.push({kind:'barn',slot:0,x:1840,y:1260,rotation:1,readyAt:Date.now()+10000});assert(nav.update(farm,Date.now()));assert(!nav.open({x:1840,y:1260}));const routed=nav.route({x:1760,y:1260},{x:1920,y:1260});assert(routed.length>5);for(let i=1;i<routed.length;i++)assert(nav.clear(routed[i-1],routed[i]));farm.s.buildings.pop();assert.equal(JSON.stringify(farm.s),before,'Visual residents do not change economy or player saves');
console.log('People navigation passed: plots, rotated buildings, obstacle reroutes, and unchanged farm state.');
const people=Object.create(FarmPeople.prototype);Object.assign(people,{navigation:nav,heightAt:()=>0,lastTick:null,clock:0,people:[],assets});
for(let i=0;i<3;i++){const type=['gardener','neighbor','builder'][i],person=createPerson(assets[type]);Object.assign(person,{id:i,type,cycle:i,wait:0,speed:19+i});person.root.position.set(1450+i*22,0,975);people.people.push(person);}
const states=new Set();for(let frame=0;frame<900;frame++){people.update(farm,1791106939676,frame*40);for(const p of people.people){states.add(p.mode);assert(nav.open({x:p.root.position.x,y:p.root.position.z}),'Residents remain on walkable land');}}
assert(states.has('walk')&&states.has('work'));assert.equal(JSON.stringify(farm.s),before);
const p=people.people[0],frozen=p.root.position.clone(),time=p.mixer.time;people.update(farm,1791106939676,1000000,{motion:false});assert(p.root.position.equals(frozen));assert.equal(p.mixer.time,time);people.update(farm,1791106939676,2000000);assert(p.root.position.distanceTo(frozen)<2,'Returning to a hidden tab does not teleport villagers');
farm.s.buildings.push({kind:'barn',slot:0,x:1840,y:1260,rotation:1,readyAt:1791107000000});nav.update(farm,1791106939676);const builder=people.people.find(p=>p.type==='builder');assert(people.tasks(farm,1791106939676,builder).every(t=>t.construction));
console.log('Resident lifecycle passed: walking and working, construction priority, motion controls, and safe tab resume.');
