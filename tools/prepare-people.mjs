import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
const source=path.resolve('../human-source/Assets');
const manager=new THREE.LoadingManager();
const fakeLoader={load(file){const texture=new THREE.Texture();texture.userData.file=path.basename(file.replaceAll('\\','/'));return texture;},setPath(){return this;}};
manager.addHandler(/\.tga$/i,fakeLoader);
THREE.TextureLoader.prototype.load=fakeLoader.load;
const loader=new FBXLoader(manager);
async function read(file){const b=await fs.readFile(path.join(source,file));return loader.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result='data:application/octet-stream;base64,'+Buffer.from(b).toString('base64');this.onloadend?.();});}};
const output='assets/people';await fs.mkdir(output,{recursive:true});
const motions={walk:'all_animations_max_motextr_xy/m_walk_neutral.max.fbx',idle:'all_animations_max_motextr_static/m_idle_breathe_01.max.fbx',tend:'all_animations_max_motextr_static/m_crouch_idle.max.fbx',work:'all_animations_max_motextr_static/m_work_mid.max.fbx'};
const clips={};for(const [name,file]of Object.entries(motions)){const model=await read('Animations/'+file);clips[name]=model.animations[0];clips[name].name=name;}
const sources={gardener:'Professions/Gardener_Male_01',builder:'Professions/Construction_Male_01',neighbor:'Adults/Female_Adult_03'};
for(const [id,folder]of Object.entries(sources)){
 const name=folder.split('/').pop(),model=await read('Avatars/'+folder+'/Export/'+name+'.fbx'),maps=new Map();model.animations=[];for(const light of [...model.children].filter(o=>o.isLight))model.remove(light);
 model.traverse(o=>{if(!o.isMesh)return;o.geometry=mergeVertices(o.geometry);const uv=o.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,1-uv.getY(i));o.material=(Array.isArray(o.material)?o.material:[o.material]).map(m=>{const map=m.map?.userData.file,normal=m.normalMap?.userData.file,alpha=!!m.alphaMap;const converted=new THREE.MeshStandardMaterial({name:m.name,color:0xffffff,roughness:.82,metalness:0,side:alpha?THREE.DoubleSide:THREE.FrontSide,alphaTest:alpha?.45:0});maps.set(m.name,{map,normal,alpha});return converted;});});
 const animations=Object.values(clips).map(original=>{const clip=original.clone();clip.tracks=clip.tracks.filter(t=>model.getObjectByName(t.name.split('.')[0])&&!/Footsteps/.test(t.name)&&!t.name.endsWith('.scale')).map(t=>{
   if(!t.name.endsWith('.position'))return t;const bone=model.getObjectByName(t.name.split('.')[0]),p=bone.position;const values=t.values.slice();
   // Rocketbox uses Y for height and Z for forward motion. Navigation supplies
   // walking displacement; copying captured Z here makes every walk loop jump back.
   for(let i=0;i<values.length;i+=3){values[i]=p.x;values[i+1]=p.y;values[i+2]=p.z;if(bone.name==='Bip01'){const standing=clips.idle.tracks.find(t=>t.name==='Bip01.position');values[i]+=t.values[i]-standing.values[0];values[i+1]+=t.values[i+1]-standing.values[1];if(clip.name!=='walk')values[i+2]+=t.values[i+2]-standing.values[2];}}
   return new THREE.VectorKeyframeTrack(t.name,t.times.slice(),values);
 });clip.tracks=clip.tracks.map(track=>{const interpolate=track.createInterpolant(),times=[],values=[];for(let t=0;t<clip.duration;t+=1/30){times.push(t);values.push(...interpolate.evaluate(t));}times.push(clip.duration);values.push(...interpolate.evaluate(clip.duration));return new track.constructor(track.name,times,values).optimize();});return clip;});
 const gltf=await new GLTFExporter().parseAsync(model,{animations,onlyVisible:true});
 for(const material of gltf.materials){const info=maps.get(material.name);if(!info)continue;material.pbrMetallicRoughness.baseColorFactor=[1,1,1,1];
  const texture=file=>{gltf.images??=[];gltf.textures??=[];gltf.samplers??=[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}];const source=gltf.images.push({uri:file.replace(/\.tga$/i,'.webp')})-1;return {index:gltf.textures.push({source,sampler:0})-1};};
  if(info.map)material.pbrMetallicRoughness.baseColorTexture=texture(info.map);if(info.normal)material.normalTexture={...texture(info.normal),scale:.6};if(info.alpha){material.alphaMode='MASK';material.alphaCutoff=.45;material.doubleSided=true;}
 }
 for(const buffer of gltf.buffers){const bytes=Buffer.from(buffer.uri.split(',')[1],'base64');await fs.writeFile(output+'/'+id+'.bin',bytes);buffer.uri=id+'.bin';}
 gltf.asset.copyright='Microsoft Rocketbox, Copyright (c) 2020 Microsoft, MIT License. Adapted for 6XG Harvest.';
 await fs.writeFile(output+'/'+id+'.gltf',JSON.stringify(gltf));console.log(id,animations.map(c=>[c.name,c.duration,c.tracks.length]));
}
await fs.copyFile(path.resolve('../human-source/LICENSE.md'),output+'/LICENSE-Microsoft.md');
await import('./prepare-people-motion.mjs');
