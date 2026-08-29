'use strict';
/* GET /api/news  → live Nepal-flood news headlines.
   Fetches Google News RSS server-side (no CORS/UA issues in the browser),
   parses it to clean JSON, and caches the result in KV for 10 minutes so we
   never hammer the upstream feed. Falls back to stale cache, then to [] —
   the site always keeps working, it just shows its built-in bulletins if the
   live feed is unreachable. Nothing here is hand-typed; it's whatever the wire
   is reporting right now. */

const { cmd } = require('../lib/kv');

const QUERY = 'Nepal floods when:14d';
const FEED = 'https://news.google.com/rss/search?q=' +
  encodeURIComponent(QUERY) + '&hl=en-US&gl=US&ceid=US:en';
const CACHE_KEY = 'cache:news:v2';
const TTL = 600;          // serve cached for 10 minutes
const STALE = 6 * 3600;   // keep a stale copy up to 6h for fallback

function decode(s) {
  return String(s == null ? '' : s)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}

function parse(xml) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  return items.map(mm => {
    const b = mm[1];
    const pick = re => { const m = b.match(re); return m ? decode(m[1]) : ''; };
    let title = pick(/<title>([\s\S]*?)<\/title>/);
    const link = pick(/<link>([\s\S]*?)<\/link>/);
    const date = pick(/<pubDate>([\s\S]*?)<\/pubDate>/);
    let source = pick(/<source[^>]*>([\s\S]*?)<\/source>/);
    // Google appends " - Source" to the title; split it off.
    const dash = title.lastIndexOf(' - ');
    if (dash > 0) {
      const tail = title.slice(dash + 3);
      if (!source) source = tail;
      if (title.endsWith(' - ' + source)) title = title.slice(0, dash);
    }
    const ts = date ? Date.parse(date) : 0;
    return { title, source: source || 'News', url: link, date, ts: isNaN(ts) ? 0 : ts };
  }).filter(x => x.title && x.url)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 24);
}

async function fresh() {
  const r = await fetch(FEED, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; nepaldisaster.com/1.0)' },
    signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error('rss ' + r.status);
  const items = parse(await r.text());
  return { at: Date.now(), items };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  // 1) serve a warm cache if it's still fresh
  try {
    const c = await cmd(['GET', CACHE_KEY]);
    if (c) { const j = JSON.parse(c); if (Date.now() - j.at < TTL * 1000) { res.status(200).json(j); return; } }
  } catch (_) { /* KV not configured — just fetch live */ }
  // 2) fetch fresh, cache it
  try {
    const payload = await fresh();
    try { await cmd(['SET', CACHE_KEY, JSON.stringify(payload), 'EX', String(STALE)]); } catch (_) {}
    res.status(200).json(payload);
  } catch (e) {
    // 3) stale cache, then empty (client falls back to built-in bulletins)
    try { const c = await cmd(['GET', CACHE_KEY]); if (c) { res.status(200).json(JSON.parse(c)); return; } } catch (_) {}
    res.status(200).json({ at: Date.now(), items: [], error: 'unavailable' });
  }
};
