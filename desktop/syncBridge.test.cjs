const test = require('node:test');
const assert = require('node:assert/strict');
const { createSyncBridge } = require('./syncBridge.cjs');

const origin = 'https://pocketpaltracker.netlify.app';
const payload = (revision = 100) => ({
  protocol: 1, revision, syncedAt: Date.now(),
  pet: { kind: 'mochi', name: 'Mochi', level: 1, care: { food: 80, water: 90, clean: 75, happy: 65 }, equipped: {} },
  petCare: true, motion: true, alarmsEnabled: true,
  alarm: { id: 'alarm-1', taskId: 'task-1', name: 'Study', priority: 'high', date: '2026-11-06', schedule: '{}', scheduledAt: Date.now() + 10000, startedAt: Date.now(), dueAt: Date.now() + 10000, status: 'pending' },
});
async function setup(settings = {}) {
  let writes = 0;
  const bridge = createSyncBridge({ settings, port: 0, origins: [origin], persist: () => writes++ });
  const port = await bridge.start();
  const base = `http://127.0.0.1:${port}`;
  const call = (path, { method = 'GET', token, data, from = origin } = {}) => fetch(base + path, { method, headers: { Origin: from, ...(data ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: data ? JSON.stringify(data) : undefined });
  return { bridge, settings, call, get writes() { return writes; } };
}

test('pair code is one-time, expires, and rate limits incorrect attempts', async t => {
  const x = await setup(); t.after(() => x.bridge.stop());
  const first = await x.bridge.beginPairing();
  assert.equal((await x.call('/pair', { method: 'POST', data: { code: 'WRONG' } })).status, 401);
  const valid = await x.call('/pair', { method: 'POST', data: { code: first.code } });
  assert.equal(valid.status, 200);
  const auth = await valid.json();
  assert.equal(auth.token.length > 40, true);
  assert.equal(x.settings.pairTokenHash.length, 64);
  assert.equal(JSON.stringify(x.settings).includes(auth.token), false);
  assert.equal((await x.call('/pair', { method: 'POST', data: { code: first.code } })).status, 410);

  x.settings.pairTokenHash = undefined;
  const second = x.bridge.beginPairing();
  const originalNow = Date.now;
  Date.now = () => second.expiresAt + 1;
  try { assert.equal((await x.call('/pair', { method: 'POST', data: { code: second.code } })).status, 410); }
  finally { Date.now = originalNow; }
  x.bridge.beginPairing();
  for (let i = 0; i < 5; i++) await x.call('/pair', { method: 'POST', data: { code: 'NOPE' } });
  assert.equal((await x.call('/pair', { method: 'POST', data: { code: 'NOPE' } })).status, 429);
});

test('strict origin, authorization, versioned display sync, stale rejection, persistence and disconnect', async t => {
  const x = await setup(); t.after(() => x.bridge.stop());
  assert.equal((await x.call('/status', { from: 'https://evil.example' })).status, 403);
  const preflight = await fetch('http://127.0.0.1:' + (await (async () => { const r = await x.call('/status'); return Number(new URL(r.url).port); })()) + '/sync', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Private-Network': 'true' } });
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
  assert.equal(preflight.headers.get('access-control-allow-private-network'), 'true');
  assert.equal((await x.call('/sync', { method: 'POST', data: payload() })).status, 401);
  const pair = await x.bridge.beginPairing();
  const paired = await (await x.call('/pair', { method: 'POST', data: { code: pair.code } })).json();
  const token = paired.token;
  assert.equal((await x.call('/sync', { method: 'POST', token, data: payload() })).status, 200);
  assert.equal(x.bridge.status().connected, true);
  assert.equal(x.settings.liveSync.pet.kind, 'mochi');
  assert.equal((await x.call('/sync', { method: 'POST', token, data: payload(99) })).status, 409);
  assert.equal((await x.call('/snapshot', { token })).status, 200);
  assert.equal((await x.call('/sync', { method: 'POST', token, data: payload(101), from: 'https://evil.example' })).status, 403);
  const restarted = await setup(x.settings); t.after(() => restarted.bridge.stop());
  assert.equal(restarted.bridge.status().connected, false);
  assert.equal((await restarted.call('/heartbeat', { method: 'POST' })).status, 401);
  assert.equal((await restarted.call('/heartbeat', { method: 'POST', token })).status, 200);
  assert.equal(restarted.bridge.status().connected, true);
  assert.equal((await restarted.call('/snapshot', { token })).status, 200);
  assert.equal((await restarted.call('/disconnect', { method: 'POST', token })).status, 200);
  assert.equal((await restarted.call('/snapshot', { token })).status, 401);
  assert.equal(restarted.bridge.status().paired, false);
});

test('rejects malformed and oversized display payloads without saving', async t => {
  const x = await setup(); t.after(() => x.bridge.stop());
  const pair = await x.bridge.beginPairing();
  const token = (await (await x.call('/pair', { method: 'POST', data: { code: pair.code } })).json()).token;
  assert.equal((await x.call('/sync', { method: 'POST', token, data: { ...payload(), pet: { ...payload().pet, kind: 'not-a-pet' } } })).status, 422);
  assert.equal((await x.call('/sync', { method: 'POST', token, data: { ...payload(), privateNotes: 'must not be accepted' } })).status, 422);
  const timerWithoutKnownStart = payload(); delete timerWithoutKnownStart.alarm.startedAt;
  assert.equal((await x.call('/sync', { method: 'POST', token, data: timerWithoutKnownStart })).status, 200);
  const huge = await fetch('http://127.0.0.1:' + (await (async () => Number(new URL((await x.call('/status')).url).port))()) + '/sync', { method: 'POST', headers: { Origin: origin, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '"' + 'x'.repeat(33000) + '"' });
  assert.equal(huge.status, 413);
  assert.equal(x.settings.liveSync.revision, timerWithoutKnownStart.revision);
});
