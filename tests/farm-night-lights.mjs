import assert from 'node:assert/strict';
import * as THREE from 'three';
import '../assets/js/farm-engine.js';
import '../assets/js/farm-daylight.js';
import {FarmNightLights,lanternSites,lanternPower} from '../src/farm-night-lights.js';
const F=globalThis.BaraFarm,now=Date.parse('2026-10-05T22:00:00+07:00');
const farm=new F.Farm({clock:()=>now});
farm.s.buildings=[{slot:0,kind:'barn',x:1950,y:1000,rotation:0,readyAt:now-1},{slot:1,kind:'pier',x:850,y:1600,rotation:0,readyAt:now-1},{slot:2,kind:'kitchen',x:2200,y:1000,rotation:0,readyAt:now+1}];
const sites=lanternSites(farm,now,F,()=>0);
assert(sites.length>=12);assert.equal(new Set(sites.map(s=>s.id)).size,sites.length);
assert(sites.some(s=>s.id==='building:0'));assert(!sites.some(s=>s.id==='building:2'));
const owned={slot:3,kind:'lamp',x:1870,y:1350,rotation:0,readyAt:now-1};farm.s.buildings.push(owned);
let personal=lanternSites(farm,now,F,()=>0).find(s=>s.id==='building:3');assert(personal.fixture&&personal.x===1870&&personal.z===1350,'Owned lamp keeps its chosen position without a duplicate frame');
owned.x=2070;personal=lanternSites(farm,now,F,()=>0).find(s=>s.id==='building:3');assert.equal(personal.x,2070,'Light follows the moved fixture');farm.s.buildings.pop();assert(!lanternSites(farm,now,F,()=>0).some(s=>s.id==='building:3'),'Sold fixture removes its light');
for(const s of sites.filter(s=>!s.pier)){
 assert(Math.abs(s.x-F.riverCenter(s.z))>117,'Lamps stand on land');
 for(const b of farm.s.buildings){const size=F.footprint(b.kind,b.rotation);assert(Math.abs(s.x-b.x)>=size.w/2+12||Math.abs(s.z-b.y)>=size.h/2+12,'Fixtures do not overlap owned buildings');}
}
const morning=Date.parse('2026-10-05T12:00:00+07:00');assert.equal(lanternPower(FarmDaylight.at(morning).daylight),0);assert.equal(lanternPower(FarmDaylight.at(now).daylight),1);
let previous=0;for(let t=17*3600000;t<=19*3600000;t+=1000){const power=lanternPower(FarmDaylight.at(Date.parse('2026-10-05T00:00:00+07:00')+t).daylight);assert(power>=previous&&power-previous<.003,'Dusk lights fade smoothly');previous=power;}
const view=new THREE.OrthographicCamera(-600,600,400,-400,.1,10000);view.position.set(1593,900,1800);view.lookAt(1593,0,1100);view.updateMatrixWorld();
for(const quality of ['low','medium','high','ultra']){
 const scene=new THREE.Scene(),lights=new FarmNightLights(scene,quality,()=>0,F),original=farm.serialize();
 lights.update(farm,now,1000,FarmDaylight.at(now),view,{});lights.update(farm,now,2000,FarmDaylight.at(now),view,{});
 assert.equal(lights.lights.length,quality==='low'?2:quality==='ultra'?6:4);assert(lights.lights.every(s=>s.light.castShadow===false));assert(lights.lights.some(s=>s.light.intensity>0));
 assert.equal(lights.pools.count,lights.sites.filter(s=>!s.pier).length,'River/deck does not get an artificial ground pool');
 assert.equal(farm.serialize(),original,'Ambient lamps do not mutate progress');
 const old=lights.sites.find(s=>s.id==='building:0');farm.s.buildings[0].x+=350;
 lights.update(farm,now,3000,FarmDaylight.at(now),view,{});const moved=lights.sites.find(s=>s.id==='building:0');assert(moved.x!==old.x);
 lights.update(farm,now,4000,FarmDaylight.at(now),view,{placement:{point:{x:2000,y:1000},moveBuilding:0}});assert.equal(lights.frames.count,lights.sites.length-1,'Moving preview hides the lamp at its old site');
 lights.update(farm,morning,5000,FarmDaylight.at(morning),view,{});for(let tick=5100;tick<=10000;tick+=100)lights.update(farm,morning,tick,FarmDaylight.at(morning),view,{});assert(lights.lights.every(s=>s.light.intensity<.01));assert(!lights.halos.visible&&!lights.pools.visible);
 lights.dispose();assert.equal(scene.children.length,0);farm.s.buildings[0].x-=350;
}
console.log('Night lights: Jakarta fade, land placement, construction/move synchronization, mobile budgets, no save mutations and disposal passed.');
