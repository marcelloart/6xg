const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const elements=new Map(),storage=new Map();
const context={window:{},JSON,Math,Object,Number,console};vm.createContext(context);
const engine=fs.readFileSync(path.join(root,'assets/js/world-data.js'),'utf8')+fs.readFileSync(path.join(root,'assets/js/engine.js'),'utf8');
vm.runInContext(engine,context);
Object.assign(context,{$:id=>{if(!elements.has(id))elements.set(id,{});return elements.get(id);},localStorage:{getItem:key=>storage.get(key)||null}});
vm.runInContext("const SAVE_KEY='guest';let activeSaveKey=SAVE_KEY,game=new Kingdom(),loaded=false,speed=1,screen='welcome',saveTimer=0;const simulationClock={reset(){}};function handleEvent(){}function advanceGame(){}function openGamePanel(){}function focusVillage(){}function renderUI(){}",context);
context.save=()=>storage.set(vm.runInContext('activeSaveKey',context),vm.runInContext('game.serialize()',context));
const source=fs.readFileSync(path.join(root,'assets/js/game.js'),'utf8');
vm.runInContext(source.slice(source.indexOf('// Narrow interface')),context);
const adapter=context.window.BentengBara,tests=[];
function test(name,fn){fn();tests.push(name);}
test('Selecting an account preserves the existing guest snapshot in its own slot',()=>{
  vm.runInContext('game.s.time=100;',context);const guest=adapter.snapshot();adapter.attach('account-a',null);assert.equal(storage.get('guest'),guest);assert.equal(JSON.parse(storage.get('account-a')).state.time,0);
});
test('Switching accounts and logging out restores each independent campaign',()=>{
  vm.runInContext('game.s.time=200;',context);const accountA=adapter.snapshot();adapter.attach('account-b',null);vm.runInContext('game.s.time=300;',context);const accountB=adapter.snapshot();adapter.attach('account-a',accountA);assert.equal(storage.get('account-b'),accountB);adapter.detach();assert.equal(JSON.parse(adapter.snapshot()).state.time,100);assert.equal(storage.get('account-a'),accountA);
});
test('Invalid cloud data cannot replace a currently valid game',()=>{
  const previous=adapter.snapshot();assert.throws(()=>adapter.attach('account-c','{"version":2,"state":{}}'),/tidak valid/);assert.equal(adapter.snapshot(),previous);assert.equal(storage.has('account-c'),false);
});
console.log(JSON.stringify({passed:tests.length,tests},null,2));
