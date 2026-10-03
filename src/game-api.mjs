// This runs on app.6xg.online, never in the player's browser.
const SITE='https://6xg.online',APP='https://app.6xg.online';
const CLOUD='https://6xg-cloud-save.marcelloartis.workers.dev';
const COOKIE='__Host-6xg-game';
export async function handleGameRequest(request,env,{cloudFetch=fetch}={}){
  const path=new URL(request.url).pathname;
  if(!path.startsWith('/api/'))return env.ASSETS.fetch(request);
  const origin=request.headers.get('Origin');
  const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff','Vary':'Origin'};
  if(origin===SITE||origin===APP){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Credentials']='true';}
  const reply=(status,data,extra={})=>new Response(JSON.stringify(data),{status,headers:{...headers,...extra}});
  if(origin&&origin!==SITE&&origin!==APP)return reply(403,{error:'origin_not_allowed'});
  if(!['/api/game-session','/api/game-session/logout','/api/farm-save'].includes(path))return reply(404,{error:'not_found'});
  if(request.method==='OPTIONS')return reply(200,{}, {'Access-Control-Allow-Methods':'GET, POST, PUT, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600'});
  if(!['GET','POST','PUT'].includes(request.method))return reply(405,{error:'method_not_allowed'});
  if(request.method!=='GET'&&origin!==SITE&&origin!==APP)return reply(403,{error:'origin_required'});
  const cookie=request.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  const validToken=token=>typeof token==='string'&&token.length<16384&&/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
  const clear={'Set-Cookie':COOKIE+'=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0'};
  if(path==='/api/game-session/logout')return request.method==='POST'?reply(200,{ok:true},clear):reply(405,{error:'method_not_allowed'});
  const create=path==='/api/game-session'&&request.method==='POST';
  if(path==='/api/game-session'&&!create&&request.method!=='GET')return reply(405,{error:'method_not_allowed'});
  if(path==='/api/farm-save'&&!['GET','PUT'].includes(request.method))return reply(405,{error:'method_not_allowed'});
  const token=create?request.headers.get('Authorization')?.replace(/^Bearer /,''):cookie;
  if(!validToken(token))return reply(401,{error:'session_required'},create?{}:clear);
  // The existing backend verifies Privy's signature, audience, expiry and user ID.
  // Bootstrap only reads progress; it cannot initialize or overwrite a farm.
  try{
    // Cloudflare Workers on this account must use the service binding to reach
    // one another; a public workers.dev fetch is not a reliable server route.
    const send=env.CLOUD_SAVE?(url,init)=>env.CLOUD_SAVE.fetch(url,init):cloudFetch;
    const remote=await send(CLOUD+'/api/farm-save',{
      method:path==='/api/farm-save'?request.method:'GET',redirect:'error',
      headers:{Authorization:'Bearer '+token,Origin:APP,'Content-Type':request.headers.get('Content-Type')||'application/json'},
      ...(path==='/api/farm-save'&&request.method==='PUT'?{body:request.body}:{}),
    });
    if(path==='/api/farm-save')return new Response(remote.body,{status:remote.status,headers:{...headers,...(remote.status===401?clear:{})}});
    if(!remote.ok)return reply(remote.status,{error:remote.status===401?'session_expired':'storage_unavailable'},remote.status===401?clear:{});
    const data=await remote.json();
    if(typeof data.userId!=='string'||!data.userId.startsWith('did:privy:'))return reply(502,{error:'invalid_identity'});
    return reply(200,{user:{id:data.userId}},create?{'Set-Cookie':COOKIE+'='+token+'; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=3600'}:{});
  }catch{return reply(503,{error:'storage_unavailable'});}
}
export default {fetch:handleGameRequest};
