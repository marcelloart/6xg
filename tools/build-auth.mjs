import {build} from 'esbuild';
import {mkdir, writeFile, readdir, unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const result=await build({
  entryPoints:[path.join(root,'src/privy.jsx')],
  bundle:true,minify:true,splitting:true,format:'esm',platform:'browser',target:['es2022'],
  outdir:path.join(root,'assets/auth'),entryNames:'privy-[hash]',chunkNames:'chunk-[hash]',
  assetNames:'asset-[hash]',metafile:true,legalComments:'linked',
  define:{'process.env.NODE_ENV':'"production"'},
  loader:{'.svg':'dataurl','.png':'dataurl'},
});
const entry=Object.entries(result.metafile.outputs).find(([,v])=>v.entryPoint?.endsWith('src/privy.jsx'))[0];
const outputFiles=new Set(Object.keys(result.metafile.outputs).map(file=>path.basename(file)));
const authDir=path.join(root,'assets/auth');
// Remove only stale generated files inside the verified build output directory.
if(!authDir.startsWith(root+path.sep))throw new Error('Invalid authentication output path');
for(const file of await readdir(authDir)){
  if(/^(privy|chunk|asset)-[\w-]+\.(js|css)(\.LEGAL\.txt)?$/.test(file)&&!outputFiles.has(file))await unlink(path.join(authDir,file));
}
await mkdir(path.join(root,'assets/js'),{recursive:true});
await writeFile(path.join(root,'assets/js/auth-entry.js'),
  "'use strict';\nwindow.BARA_AUTH_ENTRY="+JSON.stringify('/'+path.relative(root,entry).replaceAll('\\','/'))+";\n");
console.log('Built Privy login with '+Object.keys(result.metafile.outputs).length+' assets');
