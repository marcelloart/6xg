// This runs on app.6xg.online, never in the player's browser.
import '../assets/js/account-photo.js';
const SITE='https://6xg.online',APP='https://app.6xg.online';
const CLOUD='https://6xg-cloud-save.marcelloartis.workers.dev';
const COOKIE='__Host-6xg-game';
const PHOTO_COOKIE='__Host-6xg-picture',COOKIE_FLAGS='; Path=/; Secure; HttpOnly; SameSite=Strict';
async function readPicture(request){
 if(!request.body)return null;
 const reader=request.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return null;}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return BaraAccountPhoto.twitterURL(JSON.parse(new TextDecoder().decode(bytes)).twitterPhoto);
 }catch{return null;}finally{reader.releaseLock();}
}
function restoredPicture(cookie,id){try{const p=JSON.parse(decodeURIComponent(cookie||''));return p.id===id?BaraAccountPhoto.twitterURL(p.photo):null;}catch{return null;}}
export async function handleGameRequest(request,env,{cloudFetch=fetch}={}){
  const path=new URL(request.url).pathname;
  if(!path.startsWith('/api/'))return env.ASSETS.fetch(request);
  const origin=request.headers.get('Origin');
  const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff','Vary':'Origin'};
  if(origin===SITE||origin===APP){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Credentials']='true';}
  const reply=(status,data,extra={})=>{const response=new Response(JSON.stringify(data),{status,headers:{...headers,...extra}});if(extra['Set-Cookie']?.includes('Max-Age=0'))response.headers.append('Set-Cookie',PHOTO_COOKIE+'='+COOKIE_FLAGS+'; Max-Age=0');return response;};
  if(origin&&origin!==SITE&&origin!==APP)return reply(403,{error:'origin_not_allowed'});
  if(!['/api/game-session','/api/game-session/logout','/api/farm-save','/api/farm-action','/api/farm-friends','/api/farm-visit'].includes(path))return reply(404,{error:'not_found'});
  if(request.method==='OPTIONS')return reply(200,{}, {'Access-Control-Allow-Methods':'GET, POST, PUT, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600'});
  if(!['GET','POST','PUT'].includes(request.method))return reply(405,{error:'method_not_allowed'});
  if(request.method!=='GET'&&origin!==SITE&&origin!==APP)return reply(403,{error:'origin_required'});
  const cookie=request.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  const pictureCookie=request.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(PHOTO_COOKIE+'='))?.slice(PHOTO_COOKIE.length+1);
  const validToken=token=>typeof token==='string'&&token.length<16384&&/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
  const clear={'Set-Cookie':COOKIE+'=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0'};
  if(path==='/api/game-session/logout')return request.method==='POST'?reply(200,{ok:true},clear):reply(405,{error:'method_not_allowed'});
  const create=path==='/api/game-session'&&request.method==='POST';
  if(path==='/api/game-session'&&!create&&request.method!=='GET')return reply(405,{error:'method_not_allowed'});
  if(path==='/api/farm-save'&&!['GET','PUT'].includes(request.method))return reply(405,{error:'method_not_allowed'});
  if(['/api/farm-friends','/api/farm-visit'].includes(path)&&request.method!=='GET')return reply(405,{error:'method_not_allowed'});
  if(path==='/api/farm-action'&&request.method!=='POST')return reply(405,{error:'method_not_allowed'});
  const token=create?request.headers.get('Authorization')?.replace(/^Bearer /,''):cookie;
  if(!validToken(token))return reply(401,{error:'session_required'},create?{}:clear);
  // The existing backend verifies Privy's signature, audience, expiry and user ID.
  // Bootstrap only reads progress; it cannot initialize or overwrite a farm.
  try{
    // Cloudflare Workers on this account must use the service binding to reach
    // one another; a public workers.dev fetch is not a reliable server route.
    const send=env.CLOUD_SAVE?(url,init)=>env.CLOUD_SAVE.fetch(url,init):cloudFetch;
    const farm=['/api/farm-save','/api/farm-action','/api/farm-friends','/api/farm-visit'].includes(path);
    const query=path==='/api/farm-visit'?'?code='+encodeURIComponent(new URL(request.url).searchParams.get('code')||''):'';
    const remote=await send(CLOUD+(farm?path+query:'/api/farm-save'),{
      method:farm?request.method:'GET',redirect:'manual',
      headers:{Authorization:'Bearer '+token,Origin:APP,'Content-Type':request.headers.get('Content-Type')||'application/json',...(request.headers.get('CF-Connecting-IP')?{'CF-Connecting-IP':request.headers.get('CF-Connecting-IP')}:{})},
      ...(farm&&request.method!=='GET'?{body:request.body}:{}),
    });
    // Never follow an upstream redirect or forward credentials to another host.
    if(remote.status>=300&&remote.status<400)return reply(502,{error:'storage_unavailable'});
    if(farm){const response=new Response(remote.body,{status:remote.status,headers:{...headers,...(remote.status===401?clear:{})}});if(remote.status===401)response.headers.append('Set-Cookie',PHOTO_COOKIE+'='+COOKIE_FLAGS+'; Max-Age=0');return response;}
    if(!remote.ok)return reply(remote.status,{error:remote.status===401?'session_expired':'storage_unavailable'},remote.status===401?clear:{});
    const data=await remote.json();
    if(typeof data.userId!=='string'||!data.userId.startsWith('did:privy:'))return reply(502,{error:'invalid_identity'});
    // This URL is cosmetic metadata, never proof of identity or permission.
    // Bind it to the server-verified DID so account switches cannot reuse it.
    const photo=create?await readPicture(request):restoredPicture(pictureCookie,data.userId);
    const response=reply(200,{user:{id:data.userId,...(photo?{twitter:{profilePictureUrl:photo}}:{})}},create?{'Set-Cookie':COOKIE+'='+token+COOKIE_FLAGS+'; Max-Age=3600'}:{});
    if(create)response.headers.append('Set-Cookie',photo?PHOTO_COOKIE+'='+encodeURIComponent(JSON.stringify({id:data.userId,photo}))+COOKIE_FLAGS+'; Max-Age=3600':PHOTO_COOKIE+'='+COOKIE_FLAGS+'; Max-Age=0');
    return response;
  }catch{return reply(503,{error:'storage_unavailable'});}
}
export default {fetch:handleGameRequest};
