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

const BIPAD = 'https://bipadportal.gov.np/api/v1/alert/?ordering=-created_on&limit=80';
const CACHE_KEY = 'cache:warnings:v1';
const TTL = 900;            // serve cached for 15 minutes
const STALE = 12 * 3600;    // keep a stale copy up to 12h for fallback
const WINDOW_H = 24;        // "today" = the last 24 hours of alerts
const WIDE_H = 72;          // …widened if the last 24h were quiet

function clean(s) {
  return String(s == null ? '' : s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/* BIPAD titles read "Flood warning at Golanjor-7, Sindhuli" — the district is
   the last comma-separated part, the settlement the part before it. */
function splitPlace(title) {
  const t = clean(title);
  const body = t.replace(/^.*?\s+(?:at|in)\s+/i, '');
  const i = body.lastIndexOf(',');
  if (i < 0) return { place: body, district: '' };
  return { place: body.slice(0, i).trim(), district: body.slice(i + 1).trim() };
}

/* The station reading lives in a serialised Django record on each alert. It is
   the difference between "there is an alert here" and "the Sunkoshi at Khurkot
   is at 7.56 m against a 7.5 m warning and an 8.6 m danger mark", so it is
   worth unpacking — but never at the cost of the endpoint, hence the try. */
function fields(a) {
  try {
    let rd = JSON.parse(a.referenceData || '{}');
    if (Array.isArray(rd)) rd = rd[0] || {};
    return (rd && rd.fields) || {};
  } catch (_) { return {}; }
}

/* Two things are worth telling apart and the feed states both: a river that has
   passed its WARNING mark, and one that has passed its DANGER mark. Both are
   flood alerts, so both count as danger for colour, but only the second is
   flagged critical so the panel can say which rivers are actually over the line. */
function sevOf(kind) { return kind === 'river' ? 'danger' : 'watch'; }
function isCrit(status) { return String(status || '').toUpperCase().indexOf('ABOVE DANGER') >= 0; }

async function fresh() {
  const r = await fetch(BIPAD, {
    headers: { 'User-Agent': 'nepaldisaster.com/1.0', Accept: 'application/json' },
    signal: AbortSignal.timeout(12000)
  });
  if (!r.ok) throw new Error('bipad ' + r.status);
  const j = await r.json();
  const rows = (j && j.results) || [];
  const now = Date.now();

  const within = h => rows.filter(a => {
    const ts = Date.parse(a.createdOn || a.startedOn || '');
    return ts && (now - ts) < h * 3600 * 1000;
  });
  // Quiet day? Widen the window rather than render an empty panel that reads
  // as "no alerts" when it really means "nothing in the last 24 hours".
  let windowH = WINDOW_H;
  let live = within(WINDOW_H);
  if (!live.length) { windowH = WIDE_H; live = within(WIDE_H); }

  const rivers = new Map(), rain = new Map(), roads = new Map();
  const districts = new Map();

  live.forEach(a => {
    const kind = a.referenceType || '';
    if (kind !== 'river' && kind !== 'rain' && kind !== 'road') return;
    const { place, district } = splitPlace(a.title);
    if (!district) return;
    const f = fields(a);
    const ts = Date.parse(a.createdOn || a.startedOn || '') || 0;
    const sev = sevOf(kind);
    const crit = isCrit(f.status);

    const d = districts.get(district) || { name: district, sev: 'watch', crit: 0, river: 0, rain: 0, road: 0, ts: 0 };
    d[kind] += 1;
    if (sev === 'danger') d.sev = 'danger';
    if (crit) d.crit += 1;
    if (ts > d.ts) d.ts = ts;
    districts.set(district, d);

    // The feed re-publishes the same station every reading cycle; keep only the
    // newest row per station so the panel shows places, not repetitions.
    const key = (f.title || place) + '|' + district;
    const bucket = kind === 'river' ? rivers : (kind === 'rain' ? rain : roads);
    const prev = bucket.get(key);
    if (prev && prev.ts >= ts) return;
    bucket.set(key, {
      station: clean(f.title || place), place, district, basin: clean(f.basin || ''),
      level: f.water_level != null ? Math.round(f.water_level * 100) / 100 : null,
      warning: f.warning_level != null ? f.warning_level : null,
      danger: f.danger_level != null ? f.danger_level : null,
      status: clean(f.status || ''), steady: clean(f.steady || ''),
      reason: clean(a.description || ''), sev, crit, ts
    });
  });

  const bySev = (a, b) => (b.crit ? 1 : 0) - (a.crit ? 1 : 0) ||
    (a.sev === 'danger' ? 0 : 1) - (b.sev === 'danger' ? 0 : 1) || b.ts - a.ts;
  const list = m => [...m.values()].sort(bySev);

  return {
    at: now,
    window_hours: windowH,
    alerts: live.length,
    count: districts.size,
    critical: [...districts.values()].filter(d => d.crit).length,
    districts: [...districts.values()].sort((a, b) =>
      b.crit - a.crit ||
      (a.sev === 'danger' ? 0 : 1) - (b.sev === 'danger' ? 0 : 1) ||
      (b.river + b.rain + b.road) - (a.river + a.rain + a.road) ||
      a.name.localeCompare(b.name)),
    rivers: list(rivers).slice(0, 14),
    rain: list(rain).slice(0, 14),
    roads: list(roads).slice(0, 14),
    source: 'BIPAD Portal (NDRRMA) · DHM hydrology & Department of Roads feeds',
    url: 'https://bipadportal.gov.np'
  };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
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
