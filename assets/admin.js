'use strict';
/* Admin analytics dashboard — client logic only. Contains NO credentials and NO
   auth decisions; the server (/api/stats behind a signed cookie) decides access.
   Untrusted strings (country/city names) are rendered with textContent ONLY.
   Charts embed numbers and validated YYYY-MM-DD dates only — never name strings. */

(function () {
  var loginView = document.getElementById('loginView');
  var dashView = document.getElementById('dashView');
  var form = document.getElementById('loginForm');
  var errEl = document.getElementById('loginErr');
  var loginBtn = document.getElementById('loginBtn');

  var DATA = null;            // last stats payload
  var LAST_AT = 0;           // when we last loaded (ms)
  var COUNTRY_SORT = 'count';
  var COUNTRY_Q = '';
  var RANGE = '7d';       // 1h | 24h | 3d | 7d | 28d
  var SHOW_MA = false;    // 7-point moving average overlay
  var timer = null, clockTimer = null;

  /* ---------- helpers ---------- */
  function show(view) {
    loginView.classList.toggle('hidden', view !== 'login');
    dashView.classList.toggle('hidden', view !== 'dash');
  }
  function fmt(n) { return (Number(n) || 0).toLocaleString('en-US'); }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function pct(part, whole) { whole = whole || 0; return whole ? (part / whole * 100) : 0; }

  /* ISO-3166 alpha-2 → display name (common set; falls back to the code). */
  var CNAME = {
    NP:'Nepal', IN:'India', US:'United States', CN:'China', AU:'Australia', GB:'United Kingdom',
    CA:'Canada', DE:'Germany', FR:'France', JP:'Japan', KR:'South Korea', MY:'Malaysia',
    UA:'Ukraine', IT:'Italy', ES:'Spain', NL:'Netherlands', RU:'Russia', BR:'Brazil',
    AE:'UAE', SA:'Saudi Arabia', QA:'Qatar', KW:'Kuwait', BH:'Bahrain', OM:'Oman',
    SG:'Singapore', HK:'Hong Kong', TW:'Taiwan', TH:'Thailand', ID:'Indonesia', PH:'Philippines',
    VN:'Vietnam', BD:'Bangladesh', PK:'Pakistan', LK:'Sri Lanka', BT:'Bhutan', MM:'Myanmar',
    IL:'Israel', TR:'Turkey', EG:'Egypt', ZA:'South Africa', NG:'Nigeria', KE:'Kenya',
    SE:'Sweden', NO:'Norway', DK:'Denmark', FI:'Finland', PL:'Poland', CZ:'Czechia',
    AT:'Austria', CH:'Switzerland', BE:'Belgium', IE:'Ireland', PT:'Portugal', GR:'Greece',
    HU:'Hungary', RO:'Romania', MX:'Mexico', AR:'Argentina', CL:'Chile', CO:'Colombia',
    NZ:'New Zealand', XX:'Unknown'
  };
  function cname(cc) { return CNAME[cc] || cc || '—'; }
  function flagUrl(cc) {
    var c = String(cc || '').toLowerCase();
    return /^[a-z]{2}$/.test(c) ? 'https://flagcdn.com/48x36/' + c + '.png' : '';
  }
  function flagImg(cc, w) {
    var img = document.createElement('img');
    img.className = 'flag'; img.width = w || 22; img.alt = '';
    var u = flagUrl(cc);
    if (u) { img.src = u; img.addEventListener('error', function () { img.style.visibility = 'hidden'; }); }
    else { img.style.visibility = 'hidden'; }
    return img;
  }

  /* ---------- KPI cards ---------- */
  function trendBadge(today, yest) {
    var b = el('span', 'trend');
    if (!yest) { b.className = 'trend flat'; b.textContent = '—'; return b; }
    var d = (today - yest) / yest * 100;
    if (Math.abs(d) < 0.5) { b.className = 'trend flat'; b.textContent = '0%'; }
    else if (d > 0) { b.className = 'trend up'; b.textContent = '▲ ' + Math.round(d) + '%'; }
    else { b.className = 'trend down'; b.textContent = '▼ ' + Math.round(Math.abs(d)) + '%'; }
    return b;
  }
  function kpiCard(value, label, cls, badge) {
    var c = el('div', 'kpi' + (cls ? ' ' + cls : ''));
    c.appendChild(el('div', 'n mono', value));
    c.appendChild(el('div', 'l', label));
    if (badge) c.appendChild(badge);
    return c;
  }
  function renderKPIs(d) {
    var wrap = document.getElementById('kpis'); wrap.textContent = '';
    var countries = d.countries || [];
    var daily = d.daily || [];
    var np = countries.find(function (c) { return c[0] === 'NP'; });
    var npv = np ? np[1] : 0;
    var pv = d.pageviews || 0, uq = d.uniques || 0;
    var today = daily.length ? daily[daily.length - 1][1] : 0;
    var yest = daily.length > 1 ? daily[daily.length - 2][1] : 0;
    var peak = daily.reduce(function (m, r) { return Math.max(m, r[1]); }, 0);
    var ppv = uq ? (pv / uq) : 0;

    wrap.appendChild(kpiCard(fmt(uq), 'Real visitors (unique)'));
    wrap.appendChild(kpiCard(fmt(pv), 'Total pageviews'));
    wrap.appendChild(kpiCard(fmt(countries.length), 'Countries reached', 'k--green'));
    wrap.appendChild(kpiCard(fmt(npv), 'Nepal visits', 'k--red'));
    wrap.appendChild(kpiCard(ppv.toFixed(1), 'Pageviews / visitor', 'k--amber'));
    wrap.appendChild(kpiCard(Math.round(pct(npv, pv)) + '%', 'Nepal share', 'k--red'));
    wrap.appendChild(kpiCard(fmt(today), 'Today', null, trendBadge(today, yest)));
    wrap.appendChild(kpiCard(fmt(peak), 'Peak day', 'k--green'));
  }

  /* ---------- time-range series + labels ---------- */
  var validDate = function (s) { return /^\d{4}-\d{2}-\d{2}$/.test(s); };
  var validHour = function (s) { return /^\d{4}-\d{2}-\d{2}T\d{2}$/.test(s); };
  function xlabel(key, gran) {
    if (gran === 'h') return validHour(key) ? key.slice(11) + ':00' : '';
    return validDate(key) ? key.slice(5) : '';
  }
  function tiplabel(key, gran) {
    if (gran === 'h') return validHour(key) ? key.slice(0, 10) + ' ' + key.slice(11) + ':00' : '';
    return validDate(key) ? key : '';
  }
  function seriesForRange(d) {
    var hourly = d.hourly || [], daily = d.daily || [];
    switch (RANGE) {
      case '1h': return { pts: hourly.slice(-1), gran: 'h', label: 'last hour' };
      case '24h': return { pts: hourly.slice(-24), gran: 'h', label: 'last 24 hours' };
      case '3d': return { pts: daily.slice(-3), gran: 'd', label: 'last 3 days' };
      case '28d': return { pts: daily.slice(-28), gran: 'd', label: 'last 28 days' };
      default: return { pts: daily.slice(-7), gran: 'd', label: 'last 7 days' };
    }
  }
  function movingAvg(vals, w) {
    return vals.map(function (_, i) {
      var a = Math.max(0, i - w + 1), s = 0, c = 0;
      for (var j = a; j <= i; j++) { s += vals[j]; c++; }
      return s / c;
    });
  }

  /* ---------- visits chart (range-aware) ---------- */
  function renderArea(d) {
    var host = document.getElementById('areaChart'); host.textContent = '';
    var tip = document.getElementById('areaTip');
    var ser = seriesForRange(d), rows = ser.pts, gran = ser.gran;
    var total = rows.reduce(function (s, r) { return s + r[1]; }, 0);
    document.getElementById('rangeTotal').textContent = fmt(total) + ' visits · ' + ser.label;
    if (!rows.length) { host.appendChild(el('div', 'empty', gran === 'h' ? 'Collecting hourly data…' : 'No visits recorded yet.')); return; }
    var W = 720, H = 210, padL = 34, padR = 12, padT = 12, padB = 26;
    var iw = W - padL - padR, ih = H - padT - padB;
    var n = rows.length;
    var max = rows.reduce(function (m, r) { return Math.max(m, r[1]); }, 1);
    var x = function (i) { return padL + (n === 1 ? iw / 2 : (i / (n - 1)) * iw); };
    var y = function (v) { return padT + ih - (v / max) * ih; };
    var pts = rows.map(function (r, i) { return [x(i), y(r[1])]; });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var area = 'M' + padL + ' ' + (padT + ih) + ' ' + line.replace('M', 'L') + ' L' + x(n - 1).toFixed(1) + ' ' + (padT + ih);
    var grid = '', labY = '';
    for (var g = 0; g <= 3; g++) {
      var gy = padT + (ih / 3) * g;
      grid += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) + '" stroke="var(--grid)" stroke-width="1"/>';
      labY += '<text x="' + (padL - 6) + '" y="' + (gy + 3).toFixed(1) + '" text-anchor="end" font-size="9" fill="var(--muted)">' + Math.round(max - (max / 3) * g) + '</text>';
    }
    var dots = pts.map(function (p) { return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="2.6" fill="var(--crimson)"/>'; }).join('');
    var maPath = '';
    if (SHOW_MA && n >= 3) {
      var ma = movingAvg(rows.map(function (r) { return r[1]; }), 7);
      maPath = '<path d="' + ma.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ') +
        '" fill="none" stroke="var(--accent-2)" stroke-width="1.8" stroke-dasharray="5 4"/>';
    }
    var xlabels = '';
    rows.forEach(function (r, i) {
      if (n <= 8 || i % Math.ceil(n / 8) === 0 || i === n - 1) {
        xlabels += '<text x="' + x(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="9" fill="var(--muted)">' + xlabel(r[0], gran) + '</text>';
      }
    });
    host.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">' +
      '<defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="var(--crimson)" stop-opacity="0.35"/>' +
      '<stop offset="1" stop-color="var(--crimson)" stop-opacity="0.02"/></linearGradient></defs>' +
      grid + labY +
      '<path d="' + area + '" fill="url(#ag)"/>' +
      '<path d="' + line + '" fill="none" stroke="var(--crimson)" stroke-width="2.2" stroke-linejoin="round"/>' +
      maPath + dots + xlabels + '</svg>';
    // hover overlay (rebuilt each render, scoped to the plot host only)
    var old = host.querySelector('.hlayer'); if (old) old.remove();
    var layer = document.createElement('div'); layer.className = 'hlayer';
    layer.style.cssText = 'position:absolute;left:0;right:0;top:0;bottom:0;';
    host.style.position = 'relative';
    rows.forEach(function (r, i) {
      var seg = document.createElement('div');
      seg.style.cssText = 'position:absolute;top:0;bottom:0;width:' + (100 / n) + '%;left:' + (i / n * 100) + '%;';
      seg.addEventListener('mouseenter', function () {
        tip.textContent = tiplabel(r[0], gran) + ' · ' + fmt(r[1]) + ' views';
        var h2 = document.getElementById('areaChart');
        tip.style.left = (h2.offsetLeft + (x(i) / W) * h2.offsetWidth) + 'px';
        tip.style.top = (h2.offsetTop + (y(r[1]) / H) * h2.offsetHeight - 6) + 'px';
        tip.style.opacity = '1';
      });
      seg.addEventListener('mouseleave', function () { tip.style.opacity = '0'; });
      layer.appendChild(seg);
    });
    host.appendChild(layer);
  }

  /* ---------- activity by hour of day (replaces flag strip) ---------- */
  function renderHourOfDay(hourly) {
    var host = document.getElementById('hourChart'); host.textContent = '';
    if (!hourly || !hourly.length) { host.appendChild(el('div', 'empty', 'Collecting hourly data…')); return; }
    var byHour = new Array(24).fill(0);
    hourly.forEach(function (r) { if (validHour(r[0])) byHour[parseInt(r[0].slice(11), 10)] += r[1]; });
    var max = byHour.reduce(function (m, v) { return Math.max(m, v); }, 1);
    var peak = byHour.indexOf(max);
    var bars = '', lab = '', bw = 100 / 24;
    byHour.forEach(function (v, i) {
      var h = (v / max) * 108;
      var col = i === peak ? 'var(--crimson)' : 'var(--accent-2)';
      bars += '<rect x="' + (i * bw + bw * 0.15) + '%" y="' + (120 - h) + '" width="' + (bw * 0.7) + '%" height="' + h.toFixed(1) + '" rx="2" fill="' + col + '"><title>' + (i < 10 ? '0' + i : i) + ':00 — ' + v + ' views</title></rect>';
      if (i % 3 === 0) lab += '<text x="' + ((i + 0.5) * bw) + '%" y="134" text-anchor="middle" font-size="8" fill="var(--muted)">' + i + '</text>';
    });
    host.innerHTML = '<svg viewBox="0 0 400 140" preserveAspectRatio="none">' + bars + lab + '</svg>';
  }

  /* ---------- donut (Nepal vs international) ---------- */
  function renderDonut(npv, pv) {
    var host = document.getElementById('donut'); host.textContent = '';
    var leg = document.getElementById('donutLegend'); leg.textContent = '';
    var intl = Math.max(0, pv - npv);
    var R = 60, C = 2 * Math.PI * R, npFrac = pv ? npv / pv : 0;
    var npLen = (C * npFrac).toFixed(1);
    host.innerHTML =
      '<svg viewBox="0 0 180 150" role="img">' +
      '<g transform="translate(90,75) rotate(-90)">' +
      '<circle r="' + R + '" fill="none" stroke="var(--accent-2)" stroke-width="22"/>' +
      '<circle r="' + R + '" fill="none" stroke="var(--crimson)" stroke-width="22" ' +
      'stroke-dasharray="' + npLen + ' ' + C.toFixed(1) + '"/></g>' +
      '<text x="90" y="72" text-anchor="middle" font-size="26" font-weight="800" fill="var(--ink)" font-family="Archivo,sans-serif">' + Math.round(npFrac * 100) + '%</text>' +
      '<text x="90" y="90" text-anchor="middle" font-size="10" fill="var(--muted)">from Nepal</text></svg>';
    var l1 = el('span'); l1.appendChild(Object.assign(document.createElement('i'), { style: 'background:var(--crimson)' }));
    l1.appendChild(document.createTextNode('Nepal · ' + fmt(npv))); leg.appendChild(l1);
    var l2 = el('span'); l2.appendChild(Object.assign(document.createElement('i'), { style: 'background:var(--accent-2)' }));
    l2.appendChild(document.createTextNode('International · ' + fmt(intl))); leg.appendChild(l2);
  }

  /* ---------- weekday pattern ---------- */
  function renderWeekday(daily) {
    var host = document.getElementById('weekday'); host.textContent = '';
    if (!daily || !daily.length) { host.appendChild(el('div', 'empty', 'No data yet.')); return; }
    var names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], sums = [0, 0, 0, 0, 0, 0, 0];
    daily.forEach(function (r) { if (validDate(r[0])) { var d = new Date(r[0] + 'T00:00:00Z').getUTCDay(); sums[d] += r[1]; } });
    var max = sums.reduce(function (m, v) { return Math.max(m, v); }, 1);
    var bars = '', lab = '', bw = 100 / 7;
    sums.forEach(function (v, i) {
      var h = (v / max) * 74, cx = (i + 0.5) * bw;
      bars += '<rect x="' + (i * bw + bw * 0.18) + '%" y="' + (86 - h) + '" width="' + (bw * 0.64) + '%" height="' + h.toFixed(1) + '" rx="3" fill="var(--accent)"><title>' + names[i] + ': ' + v + '</title></rect>';
      lab += '<text x="' + cx + '%" y="98" text-anchor="middle" font-size="9" fill="var(--muted)">' + names[i] + '</text>';
    });
    host.innerHTML = '<svg viewBox="0 0 300 104" preserveAspectRatio="none" style="height:120px">' + bars + lab + '</svg>';
  }

  /* ---------- auto-generated insights ---------- */
  // Themed line icons (stroke = currentColor, tinted by the card's accent chip).
  var IC = {
    trend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    compare: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3l4 4-4 4"/><path d="M21 7H8a4 4 0 0 0-4 4"/><path d="M7 21l-4-4 4-4"/><path d="M3 17h13a4 4 0 0 0 4-4"/></svg>',
    bars: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h11l-2 3.5L16 11H5"/></svg>'
  };
  function insightCard(iconSvg, cls, title, value, sub) {
    var c = el('div', 'insight' + (cls ? ' ' + cls : ''));
    var ic = el('div', 'ic'); ic.innerHTML = iconSvg; c.appendChild(ic);
    c.appendChild(el('div', 't', title));
    var v = el('div', 'v'); v.appendChild(document.createTextNode(value));
    if (sub) { v.appendChild(document.createTextNode(' ')); v.appendChild(el('small', null, sub)); }
    c.appendChild(v);
    return c;
  }
  function renderInsights(d) {
    var host = document.getElementById('insights'); host.textContent = '';
    var daily = d.daily || [], hourly = d.hourly || [], countries = d.countries || [];
    // busiest day
    var busy = daily.reduce(function (b, r) { return r[1] > b[1] ? r : b; }, ['—', 0]);
    var wk = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var busyLbl = validDate(busy[0]) ? wk[new Date(busy[0] + 'T00:00:00Z').getUTCDay()] + ' ' + busy[0].slice(5) : '—';
    host.appendChild(insightCard(IC.trend, 'i-red', 'Busiest day', fmt(busy[1]), 'views · ' + busyLbl));
    // peak hour of day
    var byHour = new Array(24).fill(0);
    hourly.forEach(function (r) { if (validHour(r[0])) byHour[parseInt(r[0].slice(11), 10)] += r[1]; });
    var peakH = byHour.indexOf(Math.max.apply(null, byHour.concat([0])));
    var peakHasData = byHour.some(function (v) { return v > 0; });
    host.appendChild(insightCard(IC.clock, 'i-blue', 'Peak hour (UTC)', peakHasData ? (peakH < 10 ? '0' + peakH : peakH) + ':00' : '—', peakHasData ? fmt(byHour[peakH]) + ' views' : 'collecting'));
    // week over week
    var last7 = daily.slice(-7).reduce(function (s, r) { return s + r[1]; }, 0);
    var prev7 = daily.slice(-14, -7).reduce(function (s, r) { return s + r[1]; }, 0);
    var wowTxt = '—', wowSub = 'vs prior 7d';
    var wowCls = 'i-green';
    if (prev7) { var w = Math.round((last7 - prev7) / prev7 * 100); wowTxt = (w >= 0 ? '+' : '') + w + '%'; wowCls = w < 0 ? 'i-red' : 'i-green'; }
    host.appendChild(insightCard(IC.compare, wowCls, 'Week over week', wowTxt, wowSub));
    // average per day
    var avg = daily.length ? Math.round(daily.reduce(function (s, r) { return s + r[1]; }, 0) / daily.length) : 0;
    host.appendChild(insightCard(IC.bars, 'i-amber', 'Avg / day', fmt(avg), 'over ' + daily.length + 'd'));
    // top country share
    var totC = countries.reduce(function (s, r) { return s + r[1]; }, 0);
    var top = countries[0] || ['—', 0];
    host.appendChild(insightCard(IC.globe, 'i-blue', 'Top country', cname(top[0]), Math.round(pct(top[1], totC)) + '% share'));
    // reach
    host.appendChild(insightCard(IC.flag, 'i-green', 'Global reach', fmt(countries.length), 'countries'));
  }

  /* ---------- country table (flags + search + sort) ---------- */
  function renderCountries() {
    var host = document.getElementById('countries'); host.textContent = '';
    var rows = (DATA && DATA.countries) ? DATA.countries.slice() : [];
    if (COUNTRY_Q) {
      var q = COUNTRY_Q.toLowerCase();
      rows = rows.filter(function (r) { return r[0].toLowerCase().indexOf(q) >= 0 || cname(r[0]).toLowerCase().indexOf(q) >= 0; });
    }
    if (COUNTRY_SORT === 'name') rows.sort(function (a, b) { return cname(a[0]).localeCompare(cname(b[0])); });
    else rows.sort(function (a, b) { return b[1] - a[1]; });
    if (!rows.length) { host.appendChild(el('div', 'empty', 'No matches.')); return; }
    var max = rows.reduce(function (m, r) { return Math.max(m, r[1]); }, 1);
    var total = (DATA.countries || []).reduce(function (s, r) { return s + r[1]; }, 0);
    rows.slice(0, 30).forEach(function (r, i) {
      var row = el('div', 'row');
      row.appendChild(el('div', 'rank', String(i + 1)));
      row.appendChild(flagImg(r[0], 22));
      var nm = el('div', 'name'); nm.appendChild(document.createTextNode(cname(r[0])));
      var code = el('span', 'code', r[0]); nm.appendChild(code);
      row.appendChild(nm);
      var track = el('div', 'track'); var bar = el('div', 'bar');
      bar.style.width = Math.max(3, (r[1] / max) * 100) + '%'; track.appendChild(bar); row.appendChild(track);
      row.appendChild(el('div', 'val mono', fmt(r[1])));
      row.appendChild(el('div', 'pct', Math.round(pct(r[1], total)) + '%'));
      host.appendChild(row);
    });
  }

  /* ---------- cities ---------- */
  function renderCities(rows) {
    var host = document.getElementById('cities'); host.textContent = '';
    if (!rows || !rows.length) { host.appendChild(el('div', 'empty', 'No Nepal visits recorded yet.')); return; }
    var max = rows[0][1] || 1, total = rows.reduce(function (s, r) { return s + r[1]; }, 0);
    rows.slice(0, 14).forEach(function (r, i) {
      var row = el('div', 'row');
      row.appendChild(el('div', 'rank', String(i + 1)));
      row.appendChild(el('div', 'name', r[0]));
      var track = el('div', 'track'); var bar = el('div', 'bar');
      bar.style.width = Math.max(3, (r[1] / max) * 100) + '%'; track.appendChild(bar); row.appendChild(track);
      row.appendChild(el('div', 'val mono', fmt(r[1])));
      row.appendChild(el('div', 'pct', Math.round(pct(r[1], total)) + '%'));
      host.appendChild(row);
    });
  }

  /* ---------- render all ---------- */
  function renderAll(d) {
    DATA = d; LAST_AT = Date.now();
    var np = (d.countries || []).find(function (c) { return c[0] === 'NP'; });
    renderKPIs(d);
    renderArea(d);
    renderDonut(np ? np[1] : 0, d.pageviews || 0);
    renderWeekday(d.daily);
    renderHourOfDay(d.hourly);
    renderInsights(d);
    renderCountries();
    renderCities(d.nepalCities);
    tickClock();
  }

  function tickClock() {
    var lbl = document.getElementById('liveLbl'); if (!lbl || !LAST_AT) return;
    var s = Math.round((Date.now() - LAST_AT) / 1000);
    var txt = s < 5 ? 'updated just now' : s < 60 ? 'updated ' + s + 's ago' : 'updated ' + Math.round(s / 60) + 'm ago';
    lbl.lastChild.textContent = ' ' + txt;
  }

  /* ---------- CSV export ---------- */
  function toCSV() {
    if (!DATA) return;
    var lines = ['section,key,value'];
    (DATA.countries || []).forEach(function (r) { lines.push('country,' + r[0] + ',' + r[1]); });
    (DATA.nepalCities || []).forEach(function (r) { lines.push('nepal_city,"' + String(r[0]).replace(/"/g, '""') + '",' + r[1]); });
    (DATA.daily || []).forEach(function (r) { lines.push('daily,' + r[0] + ',' + r[1]); });
    lines.push('summary,pageviews,' + (DATA.pageviews || 0));
    lines.push('summary,uniques,' + (DATA.uniques || 0));
    var blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'nepaldisaster-analytics-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  /* ---------- copy summary ---------- */
  function copySummary() {
    if (!DATA) return;
    var np = (DATA.countries || []).find(function (c) { return c[0] === 'NP'; });
    var lines = [
      'NepalDisaster.com — analytics summary (' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC)',
      'Unique visitors: ' + fmt(DATA.uniques),
      'Total pageviews: ' + fmt(DATA.pageviews),
      'Countries reached: ' + (DATA.countries || []).length,
      'Nepal visits: ' + fmt(np ? np[1] : 0) + ' (' + Math.round(pct(np ? np[1] : 0, DATA.pageviews)) + '%)',
      'Top countries: ' + (DATA.countries || []).slice(0, 5).map(function (c) { return cname(c[0]) + ' ' + c[1]; }).join(', '),
      'Top NP cities: ' + (DATA.nepalCities || []).slice(0, 5).map(function (c) { return c[0] + ' ' + c[1]; }).join(', ')
    ];
    var txt = lines.join('\n'), btn = document.getElementById('copyBtn');
    var done = function () { btn.textContent = 'Copied ✓'; setTimeout(loadCopyIcon, 1400); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, done);
    else { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); done(); }
  }
  function loadCopyIcon() {
    document.getElementById('copyBtn').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg> Copy';
  }

  /* ---------- theme ---------- */
  function applyTheme(t) {
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    var ic = document.getElementById('themeIcon');
    if (ic) ic.innerHTML = t === 'dark'
      ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>'
      : '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>';
    try { localStorage.setItem('nd_admin_theme', t); } catch (e) {}
  }
  function initTheme() {
    var t = 'light';
    try { t = localStorage.getItem('nd_admin_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch (e) {}
    applyTheme(t);
  }

  /* ---------- data load ---------- */
  function loadStats() {
    fetch('/api/stats', { credentials: 'same-origin' })
      .then(function (r) {
        if (r.status === 401) { show('login'); stopAuto(); throw new Error('unauth'); }
        if (!r.ok) throw new Error('stats');
        return r.json();
      })
      .then(function (d) { show('dash'); renderAll(d); startAuto(); })
      .catch(function () { /* handled */ });
  }
  function startAuto() {
    if (!timer) timer = setInterval(loadStats, 45000);
    if (!clockTimer) clockTimer = setInterval(tickClock, 1000);
  }
  function stopAuto() {
    if (timer) { clearInterval(timer); timer = null; }
    if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
  }

  /* ---------- wiring ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errEl.textContent = ''; loginBtn.disabled = true;
    fetch('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
      body: JSON.stringify({ email: document.getElementById('email').value, password: document.getElementById('password').value })
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        loginBtn.disabled = false;
        if (res.ok && res.j.ok) { document.getElementById('password').value = ''; loadStats(); }
        else { errEl.textContent = (res.j && res.j.error) || 'Sign-in failed.'; }
      })
      .catch(function () { loginBtn.disabled = false; errEl.textContent = 'Network error. Try again.'; });
  });

  document.getElementById('logoutBtn').addEventListener('click', function () {
    stopAuto();
    fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).then(function () { show('login'); });
  });
  document.getElementById('refreshBtn').addEventListener('click', loadStats);
  document.getElementById('exportBtn').addEventListener('click', toCSV);
  document.getElementById('copyBtn').addEventListener('click', copySummary);
  document.getElementById('maToggle').addEventListener('change', function (e) { SHOW_MA = e.target.checked; if (DATA) renderArea(DATA); });
  Array.prototype.forEach.call(document.querySelectorAll('#rangeSeg button'), function (b) {
    b.addEventListener('click', function () {
      RANGE = b.getAttribute('data-range');
      Array.prototype.forEach.call(document.querySelectorAll('#rangeSeg button'), function (x) { x.classList.toggle('on', x === b); });
      if (DATA) renderArea(DATA);
    });
  });
  document.getElementById('themeBtn').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });
  document.getElementById('countrySearch').addEventListener('input', function (e) { COUNTRY_Q = e.target.value.trim(); renderCountries(); });
  Array.prototype.forEach.call(document.querySelectorAll('#countrySort button'), function (b) {
    b.addEventListener('click', function () {
      COUNTRY_SORT = b.getAttribute('data-sort');
      Array.prototype.forEach.call(document.querySelectorAll('#countrySort button'), function (x) { x.classList.toggle('on', x === b); });
      renderCountries();
    });
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && DATA) loadStats(); });

  initTheme();
  loadStats();
})();
