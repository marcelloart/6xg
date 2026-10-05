import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FarmAngler,anglerMotion} from '../src/farm-angler.js';
import {FishingScene} from '../src/farm-fishing.js';
globalThis.ProgressEvent=class{constructor(t,v){Object.assign(this,v);}};
const g=JSON.parse(fs.readFileSync('assets/people/angler.gltf','utf8'));
assert(g.asset.copyright.includes('MIT'));
const original=JSON.parse(fs.readFileSync('assets/people/gardener.gltf','utf8'));assert.notEqual(g.nodes.find(n=>n.mesh!==undefined).name,original.nodes.find(n=>n.mesh!==undefined).name,'Separate source character');
g.images=[];g.textures=[];for(const m of g.materials){delete m.pbrMetallicRoughness.baseColorTexture;delete m.normalTexture;}
for(const b of g.buffers)b.uri='data:application/octet-stream;base64,'+fs.readFileSync('assets/people/'+b.uri).toString('base64');
const parsed=await new GLTFLoader().parseAsync(JSON.stringify(g),'');const bounds=new THREE.Box3().setFromObject(parsed.scene);parsed.scene.userData.height=bounds.max.y-bounds.min.y;parsed.scene.userData.ground=bounds.min.y;const asset={model:parsed.scene,clips:parsed.animations};
let triangles=0;parsed.scene.traverse(m=>{if(m.isSkinnedMesh){assert(m.skeleton.bones.length>=50);triangles+=m.geometry.index.count/3;}});assert(triangles<12000);
globalThis.document={createElement:()=>({getContext:()=>({createLinearGradient:()=>({addColorStop(){}}),fillRect(){},beginPath(){},ellipse(){},stroke(){},fill(){},moveTo(){},lineTo(){}})})};
const scene=new THREE.Scene(),rules={fishingStage:()=> 'waiting',buildingLevel:()=>1},fx=new FishingScene(scene,()=>2,rules,async()=>asset);await fx.angler.ready;
const farm={s:{fishing:{rod:1,cast:null,records:[]},buildings:[{kind:'pier',slot:1,x:800,y:1460,rotation:0,readyAt:0}]}},before=JSON.stringify(farm.s);let time=0;const states=new Set();
fx.update(farm,100000,0,null);assert(fx.line.visible&&fx.bobber.visible,'Ambient angler fishes at an existing pier before opening any panel');for(const value of fx.line.geometry.attributes.position.array)assert(Number.isFinite(value),'The first idle fishing line is finite');
for(const hz of[30,60,120]){
 const cast={id:1,slot:1,rod:1,startedAt:100000,biteAt:103000,expiresAt:110000,hookedAt:0};farm.s.fishing.cast=cast;
 const angles=[];let previous=null,maxSnap=0,maxGap=0;
 for(let i=0;i<hz*8;i++){
  const now=100000+i*1000/hz;if(i===hz*4)cast.hookedAt=now;time+=1/hz;
  fx.update(farm,now,time,null);fx.angler.root.updateMatrixWorld(true);states.add(fx.angler.mode);
  const q=fx.angler.arms[1].upper.quaternion.clone();if(previous&&i>hz)maxSnap=Math.max(maxSnap,previous.angleTo(q));previous=q;
  const right=fx.rod.localToWorld(new THREE.Vector3(5,3,0)),left=fx.rod.userData.crankKnob.getWorldPosition(new THREE.Vector3());
  for(const arm of fx.angler.arms){const target=arm.side==='R'?right:left;maxGap=Math.max(maxGap,arm.hand.getWorldPosition(new THREE.Vector3()).distanceTo(target));}
  for(const b of fx.angler.pose)assert(b.bone.quaternion.toArray().every(Number.isFinite));
 }
 assert(maxGap<.4,'Wrists stay on the grip and crank at '+hz+' Hz: '+maxGap);assert(maxSnap<8/hz,'No sudden arm pose changes at '+hz+' Hz: '+maxSnap);
 console.log(hz+' Hz: wrist gap '+maxGap.toFixed(4)+', maximum arm step '+maxSnap.toFixed(4));
}
farm.s.fishing.cast=null;farm.s.fishing.records=[{at:108000,kind:'carp'}];fx.update(farm,108500,time+.016,null);assert.equal(fx.angler.mode,'catch');
const positions=fx.angler.pose.map(p=>p.bone.quaternion.clone()),clock=fx.angler.clock;fx.update(farm,108500,time+500,null,{motion:false});assert.equal(fx.angler.clock,clock);for(let i=0;i<positions.length;i++)assert(positions[i].angleTo(fx.angler.pose[i].bone.quaternion)<1e-5,'Paused pose stays frozen');
farm.s.fishing.records=[];fx.update(farm,120000,time+1000,null);assert.equal(fx.angler.mode,'idle');farm.s.buildings[0].x=950;farm.s.buildings[0].rotation=2;fx.update(farm,120000,time+1000.016,null);assert.equal(fx.actorGroup.position.x,950);assert(fx.actorGroup.quaternion.angleTo(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI))<1e-6);
farm.s.buildings.push({kind:'pier',slot:2,x:1000,y:1600,rotation:0,readyAt:0});fx.update(farm,120000,time+1000.032,{slot:2});assert.equal(fx.actorGroup.children.length,1,'One angler, including when switching piers');
farm.s.buildings=[];fx.update(farm,120000,time+1000.048,null);assert(!fx.actorGroup.visible);assert(!fx.angler.root.visible);fx.destroy();assert(!fx.angler.model);assert(!scene.children.length);
farm.s.buildings=[{kind:'pier',slot:1,x:800,y:1460,rotation:0,readyAt:0}];farm.s.fishing={rod:1,cast:null,records:[]};assert.equal(JSON.stringify(farm.s),before,'Visual choreography does not change saves or catch odds');
for(const mode of['casting','waiting','bite','hooking','reeling'])assert(states.has(mode));
assert.equal(anglerMotion({startedAt:0,biteAt:1000,expiresAt:2000,hookedAt:1100},null,3000,3).reel,0,'Expired casts stop cranking');
assert.equal(anglerMotion({startedAt:0,biteAt:1000,expiresAt:15000,hookedAt:1100,reels:3},null,10000,3).mode,'landed','Full bag keeps the fish held instead of cranking forever');
const source=fs.readFileSync('assets/js/farm-game.js','utf8');for(const id of['arapaima','gourami','pacu','pangasius','knifefish'])assert(source.includes('./assets/produce/'+id+'.jpg?v='));
delete globalThis.document;console.log('Unique rigged angler, casting, bite, reeling, catch, frozen motion, pier movement/sale, exact wrist attachment and five uploaded photos passed.');
