'use strict';
/* GET /api/stats — returns aggregated visitor analytics.
   GATED SERVER-SIDE: a valid signed session cookie is required. Without it the
   data is never sent (this is real protection, not a hidden client-side check). */

const { isAuthed } = require('../lib/auth');
const { cmd } = require('../lib/kv');
const { mergeCities } = require('../lib/geo');

/* Upstash HGETALL returns a flat array [field, val, field, val, ...].
   Normalise to sorted [ [field, count], ... ] descending by count. */
function toSorted(hgetall) {
  const out = [];
  if (Array.isArray(hgetall)) {
    for (let i = 0; i < hgetall.length; i += 2) {
      out.push([hgetall[i], Number(hgetall[i + 1]) || 0]);
    }
  } else if (hgetall && typeof hgetall === 'object') {
    for (const k in hgetall) out.push([k, Number(hgetall[k]) || 0]);
  }
  out.sort((a, b) => b[1] - a[1]);
  return out;
}

module.exports = async (req, res) => {
  if (!isAuthed(req)) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const [pv, uniques, countries, npCities, daily] = await Promise.all([
      cmd(['GET', 'stats:pageviews']),
      cmd(['PFCOUNT', 'stats:uniques']),
      cmd(['HGETALL', 'stats:countries']),
      cmd(['HGETALL', 'stats:cities:NP']),
      cmd(['HGETALL', 'stats:daily'])
    ]);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      pageviews: Number(pv) || 0,
      uniques: Number(uniques) || 0,
      countries: toSorted(countries),
      nepalCities: mergeCities(toSorted(npCities)),
      daily: toSorted(daily).sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-14)
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load stats' });
  }
};
