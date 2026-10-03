const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const context={URL,AbortController,JSON,Number,Error,fetch:()=>{},window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/js/cloud-client.js'),'utf8'),context);
const Session=context.window.BaraCloudSession;
const tests=[];const raw=n=>JSON.stringify({version:2,state:{time:n}});
const ok=data=>({ok:true,json:async()=>data});
async function test(name,fn){await fn();tests.push(name);}
(async()=>{
  await test('The default browser fetch keeps its native invocation context',async()=>{
    context.fetch=function(){assert(!(this instanceof Session));return Promise.resolve(ok({userId:'did:privy:a',save:null,revision:0}));};
    const s=new Session('https://api.example.test','did:privy:a',async()=>'token');await s.load();s.close();
  });
  await test('An authenticated save sends the bearer token and expected revision, never a client-chosen user ID',async()=>{
    const requests=[];const s=new Session('https://api.example.test','did:privy:a',async()=>'token',{fetcher:async(url,options)=>{requests.push({url,...options});return ok(options.method==='GET'?{userId:s.userId,save:null,revision:7}:{userId:s.userId,revision:8});}});
    await s.load();s.changed(raw(2));await s.flush();
    assert.equal(requests[1].headers.Authorization,'Bearer token');const body=JSON.parse(requests[1].body);assert.equal(body.revision,7);assert.equal(body.userId,undefined);assert.equal(s.revision,8);
  });
  await test('Progress changed during an upload is retained for the next upload',async()=>{
    let complete;const s=new Session('https://api.example.test','did:privy:a',async()=>'token',{fetcher:()=>new Promise(r=>complete=r)});
    s.changed(raw(1));const pending=s.flush();await new Promise(r=>setImmediate(r));s.changed(raw(2));complete(ok({userId:s.userId,revision:1}));await pending;assert.equal(s.pending,raw(2));assert.equal(s.revision,1);
  });
  await test('A stale device cannot silently overwrite a newer cloud revision',async()=>{
    let count=0;const status=[];const s=new Session('https://api.example.test','did:privy:a',async()=>'token',{fetcher:async()=>{count++;return {ok:false,status:409};},onStatus:k=>status.push(k)});
    s.changed(raw(1));await s.flush();s.changed(raw(2));await s.flush();assert(s.blocked);assert.equal(count,1);assert.equal(status.at(-1),'conflict');
  });
  await test('An interrupted network keeps the most recent local snapshot for retry',async()=>{
    const s=new Session('https://api.example.test','did:privy:a',async()=>'token',{fetcher:async()=>{throw Error('network');}});s.changed(raw(8));await s.flush();assert.equal(s.pending,raw(8));assert(!s.blocked);
  });
  await test('Logout during token refresh prevents a request from being sent under another account',async()=>{
    let tokenDone,requests=0;const s=new Session('https://api.example.test','did:privy:a',()=>new Promise(r=>tokenDone=r),{fetcher:async()=>{requests++;return ok({userId:s.userId,revision:1});}});
    s.changed(raw(1));const pending=s.flush();s.close();tokenDone('token-for-next-user');await pending;assert.equal(requests,0);assert.equal(s.pending,null);
  });
  await test('A cloud response for a different identity is rejected before restoring it',async()=>{
    const s=new Session('https://api.example.test','did:privy:a',async()=>'token',{fetcher:async()=>ok({userId:'did:privy:b',revision:1,save:JSON.parse(raw(8))})});await assert.rejects(s.load(),/Akun server/);
  });
  await test('Production cloud origins require HTTPS and reject credentials in the URL',async()=>{
    assert.throws(()=>new Session('http://api.example.test','did:privy:a',()=>{}),/HTTPS/);assert.throws(()=>new Session('https://secret@example.test','did:privy:a',()=>{}),/tidak valid/);const s=new Session('http://127.0.0.1:8770','did:privy:a',()=>{});s.close();
  });
  await test('Farm sessions use the farm endpoint without affecting legacy sessions',async()=>{
    const urls=[];const fetcher=async url=>{urls.push(url);return ok({userId:'did:privy:a',revision:0,save:null});};
    const legacy=new Session('https://api.example.test','did:privy:a',async()=>'token',{fetcher});
    const farm=new Session('https://api.example.test','did:privy:a',async()=>'token',{fetcher,path:'/api/farm-save'});
    await legacy.load();await farm.load();assert.deepEqual(urls,['https://api.example.test/api/save','https://api.example.test/api/farm-save']);
    assert.throws(()=>new Session('https://api.example.test','did:privy:a',()=>{}, {path:'/api/other-user'}),/Endpoint/);
  });
  await test('The local cloud baseline advances only after a verified successful upload',async()=>{
    const remembered=[];let online=false;
    const s=new Session('https://api.example.test','did:privy:a',async()=>'token',{onSaved:(raw,revision)=>remembered.push({raw,revision}),fetcher:async()=>online?ok({userId:'did:privy:a',revision:1}):{ok:false,status:503}});
    s.changed(raw(2));await s.flush();assert.equal(remembered.length,0);online=true;await s.flush();assert.deepEqual(remembered,[{raw:raw(2),revision:1}]);
  });
  console.log(JSON.stringify({passed:tests.length,tests},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
