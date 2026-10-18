import {authenticateIdentity,authConfigured,verifyFirebase,verifyPrivy,linkLegacyAccount} from './auth-identity.mjs';
import {integer, validateSave} from './save.mjs';
import {loadFarm, runFarmAction, parseAction} from './farm-actions.mjs';

import {socialData} from './farm-social.mjs';
import {marketData,parseMarketAction,runMarketAction} from './farm-market.mjs';
import {authorizeNative,exchangeNative,nativeIdentity,revokeNative} from './native-auth.mjs';

const MAX_BODY = 49152;
const requests = new Map();
// Bounded, per-isolate abuse throttle; this does not claim to be a global quota.
function rateAllowed(identity) {
  const minute = Math.floor(Date.now() / 60000);
  if (requests.size > 10000) {
    for (const [key, value] of requests) if (value.minute !== minute) requests.delete(key);
    if (requests.size > 10000) return false;
  }
  const previous = requests.get(identity);
  const count = previous?.minute === minute ? previous.count + 1 : 1;
  requests.set(identity, {minute, count});
  return count <= 120;
}

async function authenticate(header,env){
 if(typeof header==='string'&&header.startsWith('Bearer 6xg_native_'))return nativeIdentity(env.DB,header.slice(7));
 return (await authenticateIdentity(header,env)).accountId;
}

async function readBody(request) {
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY)) throw new RangeError('Body too large');
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new TypeError('Expected JSON');
  if (!request.body) throw new TypeError('Missing body');
  const reader = request.body.getReader(), parts = [];
  let bytes = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY) { await reader.cancel(); throw new RangeError('Body too large'); }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const part of parts) { body.set(part, offset); offset += part.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(body));
}

