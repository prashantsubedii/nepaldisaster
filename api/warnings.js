'use strict';
/* GET /api/warnings → today's real district-level flood, rainfall and road
   alerts for Nepal.

   Source: the BIPAD Portal (https://bipadportal.gov.np), which is NDRRMA's own
   public platform. Its alert feed carries the DHM hydrology stations (river
   levels against their published warning and danger marks, plus rainfall
   stations) and the Department of Roads closure notices, each tagged with the
   ward it belongs to, so the district falls out of the record itself.

   This replaces a hand-typed district list that had to be edited by hand every
   morning and was therefore wrong by lunchtime — it still said "44 districts"
   from an earlier bulletin days after those bulletins had moved on. Whatever
   DHM and DoR are reporting right now is what the site shows.

   Fetched server-side and KV-cached: the upstream records carry a large
   embedded blob per alert, so pulling them straight from every visitor's
   browser would mean a few hundred KB per page view for a payload that only
   changes a few times an hour. */

const { cmd } = require('../lib/kv');
// One normaliser for server and browser — see assets/warn-normalize.js.
const W = require('../assets/warn-normalize.js');

const CACHE_KEY = 'cache:warnings:v2';   // v2: stations + districts carry lat/lng
const DIST_KEY = 'cache:bipad:districts:v1';
const TTL = 30;             // re-check BIPAD at most every 30 s (was 15 min)
const STALE = 12 * 3600;    // keep a stale copy up to 12h for fallback

const UA = { 'User-Agent': 'nepaldisaster.com/1.0', Accept: 'application/json' };

/* District centroids change never, so cache them for a day. They are what
   place each warned district on the live alert map. */
async function districtIndex() {
  try { const c = await cmd(['GET', DIST_KEY]); if (c) return JSON.parse(c); } catch (_) {}
  try {
    const r = await fetch(W.BIPAD_DISTRICTS, { headers: UA, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return {};
    const idx = W.indexDistricts(await r.json());
    try { await cmd(['SET', DIST_KEY, JSON.stringify(idx), 'EX', String(86400)]); } catch (_) {}
    return idx;
  } catch (_) { return {}; }
}

async function fresh() {
  const [r, idx] = await Promise.all([
    fetch(W.BIPAD_ALERTS, { headers: UA, signal: AbortSignal.timeout(12000) }),
    districtIndex()
  ]);
  if (!r.ok) throw new Error('bipad ' + r.status);
  const j = await r.json();
  return W.normalize((j && j.results) || [], idx, Date.now());
}

module.exports = async (req, res) => {
  // Browsers never keep a copy; the CDN keeps one for 15 s and keeps serving it
  // while it fetches a fresh one in the background, so nobody waits on BIPAD's
  // ~3 s response and nothing shown is more than about a minute old.
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=15, stale-while-revalidate=60');
  try {
    const c = await cmd(['GET', CACHE_KEY]);
    if (c) { const j = JSON.parse(c); if (Date.now() - j.at < TTL * 1000) { res.status(200).json(j); return; } }
  } catch (_) { /* KV not configured — just fetch live */ }
  try {
    const payload = await fresh();
    try { await cmd(['SET', CACHE_KEY, JSON.stringify(payload), 'EX', String(STALE)]); } catch (_) {}
    res.status(200).json(payload);
  } catch (e) {
    // Stale cache, then an explicit empty result — the client falls back to its
    // built-in bulletin rather than showing an all-clear it cannot vouch for.
    try { const c = await cmd(['GET', CACHE_KEY]); if (c) { res.status(200).json(JSON.parse(c)); return; } } catch (_) {}
    res.status(200).json({ at: Date.now(), districts: [], rivers: [], rain: [], roads: [], count: 0, alerts: 0, error: 'unavailable' });
  }
};
