import {after, before, beforeEach, test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Miniflare, convertV4MiniflareOptions} from 'miniflare';
import {exportSPKI, generateKeyPair, importSPKI, SignJWT} from 'jose';

const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
const keys = await generateKeyPair('ES256');
const bindings = {PRIVY_APP_ID: 'test-app', PRIVY_VERIFICATION_KEY: await exportSPKI(keys.publicKey), ALLOWED_ORIGINS: 'https://6xg.online,https://app.6xg.online'};
const options = {modules: true, scriptPath: new URL('../dist/worker.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'), compatibilityDate: '2026-10-01', bindings, d1Databases: {DB: 'test-bara-saves'}};
let mf, db;
// Fixture was exported from new Kingdom().serialize(), using save format version 2.
const fixture = JSON.parse(await readFile(new URL('./save.json', import.meta.url), 'utf8'));
const fresh = () => structuredClone(fixture);
const rtsFixture = JSON.parse(await readFile(new URL('../../tests/rts-save.json', import.meta.url), 'utf8'));
const farmFixture = JSON.parse(await readFile(new URL('../../tests/farm-save.json', import.meta.url), 'utf8'));

before(async () => {
  mf = new Miniflare(convertV4MiniflareOptions({...options, cf: false, telemetry: {enabled: false}}));
  db = await mf.getD1Database('DB');
  await db.exec((await readFile(new URL('../migrations/0001_saves.sql', import.meta.url), 'utf8')).replaceAll('\n', ' '));
  await db.exec((await readFile(new URL('../migrations/0002_farm_saves.sql', import.meta.url), 'utf8')).replaceAll('\n', ' '));
  await db.exec((await readFile(new URL('../migrations/0003_farm_actions.sql', import.meta.url), 'utf8')).replaceAll('\n', ' '));
});
beforeEach(async () => { await db.prepare('DELETE FROM saves').run(); await db.prepare('DELETE FROM farm_saves').run(); await db.prepare('DELETE FROM farm_actions').run(); });
after(async () => { await mf?.dispose(); });
async function token(uid = 'did:privy:a', updates = {}, privateKey = keys.privateKey) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({sub: uid, sid: 'test-session', iss: 'privy.io', aud: 'test-app', iat: now, exp: now + 3600, ...updates}).setProtectedHeader({alg: 'ES256'}).sign(privateKey);
}
async function call(method = 'GET', auth, payload, extra = {}) {
  const headers = {origin: 'https://6xg.online', ...extra.headers};
  if (auth) headers.authorization = 'Bearer ' + auth;
  if (payload !== undefined) headers['content-type'] = 'application/json';
  const response = await mf.dispatchFetch('https://api.example' + (extra.path || '/api/save'), {method, headers, ...(payload !== undefined ? {body: JSON.stringify(payload)} : {})});
  return {status: response.status, headers: response.headers, body: await response.json()};
}

test('deployment public key can be imported as a P-256 verification key', async () => {
  assert.equal((await importSPKI(config.vars.PRIVY_VERIFICATION_KEY, 'ES256')).algorithm.namedCurve, 'P-256');
});
test('a signed account can save and restore a real game snapshot', async () => {
  const auth = await token(), save = fresh();
  assert.equal((await call('GET', auth)).body.revision, 0);
  assert.equal((await call('PUT', auth, {save, revision: 0})).status, 200);
  const restored = await call('GET', auth);
  assert.equal(restored.body.revision, 1);
  assert.deepEqual(restored.body.save, save);
  assert.equal(restored.headers.get('cache-control'), 'no-store');
});

test('RTS positions, active orders and castles round-trip through authenticated D1 storage', async () => {
  const auth = await token(), save = structuredClone(rtsFixture);
  save.state.units[0].order = {type:'move',x:1800,y:1400,target:0,resource:null};
  save.state.buildings.push({id:save.state.nextId++,kind:'castle',x:1696,y:1488,hp:1400,progress:.5,cooldown:0,rally:{x:1800,y:1550},queue:[]});
  assert.equal((await call('PUT',auth,{save,revision:0})).status,200);
  assert.deepEqual((await call('GET',auth)).body.save,save);
  assert.equal(save.state.resources.wood,0);
});

