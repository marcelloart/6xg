import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {MeshoptSimplifier} from 'meshoptimizer';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),cache=path.resolve(process.argv[2]),dest=path.join(root,'assets/cc0');
await MeshoptSimplifier.ready;
const sourceManifest=JSON.parse(fs.readFileSync(path.join(dest,'sources.json'),'utf8'));
function accessor(gltf,bytes,id){const a=gltf.accessors[id],v=gltf.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],Type={5126:Float32Array,5125:Uint32Array,5123:Uint16Array}[a.componentType];if(v.byteStride)throw Error('Interleaved source needs explicit decoding');const offset=(v.byteOffset||0)+(a.byteOffset||0);return new Type(bytes.buffer,bytes.byteOffset+offset,a.count*n).slice();}
function fromGltf(id){const folder=path.join(cache,id),gltf=JSON.parse(fs.readFileSync(path.join(folder,id+'.gltf'),'utf8')),bytes=fs.readFileSync(path.join(folder,gltf.buffers[0].uri)),parts=[];
 const visit=(index,parent)=>{const node=gltf.nodes[index],local=node.matrix?new THREE.Matrix4().fromArray(node.matrix):new THREE.Matrix4().compose(new THREE.Vector3().fromArray(node.translation||[0,0,0]),new THREE.Quaternion().fromArray(node.rotation||[0,0,0,1]),new THREE.Vector3().fromArray(node.scale||[1,1,1])),world=parent.clone().multiply(local);
  if(node.mesh!==undefined)for(const p of gltf.meshes[node.mesh].primitives){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(accessor(gltf,bytes,p.attributes.POSITION),3));g.setAttribute('normal',new THREE.BufferAttribute(accessor(gltf,bytes,p.attributes.NORMAL),3));g.setAttribute('uv',new THREE.BufferAttribute(accessor(gltf,bytes,p.attributes.TEXCOORD_0),2));g.setIndex(new THREE.BufferAttribute(accessor(gltf,bytes,p.indices),1));g.applyMatrix4(world);parts.push({geometry:g,material:p.material});}
  for(const child of node.children||[])visit(child,world);
 };for(const n of gltf.scenes[gltf.scene||0].nodes)visit(n,new THREE.Matrix4());
 const images=gltf.images.map(im=>{const name=path.basename(im.uri).replace('_4k.jpg',''),alpha=name.includes('leaves_diff');return{uri:name+'-ultra.'+(alpha?'webp':'jpg')};});
 const materials=structuredClone(gltf.materials);for(const m of materials)if(m.name.includes('leaves')){m.alphaMode='MASK';m.alphaCutoff=.35;}
 return{parts,materials,images,textures:gltf.textures,samplers:gltf.samplers,extensionsUsed:gltf.extensionsUsed,extensionsRequired:gltf.extensionsRequired};
}
function fromObj(id){const object=new OBJLoader().parse(fs.readFileSync(path.join(dest,id,'source.obj'),'utf8')),parts=[];object.updateMatrixWorld(true);object.traverse(m=>{if(m.isMesh){const g=mergeVertices(m.geometry);g.applyMatrix4(m.matrixWorld);
 // OBJ uses bottom-left UVs; glTF loads images without TextureLoader's vertical flip.
 // Convert the UV origin so the original photographic images stay aligned to the scan.
 const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,1-uv.getY(i));
 parts.push({geometry:g,material:0});}});
 const images=[{uri:'color-ultra.jpg'},{uri:'normal-ultra.jpg'}],textures=[{source:0},{source:1}],mat={name:id,pbrMetallicRoughness:{baseColorTexture:{index:0},metallicFactor:0,roughnessFactor:.7},normalTexture:{index:1,scale:.6}};
 if(fs.existsSync(path.join(dest,id,'rough-ultra.jpg'))){images.push({uri:'rough-ultra.jpg'});textures.push({source:2});mat.pbrMetallicRoughness.metallicRoughnessTexture={index:2};}
 return{parts,materials:[mat],images,textures};
}
function compact(g,indices){const [remap,count]=MeshoptSimplifier.compactMesh(indices),result=new THREE.BufferGeometry();for(const field of ['position','normal','uv']){const a=g.attributes[field],out=new Float32Array(count*a.itemSize);for(let i=0;i<a.count;i++)if(remap[i]!==0xffffffff)out.set(a.array.subarray(i*a.itemSize,(i+1)*a.itemSize),remap[i]*a.itemSize);result.setAttribute(field,new THREE.BufferAttribute(out,a.itemSize));}result.setIndex(Array.from(indices));return result;}
function optimized(g,budget){const p=g.attributes.position,normal=g.attributes.normal,uv=g.attributes.uv,indices=Uint32Array.from(g.index.array);if(indices.length<=budget*3)return g.clone();const attrs=new Float32Array(p.count*5);for(let i=0;i<p.count;i++)attrs.set([normal.getX(i),normal.getY(i),normal.getZ(i),uv.getX(i),uv.getY(i)],i*5);
 const [reduced]=MeshoptSimplifier.simplifyWithAttributes(indices,p.array,3,attrs,5,[.02,.02,.02,.1,.1],null,budget*3,.035,['Permissive','PreserveFolds']);return compact(g,reduced);
}
// Keep the scan's canopy distribution. Pruning disconnected leaf meshes would make it bare.
// Photographic atlas cards at sampled leaf surfaces preserve the canopy at a practical draw cost.
function foliageLod(source,quality){const p=source.attributes.position,n=source.attributes.normal,points=new Map(),step=Math.max(1,Math.floor(p.count/({'ultra':9000,'high':5500,'low':2600}[quality]))),cell=quality==='low'?5:3.2,positions=[],normals=[],uvs=[],indices=[];
 for(let i=0;i<p.count;i+=step){const center=new THREE.Vector3().fromBufferAttribute(p,i),key=[center.x,center.y,center.z].map(v=>Math.floor(v/cell)).join(':');if(points.has(key))continue;points.set(key,i);const normal=new THREE.Vector3().fromBufferAttribute(n,i).normalize(),rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),normal),w=3.5+(i%11)*.12,h=w*1.6,start=positions.length/3;
  for(const[x,y,u,v]of[[-w/2,-h/2,0,1],[w/2,-h/2,1,1],[w/2,h/2,1,0],[-w/2,h/2,0,0]]){const vertex=new THREE.Vector3(x,y,0).applyQuaternion(rotation).add(center);positions.push(vertex.x,vertex.y,vertex.z);normals.push(normal.x,normal.y,normal.z);uvs.push(u,v);}indices.push(start,start+1,start+2,start,start+2,start+3);
 }const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);return g;
}
function writeGltf(id,quality,source,parts){const chunks=[],views=[],accessors=[],meshes=[],nodes=[];let bytes=0;
 const add=(array,itemSize,target,position=false)=>{const raw=Buffer.from(array.buffer,array.byteOffset,array.byteLength),index=views.length;views.push({buffer:0,byteOffset:bytes,byteLength:raw.length,target});chunks.push(raw);const pad=(4-raw.length%4)%4;if(pad)chunks.push(Buffer.alloc(pad));bytes+=raw.length+pad;const accessor={bufferView:index,componentType:array instanceof Uint32Array?5125:array instanceof Uint16Array?5123:5126,count:array.length/itemSize,type:{1:'SCALAR',2:'VEC2',3:'VEC3'}[itemSize]};if(position){accessor.min=[Infinity,Infinity,Infinity];accessor.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<array.length;i++) {const axis=i%3;accessor.min[axis]=Math.min(accessor.min[axis],array[i]);accessor.max[axis]=Math.max(accessor.max[axis],array[i]);}}accessors.push(accessor);return accessors.length-1;};
 for(const {geometry:g,material}of parts){const p={attributes:{POSITION:add(g.attributes.position.array,3,34962,true),NORMAL:add(g.attributes.normal.array,3,34962),TEXCOORD_0:add(g.attributes.uv.array,2,34962)},indices:add(g.index.array,1,34963),material};nodes.push({mesh:meshes.length,name:id+'-'+nodes.length});meshes.push({primitives:[p]});}
 const data={asset:{version:'2.0',generator:'6xg CC0 web asset pipeline',extras:{source:sourceManifest.assets.find(a=>a.id===id).source,license:'CC0-1.0'}},scene:0,scenes:[{nodes:nodes.map((_,i)=>i)}],nodes,meshes,accessors,bufferViews:views,buffers:[{uri:'model-'+quality+'.bin',byteLength:bytes}],materials:source.materials,images:source.images,textures:source.textures};for(const field of ['samplers','extensionsUsed','extensionsRequired'])if(source[field])data[field]=source[field];
 const folder=path.join(dest,id);for(const [file,content]of [['model-'+quality+'.bin',Buffer.concat(chunks)],['model-'+quality+'.gltf',Buffer.from(JSON.stringify(data))]]){const target=path.join(folder,file);fs.writeFileSync(target,content);sourceManifest.assets.find(a=>a.id===id).files.push({path:path.relative(root,target).replaceAll('\\','/'),bytes:content.length,sha256:createHash('sha256').update(content).digest('hex')});}
 return parts.reduce((n,p)=>n+p.geometry.index.count/3,0);
}
for(const id of ['3DApple002','3DAvocado001','3DTreeStump001','island_tree_02','boulder_01','wooden_crate_02']){sourceManifest.assets.find(a=>a.id===id).files=sourceManifest.assets.find(a=>a.id===id).files.filter(f=>!f.path.match(/model-(ultra|high|low)\.(bin|gltf)$/));const source=id.startsWith('3D')?fromObj(id):fromGltf(id),bounds=new THREE.Box3();for(const p of source.parts){p.geometry.computeBoundingBox();bounds.union(p.geometry.boundingBox);}const center=bounds.getCenter(new THREE.Vector3()),height=id==='island_tree_02'?150:1,scale=height/(bounds.max.y-bounds.min.y);for(const p of source.parts){p.geometry.translate(-center.x,-bounds.min.y,-center.z);p.geometry.scale(scale,scale,scale);}
 if(id==='island_tree_02'){const first=source.images.length;source.images.push({uri:'../LeafSet004/color-ultra.webp'},{uri:'../LeafSet004/normal-ultra.jpg'},{uri:'../LeafSet004/rough-ultra.jpg'});const texture=source.textures.length;source.textures.push({source:first},{source:first+1},{source:first+2});source.materials[1]={name:'ambientCG LeafSet004 canopy',doubleSided:true,alphaMode:'MASK',alphaCutoff:.4,normalTexture:{index:texture+1,scale:.5},pbrMetallicRoughness:{baseColorTexture:{index:texture},metallicFactor:0,metallicRoughnessTexture:{index:texture+2}}};sourceManifest.assets.find(a=>a.id===id).processing+=' Canopy converted to photographic LeafSet004 cards at the source leaf surface positions; disconnected leaves are not pruned away.';}
 for(const [quality,factor]of [['ultra',1],['high',.45],['low',.12]]){const parts=source.parts.map((p,i)=>({material:p.material,geometry:id==='island_tree_02'&&i===1?foliageLod(p.geometry,quality):optimized(p.geometry,Math.max(80,Math.round((id==='island_tree_02'?[1600,14000,4500][i]:id==='boulder_01'?3000:id==='wooden_crate_02'?1500:1800)*factor)))}));const triangles=writeGltf(id,quality,source,parts);console.log(JSON.stringify({id,quality,triangles}));}
}
fs.writeFileSync(path.join(dest,'sources.json'),JSON.stringify(sourceManifest,null,2)+'\n');
