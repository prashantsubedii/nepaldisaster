'use strict';
/* POST /api/track  { v: <random visitor id> }
   Privacy-first analytics beacon. Reads Vercel's server-side geo headers
   (country + city — derived by Vercel, we never see or store the raw IP) and
   increments AGGREGATE counters only. No personal data, no IP, no gender
   (gender is not obtainable from a web request and is deliberately not tracked).
   Always returns 204 so it can never break page loads. */

const { pipeline } = require('../lib/kv');
const { canonCity } = require('../lib/geo');

/* Strip anything that isn't a letter/number/basic punctuation, cap length —
   defends the KV key/field space against junk or injection attempts. */
function clean(s, max) {
  return String(s == null ? '' : s)
    .replace(/[^\p{L}\p{N} .,_\-]/gu, '')
    .slice(0, max || 64);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).end(); return; }
  try {
    const country = String(req.headers['x-vercel-ip-country'] || '')
      .toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) || 'XX';

    let rawCity = req.headers['x-vercel-ip-city'] || '';
    try { rawCity = decodeURIComponent(rawCity); } catch (_) { /* keep as-is */ }
    const city = canonCity(clean(rawCity, 64)) || 'Unknown';

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = {}; } }
    const vid = clean(body && body.v, 64) || 'anon';

    const day = new Date().toISOString().slice(0, 10);

    await pipeline([
      ['INCR', 'stats:pageviews'],
      ['PFADD', 'stats:uniques', vid],
      ['HINCRBY', 'stats:countries', country, 1],
      ['HINCRBY', 'stats:cities:' + country, city, 1],
      ['HINCRBY', 'stats:daily', day, 1]
    ]);
  } catch (_) {
    /* swallow — analytics must never surface an error to visitors */
  }
  res.status(204).end();
};
