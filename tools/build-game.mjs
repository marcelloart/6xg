import {cp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'app-static');
// The output is fixed inside this repository; source and player data are never copied.
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
await cp(path.join(root,'assets'),path.join(output,'assets'),{recursive:true});
await cp(path.join(root,'play/index.html'),path.join(output,'index.html'));
await build({stdin:{contents:"export {default} from './src/game-api.mjs';",resolveDir:root,sourcefile:'game-worker.mjs'},outfile:path.join(output,'_worker.js'),bundle:true,format:'esm',platform:'browser',target:['es2022'],minify:true});
await writeFile(path.join(output,'_routes.json'),JSON.stringify({version:1,include:['/api/*'],exclude:[]}));
await writeFile(path.join(output,'_headers'),'/\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/assets/*\n  Cache-Control: public, max-age=3600\n');
const html=await readFile(path.join(output,'index.html'),'utf8');
if(!html.includes('BARA_PAGE="game"')||!html.includes('<base href="/">'))throw new Error('Invalid game entry');
console.log('Game ready in app-static/');
