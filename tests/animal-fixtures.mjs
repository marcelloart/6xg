import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export async function animalFixtures(){
 globalThis.ProgressEvent??=class{constructor(type,init){Object.assign(this,init);}};const assets={};
 for(const kind of['cow','chicken']){const data=JSON.parse(fs.readFileSync('assets/animals/'+kind+'.gltf'));data.images=[];data.textures=[];for(const m of data.materials){delete m.pbrMetallicRoughness.baseColorTexture;delete m.normalTexture;}
  for(const b of data.buffers)b.uri='data:application/octet-stream;base64,'+fs.readFileSync('assets/animals/'+b.uri).toString('base64');
  const gltf=await new GLTFLoader().parseAsync(JSON.stringify(data),''),bounds=new THREE.Box3().setFromObject(gltf.scene);gltf.scene.userData.height=bounds.max.y-bounds.min.y;gltf.scene.userData.ground=bounds.min.y;gltf.scene.traverse(o=>{if(o.isMesh)o.geometry.userData.cc0Shared=true;});assets[kind]={kind,model:gltf.scene,clips:gltf.animations};
 }return assets;
}
