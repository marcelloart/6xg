const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('assets/js/farm-game.js','utf8'),nodes=new Map(),calls=[];
const node=id=>{if(!nodes.has(id))nodes.set(id,{dataset:{},classList:{toggle(){}},textContent:'',disabled:false,hidden:false});return nodes.get(id);};
const context={window:{},console,Intl,Map,Math,$:node,gate:{canPlay:true},entered:true,visiting:null,transactionBusy:false,placement:null,pendingBuild:null,selectedPlot:null,selectedBuilding:null,shop:'premium',panel:null,
 renderer:{mode:'3d'},productImage:()=> 'actual-model.png',camera:{width:1280,height:720,zoom:1.05,zoomAt(){},focus(){},screenToWorld:()=>({x:1850,y:1100}),worldToScreen:()=>({x:640,y:360})},
 audio:{play(){}},pickup:{reset(){},follow(){}},canvas:{focus(){}},closePanel(){},renderUI(){},toast(){},transact:async(type,args)=>{calls.push({type,args});return true;}};
vm.createContext(context);vm.runInContext(fs.readFileSync('assets/js/farm-engine.js','utf8')+'\nglobalThis.F=BaraFarm;globalThis.farm=new BaraFarm.Farm({clock:()=>1000000});',context);
vm.runInContext(source.slice(source.indexOf('function placementResult(){'),source.indexOf('function onAction(event){')),context);
(async()=>{
 const original=context.farm.serialize();assert.equal(context.farm.s.coins,0);assert.equal(context.farm.s.materials.wood,0);
 context.beginDecorationPreview();assert.equal(context.placement.product,'rusticGarden');assert(context.placement.followPointer);assert(context.placementResult().ok,'Fresh zero-balance players can try the decoration on empty land');
 context.chooseLocation({x:context.farm.s.plots[0].x,y:context.farm.s.plots[0].y});await context.confirmPlacement();assert(!context.placement.demoPlaced,'Occupied crop land rejects placement');assert.equal(calls.length,0);
 context.chooseLocation({x:1850,y:1100});await context.confirmPlacement();assert(context.placement.demoPlaced);assert(!context.placement.followPointer);assert.equal(node('confirmPlacement').textContent,'Ubah posisi');assert.equal(node('cancelPlacement').textContent,'Selesai preview');
 const parked=JSON.stringify(context.placement.point);context.chooseLocation({x:1950,y:1400});assert.equal(JSON.stringify(context.placement.point),parked,'Inspecting the parked preview cannot move it with an ordinary click');
 context.rotatePlacement();assert.equal(context.placement.rotation,1);await context.confirmPlacement();assert(context.placement.followPointer);assert(!context.placement.demoPlaced);context.chooseLocation({x:1950,y:1400});await context.confirmPlacement();assert(context.placement.demoPlaced);
 context.cancelPlacement(true);assert.equal(context.placement,null);assert.equal(context.farm.serialize(),original,'Preview, relocation, rotation and cancellation never mutate the saved farm');assert.equal(calls.length,0,'A premium preview never submits a build or purchase transaction');
 context.beginDecorationPreview();context.gate.canPlay=false;await context.confirmPlacement();assert(!context.placement.demoPlaced,'Authentication is still required');context.cancelPlacement(true);context.beginDecorationPreview();assert.equal(context.placement,null);context.gate.canPlay=true;
 context.renderer.mode='2d';context.beginDecorationPreview();assert.equal(context.placement,null,'2D mode cannot substitute another model');context.renderer.mode='3d';
 context.placement={kind:'bench',point:{x:1850,y:1100},rotation:0};await context.confirmPlacement();assert.equal(calls.length,1);assert.equal(calls[0].type,'build','Normal buildings still use the authoritative server action');
 assert(!fs.readFileSync('play/index.html','utf8').includes('data-action="premium-buy"'));console.log('Decoration preview checks passed: zero balance, collision, rotation, relocation, auth, 2D fallback and no purchase/save mutations.');
})().catch(error=>{console.error(error);process.exitCode=1;});
