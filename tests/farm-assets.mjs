import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {modelInstance} from '../src/farm-assets.js';

const manifest=JSON.parse(fs.readFileSync('assets/cc0/sources.json','utf8'));
assert.equal(manifest.assets.length,20);
for(const asset of manifest.assets){assert.equal(asset.license,'CC0-1.0');assert(['ambientCG','Poly Haven'].includes(asset.provider));const seen=new Set();for(const file of asset.files){assert(!seen.has(file.path),'Duplicate processing entry '+file.path);seen.add(file.path);const bytes=fs.readFileSync(file.path);assert.equal(bytes.length,file.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),file.sha256);}}
globalThis.ProgressEvent=class {constructor(type,init){this.type=type;Object.assign(this,init);}};
let models=0;
for(const id of ['3DApple002','3DAvocado001','3DTreeStump001','island_tree_02','boulder_01','wooden_crate_02'])for(const quality of ['ultra','high','low']){
 const folder='assets/cc0/'+id+'/',gltf=JSON.parse(fs.readFileSync(folder+'model-'+quality+'.gltf','utf8'));
 // Texture bytes and licensing are checked above. Parse actual geometry without a DOM image decoder.
 gltf.images=[];gltf.textures=[];gltf.materials=gltf.materials.map(m=>({name:m.name,doubleSided:m.doubleSided,alphaMode:m.alphaMode,pbrMetallicRoughness:{metallicFactor:0}}));gltf.extensionsRequired=[];gltf.extensionsUsed=[];
 for(const buffer of gltf.buffers)buffer.uri='data:application/octet-stream;base64,'+fs.readFileSync(folder+buffer.uri).toString('base64');
 const model=(await new GLTFLoader().parseAsync(JSON.stringify(gltf),'')).scene,bounds=new THREE.Box3().setFromObject(model),height=bounds.max.y-bounds.min.y;
 assert(height>0&&Number.isFinite(height));assert(Math.abs(bounds.getCenter(new THREE.Vector3()).x)<4);assert(bounds.min.y>-.02);
 let triangles=0;model.traverse(m=>{if(!m.isMesh)return;assert(m.geometry.attributes.uv.count===m.geometry.attributes.position.count);for(const a of Object.values(m.geometry.attributes))for(const n of a.array)assert(Number.isFinite(n));triangles+=m.geometry.index.count/3;m.geometry.userData.cc0Shared=true;});
 if(id==='3DApple002'&&quality==='ultra'){
  const original=new OBJLoader().parse(fs.readFileSync(folder+'source.obj','utf8')),box=new THREE.Box3().setFromObject(original),center=box.getCenter(new THREE.Vector3()),scale=1/(box.max.y-box.min.y),samples=[];
  original.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position,uv=m.geometry.attributes.uv;for(let i=0;i<p.count;i++)samples.push([(p.getX(i)-center.x)*scale,(p.getY(i)-box.min.y)*scale,(p.getZ(i)-center.z)*scale,uv.getX(i),1-uv.getY(i)]);});
  model.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position,uv=m.geometry.attributes.uv;for(let i=0;i<p.count;i++)assert(samples.some(([x,y,z,u,v])=>Math.abs(x-p.getX(i))<1e-5&&Math.abs(y-p.getY(i))<1e-5&&Math.abs(z-p.getZ(i))<1e-5&&Math.abs(u-uv.getX(i))<1e-5&&Math.abs(v-uv.getY(i))<1e-5),'OBJ photographic UV origin is converted to glTF');});
 }
 assert(triangles<22000,'Web geometry budget '+id+' '+quality);
 model.userData.height=height;const clone=modelInstance(model,40);clone.updateMatrixWorld(true);const scaled=new THREE.Box3().setFromObject(clone);assert(Math.abs(scaled.max.y-scaled.min.y-40)<.01);
 const originalMeshes=[],clonedMeshes=[];model.traverse(o=>{if(o.isMesh)originalMeshes.push(o);});clone.traverse(o=>{if(o.isMesh)clonedMeshes.push(o);});for(let i=0;i<originalMeshes.length;i++)assert.equal(originalMeshes[i].geometry,clonedMeshes[i].geometry,'Instances retain the shared imported geometry');models++;
}
console.log('CC0 assets verified: 20 licensed sources, byte hashes, 18 model LODs, finite UVs, normalized placement sizes, and shared geometry.');
