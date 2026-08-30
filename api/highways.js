'use strict';
/* GET /api/highways → live "road/highway blocked" headlines for Nepal.
   Same approach as /api/news: fetch Google News RSS server-side (no CORS/UA
   issues), keep only items that read as a road-status update, cache in KV for
   10 minutes. This is the auto-updating feed shown on the Highway Updates page
   ON TOP of the curated route table (assets/highways.json), so travellers see
   whatever the wire is reporting right now. Falls back to stale cache, then []. */

const { cmd } = require('../lib/kv');

const FEEDS = [
  'https://news.google.com/rss/search?q=' +
    encodeURIComponent('Nepal highway OR road blocked OR landslide OR obstructed when:7d') +
    '&hl=en-US&gl=US&ceid=US:en'
];
const CACHE_KEY = 'cache:highways:v1';
const TTL = 600;          // serve cached for 10 minutes
const STALE = 6 * 3600;

// Keep only headlines that are actually about road/traffic status.
const ROADY = /(highway|road|route|traffic|blocked|obstruct|landslide|reopen|resume|one[- ]way|detour|closed|disrupt|section)/i;

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
    const dash = title.lastIndexOf(' - ');
    if (dash > 0) {
      const tail = title.slice(dash + 3);
      if (!source) source = tail;
      if (title.endsWith(' - ' + source)) title = title.slice(0, dash);
    }
    const ts = date ? Date.parse(date) : 0;
    return { title, source: source || 'News', url: link, date, ts: isNaN(ts) ? 0 : ts };
  }).filter(x => x.title && x.url && ROADY.test(x.title))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 16);
}

async function fetchFeed(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; nepaldisaster.com/1.0)' },
    signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error('rss ' + r.status);
  return parse(await r.text());
}

async function fresh() {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const seen = new Set();
  let merged = [];
  results.forEach(r => {
    if (r.status === 'fulfilled') r.value.forEach(it => {
      const key = (it.title || '').toLowerCase().slice(0, 60);
      if (key && !seen.has(key)) { seen.add(key); merged.push(it); }
    });
  });
  merged.sort((a, b) => b.ts - a.ts);
  return { at: Date.now(), items: merged.slice(0, 16) };
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
    res.status(200).json({ at: Date.now(), items: [], error: 'unavailable' });
  }
};
