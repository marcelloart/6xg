const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
module.exports=function loadGame(){const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const files=[...html.matchAll(/<script defer src="\.\/([^"?]+)(?:\?[^"\s]+)?"><\/script>/g)].map(match=>match[1]);if(files.length!==4)throw new Error('The game must load four JavaScript modules');const source=files.map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n');return{html,source,files};};
