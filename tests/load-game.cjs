const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
// Version-2 rules remain tested because existing accounts migrate from them.
module.exports=function loadGame(){const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const files=['assets/js/world-data.js','assets/js/engine.js','assets/js/camera.js','assets/js/game.js'];const source=files.map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n');return{html,source,files};};
