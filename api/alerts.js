'use strict';
/* GET /api/alerts → live flood alerts for Nepal.
   Source: GDACS (Global Disaster Alert and Coordination System, run by the UN &
   European Commission) — the authoritative, machine-readable feed that sits
   behind flood-warning services. Fetched server-side (GDACS sends no CORS
   header), normalised, and KV-cached. This is the reliable substitute for
   scraping a Facebook page, which Facebook does not permit. */

const { cmd } = require('../lib/kv');

const GDACS = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=FL&country=Nepal';
const CACHE_KEY = 'cache:alerts:v2';   // bumped: recency filter added
const TTL = 60;           // re-check GDACS at most every minute (was 10 min)
const STALE = 6 * 3600;
const MAX_AGE_MS = 45 * 24 * 3600 * 1000;  // drop events with no activity in the last 45 days

const LEVEL = { Red: 'danger', Orange: 'watch', Green: 'relief' };

function clean(s) {
  return String(s == null ? '' : s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fresh() {
  const r = await fetch(GDACS, {
    headers: { 'User-Agent': 'nepaldisaster.com/1.0', Accept: 'application/json' },
    signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error('gdacs ' + r.status);
  const j = await r.json();
  const feats = (j && j.features) || [];
  const now = Date.now();
  const alerts = feats.map(f => {
    const p = f.properties || {};
    const from = p.fromdate ? Date.parse(p.fromdate) : 0;
    const to = p.todate ? Date.parse(p.todate) : 0;
    // "Freshness" = the most recent activity date GDACS reports for the event.
    const recent = Math.max(isNaN(from) ? 0 : from, isNaN(to) ? 0 : to);
    return {
      _recent: recent,
      id: 'gdacs-' + (p.eventid || '') + '-' + (p.episodeid || ''),
      level: LEVEL[p.alertlevel] || 'watch',
      alertlevel: p.alertlevel || '',
      title: clean(p.name) || ('Flood alert — Nepal'),
      description: clean(p.htmldescription || p.description),
      from: p.fromdate || '',
      to: p.todate || '',
      ts: isNaN(from) ? 0 : from,
      url: p.url && p.url.report ? p.url.report :
        ('https://www.gdacs.org/report.aspx?eventid=' + (p.eventid || '') + '&episodeid=' + (p.episodeid || '') + '&eventtype=FL')
    };
  }).filter(a => a.title)
    // Drop stale events (e.g. last year's monsoon) that GDACS still lists —
    // keep only alerts with activity in the recency window.
    .filter(a => a._recent && (now - a._recent) < MAX_AGE_MS)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 12)
    .map(a => { delete a._recent; return a; });
  return { at: Date.now(), alerts };
}

module.exports = async (req, res) => {
  // Same pattern as /api/warnings: no browser copy, short CDN copy refreshed in the background.
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=120');
  try {
    const c = await cmd(['GET', CACHE_KEY]);
    if (c) { const j = JSON.parse(c); if (Date.now() - j.at < TTL * 1000) { res.status(200).json(j); return; } }
  } catch (_) {}
  try {
    const payload = await fresh();
    try { await cmd(['SET', CACHE_KEY, JSON.stringify(payload), 'EX', String(STALE)]); } catch (_) {}
    res.status(200).json(payload);
  } catch (e) {
    try { const c = await cmd(['GET', CACHE_KEY]); if (c) { res.status(200).json(JSON.parse(c)); return; } } catch (_) {}
    res.status(200).json({ at: Date.now(), alerts: [], error: 'unavailable' });
  }
};
