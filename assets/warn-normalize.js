/* =========================================================================
   Shared BIPAD warning normaliser — used by BOTH api/warnings.js (server,
   CommonJS) and the browser (window.NDWarn), so the live alert map, the
   homepage counts and the district panel read one shape whichever path the
   data came in on.

   Source: the BIPAD Portal (https://bipadportal.gov.np), NDRRMA's public
   platform. Each alert carries a GeoJSON `point` (the station or road site),
   and the district endpoint publishes a centroid for all 77 districts — that
   is what lets the map plot every warned district automatically, with no
   hand-placed markers.

   Browser path is a FALLBACK: pages call /api/warnings first (server-side,
   KV-cached), and only read BIPAD directly if that endpoint is down.
   ========================================================================= */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NDWarn = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BIPAD_ALERTS = 'https://bipadportal.gov.np/api/v1/alert/?ordering=-created_on&limit=80';
  var BIPAD_DISTRICTS = 'https://bipadportal.gov.np/api/v1/district/?format=json&limit=100';
  var WINDOW_H = 24;   // "today" = the last 24 hours of alerts
  var WIDE_H = 72;     // widened if the last 24h were quiet

  function clean(s) {
    return String(s == null ? '' : s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  /* "Flood warning at Golanjor-7, Sindhuli" → place "Golanjor-7", district "Sindhuli". */
  function splitPlace(title) {
    var t = clean(title);
    var body = t.replace(/^.*?\s+(?:at|in)\s+/i, '');
    var i = body.lastIndexOf(',');
    if (i < 0) return { place: body, district: '' };
    return { place: body.slice(0, i).trim(), district: body.slice(i + 1).trim() };
  }
  /* The station reading lives in a serialised Django record on each alert. */
  function fields(a) {
    try {
      var rd = JSON.parse(a.referenceData || '{}');
      if (Array.isArray(rd)) rd = rd[0] || {};
      return (rd && rd.fields) || {};
    } catch (_) { return {}; }
  }
  /* River = flood alert (danger colour); only ABOVE DANGER is critical. */
  function sevOf(kind) { return kind === 'river' ? 'danger' : 'watch'; }
  function isCrit(status) { return String(status || '').toUpperCase().indexOf('ABOVE DANGER') >= 0; }
  function key(name) { return String(name || '').toLowerCase().replace(/[^a-z]/g, ''); }
  function pt(a) {
    var c = a && a.point && a.point.coordinates;
    return (c && isFinite(c[0]) && isFinite(c[1])) ? { lat: +c[1], lng: +c[0] } : null;
  }

  /* District list → lookup by normalised English name. */
  function indexDistricts(list) {
    var idx = {};
    (Array.isArray(list) ? list : (list && list.results) || []).forEach(function (d) {
      var c = d.centroid && d.centroid.coordinates;
      if (!c) return;
      idx[key(d.title_en || d.title)] = { lat: +c[1], lng: +c[0], ne: d.title_ne || '', province: d.province };
    });
    return idx;
  }
  function findDistrict(idx, name) {
    var k = key(name);
    if (idx[k]) return idx[k];
    for (var p in idx) { if (p.indexOf(k) === 0 || k.indexOf(p) === 0) return idx[p]; }
    return null;
  }

  function normalize(rows, dIdx, now) {
    rows = rows || []; dIdx = dIdx || {}; now = now || Date.now();
    var within = function (h) {
      return rows.filter(function (a) {
        var ts = Date.parse(a.createdOn || a.startedOn || '');
        return ts && (now - ts) < h * 3600 * 1000;
      });
    };
    var windowH = WINDOW_H, live = within(WINDOW_H);
    if (!live.length) { windowH = WIDE_H; live = within(WIDE_H); }

    var rivers = {}, rain = {}, roads = {}, districts = {};
    live.forEach(function (a) {
      var kind = a.referenceType || '';
      if (kind !== 'river' && kind !== 'rain' && kind !== 'road') return;
      var sp = splitPlace(a.title);
      if (!sp.district) return;
      var f = fields(a), ts = Date.parse(a.createdOn || a.startedOn || '') || 0;
      var sev = sevOf(kind), crit = isCrit(f.status), p = pt(a);

      var d = districts[sp.district] || { name: sp.district, sev: 'watch', crit: 0, river: 0, rain: 0, road: 0, ts: 0, _pts: [] };
      d[kind] += 1;
      if (sev === 'danger') d.sev = 'danger';
      if (crit) d.crit += 1;
      if (ts > d.ts) d.ts = ts;
      if (p) d._pts.push(p);
      districts[sp.district] = d;

      // The feed re-publishes the same station every reading cycle; keep only
      // the newest row per station so the map shows places, not repetitions.
      var k = (f.title || sp.place) + '|' + sp.district;
      var bucket = kind === 'river' ? rivers : (kind === 'rain' ? rain : roads);
      var prev = bucket[k];
      if (prev && prev.ts >= ts) return;
      bucket[k] = {
        station: clean(f.title || sp.place), place: sp.place, district: sp.district, basin: clean(f.basin || ''),
        level: f.water_level != null ? Math.round(f.water_level * 100) / 100 : null,
        warning: f.warning_level != null ? f.warning_level : null,
        danger: f.danger_level != null ? f.danger_level : null,
        status: clean(f.status || ''), steady: clean(f.steady || ''),
        reason: clean(a.description || ''), sev: sev, crit: crit, ts: ts,
        lat: p ? p.lat : null, lng: p ? p.lng : null
      };
    });

    var dList = Object.keys(districts).map(function (n) {
      var d = districts[n], c = findDistrict(dIdx, n);
      if (c) { d.lat = c.lat; d.lng = c.lng; d.ne = c.ne; d.province = c.province; }
      else if (d._pts.length) {             // no centroid match: average its stations
        d.lat = d._pts.reduce(function (s, q) { return s + q.lat; }, 0) / d._pts.length;
        d.lng = d._pts.reduce(function (s, q) { return s + q.lng; }, 0) / d._pts.length;
      }
      delete d._pts;
      return d;
    });
    var vals = function (m) { return Object.keys(m).map(function (k) { return m[k]; }); };
    var bySev = function (a, b) {
      return (b.crit ? 1 : 0) - (a.crit ? 1 : 0) ||
        (a.sev === 'danger' ? 0 : 1) - (b.sev === 'danger' ? 0 : 1) || b.ts - a.ts;
    };
    return {
      at: now,
      window_hours: windowH,
      alerts: live.length,
      count: dList.length,
      critical: dList.filter(function (d) { return d.crit; }).length,
      districts: dList.sort(function (a, b) {
        return b.crit - a.crit ||
          (a.sev === 'danger' ? 0 : 1) - (b.sev === 'danger' ? 0 : 1) ||
          (b.river + b.rain + b.road) - (a.river + a.rain + a.road) ||
          a.name.localeCompare(b.name);
      }),
      rivers: vals(rivers).sort(bySev).slice(0, 40),
      rain: vals(rain).sort(bySev).slice(0, 40),
      roads: vals(roads).sort(bySev).slice(0, 20),
      source: 'BIPAD Portal (NDRRMA) · DHM hydrology & Department of Roads feeds',
      url: 'https://bipadportal.gov.np'
    };
  }

  return {
    BIPAD_ALERTS: BIPAD_ALERTS, BIPAD_DISTRICTS: BIPAD_DISTRICTS,
    normalize: normalize, indexDistricts: indexDistricts,
    clean: clean, splitPlace: splitPlace, fields: fields, isCrit: isCrit
  };
});
