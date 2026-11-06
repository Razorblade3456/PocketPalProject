const http = require('node:http');
const crypto = require('node:crypto');

const PROTOCOL = 1;
const MAX_BODY = 32 * 1024;
const TRUSTED_ORIGINS = new Set([
  'https://pocketpaltracker.netlify.app',
  'http://127.0.0.1:5173', 'http://127.0.0.1:5174',
  'http://localhost:5173', 'http://localhost:5174',
]);
const PETS = new Set(['mochi', 'pippin', 'crumb', 'rattle']);
const CATEGORIES = ['food', 'water', 'clean', 'happy'];
const OUTFITS = new Set(['beanie', 'bowtie', 'scarf', 'backpack', 'mushroomHat', 'pajamas', 'crown', 'zombieSuit']);
const OUTFIT_SLOTS = new Set(['head', 'neck', 'back', 'body']);
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key));

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}
function validPayload(p) {
  if (!exactKeys(p, ['protocol','revision','syncedAt','pet','petCare','motion','alarmsEnabled','alarm']) || p.protocol !== PROTOCOL || !Number.isSafeInteger(p.revision) || p.revision < 1 || !Number.isFinite(p.syncedAt)) return false;
  const pet = p.pet;
  if (!exactKeys(pet, ['kind','name','level','care','equipped']) || !PETS.has(pet.kind) || typeof pet.name !== 'string' || pet.name.length > 64 || !Number.isInteger(pet.level) || pet.level < 0 || pet.level > 5) return false;
  if (!exactKeys(pet.care, CATEGORIES) || !CATEGORIES.every(k => Number.isFinite(pet.care[k]) && pet.care[k] >= 0 && pet.care[k] <= 100)) return false;
  if (!pet.equipped || typeof pet.equipped !== 'object' || Array.isArray(pet.equipped) || Object.entries(pet.equipped).some(([slot, id]) => !OUTFIT_SLOTS.has(slot) || !OUTFITS.has(id))) return false;
  if (typeof p.petCare !== 'boolean' || typeof p.motion !== 'boolean' || typeof p.alarmsEnabled !== 'boolean') return false;
  if (p.alarm !== null) {
    const a = p.alarm;
    const requiredAlarmKeys = ['id','taskId','date','schedule','scheduledAt','dueAt','status','name','priority'];
    if (!a || typeof a !== 'object' || Array.isArray(a) || !requiredAlarmKeys.every(key => Object.hasOwn(a, key)) || Object.keys(a).some(key => ![...requiredAlarmKeys, 'startedAt'].includes(key)) || typeof a.id !== 'string' || a.id.length > 180 || typeof a.taskId !== 'string' || a.taskId.length > 180 || typeof a.name !== 'string' || a.name.length > 120 || typeof a.date !== 'string' || a.date.length > 20 || typeof a.schedule !== 'string' || a.schedule.length > 1000 || (a.priority !== 'low' && a.priority !== 'normal' && a.priority !== 'high') || !Number.isFinite(a.scheduledAt) || !Number.isFinite(a.dueAt) || (a.startedAt !== undefined && !Number.isFinite(a.startedAt)) || !['pending','ringing'].includes(a.status)) return false;
  }
  return true;
}
function createSyncBridge({ settings, persist, port = 47821, origins = TRUSTED_ORIGINS }) {
  const allowed = new Set(origins);
  let pairing = null;
  let attempts = [];
  let lastContactAt = 0;
  let server;
  const now = () => Date.now();
  const paired = () => typeof settings.pairTokenHash === 'string' && settings.pairTokenHash.length === 64;
  function json(res, status, value) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(JSON.stringify(value));
  }
  function tokenFor(req) {
    const auth = req.headers.authorization || '';
    return auth.startsWith('Bearer ') ? auth.slice(7) : '';
  }
  function authorized(req) {
    const token = tokenFor(req);
    return paired() && safeEqual(crypto.createHash('sha256').update(token).digest('hex'), settings.pairTokenHash);
  }
  async function body(req) {
    let size = 0, raw = '';
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BODY) throw Object.assign(new Error('Request too large'), { status: 413 });
      raw += chunk;
    }
    try { return JSON.parse(raw || '{}'); } catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
  }
  function handler(req, res) {
    const origin = req.headers.origin;
    const expectedHost = `127.0.0.1:${server.address().port}`;
    if (req.headers.host !== expectedHost || !origin || !allowed.has(origin)) return json(res, 403, { error: 'Untrusted origin or host.' });
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '600' });
      return res.end();
    }
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/status' && req.method === 'GET') return json(res, 200, { protocol: PROTOCOL, paired: paired(), pairReady: !!pairing && pairing.expiresAt > now(), connected: lastContactAt > now() - 35000, lastSyncAt: Number(settings.liveSync?.syncedAt) || null });
    if (url.pathname === '/pair' && req.method === 'POST') {
      (async () => {
        const cutoff = now() - 5 * 60_000;
        attempts = attempts.filter(at => at > cutoff);
        if (attempts.length >= 5) return json(res, 429, { error: 'Too many pairing attempts. Wait five minutes and try again.' });
        attempts.push(now());
        const data = await body(req);
        if (!pairing || pairing.expiresAt <= now()) { pairing = null; return json(res, 410, { error: 'Pairing code expired. Generate a new code on the desktop pet.' }); }
        if (!safeEqual(data.code, pairing.code)) return json(res, 401, { error: 'Pairing code is incorrect.' });
        const token = crypto.randomBytes(32).toString('base64url');
        settings.pairTokenHash = crypto.createHash('sha256').update(token).digest('hex');
        pairing = null;
        persist();
        return json(res, 200, { protocol: PROTOCOL, token });
      })().catch(error => json(res, error.status || 400, { error: error.status ? error.message : 'Pairing could not be completed.' }));
      return;
    }
    if (url.pathname === '/sync' && req.method === 'POST') {
      if (!authorized(req)) return json(res, 401, { error: 'Pairing needed.' });
      (async () => {
        const data = await body(req);
        if (!validPayload(data)) return json(res, 422, { error: 'Unsupported or invalid sync payload.' });
        const current = settings.liveSync;
        if (current && data.revision < current.revision) return json(res, 409, { error: 'An older PocketPal tab cannot replace newer pet data.', revision: current.revision });
        if (current && data.revision === current.revision && JSON.stringify(data) !== JSON.stringify(current)) return json(res, 409, { error: 'Conflicting sync revision.' });
        settings.liveSync = data;
        lastContactAt = now();
        persist();
        return json(res, 200, { protocol: PROTOCOL, accepted: true, revision: data.revision });
      })().catch(error => json(res, error.status || 400, { error: error.status ? error.message : 'Sync request failed.' }));
      return;
    }
    if (url.pathname === '/heartbeat' && req.method === 'POST') {
      if (!authorized(req)) return json(res, 401, { error: 'Pairing needed.' });
      lastContactAt = now();
      return json(res, 200, { protocol: PROTOCOL, connected: true });
    }
    if (url.pathname === '/disconnect' && req.method === 'POST') {
      if (!authorized(req)) return json(res, 401, { error: 'Pairing needed.' });
      delete settings.pairTokenHash;
      persist();
      return json(res, 200, { protocol: PROTOCOL, disconnected: true });
    }
    if (url.pathname === '/snapshot' && req.method === 'GET') {
      if (!authorized(req)) return json(res, 401, { error: 'Pairing needed.' });
      return json(res, 200, { protocol: PROTOCOL, snapshot: settings.liveSync || null });
    }
    return json(res, 404, { error: 'Not found.' });
  }
  return {
    beginPairing() {
      pairing = { code: crypto.randomBytes(5).toString('hex').toUpperCase(), expiresAt: now() + 5 * 60_000 };
      attempts = [];
      return { code: pairing.code, expiresAt: pairing.expiresAt };
    },
    status() { return { paired: paired(), pairReady: !!pairing && pairing.expiresAt > now(), connected: lastContactAt > now() - 35000, lastSyncAt: Number(settings.liveSync?.syncedAt) || null }; },
    getSnapshot() { return settings.liveSync || null; },
    async start() {
      server = http.createServer(handler);
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
      return server.address().port;
    },
    stop() { return new Promise(resolve => server ? server.close(resolve) : resolve()); },
  };
}

module.exports = { PROTOCOL, TRUSTED_ORIGINS, validPayload, createSyncBridge };
