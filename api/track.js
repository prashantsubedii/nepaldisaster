'use strict';
/* POST /api/track  { v: <random visitor id> }
   Privacy-first analytics beacon. Reads Vercel's server-side geo headers
   (country + city — derived by Vercel, we never see or store the raw IP) and
   increments AGGREGATE counters only. No personal data, no IP, no gender
   (gender is not obtainable from a web request and is deliberately not tracked).
   Always returns 204 so it can never break page loads. */

const { pipeline } = require('../lib/kv');
const { canonCity } = require('../lib/geo');
const { clientIp } = require('../lib/auth');

const PER_MINUTE = 20;   // page views per IP per minute; more than any real reader

/* The beacon is only ever sent by our own pages, so a browser POST always
   carries our Origin. Scripts can fake it, which is why the per-IP limit below
   is the real guard — this just drops the cheapest junk without a KV call. */
function sameSite(req) {
  const o = String(req.headers.origin || '');
  if (!o) return req.headers['sec-fetch-site'] === 'same-origin';
  try {
    const h = new URL(o).hostname;
    return h === 'nepaldisaster.com' || h.endsWith('.nepaldisaster.com') ||
      h.endsWith('.vercel.app') || h === 'localhost';
  } catch (_) { return false; }
}

/* Strip anything that isn't a letter/number/basic punctuation, cap length —
   defends the KV key/field space against junk or injection attempts. */
function clean(s, max) {
  return String(s == null ? '' : s)
    .replace(/[^\p{L}\p{N} .,_\-]/gu, '')
    .slice(0, max || 64);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).end(); return; }
  if (!sameSite(req)) { res.status(204).end(); return; }
  try {
    // Per-IP cap (a per-minute counter), so a script looping on this endpoint
    // can't fake the numbers or burn the KV plan's daily command quota.
    const rk = 'rl:track:' + clientIp(req) + ':' + new Date().toISOString().slice(0, 16);
    const [hits] = await pipeline([['INCR', rk], ['EXPIRE', rk, 120]]);
    if (!(hits <= PER_MINUTE)) { res.status(204).end(); return; }

    const country = String(req.headers['x-vercel-ip-country'] || '')
      .toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) || 'XX';

    let rawCity = req.headers['x-vercel-ip-city'] || '';
    try { rawCity = decodeURIComponent(rawCity); } catch (_) { /* keep as-is */ }
    const city = canonCity(clean(rawCity, 64)) || 'Unknown';

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = {}; } }
    const vid = clean(body && body.v, 64) || 'anon';

    const now = new Date().toISOString();
    const day = now.slice(0, 10);        // YYYY-MM-DD  → daily buckets (3d/7d/28d ranges)
    const hour = now.slice(0, 13);       // YYYY-MM-DDTHH → hourly buckets (last-hour / 24h ranges)

    await pipeline([
      ['INCR', 'stats:pageviews'],
      ['PFADD', 'stats:uniques', vid],
      ['HINCRBY', 'stats:countries', country, 1],
      ['HINCRBY', 'stats:cities:' + country, city, 1],
      ['HINCRBY', 'stats:daily', day, 1],
      ['HINCRBY', 'stats:hourly', hour, 1]
    ]);
  } catch (_) {
    /* swallow — analytics must never surface an error to visitors */
  }
  res.status(204).end();
};
