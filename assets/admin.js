'use strict';
/* Admin panel client logic. Contains NO credentials and NO auth decisions —
   it simply talks to the server-side API. The server decides who is allowed in;
   this script only reflects that. All rendering uses safe DOM APIs (no innerHTML
   with server strings) so hostile city/country values can never inject markup. */

(function () {
  var loginView = document.getElementById('loginView');
  var dashView = document.getElementById('dashView');
  var form = document.getElementById('loginForm');
  var errEl = document.getElementById('loginErr');
  var loginBtn = document.getElementById('loginBtn');

  function show(view) {
    loginView.classList.toggle('hidden', view !== 'login');
    dashView.classList.toggle('hidden', view !== 'dash');
  }

  function fmt(n) { return (Number(n) || 0).toLocaleString('en-US'); }

  /* Build a labelled bar row with textContent only (XSS-safe). */
  function barRow(name, value, max) {
    var row = document.createElement('div'); row.className = 'row';
    var nm = document.createElement('div'); nm.className = 'name'; nm.textContent = name;
    var barWrap = document.createElement('div'); barWrap.style.flex = '0 0 120px';
    var bar = document.createElement('div'); bar.className = 'bar';
    bar.style.width = Math.max(2, Math.round((value / (max || 1)) * 120)) + 'px';
    barWrap.appendChild(bar);
    var val = document.createElement('div'); val.className = 'val'; val.textContent = fmt(value);
    row.appendChild(nm); row.appendChild(barWrap); row.appendChild(val);
    return row;
  }

  function renderList(el, rows, emptyMsg) {
    el.textContent = '';
    if (!rows || !rows.length) {
      var e = document.createElement('div'); e.className = 'empty';
      e.textContent = emptyMsg || 'No data yet.'; el.appendChild(e); return;
    }
    var max = rows[0][1] || 1;
    rows.slice(0, 12).forEach(function (r) { el.appendChild(barRow(r[0], r[1], max)); });
  }

  function renderSpark(rows) {
    var el = document.getElementById('spark'); el.textContent = '';
    if (!rows || !rows.length) return;
    var max = rows.reduce(function (m, r) { return Math.max(m, r[1]); }, 1);
    var total = 0;
    rows.forEach(function (r) {
      total += r[1];
      var d = document.createElement('div');
      d.style.height = Math.max(2, Math.round((r[1] / max) * 60)) + 'px';
      d.title = r[0] + ': ' + fmt(r[1]);
      el.appendChild(d);
    });
    document.getElementById('dailyTotal').textContent = fmt(total) + ' total';
  }

  function loadStats() {
    fetch('/api/stats', { credentials: 'same-origin' })
      .then(function (r) {
        if (r.status === 401) { show('login'); throw new Error('unauth'); }
        if (!r.ok) throw new Error('stats');
        return r.json();
      })
      .then(function (d) {
        show('dash');
        document.getElementById('kUniques').textContent = fmt(d.uniques);
        document.getElementById('kPageviews').textContent = fmt(d.pageviews);
        document.getElementById('kCountries').textContent = fmt((d.countries || []).length);
        var np = (d.countries || []).find(function (c) { return c[0] === 'NP'; });
        document.getElementById('kNepal').textContent = fmt(np ? np[1] : 0);
        renderList(document.getElementById('countries'), d.countries, 'No visits recorded yet.');
        renderList(document.getElementById('cities'), d.nepalCities, 'No Nepal visits recorded yet.');
        renderSpark(d.daily);
      })
      .catch(function () { /* handled above */ });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errEl.textContent = '';
    loginBtn.disabled = true;
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
      })
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        loginBtn.disabled = false;
        if (res.ok && res.j.ok) {
          document.getElementById('password').value = '';
          loadStats();
        } else {
          errEl.textContent = (res.j && res.j.error) || 'Sign-in failed.';
        }
      })
      .catch(function () { loginBtn.disabled = false; errEl.textContent = 'Network error. Try again.'; });
  });

  document.getElementById('logoutBtn').addEventListener('click', function () {
    fetch('/api/logout', { method: 'POST', credentials: 'same-origin' })
      .then(function () { show('login'); });
  });

  // On load, try stats — if the session cookie is valid we skip straight to the dashboard.
  loadStats();
})();
