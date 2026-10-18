import {build} from 'esbuild';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const result=await build({entryPoints:[path.join(root,'src/firebase-auth.jsx')],bundle:true,minify:true,splitting:true,format:'esm',platform:'browser',target:['es2022'],outdir:path.join(root,'assets/firebase-auth'),entryNames:'firebase-[hash]',chunkNames:'chunk-[hash]',metafile:true,legalComments:'linked',external:['https://www.gstatic.com/*'],define:{'process.env.NODE_ENV':'"production"'},loader:{'.svg':'dataurl','.png':'dataurl'}});
const entry=Object.entries(result.metafile.outputs).find(([,v])=>v.entryPoint?.endsWith('src/firebase-auth.jsx'))[0];
await writeFile(path.join(root,'assets/js/firebase-entry.js'),"window.BARA_FIREBASE_ENTRY="+JSON.stringify('/'+path.relative(root,entry).replaceAll('\\','/'))+";\n");
await writeFile(path.join(root,'tools/firebase-auth-outputs.json'),JSON.stringify(Object.keys(result.metafile.outputs).map(file=>path.relative(root,path.resolve(file)).replaceAll('\\','/')),null,2));
console.log('Firebase login built; legacy verification loads only when requested.');

const initial=new Set();function visit(file){if(initial.has(file))return;initial.add(file);for(const item of result.metafile.outputs[file].imports)if(item.kind!=='dynamic-import'&&!item.external)visit(item.path);}visit(entry);
const initialInputs=[...new Set([...initial].flatMap(file=>Object.keys(result.metafile.outputs[file].inputs)))];
if(initialInputs.some(file=>file.includes('@privy-io')||file.includes('@reown')||file.endsWith('legacy-account-link.jsx')))throw Error('Legacy SDK must not load during Firebase startup');
console.log('Initial Firebase package: '+[...initial].reduce((sum,file)=>sum+result.metafile.outputs[file].bytes,0)+' bytes; no Privy startup.');
