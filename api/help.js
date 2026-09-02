'use strict';
/* /api/help — the Helping Hand board.

   A public two-sided list for a disaster: people who NEED something (food,
   water, shelter, medicine, blood, evacuation, transport) and people who can
   GIVE it. Both go into the same store so the two halves are readable side by
   side and can actually meet.

   Design notes that matter more than the code:

   • This is a board where people in trouble publish a phone number. That is
     the whole point of it and also its main hazard, so contact details are
     only stored when the poster ticks an explicit consent box, every post
     carries a standing warning about verifying identity and never sending
     money, and anyone can flag a post. Enough flags and it hides itself
     without waiting for a moderator, because during a disaster there isn't
     one awake at 3am.

   • Posts expire. A "need food in Rasuwa" from three weeks ago is not
     information, it is noise that makes the live entries harder to find, so
     records carry a TTL and the index is trimmed on read.

   • Rate-limited per client so one script cannot bury the board.

   GET  /api/help                      → { posts: [...] }
   POST /api/help  {kind,category,...} → { ok, id, token }
   POST /api/help?action=resolve {id, token}
   POST /api/help?action=flag    {id}
*/

const crypto = require('crypto');
const { cmd, pipeline } = require('../lib/kv');

const IDX = 'help:z';                  // sorted set: score = created ts, member = id
const P = id => 'help:p:' + id;        // the post record
const F = id => 'help:f:' + id;        // flag counter
const RL = h => 'help:rl:' + h;        // per-client post counter

const TTL = 21 * 24 * 3600;            // posts live 21 days
const MAX_LIST = 240;                  // most recent N kept in the index
const RATE_MAX = 6;                    // posts per client per RATE_WINDOW
const RATE_WINDOW = 3600;              // 1 hour
const FLAG_HIDE = 3;                   // hidden once this many people flag it

const KINDS = ['need', 'offer'];
const CATEGORIES = [
  'food', 'water', 'shelter', 'medical', 'blood', 'rescue', 'transport',
  'clothing', 'baby', 'hygiene', 'power', 'volunteer', 'money', 'other'
];
const URGENCY = ['critical', 'urgent', 'normal'];

/* Strip control characters and anything that could carry markup through to a
   reader, then cap the length. The client escapes on render as well; this is
   the half that survives someone posting straight to the endpoint. */
function clean(v, max) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max || 200);
}
function pick(v, allowed, fallback) {
  const s = String(v == null ? '' : v).toLowerCase();
  return allowed.indexOf(s) >= 0 ? s : fallback;
}
/* Nepali numbers, with or without +977, plus a little punctuation tolerance. */
function cleanPhone(v) {
  const s = String(v == null ? '' : v).replace(/[^\d+]/g, '').slice(0, 20);
  const digits = s.replace(/\D/g, '');
  return digits.length >= 7 ? s : '';
}
function clientHash(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'anon').split(',')[0].trim();
  return crypto.createHash('sha256').update(ip + '|nd-help').digest('hex').slice(0, 24);
}
function readBody(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { b = {}; } }
  return b && typeof b === 'object' ? b : {};
}

async function list() {
  const ids = await cmd(['ZREVRANGE', IDX, '0', String(MAX_LIST - 1)]);
  if (!Array.isArray(ids) || !ids.length) return [];
  const rows = await cmd(['MGET'].concat(ids.map(P)));
  const flags = await pipeline(ids.map(id => ['GET', F(id)]));
  const out = [];
  const gone = [];
  (rows || []).forEach((raw, i) => {
    if (!raw) { gone.push(ids[i]); return; }        // expired out from under the index
    let p;
    try { p = JSON.parse(raw); } catch (_) { return; }
    if (Number(flags[i] || 0) >= FLAG_HIDE) return; // community-hidden
    delete p.tokenHash;                             // never leaves the server
    p.flags = Number(flags[i] || 0);
    out.push(p);
  });
  // Housekeeping on read: drop index entries whose record has expired, so the
  // index cannot grow forever behind the TTL.
  if (gone.length) { try { await cmd(['ZREM', IDX].concat(gone)); } catch (_) {} }
  return out;
}

