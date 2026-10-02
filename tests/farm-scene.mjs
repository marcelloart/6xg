import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const errors=[],window={};
const source=fs.readFileSync('src/farm-3d.js','utf8').replace(/^import .*;\r?\n/gm,'');
const context={THREE,mergeGeometries,window,FARM_TEXTURE_URLS:{},console:{error:(...args)=>errors.push(args),warn:()=>{}}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('assets/js/farm-engine.js','utf8')+'\nwindow.BaraFarm=BaraFarm;'+fs.readFileSync('assets/js/farm-camera.js','utf8')+'\nwindow.Camera=FarmCamera;',context);
vm.runInContext(source+'\nwindow.GeometryTests={mergeStatic,FarmRenderer3D,windMaterial,makeRiverGeometry,riverMaterial};',context);
const {mergeStatic,FarmRenderer3D}=window.GeometryTests;
const group=new THREE.Group(),mat=new THREE.MeshStandardMaterial();let vertices=0;
for(const geometry of[new THREE.BoxGeometry(),new THREE.SphereGeometry(),new THREE.CylinderGeometry(),new THREE.DodecahedronGeometry(1,1)]){vertices+=geometry.index?geometry.index.count:geometry.attributes.position.count;const mesh=new THREE.Mesh(geometry,mat);mesh.position.x=group.children.length*4;group.add(mesh);}
mergeStatic(group);assert.equal(group.children.length,1);assert.equal(group.children[0].geometry.attributes.position.count,vertices,'Mixed rock and building geometry must not disappear while batching');group.children[0].geometry.computeBoundingBox();assert(group.children[0].geometry.boundingBox.max.x>11);
const renderer=Object.create(FarmRenderer3D.prototype);renderer.materials=Object.fromEntries(['soil','stone','glass','wood','darkWood','straw','plaster','roof','iron','green','leaves'].map(key=>[key,new THREE.MeshStandardMaterial({side:key==='leaves'?THREE.DoubleSide:THREE.FrontSide})]));
renderer.fruitMaterials=Object.fromEntries(Object.keys(window.BaraFarm.CROPS).map(key=>[key,new THREE.MeshStandardMaterial()]));
for(const kind of['house','barn','shed','well'])for(const complete of[false,true]){const model=renderer.building(kind,complete);assert(model.children.length>0,kind);for(const mesh of model.children){assert(mesh.geometry.attributes.position.count>0);mesh.geometry.computeBoundingBox();assert(Number.isFinite(mesh.geometry.boundingBox.max.y),kind+' bounds');}}
for(const crop of Object.keys(window.BaraFarm.CROPS))for(const stage of[0,.5,1]){const model=renderer.makeCrop(crop,stage);assert(model.children.length>0,crop);for(const mesh of model.children)assert(mesh.geometry.attributes.position.count>0,crop);}
renderer.camera=new window.Camera();renderer.camera.resize(1280,720);renderer.camera.zoom=2;renderer.camera.focus(1592,1084);renderer.view=new THREE.OrthographicCamera(-1,1,1,-1,10,6200);renderer.cropLayer=new THREE.Group();renderer.farmLayer=new THREE.Group();
const apple=renderer.makeCrop('apple',1);apple.position.set(1592,0,1084);apple.userData.plotId=4;renderer.cropLayer.add(apple);apple.updateMatrixWorld(true);
const leaves=apple.children.find(m=>m.material===renderer.materials.leaves),vertices3d=leaves.geometry.attributes.position;let canopy=new THREE.Vector3(),highest=-Infinity;
for(let i=0;i<vertices3d.count;i+=3){const p=new THREE.Vector3().fromBufferAttribute(vertices3d,i).add(new THREE.Vector3().fromBufferAttribute(vertices3d,i+1)).add(new THREE.Vector3().fromBufferAttribute(vertices3d,i+2)).divideScalar(3);if(p.y>highest){highest=p.y;canopy=p;}}
canopy=leaves.localToWorld(canopy);
for(let i=0;i<8;i++){renderer.camera.rotate(Math.PI/4);renderer.updateView();const screen=renderer.camera.worldToScreen(canopy.x,canopy.z,canopy.y),projected=canopy.clone().project(renderer.view);assert(Math.abs(screen.x-(projected.x+1)*640)<1e-6);assert(Math.abs(screen.y-(1-projected.y)*360)<1e-6);assert.equal(renderer.pickPlot(renderer.camera.screenToWorld(screen.x,screen.y)),4,'A canopy click belongs to its fruit tree after rotation');}
renderer.pondok=renderer.building('house');renderer.pondok.position.set(1592,0,1084);renderer.pondok.userData.building=true;const roof=renderer.camera.worldToScreen(1592,1084,104);assert.equal(renderer.pickPlot(renderer.camera.screenToWorld(roof.x,roof.y)),-1,'An occluding roof blocks a click through to a crop');
const river=window.GeometryTests.makeRiverGeometry();for(let i=0;i<river.attributes.normal.count;i++)assert(river.attributes.normal.getY(i)>.99,'River surface faces the daylight');
const clock={value:2},strength={value:4},wind=window.GeometryTests.windMaterial(new THREE.MeshStandardMaterial(),clock,strength),shader={uniforms:{},vertexShader:'#include <begin_vertex>'};wind.onBeforeCompile(shader);assert.equal(shader.uniforms.baraWindTime,clock);assert(shader.vertexShader.includes('inverse(mat3(instanceMatrix))'));const depthShader={uniforms:{},vertexShader:'#include <begin_vertex>'};wind.userData.windDepth.onBeforeCompile(depthShader);assert.equal(depthShader.vertexShader,shader.vertexShader,'Visible foliage and shadow use identical wind deformation');assert(window.GeometryTests.riverMaterial(clock).fragmentShader.includes('sparkle'));
for(const kind of [...Object.keys(window.BaraFarm.CROPS),...Object.keys(window.BaraFarm.MATERIALS)])assert(renderer.catalogueProduct(kind).children.length>0,'Product artwork '+kind);
const farm=new window.BaraFarm.Farm({clock:()=>1000000});farm.plant(0,'carrot');renderer.pondok=null;renderer.scene=new THREE.Scene();renderer.syncFarm(farm,farm.now());
const soil=renderer.farmLayer.children.find(o=>o.userData.plotId===0),crop=renderer.cropLayer.children.find(o=>o.userData.plotId===0);
assert.equal(renderer.pickPlot(renderer.camera.screenToWorld(...Object.values(renderer.camera.worldToScreen(farm.s.plots[1].x,farm.s.plots[1].y)))),1,'Empty soil is picked by its stable plot id');
const placement={kind:'plot',movePlot:0,point:{x:2100,y:1500},rotation:0,lifted:true,valid:true};
renderer.updateSelection(farm,{placement,now:farm.now()});assert.equal(soil.visible,false);assert.equal(crop.visible,false);assert(renderer.preview.children.length>=3,'Lifted plot includes the soil and living crop');const preview=renderer.preview;
placement.point={x:2110,y:1510};placement.valid=false;renderer.updateSelection(farm,{placement,now:farm.now()});assert.equal(renderer.preview,preview,'Following the cursor reuses the preview instead of rebuilding geometry');assert.equal(preview.position.x,2110);assert.equal(renderer.previewFill.color.getHexString(),'e26854');
renderer.updateSelection(farm,{placement:null,now:farm.now()});assert.equal(soil.visible,true);assert.equal(crop.visible,true);assert.equal(renderer.preview,null,'Cancel restores originals and removes the temporary ghost');
assert.deepEqual(errors,[]);console.log('3D scene checks passed: mixed geometry, four buildings, all crop stages, rotated canopy picking, and roof occlusion.');

