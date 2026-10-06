import {before,beforeEach,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {generateKeyPair,exportSPKI,SignJWT} from 'jose';
import '../src/farm-actions.mjs';
const F=globalThis.BaraFarm,keys=await generateKeyPair('ES256'),origin='https://app.6xg.online';
let mf,db;
const uid=name=>'did:privy:market-'+name;
async function token(name){const now=Math.floor(Date.now()/1000);return new SignJWT({sub:uid(name),sid:'market-session',iss:'privy.io',aud:'market-test',iat:now,exp:now+3600}).setProtectedHeader({alg:'ES256'}).sign(keys.privateKey);}
async function call(name,path,body){const headers={Origin:origin,Authorization:'Bearer '+await token(name)};if(body)headers['Content-Type']='application/json';const response=await mf.dispatchFetch('https://market.example'+path,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,body:await response.json()};}
async function farm(name,coins=1000,stock=0){const f=new F.Farm();f.s.coins=coins;f.s.produce.carrot=stock;f.s.profile.name=name;await db.prepare('INSERT INTO farm_saves(user_id,save,revision,saved_at) VALUES(?,?,1,?)').bind(uid(name),f.serialize(),new Date().toISOString()).run();return f;}
async function current(name){return(await call(name,'/api/farm-save')).body;}
async function action(name,type,args,id=crypto.randomUUID(),revision){return call(name,'/api/farm-market-action',{id,revision:revision??(await current(name)).revision,type,args});}
async function list(qty=5,price=7){return action('seller','list',{category:'crop',item:'carrot',qty,unitPrice:price,currency:'coins'});}
async function browse(name='buyer',query=''){return(await call(name,'/api/farm-market?'+query)).body;}
before(async()=>{mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:await readFile(new URL('../dist/worker.js',import.meta.url),'utf8'),compatibilityDate:'2026-10-01',cf:false,telemetry:{enabled:false},bindings:{PRIVY_APP_ID:'market-test',PRIVY_VERIFICATION_KEY:await exportSPKI(keys.publicKey),ALLOWED_ORIGINS:origin},d1Databases:{DB:'market-test'}}));db=await mf.getD1Database('DB');for(const file of ['0001_saves','0002_farm_saves','0003_farm_actions','0004_native_sessions','0005_marketplace'])await db.exec((await readFile(new URL('../migrations/'+file+'.sql',import.meta.url),'utf8')).replace(/^--.*$/gm,'').replaceAll('\n',' '));});
beforeEach(async()=>{await db.exec('DROP TRIGGER IF EXISTS reject_seller; DELETE FROM market_trades; DELETE FROM market_actions; DELETE FROM market_listings; DELETE FROM market_guards; DELETE FROM farm_actions; DELETE FROM farm_saves;');await farm('seller',1000,10);await farm('buyer',1000);});
after(async()=>await mf?.dispose());
test('escrow, partial purchase and cancellation conserve stock and coins between real accounts',async()=>{
 const created=await list();assert.equal(created.status,200);assert.equal((await current('seller')).save.state.produce.carrot,5);
 const [offer]=(await browse()).listings;assert.equal(offer.qty,5);assert.equal(offer.mine,false);assert.equal(Object.hasOwn(offer,'seller_id'),false);
 const bought=await action('buyer','buy',{listing:offer.id,version:offer.version,qty:2,unitPrice:7,currency:'coins'});assert.equal(bought.status,200);
 assert.equal((await current('buyer')).save.state.coins,986);assert.equal((await current('buyer')).save.state.produce.carrot,2);assert.equal((await current('seller')).save.state.coins,1014);
 const remaining=(await browse('seller','view=mine')).listings[0];assert.equal(remaining.qty,3);assert.equal((await action('seller','cancel',{listing:offer.id,version:remaining.version})).status,200);assert.equal((await current('seller')).save.state.produce.carrot,8);assert.equal((await browse()).listings.length,0);
 assert.equal((await browse('seller','view=history')).trades[0].side,'sell');assert.equal((await browse('buyer','view=history')).trades[0].side,'buy');
});
test('retry after an already committed purchase is idempotent, and altered reuse is rejected',async()=>{
 await list();const offer=(await browse()).listings[0],id=crypto.randomUUID(),args={listing:offer.id,version:offer.version,qty:2,unitPrice:7,currency:'coins'};
 const first=await action('buyer','buy',args,id,1);assert.equal(first.status,200);const again=await action('buyer','buy',args,id,1);assert.equal(again.status,200);assert.equal(again.body.replayed,true);assert.equal((await current('buyer')).save.state.coins,986);
 assert.equal((await action('buyer','buy',{...args,qty:1},id,1)).status,409);assert.equal((await browse('buyer','view=history')).trades.length,1);
});
test('two buyers competing for the same quoted stock commit exactly one transfer',async()=>{
 await farm('other',1000);await list(5);const offer=(await browse()).listings[0],args={listing:offer.id,version:offer.version,qty:5,unitPrice:7,currency:'coins'};
 const results=await Promise.all(['buyer','other'].map(name=>action(name,'buy',args,crypto.randomUUID(),1)));assert.deepEqual(results.map(v=>v.status).sort(),[200,409]);
 const buyer=await current('buyer'),other=await current('other'),seller=await current('seller');assert.equal(buyer.save.state.produce.carrot+other.save.state.produce.carrot,5);assert.equal(buyer.save.state.coins+other.save.state.coins+seller.save.state.coins,3000);assert.equal((await browse()).listings.length,0);
});
test('failed seller write rolls back buyer, listing, receipt and history together',async()=>{
 await list();const offer=(await browse()).listings[0];await db.exec("CREATE TRIGGER reject_seller BEFORE UPDATE ON farm_saves WHEN NEW.user_id='did:privy:market-seller' BEGIN SELECT RAISE(ABORT,'fixture-failure'); END;");
 assert.equal((await action('buyer','buy',{listing:offer.id,version:1,qty:2,unitPrice:7,currency:'coins'})).status,503);assert.equal((await current('buyer')).save.state.coins,1000);assert.equal((await current('buyer')).save.state.produce.carrot,0);assert.equal((await browse()).listings[0].qty,5);assert.equal((await browse('buyer','view=history')).trades.length,0);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM market_guards').first()).n,0);
});
test('ownership, price, stock, capacity and malformed inputs cannot be bypassed',async()=>{
 await list();const offer=(await browse()).listings[0],args={listing:offer.id,version:1,qty:2,unitPrice:7,currency:'coins'};
 assert.equal((await action('buyer','cancel',{listing:offer.id,version:1})).status,403);assert.equal((await action('seller','buy',args)).status,422);assert.equal((await action('buyer','buy',{...args,unitPrice:1})).status,409);assert.equal((await action('buyer','buy',{...args,qty:6})).status,409);assert.equal((await action('buyer','buy',{...args,qty:-1})).status,400);assert.equal((await action('buyer','list',{category:'crop',item:'__proto__',qty:1,unitPrice:7,currency:'coins'})).status,400);
 const b=await current('buyer');b.save.state.produce.carrot=20;await db.prepare('UPDATE farm_saves SET save=? WHERE user_id=?').bind(JSON.stringify(b.save),uid('buyer')).run();assert.equal((await action('buyer','buy',args)).body.error,'inventory_full');assert.equal((await browse()).listings[0].qty,5);
});
test('inactive rupiah, USD and crypto reject financial actions without reserving inventory',async()=>{
 for(const currency of ['idr','usd','crypto']){const r=await action('seller','list',{category:'crop',item:'carrot',qty:1,unitPrice:7,currency});assert.equal(r.status,503);assert.equal(r.body.error,'merchant_setup_required');assert.equal((await browse('buyer','currency='+currency)).listings.length,0);}
 assert.equal((await current('seller')).save.state.produce.carrot,10);assert.deepEqual((await browse()).paymentMethods.map(v=>v.enabled),[true,false,false,false]);
});
test('expired stock is not purchasable and can only return when storage has room',async()=>{
 await list();const offer=(await browse()).listings[0];await db.prepare('UPDATE market_listings SET expires_at=? WHERE id=?').bind(Date.now()-1,offer.id).run();assert.equal((await browse()).listings.length,0);assert.equal((await action('buyer','buy',{listing:offer.id,version:1,qty:1,unitPrice:7,currency:'coins'})).status,409);
 const s=await current('seller');s.save.state.produce.carrot=20;await db.prepare('UPDATE farm_saves SET save=? WHERE user_id=?').bind(JSON.stringify(s.save),uid('seller')).run();assert.equal((await action('seller','cancel',{listing:offer.id,version:1})).status,422);assert.equal((await browse('seller','view=mine')).listings[0].qty,5);
});
test('private photo is never exposed by a listing, and query injection is rejected',async()=>{
 const s=await current('seller');s.save.state.profile.accountPhoto='https://pbs.twimg.com/profile_images/123/photo.jpg';s.save.state.profile.sharePhoto=false;await db.prepare('UPDATE farm_saves SET save=? WHERE user_id=?').bind(JSON.stringify(s.save),uid('seller')).run();await list();assert.equal(Object.hasOwn((await browse()).listings[0].seller,'photo'),false);assert.equal((await call('buyer','/api/farm-market?currency=coins%27%20OR%201=1')).status,400);
});
test('traded fish survive reload without inflating catches, records, best size or XP',async()=>{
 const s=await current('seller');s.save.state.fishing.fish.tilapia=3;s.save.state.fishing.caught=3;await db.prepare('UPDATE farm_saves SET save=? WHERE user_id=?').bind(JSON.stringify(s.save),uid('seller')).run();
 assert.equal((await action('seller','list',{category:'fish',item:'tilapia',qty:3,unitPrice:15,currency:'coins'})).status,200);
 const offer=(await browse()).listings[0];assert.equal((await action('buyer','buy',{listing:offer.id,version:1,qty:2,unitPrice:15,currency:'coins'})).status,200);
 const b=await current('buyer');assert.equal(b.save.state.fishing.fish.tilapia,2);assert.equal(b.save.state.fishing.caught,0);assert.equal(b.save.state.fishing.traded,2);assert.equal(b.save.state.fishing.best,0);assert.equal(b.save.state.progress.xp,0);assert.deepEqual(b.save.state.fishing.records,[]);assert.doesNotThrow(()=>new F.Farm({save:b.save}));
 const remaining=(await browse('seller','view=mine')).listings[0];assert.equal((await action('seller','cancel',{listing:offer.id,version:remaining.version})).status,200);assert.equal((await current('seller')).save.state.fishing.traded,0);
});
test('pagination keeps listings created in the same millisecond without duplicates or omissions',async()=>{
 const now=Date.now()-1000,ids=[];for(let i=0;i<53;i++)ids.push(crypto.randomUUID());await db.batch(ids.map(id=>db.prepare("INSERT INTO market_listings(id,seller_id,category,item,currency,unit_price,original_qty,remaining_qty,status,version,created_at,updated_at,expires_at) VALUES(?,?,'seed','carrot','coins',7,1,1,'active',1,?,?,?)").bind(id,uid('seller'),now,now,now+86400000)));
 const first=await browse();assert.equal(first.listings.length,50);assert(first.next);const second=await browse('buyer','before='+encodeURIComponent(first.next));assert.equal(second.listings.length,3);assert.equal(second.next,null);assert.equal(new Set([...first.listings,...second.listings].map(v=>v.id)).size,53);
});