async function create(req, res) {
  const b = readBody(req);
  const kind = pick(b.kind, KINDS, '');
  if (!kind) { res.status(400).json({ error: 'kind must be need or offer' }); return; }

  const hash = clientHash(req);
  let n = 0;
  try {
    n = Number(await cmd(['INCR', RL(hash)])) || 0;
    if (n === 1) await cmd(['EXPIRE', RL(hash), String(RATE_WINDOW)]);
  } catch (_) { /* KV unavailable is handled by the caller */ }
  if (n > RATE_MAX) { res.status(429).json({ error: 'Too many posts from here. Try again later.' }); return; }

  const detail = clean(b.detail, 600);
  const district = clean(b.district, 60);
  if (!detail || !district) { res.status(400).json({ error: 'district and detail are required' }); return; }

  const shareContact = b.shareContact === true || b.shareContact === 'true';
  const phone = shareContact ? cleanPhone(b.phone) : '';

  const id = crypto.randomUUID();
  const token = crypto.randomBytes(16).toString('hex');
  const post = {
    id,
    kind,
    category: pick(b.category, CATEGORIES, 'other'),
    urgency: kind === 'need' ? pick(b.urgency, URGENCY, 'normal') : 'normal',
    name: clean(b.name, 60),
    district,
    place: clean(b.place, 120),
    people: Math.max(0, Math.min(9999, parseInt(b.people, 10) || 0)),
    detail,
    phone,
    status: 'open',
    at: Date.now(),
    tokenHash: crypto.createHash('sha256').update(token).digest('hex')
  };

  await pipeline([
    ['SET', P(id), JSON.stringify(post), 'EX', String(TTL)],
    ['ZADD', IDX, String(post.at), id],
    // Keep the index bounded: everything outside the newest MAX_LIST goes.
    ['ZREMRANGEBYRANK', IDX, '0', String(-MAX_LIST - 1)]
  ]);

  delete post.tokenHash;
  res.status(200).json({ ok: true, id, token, post });
}

async function resolve(req, res) {
  const b = readBody(req);
  const id = clean(b.id, 64);
  const token = clean(b.token, 64);
  if (!id || !token) { res.status(400).json({ error: 'id and token required' }); return; }
  const raw = await cmd(['GET', P(id)]);
  if (!raw) { res.status(404).json({ error: 'not found' }); return; }
  const p = JSON.parse(raw);
  const given = crypto.createHash('sha256').update(token).digest('hex');
  // Fixed-length compare, so a wrong token cannot be narrowed down by timing.
  const ok = p.tokenHash && given.length === p.tokenHash.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(p.tokenHash));
  if (!ok) { res.status(403).json({ error: 'not your post' }); return; }
  p.status = b.status === 'open' ? 'open' : 'resolved';
  p.resolvedAt = Date.now();
  const left = await cmd(['TTL', P(id)]);
  await cmd(['SET', P(id), JSON.stringify(p), 'EX', String(Number(left) > 0 ? left : TTL)]);
  res.status(200).json({ ok: true, status: p.status });
}

async function flag(req, res) {
  const id = clean(readBody(req).id, 64);
  if (!id) { res.status(400).json({ error: 'id required' }); return; }
  const n = Number(await cmd(['INCR', F(id)])) || 1;
  if (n === 1) await cmd(['EXPIRE', F(id), String(TTL)]);
  res.status(200).json({ ok: true, hidden: n >= FLAG_HIDE });
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') { res.status(200).json({ at: Date.now(), posts: await list() }); return; }
    if (req.method === 'POST') {
      let action = (req.query && req.query.action) || '';
      if (!action) {
        try { action = new URL(req.url, 'http://x').searchParams.get('action') || ''; } catch (_) {}
      }
      action = String(action).toLowerCase();
      if (action === 'resolve') return await resolve(req, res);
      if (action === 'flag') return await flag(req, res);
      return await create(req, res);
    }
    res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    // Almost always "KV not configured". The board is a place people ask for
    // help, so it must never pretend to have saved something it did not — the
    // client shows the official helplines instead of a fake success.
    res.status(503).json({ error: 'unavailable' });
  }
};