test('RTS malformed identities and dangling order targets are rejected', async () => {
  const auth=await token();
  for(const change of [s=>s.units[1].id=s.units[0].id,s=>s.units[0].order.target=99999,s=>s.units[0].hp=10000,s=>s.nodes[0].resource='admin']){
    const save=structuredClone(rtsFixture);change(save.state);
    assert.equal((await call('PUT',auth,{save,revision:0})).status,400);
  }
});
test('another account cannot read or replace a players village by providing its ID', async () => {
  await call('PUT', await token(), {save: fresh(), revision: 0, userId: 'did:privy:b'});
  assert.equal((await call('GET', await token('did:privy:b'))).body.save, null);
  assert.equal((await call('GET', await token())).body.revision, 1);
});
test('two simultaneous writes at the same revision allow exactly one update', async () => {
  const auth = await token(), save = fresh();
  const first = await Promise.all([call('PUT', auth, {save, revision: 0}), call('PUT', auth, {save, revision: 0})]);
  assert.deepEqual(first.map(r => r.status).sort(), [200, 409]);
  const next = structuredClone(save); next.state.time = 250;
  const second = await Promise.all([call('PUT', auth, {save, revision: 1}), call('PUT', auth, {save: next, revision: 1})]);
  assert.deepEqual(second.map(r => r.status).sort(), [200, 409]);
  assert.equal((await call('GET', auth)).body.revision, 2);
});
test('a stale device cannot overwrite the newest snapshot', async () => {
  const auth = await token(), save = fresh();
  await call('PUT', auth, {save, revision: 0});
  const changed = structuredClone(save); changed.state.resources.gold = 1;
  assert.equal((await call('PUT', auth, {save: changed, revision: 0})).status, 409);
  assert.deepEqual((await call('GET', auth)).body.save, save);
});
test('signature, expiry, issuer, audience, session, subject and issued time are checked', async () => {
  const now = Math.floor(Date.now() / 1000);
  for (const updates of [{exp: now - 1}, {iss: 'evil.example'}, {aud: 'other-app'}, {sub: 'other-user'}, {sid: ''}, {iat: now + 60}]) assert.equal((await call('GET', await token('did:privy:a', updates))).status, 401);
  const wrong = await generateKeyPair('ES256');
  assert.equal((await call('GET', await token('did:privy:a', {}, wrong.privateKey))).status, 401);
  assert.equal((await call()).status, 401);
});
test('invalid resources, tasks, capacities and revisions are rejected', async () => {
  const auth = await token();
  for (const invalid of [-1, 99999, true, null]) {
    const save = fresh(); save.state.resources.gold = invalid;
    assert.equal((await call('PUT', auth, {save, revision: 0})).status, 400);
  }
  const save = fresh(); save.state.training = Array(6).fill({key: 'soldier', left: 5});
  assert.equal((await call('PUT', auth, {save, revision: 0})).status, 400);
  assert.equal((await call('PUT', auth, {save: fresh(), revision: true})).status, 400);
  assert.equal((await call('GET', auth)).body.save, null);
});
test('body size is enforced even when no content length is supplied', async () => {
  assert.equal((await call('PUT', await token(), {save: fresh(), revision: 0, extra: 'x'.repeat(50000)})).status, 413);
});
test('only the configured game origin receives CORS permission', async () => {
  assert.equal((await call('GET', await token(), undefined, {headers: {origin: 'https://evil.example'}})).status, 403);
  const preflight = await call('OPTIONS');
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://6xg.online');
  assert.match(preflight.headers.get('access-control-allow-methods'), /PUT/);
});
test('health checks the migration and missing auth fails closed', async () => {
  assert.deepEqual((await call('GET', null, undefined, {path: '/health'})).body, {ok: true, authConfigured: true, storage: true, farmStorage:true,farmSaveVersion:10,buildingSales:true,fishing:true});
  const unconfigured = new Miniflare(convertV4MiniflareOptions({...options, bindings: {...bindings, PRIVY_VERIFICATION_KEY: ''}, d1Databases: {DB: 'empty-test-database'}, cf: false, telemetry: {enabled: false}}));
  try {
    const res = await unconfigured.dispatchFetch('https://api.example/api/save', {headers: {authorization: 'Bearer ' + await token()}});
    assert.equal(res.status, 503);
  } finally { await unconfigured.dispose(); }
});

test('both exact site and game origins can restore farm progress', async () => {
  const auth=await token();
  for(const origin of ['https://6xg.online','https://app.6xg.online']){
    const result=await call('GET',auth,undefined,{path:'/api/farm-save',headers:{origin}});
    assert.equal(result.status,200);assert.equal(result.headers.get('access-control-allow-origin'),origin);
  }
  for(const origin of ['https://evil.example','https://app.6xg.online.evil.example']){
    assert.equal((await call('GET',auth,undefined,{path:'/api/farm-save',headers:{origin}})).status,403);
  }
});

