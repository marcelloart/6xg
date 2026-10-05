import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('assets/js/farm-engine.js','utf8'),context);vm.runInContext(fs.readFileSync('assets/js/farm-fishing-auto.js','utf8'),context);
const F=context.BaraFarm,{Pull}=context.FarmFishingAuto,flush=()=>new Promise(resolve=>setImmediate(resolve));
let now=1791200000000,enabled=true,identity='player-a',calls=[];
function ready(){const farm=new F.Farm({clock:()=>now-90000});farm.s.progress.xp=1400;farm.s.materials={wood:100,stone:100,meat:100};assert(farm.build('pier',F.pierPoint(1460)).ok);farm.clock=()=>now;farm.now();farm.fishingStarter();return farm;}
let farm=ready();const auto=new Pull({getFarm:()=>farm,clock:()=>now,identity:()=>identity,stage:F.fishingStage,enabled:()=>enabled,run:async job=>{calls.push(job.type);const result=job.type==='fish-hook'?farm.hookFish(job.id):farm.reelFish(job.id);assert(result.ok);return true;}});
assert(farm.startFishing(0,'worm',321).ok);let cast=farm.s.fishing.cast;
for(const time of[cast.startedAt,cast.biteAt-1,cast.biteAt+149]){now=time;auto.tick();await flush();}assert.deepEqual(calls,[]);
now=cast.biteAt+200;auto.tick();auto.tick();await flush();assert.deepEqual(calls,['fish-hook']);
for(let reel=1;reel<=3;reel++){now=cast.hookedAt+reel*3000-601;auto.tick();await flush();assert.equal(calls.length,reel);now++;for(let i=0;i<10;i++)auto.tick();await flush();assert.equal(calls.length,reel+1);}
assert.equal(farm.s.fishing.caught,1);assert.equal(farm.s.fishing.bait.worm,2);assert.equal(farm.s.fishing.cast,null);
now+=60000;auto.tick();await flush();assert.equal(calls.length,4);assert.equal(farm.s.fishing.bait.worm,2,'auto never casts again');
assert(farm.startFishing(0,'worm',555).ok);cast=farm.s.fishing.cast;now=cast.biteAt+200;enabled=false;auto.tick();await flush();assert.equal(calls.length,4);assert(!cast.hookedAt);
enabled=true;auto.tick();enabled=false;await flush();assert.equal(calls.length,4,'disabling before dispatch stops the queued action');
enabled=true;now+=801;auto.tick();await flush();assert(cast.hookedAt);
farm.s.produce.carrot=farm.capacity-farm.used;for(let reel=1;reel<=3;reel++){now=cast.hookedAt+reel*3000-600;auto.tick();await flush();}
assert.equal(farm.s.fishing.cast.reels,3);assert.equal(farm.s.fishing.caught,1);const fullCalls=calls.length;now+=10000;auto.tick();await flush();assert.equal(calls.length,fullCalls,'a full bag does not spam transactions');
farm.sell('carrot',1);auto.tick();await flush();assert.equal(farm.s.fishing.caught,2);assert.equal(farm.s.fishing.cast,null);
// A slow request holds a single slot even while animation frames and clocks advance.
farm=ready();farm.startFishing(0,'worm',999);cast=farm.s.fishing.cast;now=cast.biteAt+200;let resolve,slowCalls=0;
const slow=new Pull({getFarm:()=>farm,clock:()=>now,identity:()=>identity,stage:F.fishingStage,enabled:()=>enabled,run:()=>{slowCalls++;return new Promise(r=>resolve=r);}});
slow.tick();await flush();now+=1000;for(let i=0;i<100;i++)slow.tick();await flush();assert.equal(slowCalls,1);resolve(false);await flush();slow.tick();await flush();assert.equal(slowCalls,2,'a failed request can retry after backoff');resolve(false);await flush();
// Login changes and a replaced farm cannot receive a job queued for the old owner.
now+=1000;slow.tick();identity='player-b';farm=ready();await flush();assert.equal(slowCalls,2);slow.tick();await flush();assert.equal(slowCalls,2);
identity=null;auto.tick();await flush();assert.equal(calls.length,fullCalls+1);
console.log('Automatic hook/reel timing, one catch per cast, disable, retry, full bag and identity isolation passed.');
