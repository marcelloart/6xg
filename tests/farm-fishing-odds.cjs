const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('assets/js/farm-engine.js','utf8'),context);
const F=context.BaraFarm,entries=Object.entries(F.FISH).sort((a,b)=>a[1].sell-b[1].sell),plain=v=>JSON.parse(JSON.stringify(v));
assert.equal(Object.keys(F.FISHING_ODDS).length,9);
assert.equal(Object.values(F.FISHING_ODDS).reduce((a,b)=>a+b,0),10000,'displayed chances must total exactly 100%');
assert.equal(F.FISHING_ODDS.arapaima,10,'Arapaima must stay at 0.1%');
for(let i=1;i<entries.length;i++)assert(F.FISHING_ODDS[entries[i-1][0]]>F.FISHING_ODDS[entries[i][0]],'higher sale value must mean a lower catch chance');
const common=entries.filter(([key])=>key!=='arapaima'),weight=common.reduce((sum,[,fish])=>sum+1/fish.sell,0);
for(const[key,fish]of common)assert(Math.abs(F.FISHING_ODDS[key]-9990/fish.sell/weight)<1,'common pool must share 99.9% in inverse proportion to sale value');
const counts=Object.fromEntries(entries.map(([key])=>[key,0])),conditions={night:false,rain:false};
for(let seed=0;seed<1000000;seed++){const catchInfo=F.fishingOutcome(seed,'worm',1,conditions);counts[catchInfo.kind]++;assert(catchInfo.length>=F.FISH[catchInfo.kind].min&&catchInfo.length<=F.FISH[catchInfo.kind].max);}
for(const[key]of entries)assert(Math.abs(counts[key]-F.FISHING_ODDS[key]*100)<=20,'million-cast distribution differs from displayed chance: '+key);
for(const seed of[0,1,83117,1234,4294967295,...Array.from({length:150},(_,i)=>Math.imul(i,2654435761)>>>0)]){
 const expected=plain(F.fishingOutcome(seed,'worm',1,conditions));
 for(const bait of Object.keys(F.BAITS))for(let rod=1;rod<=3;rod++)for(let pier=1;pier<=5;pier++)for(const night of[false,true])for(const rain of[false,true])assert.deepEqual(plain(F.fishingOutcome(seed,bait,rod,{night,rain},pier)),expected);
}
let now=1791200000000;
function ready(){const f=new F.Farm({clock:()=>now-90000});f.s.progress.xp=1400;f.s.coins=500;f.s.materials={wood:100,stone:100,meat:100};assert(f.build('pier',F.pierPoint(1460)).ok);f.clock=()=>now;f.now();assert(f.fishingStarter().ok);return f;}
for(const version of[2,3]){
 const f=ready();assert(f.startFishing(0,'worm',75319).ok);assert.equal(f.s.fishing.cast.poolVersion,3);f.s.fishing.cast.poolVersion=version;
 const c=f.s.fishing.cast,expected=plain(F.fishingOutcome(c.seed,c.bait,c.rod,c.conditions,1,version)),coins=f.s.coins,save=f.serialize(),g=new F.Farm({save,clock:()=>now});
 assert.equal(g.s.fishing.cast.poolVersion,version);assert.equal(g.s.coins,coins);assert.equal(g.s.fishing.bait.worm,2);
 now=c.biteAt;assert(g.hookFish(c.id).ok);let result;for(let i=1;i<=3;i++){now=g.s.fishing.cast.hookedAt+i*3000;result=g.reelFish(c.id);assert(result.ok);}
 assert.deepEqual(plain(result.caught),expected);assert.equal(g.s.fishing.fish[expected.kind],1);assert(!g.reelFish(c.id).ok);F.validateSave(JSON.parse(g.serialize()));
}
const uiContext={F,harvestWords:en=>en,farm:{s:{fishing:{fish:Object.fromEntries(entries.map(([key])=>[key,0]))}},used:0,capacity:20},picture:()=>'',action:()=>'',localStorage:{getItem:()=>null}};
vm.createContext(uiContext);vm.runInContext(fs.readFileSync('assets/js/farm-fishing-ui.js','utf8')+';this.markup=fishingBag();',uiContext);
for(const[key]of entries)assert(uiContext.markup.includes('data-fish-chance="'+key+'">'+(key==='arapaima'?'Legendary · ':'Catch · ')+(F.FISHING_ODDS[key]/100).toFixed(2)+'%'));
uiContext.harvestWords=(en,id)=>id;vm.runInContext('this.markup=fishingBag();',uiContext);assert(uiContext.markup.includes('Legendaris · 0,10%'));assert(uiContext.markup.includes('Total: 100%.'));
console.log('All nine price-weighted chances total 100%; one million catches match; gear/weather do not alter odds; old casts and EN/ID labels passed.');
console.table(entries.map(([key,fish])=>({fish:fish.idName,sell:fish.sell,chance:(F.FISHING_ODDS[key]/100).toFixed(2)+'%',observed:counts[key]})));
