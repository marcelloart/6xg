import assert from 'node:assert/strict';
import {startGameSession} from '../src/game-session.js';
const userId='did:privy:test';const calls=[];
const settings={gameOrigin:'https://app.6xg.online',userId,getAccessToken:async()=>'test-token'};
await startGameSession({...settings,fetcher:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({user:{id:userId}})};}});
assert.equal(calls.length,2);assert.equal(calls[0].url,'https://app.6xg.online/api/game-session');assert.equal(calls[0].options.headers.Authorization,'Bearer test-token');assert.equal(calls[0].options.credentials,'include');assert.equal(calls[1].options.credentials,'include');assert.equal(calls[1].options.headers,undefined);assert(!calls[0].url.includes('token'));
await assert.rejects(startGameSession({...settings,fetcher:async()=>({ok:false})}));
let n=0;await assert.rejects(startGameSession({...settings,fetcher:async()=>({ok:++n===1})}),/belum tersimpan/);
await assert.rejects(startGameSession({...settings,fetcher:async()=>({ok:true,json:async()=>({user:{id:'did:privy:other'}})})}),/belum sesuai/);
await assert.rejects(startGameSession({...settings,getAccessToken:async()=>null,fetcher:()=>{throw Error('must not request');}}),/belum siap/);
console.log('Game session: credentialed bootstrap, cookie confirmation, identity mismatch and failure handling passed.');
for(const [twitterPhoto,expected] of [['https://pbs.twimg.com/profile_images/123/photo_normal.jpg','https://pbs.twimg.com/profile_images/123/photo.jpg'],['https://evil.example/a.jpg',null],[undefined,null]]){
 let payload;await startGameSession({...settings,twitterPhoto,fetcher:async(url,options)=>{if(options.method==='POST')payload=JSON.parse(options.body);return {ok:true,json:async()=>({user:{id:userId}})};}});
 assert.deepEqual(payload,{twitterPhoto:expected});assert.equal(payload.userId,undefined);
}
console.log('Game session: only sanitized cosmetic X picture is carried; identity still comes from token.');
