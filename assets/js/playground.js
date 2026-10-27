/* ============================================================
   DPM Learning Hub — live runners
   #xl-play  -> window.ExcelEngine  (formula evaluated on DPM_DATA)
   #sql-play -> sql.js / SQLite in the browser (tables: orders, targets)
   #dax-play -> window.DaxValidator (syntax & style check)
   Also exposes window.DPM_buildSqlDb(SQL) and window.DPM_SQL_READY,
   which the exam engine uses to grade typed SQL answers.
   ============================================================ */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(v) {
    if (v === null || v === undefined) return '<span class="nullv">NULL</span>';
    if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString('en-US') : (Math.round(v * 10000) / 10000).toLocaleString('en-US', { maximumFractionDigits: 4 });
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    return esc(v);
  }

  /* wire a runner: textarea + run button + example chips + Ctrl/⌘+Enter */
  function wire(host, run) {
    var input = $('.code-in', host);
    var btn = $('.play-actions .btn', host);
    if (!input || !btn) return;
    btn.addEventListener('click', run);
    input.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
    });
    host.querySelectorAll('.chip-btn[data-f]').forEach(function (c) {
      c.addEventListener('click', function () { input.value = c.dataset.f; autosize(input); run(); });
    });
    input.addEventListener('input', function () { autosize(input); });
    autosize(input);
    var hint = document.createElement('span');
    hint.className = 'legend run-hint';
    hint.innerHTML = 'or press <kbd class="kbd-mod">Ctrl</kbd>+<kbd>Enter</kbd>';
    btn.insertAdjacentElement('afterend', hint);
    if (/Mac|iPhone|iPad/.test(navigator.platform || '')) hint.querySelector('.kbd-mod').textContent = '⌘';
  }
  function autosize(t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 2, 420) + 'px'; }

  /* ---------------- Excel ---------------- */
  var xl = document.getElementById('xl-play');
  if (xl && window.ExcelEngine && window.DPM_DATA) {
    var xlOut = document.getElementById('xl-out');
    var runXl = function () {
      var f = document.getElementById('xl-in').value.trim();
      if (!f) { xlOut.className = 'out'; xlOut.textContent = 'Type a formula starting with ='; return; }
      var r = window.ExcelEngine.evaluate(f, { headers: window.DPM_DATA.excelHeaders, rows: window.DPM_DATA.rows });
      if (r.ok) {
        var v = r.value;
        if (Array.isArray(v)) v = v.join(', ');
        xlOut.className = 'out ok';
        xlOut.innerHTML = '<span class="res-label">Result</span><span class="res-val">' + fmt(v) + '</span>';
      } else {
        xlOut.className = 'out err';
        xlOut.innerHTML = '<span class="res-label">Error</span><b>' + esc(r.error) + '</b>' +
          '<p class="legend">Check the function name, brackets, commas and that text is in "double quotes".</p>';
      }
    };
    wire(xl, runXl);
    runXl();
  }

  /* ---------------- SQL ---------------- */
  function buildDb(SQL) {
    var D = window.DPM_DATA;
    var db = new SQL.Database();
    var cols = D.sqlColumns.map(function (c, i) { return c + ' ' + D.sqlTypes[i]; }).join(', ');
    db.run('CREATE TABLE orders (' + cols + ');');
    var stmt = db.prepare('INSERT INTO orders VALUES (' + D.sqlColumns.map(function () { return '?'; }).join(',') + ');');
    D.rows.forEach(function (r) { stmt.run(r.map(function (v) { return v === undefined ? null : v; })); });
    stmt.free();
    db.run('CREATE TABLE targets (region TEXT, revenue_target INTEGER);');
    var t = db.prepare('INSERT INTO targets VALUES (?, ?);');
    D.targets.forEach(function (r) { t.run(r); });
    t.free();
    return db;
  }
  window.DPM_buildSqlDb = buildDb;

  if (window.initSqlJs && window.DPM_DATA) {
    window.DPM_SQL_READY = window.initSqlJs({ locateFile: function (f) { return 'assets/vendor/' + f; } }).then(buildDb);
  }

  var sqlHost = document.getElementById('sql-play');
  if (sqlHost) {
    var out = document.getElementById('sql-out');
    var status = document.getElementById('sql-status');
    if (!window.DPM_SQL_READY) {
      out.className = 'out err';
      out.textContent = 'The SQL engine could not load. If you opened the file directly, serve the folder over HTTP (python3 -m http.server).';
    } else {
      out.textContent = 'Loading the in-browser database…';
      window.DPM_SQL_READY.then(function (db) {
        var runSql = function () {
          var q = document.getElementById('sql-in').value.trim();
          if (!q) return;
          var t0 = performance.now();
          try {
            var res = db.exec(q);
            var ms = Math.max(1, Math.round(performance.now() - t0));
            if (!res.length) {
              var changed = db.getRowsModified();
              out.className = 'out ok';
              out.innerHTML = 'Statement ran' + (changed ? ' — ' + changed + ' row(s) changed' : '') + '. No rows returned. <span class="legend">Refresh the page to reset the data.</span>';
              if (status) status.textContent = ms + ' ms';
              return;
            }
            var last = res[res.length - 1];
            var shown = last.values.slice(0, 200);
            var html = '<div class="rtbl-wrap"><table class="rtbl"><thead><tr><th class="rn">#</th>' +
              last.columns.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
              shown.map(function (row, i) {
                return '<tr><td class="rn">' + (i + 1) + '</td>' + row.map(function (v) { return '<td' + (typeof v === 'number' ? ' class="num"' : '') + '>' + fmt(v) + '</td>'; }).join('') + '</tr>';
              }).join('') + '</tbody></table></div>';
            if (last.values.length > shown.length) html += '<p class="legend">Showing the first ' + shown.length + ' of ' + last.values.length + ' rows.</p>';
            out.className = 'out ok';
            out.innerHTML = html;
            if (status) status.textContent = last.values.length + ' row' + (last.values.length === 1 ? '' : 's') + ' · ' + ms + ' ms';
          } catch (e) {
            out.className = 'out err';
            out.innerHTML = '<span class="res-label">SQL error</span><b>' + esc(e.message) + '</b>' +
              '<p class="legend">Tip: text values go in single quotes, e.g. <code>WHERE region = \'EMEA\'</code>. Tables: <code>orders</code>, <code>targets</code>.</p>';
            if (status) status.textContent = '';
          }
        };
        wire(sqlHost, runSql);
        runSql();
      }).catch(function (e) {
        out.className = 'out err';
        out.textContent = 'Could not start SQLite: ' + e.message;
      });
    }
  }

  /* ---------------- DAX ---------------- */
  var dax = document.getElementById('dax-play');
  if (dax && window.DaxValidator) {
    var dOut = document.getElementById('dax-out');
    var runDax = function () {
      var r = window.DaxValidator.validate(document.getElementById('dax-in').value);
      var html = r.ok
        ? '<span class="res-label">Syntax</span><b class="okv">✓ Looks valid</b>'
        : '<span class="res-label">Syntax</span><b class="badv">✗ ' + r.issues.length + ' problem' + (r.issues.length === 1 ? '' : 's') + '</b>';
      if (r.issues.length) html += r.issues.map(function (i) { return '<p class="tip-line bad">' + i + '</p>'; }).join('');
      if (r.tips.length) html += r.tips.map(function (i) { return '<p class="tip-line">' + i + '</p>'; }).join('');
      if (r.notes && r.notes.length) html += r.notes.map(function (i) { return '<p class="tip-line note-line">' + i + '</p>'; }).join('');
      dOut.className = 'out ' + (r.ok ? 'ok' : 'err');
      dOut.innerHTML = html;
    };
    wire(dax, runDax);
    runDax();
  }
})();
