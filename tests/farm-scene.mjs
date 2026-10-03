import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {bridgeBounds,renderScale,farmRoads} from '../src/farm-visuals.js';
import {modelInstance} from '../src/farm-assets.js';
const errors=[],window={};
const source=fs.readFileSync('src/farm-3d.js','utf8').replace(/^import .*;\r?\n/gm,'');
const context={THREE,mergeGeometries,bridgeBounds,renderScale,farmRoads,modelInstance,window,FARM_TEXTURE_URLS:{},console:{error:(...args)=>errors.push(args),warn:()=>{}}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('assets/js/farm-engine.js','utf8')+'\nwindow.BaraFarm=BaraFarm;'+fs.readFileSync('assets/js/farm-camera.js','utf8')+'\nwindow.Camera=FarmCamera;',context);
vm.runInContext(source+'\nwindow.GeometryTests={mergeStatic,disposeGeometry,FarmRenderer3D,windMaterial,makeRiverGeometry,makeRiverBedGeometry,riverBedHeight,riverMaterial,terrainPath,terrainRoad,terrainHeight};',context);
const {mergeStatic,FarmRenderer3D}=window.GeometryTests;
const group=new THREE.Group(),mat=new THREE.MeshStandardMaterial();let vertices=0;
for(const geometry of[new THREE.BoxGeometry(),new THREE.SphereGeometry(),new THREE.CylinderGeometry(),new THREE.DodecahedronGeometry(1,1)]){vertices+=geometry.index?geometry.index.count:geometry.attributes.position.count;const mesh=new THREE.Mesh(geometry,mat);mesh.position.x=group.children.length*4;group.add(mesh);}
mergeStatic(group);assert.equal(group.children.length,1);assert.equal(group.children[0].geometry.attributes.position.count,vertices,'Mixed rock and building geometry must not disappear while batching');group.children[0].geometry.computeBoundingBox();assert(group.children[0].geometry.boundingBox.max.x>11);
const renderer=Object.create(FarmRenderer3D.prototype);renderer.materials=Object.fromEntries(['soil','stone','glass','wood','darkWood','straw','plaster','roof','iron','green','leaves','red'].map(key=>[key,new THREE.MeshStandardMaterial({side:key==='leaves'?THREE.DoubleSide:THREE.FrontSide})]));
renderer.workshopSigns=Object.fromEntries(['kitchen','juicery','bakery'].map(key=>[key,new THREE.MeshStandardMaterial()]));
renderer.fruitMaterials=Object.fromEntries(Object.keys(window.BaraFarm.CROPS).map(key=>[key,new THREE.MeshStandardMaterial()]));
for(const kind of Object.keys(window.BaraFarm.BUILDINGS))for(const complete of[false,true]){const model=renderer.building(kind,complete);assert(model.children.length>0,kind);model.traverse(mesh=>{if(!mesh.isMesh)return;assert(mesh.geometry.attributes.position.count>0);mesh.geometry.computeBoundingBox();assert(Number.isFinite(mesh.geometry.boundingBox.max.y),kind+' bounds');});}
for(const recipe of Object.keys(window.BaraFarm.RECIPES)){const model=renderer.catalogueProduct(recipe);assert(model.children.length>0,recipe);for(const mesh of model.children){assert(mesh.geometry.attributes.position.count>0);assert(mesh.material,'Every dish has a real material');}}
for(const crop of Object.keys(window.BaraFarm.CROPS))for(const stage of[0,.5,1]){const model=renderer.makeCrop(crop,stage);assert(model.children.length>0,crop);for(const mesh of model.children)assert(mesh.geometry.attributes.position.count>0,crop);}
renderer.camera=new window.Camera();renderer.camera.resize(1280,720);renderer.camera.zoom=2;renderer.camera.focus(1592,1084);renderer.view=new THREE.OrthographicCamera(-1,1,1,-1,10,6200);renderer.cropLayer=new THREE.Group();renderer.farmLayer=new THREE.Group();
const apple=renderer.makeCrop('apple',1);apple.position.set(1592,0,1084);apple.userData.plotId=4;renderer.cropLayer.add(apple);apple.updateMatrixWorld(true);
const leaves=apple.children.find(m=>m.material===renderer.materials.leaves),vertices3d=leaves.geometry.attributes.position;let canopy=new THREE.Vector3(),highest=-Infinity;
for(let i=0;i<vertices3d.count;i+=3){const p=new THREE.Vector3().fromBufferAttribute(vertices3d,i).add(new THREE.Vector3().fromBufferAttribute(vertices3d,i+1)).add(new THREE.Vector3().fromBufferAttribute(vertices3d,i+2)).divideScalar(3);if(p.y>highest){highest=p.y;canopy=p;}}
canopy=leaves.localToWorld(canopy);
for(let i=0;i<8;i++){renderer.camera.rotate(Math.PI/4);renderer.updateView();const screen=renderer.camera.worldToScreen(canopy.x,canopy.z,canopy.y),projected=canopy.clone().project(renderer.view);assert(Math.abs(screen.x-(projected.x+1)*640)<1e-6);assert(Math.abs(screen.y-(1-projected.y)*360)<1e-6);assert.equal(renderer.pickPlot(renderer.camera.screenToWorld(screen.x,screen.y)),4,'A canopy click belongs to its fruit tree after rotation');}
renderer.pondok=renderer.building('house');renderer.pondok.position.set(1592,0,1084);renderer.pondok.userData.building=true;const roof=renderer.camera.worldToScreen(1592,1084,104);assert.equal(renderer.pickPlot(renderer.camera.screenToWorld(roof.x,roof.y)),-1,'An occluding roof blocks a click through to a crop');
const river=window.GeometryTests.makeRiverGeometry();for(let i=0;i<river.attributes.normal.count;i++)assert(river.attributes.normal.getY(i)>.99,'River surface faces the daylight');
const bed=window.GeometryTests.makeRiverBedGeometry();for(let i=0;i<bed.attributes.position.count;i++){const p=bed.attributes.position;assert(p.getY(i)<river.attributes.position.getY(i),'The photographic riverbed is below the water');assert(p.getY(i)>window.GeometryTests.riverBedHeight(p.getX(i),p.getZ(i)),'The grass terrain cannot cover the riverbed');}
for(const road of farmRoads()){
 const geometry=window.GeometryTests.terrainRoad(road.points,road.width),p=geometry.attributes.position;assert.equal(geometry.index.count,(p.count/5-1)*24);
 for(let i=0;i<p.count;i++){assert(!(p.getX(i)>1000&&p.getX(i)<2190&&p.getZ(i)>630&&p.getZ(i)<1760),'Roads never overlap the entire movable farm');assert(Number.isFinite(p.getY(i)));}
 for(let i=5;i<p.count;i++)assert(Math.hypot(p.getX(i)-p.getX(i-5),p.getZ(i)-p.getZ(i-5))<18,'Road bends remain one continuous, connected strip');
}
const approach=window.GeometryTests.terrainPath([bridgeBounds().right,1115],[1080,1130]);for(let i=0;i<approach.attributes.position.count;i++){const p=approach.attributes.position;assert(Math.abs(p.getY(i)-window.GeometryTests.terrainHeight(p.getX(i),p.getZ(i))-.55)<.001,'Bridge approach follows the ground rather than disappearing below it');assert(approach.attributes.normal.getY(i)>.9);}
const clock={value:2},strength={value:4},wind=window.GeometryTests.windMaterial(new THREE.MeshStandardMaterial(),clock,strength),shader={uniforms:{},vertexShader:'#include <begin_vertex>'};wind.onBeforeCompile(shader);assert.equal(shader.uniforms.baraWindTime,clock);assert(shader.vertexShader.includes('inverse(mat3(instanceMatrix))'));const depthShader={uniforms:{},vertexShader:'#include <begin_vertex>'};wind.userData.windDepth.onBeforeCompile(depthShader);assert.equal(depthShader.vertexShader,shader.vertexShader,'Visible foliage and shadow use identical wind deformation');const water=window.GeometryTests.riverMaterial(clock),waterShader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>\n#include <normal_fragment_begin>'};water.onBeforeCompile(waterShader);assert(water.isMeshPhysicalMaterial);assert(waterShader.fragmentShader.includes('ripple')&&waterShader.fragmentShader.includes('bankFoam'));assert(water.transmission>0&&water.ior===1.333);assert.equal(waterShader.uniforms.baraTime,clock);
for(const kind of [...Object.keys(window.BaraFarm.CROPS),...Object.keys(window.BaraFarm.MATERIALS)])assert(renderer.catalogueProduct(kind).children.length>0,'Product artwork '+kind);
const farm=new window.BaraFarm.Farm({clock:()=>1000000});farm.plant(0,'carrot');renderer.pondok=null;renderer.scene=new THREE.Scene();renderer.syncFarm(farm,farm.now());
for(const kind of Object.keys(window.BaraFarm.ANIMALS)){const animal=renderer.animalModel(kind);let vertices=0;animal.traverse(o=>{if(o.isMesh){vertices+=o.geometry.attributes.position.count;o.geometry.computeBoundingBox();assert(Number.isFinite(o.geometry.boundingBox.max.y));}});assert(vertices>1000,'Ternak has articulated visible geometry');assert.equal(animal.userData.actor.legs.length,kind==='cow'?4:2);}
for(const kind of Object.keys(window.BaraFarm.ANIMAL_PRODUCTS))assert(renderer.catalogueProduct(kind).children.length>0,'Every animal product has artwork');
const animalFarm=new window.BaraFarm.Farm({clock:()=>1000000});animalFarm.s.progress.xp=1400;animalFarm.s.coins=100;animalFarm.s.buildings.push({slot:0,kind:'coop',x:1170,y:740,rotation:0,startedAt:920000,readyAt:1000000});animalFarm.buyAnimal(0,'chicken');renderer.wind=true;renderer.syncAnimals(animalFarm,1000000);assert.equal(renderer.animalActors.length,1);renderer.animateAnimals(0);const pose=renderer.animalActors[0].head.rotation.x;renderer.animateAnimals(5);assert.notEqual(renderer.animalActors[0].head.rotation.x,pose,'Chicken pecking moves over time');const layer=renderer.animalLayer;renderer.syncAnimals(animalFarm,1000001);assert.equal(renderer.animalLayer,layer,'Frames reuse existing animal geometry');
const soil=renderer.farmLayer.children.find(o=>o.userData.plotId===0),crop=renderer.cropLayer.children.find(o=>o.userData.plotId===0);
assert.equal(renderer.pickPlot(renderer.camera.screenToWorld(...Object.values(renderer.camera.worldToScreen(farm.s.plots[1].x,farm.s.plots[1].y)))),1,'Empty soil is picked by its stable plot id');
const placement={kind:'plot',movePlot:0,point:{x:2100,y:1500},rotation:0,lifted:true,valid:true};
renderer.updateSelection(farm,{placement,now:farm.now()});assert.equal(soil.visible,false);assert.equal(crop.visible,false);assert(renderer.preview.children.length>=3,'Lifted plot includes the soil and living crop');const preview=renderer.preview;
placement.point={x:2110,y:1510};placement.valid=false;renderer.updateSelection(farm,{placement,now:farm.now()});assert.equal(renderer.preview,preview,'Following the cursor reuses the preview instead of rebuilding geometry');assert.equal(preview.position.x,2110);assert.equal(renderer.previewFill.color.getHexString(),'e26854');
renderer.updateSelection(farm,{placement:null,now:farm.now()});assert.equal(soil.visible,true);assert.equal(crop.visible,true);assert.equal(renderer.preview,null,'Cancel restores originals and removes the temporary ghost');
const garden=renderer.rusticGarden(),gardenBounds=new THREE.Box3().setFromObject(garden);
assert(gardenBounds.min.x>=-45&&gardenBounds.max.x<=45&&gardenBounds.min.z>=-30&&gardenBounds.max.z<=30,'Real geometry fits the validated placement footprint');
garden.traverse(o=>{if(o.isMesh)for(const value of o.geometry.attributes.position.array)assert(Number.isFinite(value));});
const decor={kind:'bench',product:'rusticGarden',demo:true,demoPlaced:false,point:{x:1850,y:1100},rotation:0,lifted:true,valid:true};
renderer.updateSelection(farm,{placement:decor,now:farm.now()});
const ghost=renderer.preview.children.find(o=>o.userData.product==='rusticGarden');assert(ghost,'Placement renders the catalog product factory');
assert.deepEqual(ghost.children.map(o=>o.material),garden.children.map(o=>o.material),'Preview and catalog model share the same actual PBR materials');
assert.deepEqual(ghost.children.map(o=>Array.from(o.geometry.attributes.position.array)),garden.children.map(o=>Array.from(o.geometry.attributes.position.array)),'Product and world preview have identical geometry');
for(const o of ghost.children)assert.equal(o.material.opacity,1,'Actual decoration keeps its original appearance during preview');
let sharedDisposals=0;for(const o of garden.children)o.material.addEventListener('dispose',()=>sharedDisposals++);
decor.demoPlaced=true;decor.followPointer=false;renderer.updateSelection(farm,{placement:decor,now:farm.now()});assert(!renderer.layoutGuide.visible);assert.equal(renderer.preview.children.find(o=>o.userData.product==='rusticGarden').position.y,0);assert(renderer.preview.children.filter(o=>o.isMesh||o.isLine).every(o=>!o.visible),'Parked preview removes the placement rectangle');
decor.rotation=1;renderer.updateSelection(farm,{placement:decor,now:farm.now()});const rotatedBounds=new THREE.Box3().setFromObject(renderer.preview),size=window.BaraFarm.footprint('bench',1);assert(rotatedBounds.max.x-rotatedBounds.min.x<=size.w+.001&&rotatedBounds.max.z-rotatedBounds.min.z<=size.h+.001);
renderer.updateSelection(farm,{placement:null,now:farm.now()});assert.equal(sharedDisposals,0,'Closing or rotating preview never disposes shared world materials');assert.equal(renderer.preview,null);
assert.deepEqual(errors,[]);console.log('3D scene checks passed, including identical decoration catalog/preview geometry, footprint bounds and safe material disposal.');

