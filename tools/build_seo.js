#!/usr/bin/env node
'use strict';
/* tools/build_seo.js — keep the crawler-facing HTML and sitemap in step.
 *
 * Runs from .github/workflows/refresh.yml after refresh_live.js (hourly), and
 * can be run by hand:   node tools/build_seo.js        (write)
 *                       node tools/build_seo.js --dry  (report only)
 *
 * 1. Headline: the hero <h1> and the eyebrow labels ([data-event-title]) and
 *    the hero region line ([data-event-region]) used to ship as "—" and were
 *    only filled in by assets/app.js. Crawlers and link previews that do not run
 *    JavaScript saw an empty headline. This writes the same text app.js shows
 *    on first paint into the HTML, so the page reads correctly before any JS.
 *    app.js still overwrites it at runtime (language switch, live data).
 *
 *    Source of truth is unchanged: EVENT / NATIONAL in assets/app.js, with
 *    event.region from assets/live_data.json taking precedence (as app.js does).
 *    In calm mode (NATIONAL.normal) the national headline/sub are used instead.
 *
 * 2. sitemap.xml: regenerated from the *.html pages in the repo root, with
 *    <lastmod> taken from the last git commit touching the page or the data it
 *    shows. New pages appear automatically. Needs full git history
 *    (actions/checkout fetch-depth: 0); with a shallow clone every date would be
 *    the latest commit's.
 *
 * No dependencies — Node 18+.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');
const SITE = 'https://www.nepaldisaster.com';

// Pages that are not public content and must never be listed.
const EXCLUDE = new Set(['adminprashant.html']);

// changefreq / priority per page, carried over from the hand-written sitemap.
// Pages not listed here get DEFAULT.
const META = {
  'index.html':           ['hourly',  '1.0'],
  'flood-details.html':   ['hourly',  '0.9'],
  'nepal-floods.html':    ['hourly',  '0.9'],
  'news.html':            ['hourly',  '0.9'],
  'stats.html':           ['hourly',  '0.9'],
  'highway-updates.html': ['hourly',  '0.9'],
  'alerts.html':          ['hourly',  '0.8'],
  'weather.html':         ['hourly',  '0.8'],
  'missing.html':         ['daily',   '0.8'],
  'rescue.html':          ['daily',   '0.8'],
  'relief.html':          ['weekly',  '0.7'],
  'nepal-disaster.html':  ['weekly',  '0.7'],
  'history.html':         ['monthly', '0.6'],
  'about-developer.html': ['monthly', '0.3'],
};
const DEFAULT = ['weekly', '0.5'];

// Data files whose changes change what a page shows. The page's own HTML is
// always included.
const DEPS = {
  'index.html':           ['assets/live_data.json', 'assets/news_cache.json', 'assets/highways_cache.json'],
  'news.html':            ['assets/news_cache.json'],
  'highway-updates.html': ['assets/highways_cache.json'],
  'stats.html':           ['assets/live_data.json'],
  'flood-details.html':   ['assets/live_data.json'],
};

/* ---------- helpers ---------- */

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Pull a top-level `const NAME = { ... };` object literal out of app.js and
// evaluate it in an empty sandbox. String-aware brace matching, so braces
// inside quoted text do not confuse it.
function extractObject(src, name) {
  const start = src.indexOf(`const ${name} = {`);
  if (start < 0) throw new Error(`const ${name} not found in assets/app.js`);
  let i = src.indexOf('{', start), depth = 0, quote = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i) + 1; continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) break;
  }
  const literal = src.slice(src.indexOf('{', start), i + 1);
  return vm.runInNewContext(`(${literal})`, {}, { timeout: 1000 });
}

// Replace the text content of every element carrying `attr`. Only elements
// with plain-text content are touched; anything with child markup is left.
function fillAttr(html, attr, text) {
  const re = new RegExp(`(<[a-z0-9]+\\b[^>]*\\s${attr}(?:\\s[^>]*)?>)([^<]*)(</)`, 'gi');
  return html.replace(re, (_, open, _old, close) => open + escHtml(text) + close);
}

// When a page or its data is changed but not yet committed (the workflow runs
// this just before committing the fresh snapshots), the date is now.
function lastCommit(files) {
  try {
    const dirty = execFileSync('git', ['status', '--porcelain', '--', ...files],
      { cwd: ROOT, encoding: 'utf8' }).trim();
    if (dirty) return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', ...files],
      { cwd: ROOT, encoding: 'utf8' }).trim();
    return out || null;
  } catch (_) { return null; }
}

/* ---------- 1. headline ---------- */

function headline() {
  const app = read('assets/app.js');
  const EVENT = extractObject(app, 'EVENT');
  const NATIONAL = extractObject(app, 'NATIONAL');
  let live = {};
  try { live = JSON.parse(read('assets/live_data.json')); } catch (_) {}

  if (NATIONAL.normal) {
    return { title: NATIONAL.headline.en, region: NATIONAL.sub.en };
  }
  const region = (live.event && live.event.region && live.event.region.en) || EVENT.region.en;
  return { title: EVENT.title.en, region };
}

function writeHeadlines() {
  const { title, region } = headline();
  if (!title) throw new Error('empty headline — refusing to write');
  const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && !EXCLUDE.has(f));
  for (const f of pages) {
    const before = read(f);
    let after = fillAttr(before, 'data-event-title', title);
    after = fillAttr(after, 'data-event-region', region);
    if (after !== before) {
      if (!DRY) fs.writeFileSync(path.join(ROOT, f), after, 'utf8');
      console.log(`${DRY ? 'would update' : 'updated'} headline in ${f}`);
    }
  }
  console.log(`headline: "${title}"`);
}

/* ---------- 2. sitemap ---------- */

function writeSitemap() {
  const pages = fs.readdirSync(ROOT)
    .filter(f => f.endsWith('.html') && !EXCLUDE.has(f))
    .sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));

  const today = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const urls = pages.map(f => {
    const loc = f === 'index.html' ? `${SITE}/` : `${SITE}/${f.replace(/\.html$/, '')}`;
    const lastmod = lastCommit([f, ...(DEPS[f] || [])]) || today;
    const [freq, prio] = META[f] || DEFAULT;
    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>${freq}</changefreq>`,
      `    <priority>${prio}</priority>`,
      '  </url>',
    ].join('\n');
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!-- Generated by tools/build_seo.js — edit that script, not this file. -->',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls.join('\n\n'),
    '</urlset>',
    '',
  ].join('\n');

  if (xml !== read('sitemap.xml')) {
    if (!DRY) fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
    console.log(`${DRY ? 'would write' : 'wrote'} sitemap.xml (${pages.length} pages)`);
  } else {
    console.log('sitemap.xml unchanged');
  }
}

writeHeadlines();
writeSitemap();
