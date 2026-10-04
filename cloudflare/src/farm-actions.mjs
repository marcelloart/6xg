import '../../assets/js/farm-engine.js';
import {sharedRow} from './farm-sharing.mjs';
const F=globalThis.BaraFarm;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const exact=(value,keys)=>object(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
const int=(v,lo,hi)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
const point=p=>exact(p,['x','y'])&&int(p.x,0,3200)&&int(p.y,0,2200);
const specs={
 plant:[['id','crop'],a=>int(a.id,0,80)&&Object.hasOwn(F.CROPS,a.crop),f=>a=>f.plant(a.id,a.crop)],
 harvest:[['id'],a=>int(a.id,0,80),f=>a=>f.harvest(a.id)],
 seed:[['crop','qty'],a=>Object.hasOwn(F.CROPS,a.crop)&&int(a.qty,1,100),f=>a=>f.buySeed(a.crop,a.qty)],
 sell:[['crop','qty'],a=>Object.hasOwn(F.CROPS,a.crop)&&int(a.qty,1,10000),f=>a=>f.sell(a.crop,a.qty)],
 material:[['material','qty'],a=>Object.hasOwn(F.MATERIALS,a.material)&&int(a.qty,1,100),f=>a=>f.buyMaterial(a.material,a.qty)],
 kit:[['kind'],a=>Object.hasOwn(F.BUILDINGS,a.kind),f=>a=>f.buildingUnlocked(a.kind)?f.buyBuildKit(a.kind):{ok:false,message:'Bangunan ini belum terbuka.'}],
 build:[['kind','point','rotation'],a=>Object.hasOwn(F.BUILDINGS,a.kind)&&point(a.point)&&int(a.rotation,0,3),f=>a=>f.build(a.kind,a.point,a.rotation)],
 'move-building':[['slot','point','rotation'],a=>int(a.slot,0,23)&&point(a.point)&&int(a.rotation,0,3),f=>a=>f.moveBuilding(a.slot,a.point,a.rotation)],
 'move-plot':[['id','point'],a=>int(a.id,0,80)&&point(a.point),f=>a=>f.movePlot(a.id,a.point)],
 expand:[['point','count','rotation'],a=>point(a.point)&&[1,3,6].includes(a.count)&&int(a.rotation,0,3),f=>a=>f.expandGarden(a.point,a.count,a.rotation)],
 profile:[['profile'],a=>object(a.profile)&&Object.keys(a.profile).every(k=>['name','farmName','avatar','photo','useAccountPhoto'].includes(k)),f=>a=>f.updateProfile(a.profile)],
 order:[['id'],a=>typeof a.id==='string'&&/^\d:\d{1,10}:\d{1,2}$/.test(a.id),f=>a=>f.deliverOrder(a.id)],
 tutorial:[['dismissed'],a=>typeof a.dismissed==='boolean',f=>a=>f.tutorialDismiss(a.dismissed)],
 production:[['slot','recipe'],a=>int(a.slot,0,23)&&Object.hasOwn(F.RECIPES,a.recipe),f=>a=>f.startProduction(a.slot,a.recipe)],
 collect:[['id'],a=>int(a.id,1,1e9),f=>a=>f.collectProduction(a.id)],
 goods:[['recipe','qty'],a=>Object.hasOwn(F.RECIPES,a.recipe)&&int(a.qty,1,10000),f=>a=>f.sellGoods(a.recipe,a.qty)],
 daily:[['id'],a=>typeof a.id==='string'&&/^\d{1,5}:(plant|harvest|order)$/.test(a.id),f=>a=>f.claimDaily(a.id)],
 animal:[['slot','kind'],a=>int(a.slot,0,23)&&Object.hasOwn(F.ANIMALS,a.kind),f=>a=>f.buyAnimal(a.slot,a.kind)],
 feed:[['id'],a=>int(a.id,1,1e9),f=>a=>f.feedAnimal(a.id)],
 'animal-collect':[['id'],a=>int(a.id,1,1e9),f=>a=>f.collectAnimal(a.id)],
 'animal-sell':[['product','qty'],a=>Object.hasOwn(F.ANIMAL_PRODUCTS,a.product)&&int(a.qty,1,10000),f=>a=>f.sellAnimalProduct(a.product,a.qty)],
 sharing:[['enabled'],a=>typeof a.enabled==='boolean',f=>a=>f.setSharing(a.enabled,crypto.randomUUID().replaceAll('-','').slice(0,16).toUpperCase())],
 friend:[['code'],a=>F.friendCode(a.code),f=>a=>f.addFriend(a.code)],
 'unfriend':[['code'],a=>F.friendCode(a.code),f=>a=>f.removeFriend(a.code)],
 achievement:[['key'],a=>Object.hasOwn(F.ACHIEVEMENTS,a.key),f=>a=>f.claimAchievement(a.key)]
};
export function parseAction(p){
 if(!exact(p,['id','revision','type','args'])||typeof p.id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id)||!int(p.revision,0,Number.MAX_SAFE_INTEGER-1)||!Object.hasOwn(specs,p.type))throw new TypeError('Invalid action');
 const [keys,valid]=specs[p.type];if(!exact(p.args,keys)||!valid(p.args))throw new TypeError('Invalid arguments');return p;
}
export function serverFarm(save,now){
 const farm=new F.Farm({save,clock:()=>now});
 // A legacy snapshot cannot dictate the server clock after migration.
 if(farm.s.lastSeen>now){const shift=farm.s.lastSeen-now;farm.s.lastSeen=now;for(const p of farm.s.plots)if(p.crop){p.plantedAt=Math.max(1,p.plantedAt-shift);p.readyAt=p.plantedAt+F.CROPS[p.crop].minutes*60000;}for(const b of farm.s.buildings){b.startedAt=Math.max(1,b.startedAt-shift);b.readyAt=b.startedAt+F.BUILDINGS[b.kind].seconds*1000;}const tails=new Map();for(const j of farm.s.production.jobs){j.startedAt=Math.max(1,j.startedAt-shift,farm.s.buildings.find(b=>b.slot===j.slot).readyAt,tails.get(j.slot)||0);j.readyAt=j.startedAt+F.RECIPES[j.recipe].minutes*60000;tails.set(j.slot,j.readyAt);}for(const a of farm.s.livestock.animals)if(a.fedAt){a.fedAt=Math.max(1,a.fedAt-shift,farm.s.buildings.find(b=>b.slot===a.slot).readyAt);a.readyAt=a.fedAt+F.ANIMALS[a.kind].minutes*60000;}for(const e of farm.s.log)e.at=Math.min(now,e.at);}
 farm.now();return farm;
}
const snapshot=(uid,row,now)=>({userId:uid,save:JSON.parse(serverFarm(row?JSON.parse(row.save):null,now).serialize()),revision:row?.revision||0,savedAt:row?.saved_at||null,serverTime:now,authoritative:true});
const read=(db,uid)=>db.prepare('SELECT save, revision, saved_at FROM farm_saves WHERE user_id = ?').bind(uid).first();
export async function loadFarm(db,uid,now=Date.now()){return snapshot(uid,await read(db,uid),now);}
export async function runFarmAction(db,uid,p,now=Date.now()){
 parseAction(p);
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([p.revision,p.type,p.args]))),hash=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
 const receipt=()=>db.prepare('SELECT request_hash, result FROM farm_actions WHERE user_id = ? AND action_id = ?').bind(uid,p.id).first();
 const replay=async r=>r.request_hash===hash?{status:200,data:{...await loadFarm(db,uid,now),result:JSON.parse(r.result),replayed:true}}:{status:409,data:{error:'action_id_reused'}};
 const previous=await receipt();if(previous)return replay(previous);
 const row=await read(db,uid);if(p.revision!==(row?.revision||0))return{status:409,data:{error:'save_conflict',...snapshot(uid,row,now)}};
 if(p.type==='friend'&&!await sharedRow(db,p.args.code))return{status:422,data:{error:'action_denied',message:'Kebun teman tidak ditemukan atau kunjungannya dinonaktifkan.',...snapshot(uid,row,now)}};
 const farm=serverFarm(row?JSON.parse(row.save):null,now),level=farm.level,result=specs[p.type][2](farm)(p.args);
 if(!result.ok)return{status:422,data:{error:'action_denied',message:result.message,...snapshot(uid,row,now)}};
 result.level=farm.level;result.levelUp=farm.level>level;
 const savedAt=new Date(now).toISOString(),raw=farm.serialize();F.validateSave(JSON.parse(raw));
 const update=row?db.prepare('UPDATE farm_saves SET save = ?, revision = revision + 1, saved_at = ?, last_action_id = ? WHERE user_id = ? AND revision = ?').bind(raw,savedAt,p.id,uid,p.revision):db.prepare('INSERT INTO farm_saves(user_id, save, revision, saved_at, last_action_id) VALUES (?, ?, 1, ?, ?) ON CONFLICT(user_id) DO NOTHING').bind(uid,raw,savedAt,p.id);
 // D1 batches are transactional. A receipt can exist only for the matching committed action.
 await db.batch([update,db.prepare('INSERT INTO farm_actions(user_id, action_id, request_hash, result, created_at) SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM farm_saves WHERE user_id = ? AND last_action_id = ?) ON CONFLICT(user_id, action_id) DO NOTHING').bind(uid,p.id,hash,JSON.stringify(result),now,uid,p.id)]);
 const committed=await receipt();if(!committed)return{status:409,data:{error:'save_conflict',...await loadFarm(db,uid,now)}};
 // Old retries still carry their stale revision after a receipt is pruned.
 await db.prepare('DELETE FROM farm_actions WHERE user_id = ? AND created_at < ?').bind(uid,now-7*86400000).run();
 return replay(committed);
}
