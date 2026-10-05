import {importSPKI, jwtVerify} from 'jose';
import {integer, validateSave} from './save.mjs';
import {loadFarm, runFarmAction, parseAction} from './farm-actions.mjs';

import {socialData} from './farm-social.mjs';

const MAX_BODY = 49152;
const requests = new Map();
let cachedKey;
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

async function authenticate(header, env) {
  if (!header.startsWith('Bearer ') || header.length > 16384) throw new TypeError('Invalid token');
  const pem = env.PRIVY_VERIFICATION_KEY.replaceAll('\\n', '\n');
  if (!cachedKey || cachedKey.pem !== pem) cachedKey = {pem, key: importSPKI(pem, 'ES256')};
  const {payload} = await jwtVerify(header.slice(7), await cachedKey.key, {
    algorithms: ['ES256'], issuer: 'privy.io', audience: env.PRIVY_APP_ID,
    requiredClaims: ['exp', 'iat', 'iss', 'aud', 'sub', 'sid']
  });
  if (typeof payload.sub !== 'string' || !payload.sub.startsWith('did:privy:') || payload.sub.length > 200 || typeof payload.sid !== 'string' || !payload.sid || !integer(payload.iat, 0, Math.floor(Date.now() / 1000))) throw new TypeError('Invalid subject or session');
  return payload.sub;
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
      let storage = false, farmStorage = false;
      try { storage = !!await env.DB?.prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?').bind('table', 'saves').first();
        farmStorage = !!await env.DB?.prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?').bind('table', 'farm_saves').first(); } catch {}
      const authConfigured = !!(env.PRIVY_APP_ID && env.PRIVY_VERIFICATION_KEY);
      return reply(storage && farmStorage && authConfigured ? 200 : 503, {ok: storage && farmStorage && authConfigured, authConfigured, storage, farmStorage, farmSaveVersion: 10, buildingSales: true, fishing: true});
    }
    if (!['/api/save', '/api/farm-save', '/api/farm-action','/api/farm-friends','/api/farm-visit'].includes(path)) return reply(404, {error: 'not_found'});
    const farm = path !== '/api/save';
    // Table names come only from this fixed route allowlist.
    const table = farm ? 'farm_saves' : 'saves';
    if (request.method === 'OPTIONS') {
      headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
      headers['Access-Control-Max-Age'] = '600';
      return reply(200, {});
    }
    const social=['/api/farm-friends','/api/farm-visit'].includes(path);
    if(social&&request.method!=='GET')return reply(405,{error:'method_not_allowed'});
    if (path === '/api/farm-action' ? request.method !== 'POST' : !['GET', 'PUT'].includes(request.method)) return reply(405, {error: 'method_not_allowed'});
    if (!env.PRIVY_APP_ID || !env.PRIVY_VERIFICATION_KEY) return reply(503, {error: 'auth_not_configured'});
    if (!rateAllowed('ip:' + (request.headers.get('cf-connecting-ip') || 'unknown'))) return reply(429, {error: 'rate_limit'});
    let uid;
    try { uid = await authenticate(request.headers.get('authorization') || '', env); }
    catch { return reply(401, {error: 'invalid_token'}); }
    if (!rateAllowed('user:' + uid)) return reply(429, {error: 'rate_limit'});
    if (!env.DB) return reply(503, {error: 'storage_unavailable'});
    if(social){try{const result=await socialData(env.DB,uid,path==='/api/farm-visit'?(new URL(request.url).searchParams.get('code')||''):null);return reply(result.status,result.data);}catch{return reply(503,{error:'storage_unavailable'});}}
    if(farm){
      if(request.method==='PUT')return reply(409,{error:'authoritative_actions_required',message:'Perbarui game untuk menggunakan transaksi server.'});
      if(request.method==='GET'){try{return reply(200,await loadFarm(env.DB,uid));}catch{return reply(503,{error:'storage_unavailable'});}}
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
