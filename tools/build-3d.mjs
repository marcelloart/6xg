import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const textures={},assets={};
for(const file of await readdir(path.join(root,'assets/textures'))){if(!file.endsWith('.jpg'))continue;const bytes=await readFile(path.join(root,'assets/textures',file));textures[file]='./assets/textures/'+file+'?v='+createHash('sha256').update(bytes).digest('hex').slice(0,10);}
async function scan(dir){for(const item of await readdir(path.join(root,dir),{withFileTypes:true})){const rel=dir+'/'+item.name;if(item.isDirectory()){await scan(rel);continue;}if(!/\.(jpg|webp|exr|bin|gltf)$/.test(item.name))continue;const bytes=await readFile(path.join(root,rel));assets[rel]='./'+rel+'?v='+createHash('sha256').update(bytes).digest('hex').slice(0,10);}}
await scan('assets/cc0');
await build({entryPoints:[path.join(root,'src/farm-3d.js')],bundle:true,minify:true,format:'iife',platform:'browser',target:['es2022'],outfile:path.join(root,'assets/js/farm-3d.js'),legalComments:'linked',define:{FARM_TEXTURE_URLS:JSON.stringify(textures),FARM_CC0_URLS:JSON.stringify(assets)}});
console.log('Built local 3D farm renderer');
