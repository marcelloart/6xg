import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';

// Replace only pelvis motion. Keep the existing mesh/texture buffers cached.
const source=path.resolve('../human-source/Assets/Animations'),output='assets/people';
const manager=new THREE.LoadingManager(),fake={load(){return new THREE.Texture();},setPath(){return this;}};
manager.addHandler(/\.tga$/i,fake);THREE.TextureLoader.prototype.load=fake.load;
const files={walk:'all_animations_max_motextr_xy/m_walk_neutral.max.fbx',idle:'all_animations_max_motextr_static/m_idle_breathe_01.max.fbx',tend:'all_animations_max_motextr_static/m_crouch_idle.max.fbx',work:'all_animations_max_motextr_static/m_work_mid.max.fbx'},clips={};
for(const [name,file]of Object.entries(files)){const b=await fs.readFile(path.join(source,file));clips[name]=new FBXLoader(manager).parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'').animations[0];}
const pelvis=clip=>clip.tracks.find(t=>t.name==='Bip01.position'),standing=pelvis(clips.idle).values;
const walk=pelvis(clips.walk),walkSpeed=Math.abs(walk.values.at(-1)-walk.values[2])/clips.walk.duration;
for(const id of ['gardener','neighbor','builder']){
 const file=output+'/'+id+'.gltf',gltf=JSON.parse(await fs.readFile(file,'utf8'));
 const previous=gltf.asset.extras?.motionLayout,base=previous||{buffers:gltf.buffers.length,views:gltf.bufferViews.length,accessors:gltf.accessors.length};
 gltf.buffers.length=base.buffers;gltf.bufferViews.length=base.views;gltf.accessors.length=base.accessors;
 const node=gltf.nodes.findIndex(n=>n.name==='Bip01'),rest=gltf.nodes[node].translation,parts=[];let offset=0;
 const accessor=(values,type)=>{const n=type==='SCALAR'?1:3,bytes=Buffer.alloc(values.length*4);for(let i=0;i<values.length;i++)bytes.writeFloatLE(values[i],i*4);parts.push(bytes);const view=gltf.bufferViews.push({buffer:base.buffers,byteOffset:offset,byteLength:bytes.length})-1;offset+=bytes.length;const min=Array(n).fill(Infinity),max=Array(n).fill(-Infinity);values.forEach((v,i)=>{min[i%n]=Math.min(min[i%n],v);max[i%n]=Math.max(max[i%n],v);});return gltf.accessors.push({bufferView:view,componentType:5126,count:values.length/n,type,min,max})-1;};
 for(const animation of gltf.animations){const clip=clips[animation.name];if(!clip)continue;const channel=animation.channels.find(c=>c.target.node===node&&c.target.path==='translation');if(!channel)throw Error('Missing pelvis channel '+id+'/'+animation.name);const interpolant=pelvis(clip).createInterpolant(),times=[],values=[];
  const sample=t=>{const p=interpolant.evaluate(t);times.push(t);values.push(rest[0]+p[0]-standing[0],rest[1]+p[1]-standing[1],rest[2]+(animation.name==='walk'?0:p[2]-standing[2]));};
  for(let t=0;t<clip.duration-1e-6;t+=1/30)sample(t);sample(clip.duration);
  animation.samplers[channel.sampler]={input:accessor(times,'SCALAR'),output:accessor(values,'VEC3'),interpolation:'LINEAR'};
 }
 const motionFile=id+'-motion.bin';await fs.writeFile(output+'/'+motionFile,Buffer.concat(parts));gltf.buffers.push({uri:motionFile,byteLength:offset});
 gltf.asset.extras={...gltf.asset.extras,motionLayout:base,motionRevision:2};const scene=gltf.scenes[gltf.scene||0];scene.extras={...scene.extras,walkSpeed};
 await fs.writeFile(file,JSON.stringify(gltf));console.log(id,offset+' motion bytes, captured stride '+walkSpeed.toFixed(3)+' cm/sec');
}
const manifestFile=output+'/sources.json',manifest=JSON.parse(await fs.readFile(manifestFile,'utf8'));
for(const id of ['gardener','neighbor','builder'])for(const name of [id+'.gltf',id+'-motion.bin']){const rel=output+'/'+name,bytes=await fs.readFile(rel),entry={path:rel,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')},index=manifest.files.findIndex(e=>e.path===rel);if(index<0)manifest.files.push(entry);else manifest.files[index]=entry;}
manifest.motionNotes='Pelvis Y motion retained; forward Z locomotion removed from walk loops. World navigation owns walking displacement. Stride timing uses captured walking distance.';
await fs.writeFile(manifestFile,JSON.stringify(manifest,null,2));
