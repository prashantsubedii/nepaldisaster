'use strict';
/* GET /api/alerts → live flood alerts for Nepal.
   Source: GDACS (Global Disaster Alert and Coordination System, run by the UN &
   European Commission) — the authoritative, machine-readable feed that sits
   behind flood-warning services. Fetched server-side (GDACS sends no CORS
   header), normalised, and KV-cached. This is the reliable substitute for
   scraping a Facebook page, which Facebook does not permit. */

const { cmd } = require('../lib/kv');

const GDACS = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=FL&country=Nepal';
const CACHE_KEY = 'cache:alerts:v1';
const TTL = 600;          // 10 min
const STALE = 6 * 3600;

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
  const alerts = feats.map(f => {
    const p = f.properties || {};
    const from = p.fromdate ? Date.parse(p.fromdate) : 0;
    return {
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
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 12);
  return { at: Date.now(), alerts };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
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
