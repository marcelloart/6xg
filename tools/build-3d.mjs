import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const textures={};
for(const file of await readdir(path.join(root,'assets/textures'))){if(!file.endsWith('.jpg'))continue;const bytes=await readFile(path.join(root,'assets/textures',file));textures[file]='./assets/textures/'+file+'?v='+createHash('sha256').update(bytes).digest('hex').slice(0,10);}
await build({entryPoints:[path.join(root,'src/farm-3d.js')],bundle:true,minify:true,format:'iife',platform:'browser',target:['es2022'],outfile:path.join(root,'assets/js/farm-3d.js'),legalComments:'linked',define:{FARM_TEXTURE_URLS:JSON.stringify(textures)}});
console.log('Built local 3D farm renderer');