export default {
  async fetch(request, env) {
    const origins = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const origin = request.headers.get('origin') || '';
    const headers = {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin'};
    if (origins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
    const reply = (status, data) => new Response(JSON.stringify(data), {status, headers});
    if (origin && !origins.includes(origin)) return reply(403, {error: 'origin_not_allowed'});
    const path = new URL(request.url).pathname;
    if (path === '/health' && request.method === 'GET') {
      let storage = false, farmStorage = false, marketStorage = false;
      try { storage = !!await env.DB?.prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?').bind('table', 'saves').first();
        farmStorage = !!await env.DB?.prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?').bind('table', 'farm_saves').first();
        marketStorage = !!await env.DB?.prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?').bind('table', 'market_listings').first(); } catch {}
      const configured = authConfigured(env);
      return reply(storage && farmStorage && configured ? 200 : 503, {ok: storage && farmStorage && configured, authConfigured:configured, storage, farmStorage, farmSaveVersion: 10, buildingSales: true, fishing: true, pierUpgrades: true, sharedAvatars: true, marketplace: marketStorage, paymentCurrencies: ["coins","idr","usd","crypto"], realMoneyPayments: false, riverSpecies: 9, fishingOddsVersion: 3, fishingOdds: globalThis.BaraFarm.FISHING_ODDS});
    }
    if(path==='/api/auth-link'){
      if(request.method==='OPTIONS'){headers['Access-Control-Allow-Methods']='POST, OPTIONS';headers['Access-Control-Allow-Headers']='Authorization, Content-Type';return reply(200,{});}
      if(request.method!=='POST')return reply(405,{error:'method_not_allowed'});
      if(!origins.includes(origin))return reply(403,{error:'origin_required'});
      if(!env.DB||!authConfigured(env))return reply(503,{error:'auth_not_configured'});
      if(!rateAllowed('link:'+(request.headers.get('cf-connecting-ip')||'unknown')))return reply(429,{error:'rate_limit'});
      let body;try{body=await readBody(request);if(!body||Array.isArray(body)||Object.keys(body).length!==1||typeof body.legacyToken!=='string'||body.legacyToken.length>16384)throw Error();}catch{return reply(400,{error:'invalid_account_link'});}
      let firebase,legacy;try{const header=request.headers.get('Authorization')||'';if(!header.startsWith('Bearer '))throw Error();firebase=await verifyFirebase(header.slice(7),env);legacy=await verifyPrivy(body.legacyToken,env);}catch{return reply(401,{error:'invalid_account_proof'});}
      try{const result=await linkLegacyAccount(env,firebase,legacy);return reply(result.status,result.data);}catch{return reply(503,{error:'account_link_unavailable'});}
    }
    const native=['/api/native-authorize','/api/native-exchange','/api/native-logout'].includes(path);
    if (!native&&!['/api/save', '/api/farm-save', '/api/farm-action','/api/farm-friends','/api/farm-visit','/api/farm-market','/api/farm-market-action'].includes(path)) return reply(404, {error: 'not_found'});
    const farm = path !== '/api/save';
    // Table names come only from this fixed route allowlist.
    const table = farm ? 'farm_saves' : 'saves';
    if (request.method === 'OPTIONS') {
      headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
      headers['Access-Control-Max-Age'] = '600';
      return reply(200, {});
    }
    if(native){
      if(request.method!=='POST')return reply(405,{error:'method_not_allowed'});
      if(!origins.includes(origin))return reply(403,{error:'origin_required'});
      if(!rateAllowed('native-ip:'+(request.headers.get('cf-connecting-ip')||'unknown')))return reply(429,{error:'rate_limit'});
      if(!env.DB)return reply(503,{error:'storage_unavailable'});
      let body;try{body=await readBody(request);}catch(error){return reply(error instanceof RangeError?413:400,{error:'invalid_body'});}
      let uid;
      if(path!=='/api/native-exchange'){
        const header=request.headers.get('authorization')||'';
        if(path==='/api/native-authorize'&&header.includes('6xg_native_'))return reply(401,{error:'privy_login_required'});
        if(path==='/api/native-logout'&&!header.startsWith('Bearer 6xg_native_'))return reply(401,{error:'native_session_required'});
        try{uid=await authenticate(header,env);}catch{return reply(401,{error:'invalid_token'});}
      }
      try{
        if(path==='/api/native-logout'){if(!body||Array.isArray(body)||Object.keys(body).length)return reply(400,{error:'invalid_body'});await revokeNative(env.DB,request.headers.get('authorization').slice(7));return reply(200,{ok:true});}
        const result=path==='/api/native-authorize'?await authorizeNative(env.DB,uid,body):await exchangeNative(env.DB,body);
        return reply(result.status,result.data);
      }catch{return reply(503,{error:'storage_unavailable'});}
    }
    const social=['/api/farm-friends','/api/farm-visit'].includes(path);
    const market=['/api/farm-market','/api/farm-market-action'].includes(path);
    if(social&&request.method!=='GET')return reply(405,{error:'method_not_allowed'});
    if (path === '/api/farm-action'||path==='/api/farm-market-action' ? request.method !== 'POST' : path==='/api/farm-market'?request.method!=='GET':!['GET', 'PUT'].includes(request.method)) return reply(405, {error: 'method_not_allowed'});
    if (!authConfigured(env)) return reply(503, {error: 'auth_not_configured'});
    if (!rateAllowed('ip:' + (request.headers.get('cf-connecting-ip') || 'unknown'))) return reply(429, {error: 'rate_limit'});
    let uid,authSubject;
    try { const header=request.headers.get('authorization')||'';if(header.startsWith('Bearer 6xg_native_'))uid=await authenticate(header,env);else{const identity=await authenticateIdentity(header,env);uid=identity.accountId;authSubject=identity.subject;} }
    catch { return reply(401, {error: 'invalid_token'}); }
    if (!rateAllowed('user:' + uid)) return reply(429, {error: 'rate_limit'});
    if (!env.DB) return reply(503, {error: 'storage_unavailable'});
    if(market){
      if(path==='/api/farm-market'){try{const result=await marketData(env.DB,uid,new URL(request.url).searchParams);return reply(result.status,result.data);}catch{return reply(503,{error:'storage_unavailable'});}}
      if(!origins.includes(origin))return reply(403,{error:'origin_required'});
      let action;try{action=parseMarketAction(await readBody(request));}catch(error){return reply(error instanceof RangeError?413:400,{error:'invalid_market_action'});}
      try{const result=await runMarketAction(env.DB,uid,action);return reply(result.status,result.data);}catch{return reply(503,{error:'storage_unavailable'});}
    }
    if(social){try{const result=await socialData(env.DB,uid,path==='/api/farm-visit'?(new URL(request.url).searchParams.get('code')||''):null);return reply(result.status,result.data);}catch{return reply(503,{error:'storage_unavailable'});}}
    if(farm){
      if(request.method==='PUT')return reply(409,{error:'authoritative_actions_required',message:'Perbarui game untuk menggunakan transaksi server.'});
      if(request.method==='GET'){try{return reply(200,{...await loadFarm(env.DB,uid),...(authSubject?.startsWith('firebase:')?{authSubject}:{})});}catch{return reply(503,{error:'storage_unavailable'});}}
      if(!origins.includes(origin))return reply(403,{error:'origin_required'});
      let action;try{action=parseAction(await readBody(request));}catch(error){return reply(error instanceof RangeError?413:400,{error:'invalid_action'});}
      try{const result=await runFarmAction(env.DB,uid,action);return reply(result.status,result.data);}catch{return reply(503,{error:'storage_unavailable'});}
    }
    if (request.method === 'GET') {
      try {
        const row = await env.DB.prepare(`SELECT save, revision, saved_at FROM ${table} WHERE user_id = ?`).bind(uid).first();
        return reply(200, {userId: uid, save: row ? JSON.parse(row.save) : null, revision: row?.revision || 0, savedAt: row?.saved_at || null});
      } catch { return reply(503, {error: 'storage_unavailable'}); }
    }
    let payload, save;
    try {
      payload = await readBody(request);
      if (!payload || !integer(payload.revision, 0, Number.MAX_SAFE_INTEGER - 1)) return reply(400, {error: 'invalid_revision'});
      if (farm ? ![4,5].includes(payload.save?.version) : ![2,3].includes(payload.save?.version)) throw new TypeError('Invalid save namespace');
      save = validateSave(payload.save);
    } catch (error) { return reply(error instanceof RangeError ? 413 : 400, {error: error instanceof RangeError ? 'save_too_large' : 'invalid_save'}); }
    const savedAt = new Date().toISOString();
    try {
      // Each conditional statement is atomic; no read-then-write race between devices.
      const statement = payload.revision === 0
        ? env.DB.prepare(`INSERT INTO ${table} (user_id, save, revision, saved_at) VALUES (?, ?, 1, ?) ON CONFLICT(user_id) DO NOTHING RETURNING revision, saved_at`).bind(uid, JSON.stringify(save), savedAt)
        : env.DB.prepare(`UPDATE ${table} SET save = ?, revision = revision + 1, saved_at = ? WHERE user_id = ? AND revision = ? RETURNING revision, saved_at`).bind(JSON.stringify(save), savedAt, uid, payload.revision);
      const row = await statement.first();
      return row ? reply(200, {userId: uid, revision: row.revision, savedAt: row.saved_at}) : reply(409, {error: 'save_conflict'});
    } catch { return reply(503, {error: 'storage_unavailable'}); }
  }
};
