'use strict';
/* tools/refresh_live.js — scheduled snapshot refresher.
 *
 * Runs on a schedule from .github/workflows/refresh.yml (hourly). It fetches the
 * same Google News RSS feeds the /api/news and /api/highways serverless routes
 * use, parses them to clean JSON, and writes two committed snapshots:
 *     assets/news_cache.json
 *     assets/highways_cache.json
 *
 * The front-end (assets/app.js) reads /api/news first and falls back to these
 * files, so the site keeps showing fresh headlines even when it is served as
 * plain static files with no serverless layer (e.g. GitHub Pages). The workflow
 * commits and pushes whatever changed, so the repo itself auto-updates.
 *
 * No dependencies — Node 18+ (global fetch). Nothing here is hand-typed; it is
 * whatever the wire is reporting at run time.
 */

const fs = require('fs');
const path = require('path');

const HAZARD =
  '(flood OR flooding OR landslide OR earthquake OR "heavy rain" OR rainfall OR ' +
  'monsoon OR avalanche OR disaster OR NDRRMA OR DHM OR "weather warning" OR ' +
  '"weather forecast" OR "road blocked" OR "highway blocked" OR rescue OR relief)';
const NEPALI_SITES = [
  'onlinekhabar.com', 'kathmandupost.com', 'ratopati.com',
  'myrepublica.nagariknetwork.com', 'setopati.com', 'ekantipur.com',
  'thehimalayantimes.com', 'nepalnews.com'
];
const g = q => 'https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=en-US&gl=US&ceid=US:en';

const NEWS_FEEDS = [
  g('Nepal ' + HAZARD + ' when:3d'),
  g('Nepal ' + HAZARD + ' when:7d (' + NEPALI_SITES.map(s => 'site:' + s).join(' OR ') + ')'),
  g('Nepal ' + HAZARD + ' when:14d')
];
const HW_FEEDS = [ g('Nepal highway OR road blocked OR landslide OR obstructed when:7d') ];
const ROADY = /(highway|road|route|traffic|blocked|obstruct|landslide|reopen|resume|one[- ]way|detour|closed|disrupt|section)/i;

function decode(s) {
  return String(s == null ? '' : s)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}

function parse(xml, roadOnly) {
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
  }).filter(x => x.title && x.url && (!roadOnly || ROADY.test(x.title)))
    .sort((a, b) => b.ts - a.ts);
}

async function fetchFeed(url, roadOnly) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; nepaldisaster.com/1.0)' },
    signal: AbortSignal.timeout(15000)
  });
  if (!r.ok) throw new Error('rss ' + r.status);
  return parse(await r.text(), roadOnly);
}

async function collect(feeds, roadOnly, cap) {
  const results = await Promise.allSettled(feeds.map(u => fetchFeed(u, roadOnly)));
  const seen = new Set();
  const merged = [];
  results.forEach(r => {
    if (r.status === 'fulfilled') r.value.forEach(it => {
      const key = (it.title || '').toLowerCase().slice(0, 60);
      if (key && !seen.has(key)) { seen.add(key); merged.push(it); }
    });
  });
  merged.sort((a, b) => b.ts - a.ts);
  return merged.slice(0, cap);
}

function writeIfChanged(file, payload) {
  const full = path.join(__dirname, '..', file);
  const next = JSON.stringify(payload, null, 2) + '\n';
  let prev = '';
  try { prev = fs.readFileSync(full, 'utf8'); } catch (_) {}
  // Compare ignoring the `at` timestamp so an unchanged headline list does not
  // produce an empty commit every hour.
  const strip = s => s.replace(/"at":\s*\d+,?/g, '');
  if (strip(prev) === strip(next)) { console.log('unchanged:', file); return false; }
  fs.writeFileSync(full, next);
  console.log('updated:', file, '(' + payload.items.length + ' items)');
  return true;
}

(async () => {
  let changed = false;
  try {
    const news = await collect(NEWS_FEEDS, false, 30);
    if (news.length) changed = writeIfChanged('assets/news_cache.json', { at: Date.now(), items: news }) || changed;
    else console.log('news: no items, keeping previous snapshot');
  } catch (e) { console.log('news failed:', e.message); }
  try {
    const hw = await collect(HW_FEEDS, true, 16);
    if (hw.length) changed = writeIfChanged('assets/highways_cache.json', { at: Date.now(), items: hw }) || changed;
    else console.log('highways: no items, keeping previous snapshot');
  } catch (e) { console.log('highways failed:', e.message); }
  console.log(changed ? 'CHANGED' : 'NOCHANGE');
})();
