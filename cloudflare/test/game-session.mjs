import {after,before,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {generateKeyPair,exportSPKI,SignJWT} from 'jose';
import {handleGameRequest} from '../../src/game-api.mjs';
const SITE='https://6xg.online',APP='https://app.6xg.online';
const keys=await generateKeyPair('ES256');let mf,db;
before(async()=>{
  mf=new Miniflare(convertV4MiniflareOptions({workers:[
    {name:'backend',routes:['6xg-cloud-save.marcelloartis.workers.dev/*'],modules:true,scriptPath:new URL('../dist/worker.js',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'),compatibilityDate:'2026-10-01',bindings:{PRIVY_APP_ID:'test-app',PRIVY_VERIFICATION_KEY:await exportSPKI(keys.publicKey),ALLOWED_ORIGINS:SITE+','+APP},d1Databases:{DB:'game-session-test'}},
    {name:'game',routes:['app.6xg.online/*'],modules:true,script:(await readFile(new URL('../../src/game-api.mjs',import.meta.url),'utf8')).replace('export async function handleGameRequest','async function handleGameRequest'),compatibilityDate:'2026-10-03',serviceBindings:{CLOUD_SAVE:'backend'}},
  ],cf:false,telemetry:{enabled:false}}));
  db=await mf.getD1Database('DB','backend');
  for(const file of ['0001_saves.sql','0002_farm_saves.sql'])await db.exec((await readFile(new URL('../migrations/'+file,import.meta.url),'utf8')).replaceAll('\n',' '));
});
after(async()=>mf?.dispose());
async function token(uid='did:privy:session-a',updates={},key=keys.privateKey){const now=Math.floor(Date.now()/1000);return new SignJWT({sub:uid,sid:'test-session',iss:'privy.io',aud:'test-app',iat:now,exp:now+3600,...updates}).setProtectedHeader({alg:'ES256'}).sign(key);}
const cloudFetch=(url,init)=>mf.dispatchFetch(url,{...init,...(init.body?{duplex:'half'}:{})});
async function call(path,method='GET',{auth,cookie,origin=APP,body}={},dependencies={cloudFetch}){
  const headers={...(origin?{Origin:origin}:{}),...(auth?{Authorization:'Bearer '+auth}:{}),...(cookie?{Cookie:'__Host-6xg-game='+cookie}:{}),...(body?{'Content-Type':'application/json'}:{})};
  return handleGameRequest(new Request(APP+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),{ASSETS:{fetch:()=>new Response('asset')}},dependencies);
}
test('signed landing login establishes a host-only HttpOnly cookie without creating or changing a farm',async()=>{
  const jwt=await token();const r=await call('/api/game-session','POST',{auth:jwt,origin:SITE});
  assert.equal(r.status,200);assert.deepEqual(await r.json(),{user:{id:'did:privy:session-a'}});
  assert(r.headers.get('Set-Cookie').includes('Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=3600'));assert(!r.headers.get('Set-Cookie').includes('Domain='));
  assert.equal(r.headers.get('Access-Control-Allow-Origin'),SITE);assert.equal(r.headers.get('Access-Control-Allow-Credentials'),'true');assert.equal(r.headers.get('Cache-Control'),'no-store');
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM farm_saves').first()).n,0);
});
test('the game restores the signed account from its cookie, and never accepts a client identity or substitute bearer',async()=>{
  const jwt=await token();const r=await call('/api/game-session','GET',{cookie:jwt});assert.equal(r.status,200);assert.equal((await r.json()).user.id,'did:privy:session-a');
  assert.equal((await call('/api/game-session','GET',{auth:jwt})).status,401);
});

test('the deployed service binding reaches signed-token verification without a public network fetch',async()=>{
  const jwt=await token('did:privy:binding-account');
  const env={CLOUD_SAVE:{fetch:cloudFetch}};
  const dependencies={cloudFetch:async()=>{throw new Error('Public network fetch must not run');}};
  const r=await handleGameRequest(new Request(APP+'/api/game-session',{method:'POST',headers:{Origin:SITE,Authorization:'Bearer '+jwt}}),env,dependencies);
  assert.equal(r.status,200);assert.equal((await r.json()).user.id,'did:privy:binding-account');
  const fake=await handleGameRequest(new Request(APP+'/api/game-session',{method:'POST',headers:{Origin:SITE,Authorization:'Bearer a.b.c'}}),env,dependencies);
  assert.equal(fake.status,401);assert.equal((await fake.json()).error,'session_expired');
  const deployed=await mf.dispatchFetch(APP+'/api/game-session',{method:'POST',headers:{Origin:SITE,Authorization:'Bearer '+jwt}});
  assert.equal(deployed.status,200);assert.equal((await deployed.json()).user.id,'did:privy:binding-account');
  const cookie=deployed.headers.get('Set-Cookie').split(';')[0];
  const restored=await mf.dispatchFetch(APP+'/api/game-session',{headers:{Origin:APP,Cookie:cookie}});
  assert.equal(restored.status,200);assert.equal((await restored.json()).user.id,'did:privy:binding-account');
  const save=JSON.parse(await readFile(new URL('../../tests/farm-save.json',import.meta.url),'utf8'));
  const saved=await mf.dispatchFetch(APP+'/api/farm-save',{method:'PUT',headers:{Origin:APP,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({revision:0,save})});
  assert.equal(saved.status,200);
  const progress=await mf.dispatchFetch(APP+'/api/farm-save',{headers:{Origin:APP,Cookie:cookie}});
  assert.deepEqual((await progress.json()).save,save);
  const rejected=await mf.dispatchFetch(APP+'/api/game-session',{method:'POST',headers:{Origin:SITE,Authorization:'Bearer a.b.c'}});
  assert.equal(rejected.status,401);assert.equal((await rejected.json()).error,'session_expired');
});
test('forged, expired and wrong-audience sessions are rejected by real JWT verification',async()=>{
  const other=await generateKeyPair('ES256');
  for(const jwt of [await token('did:privy:session-a',{},other.privateKey),await token('did:privy:session-a',{exp:1}),await token('did:privy:session-a',{aud:'other-app'})])assert.equal((await call('/api/game-session','GET',{cookie:jwt})).status,401);
});
test('foreign and absent origins cannot establish or delete an account session',async()=>{
  const jwt=await token();for(const origin of ['https://evil.example',null])for(const path of ['/api/game-session','/api/game-session/logout']){
    const r=await call(path,'POST',{auth:jwt,cookie:jwt,origin});assert.equal(r.status,403);assert.equal(r.headers.get('Set-Cookie'),null);
  }
  assert.equal((await call('/api/game-session','GET',{cookie:jwt,origin:'https://evil.example'})).status,403);
});
test('cookie transport saves and restores the existing account progress and isolates another account',async()=>{
  const jwt=await token(),save=JSON.parse(await readFile(new URL('../../tests/farm-save.json',import.meta.url),'utf8'));
  const r=await call('/api/farm-save','PUT',{cookie:jwt,auth:await token('did:privy:ignored-header'),body:{revision:0,save}});assert.equal(r.status,200);
  const restored=await call('/api/farm-save','GET',{cookie:jwt});assert.deepEqual((await restored.json()).save,save);
  const other=await call('/api/farm-save','GET',{cookie:await token('did:privy:session-b')});assert.equal((await other.json()).save,null);
  const stale=await call('/api/farm-save','PUT',{cookie:jwt,body:{revision:0,save}});assert.equal(stale.status,409);
});
test('logout clears the game cookie and backend outages do not clear a valid session',async()=>{
  const jwt=await token();const r=await call('/api/game-session/logout','POST',{cookie:jwt});assert.equal(r.status,200);assert(r.headers.get('Set-Cookie').includes('Max-Age=0'));
  const unavailable=await call('/api/game-session','GET',{cookie:jwt},{cloudFetch:async()=>new Response('{}',{status:503})});assert.equal(unavailable.status,503);assert.equal(unavailable.headers.get('Set-Cookie'),null);
  const redirected=await call('/api/game-session','GET',{cookie:jwt},{cloudFetch:async()=>new Response(null,{status:302,headers:{Location:'https://evil.example'}})});assert.equal(redirected.status,502);assert.equal(redirected.headers.get('Location'),null);assert.equal(redirected.headers.get('Set-Cookie'),null);
});
test('only API routes enter authentication, and preflights use exact credentialed origins',async()=>{
  const r=await call('/api/game-session','OPTIONS',{origin:SITE});assert.equal(r.status,200);assert.equal(r.headers.get('Access-Control-Allow-Origin'),SITE);assert.equal(r.headers.get('Access-Control-Allow-Credentials'),'true');
  assert.equal((await call('/api/unknown')).status,404);assert.equal((await call('/api/game-session','PUT')).status,405);assert.equal(await (await call('/assets/game.css')).text(),'asset');
});
