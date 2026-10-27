/* ============================================================
   DPM Learning Hub — Live Dashboard (dashboard.html)
   Filters (synced to the URL), KPI tiles, click-to-filter SVG
   bar charts with tooltips, a sortable/searchable data explorer
   and CSV export. All charts are single-series (one hue) with
   direct value labels; the explorer is the table view.
   ============================================================ */
(function () {
  'use strict';
  var D = window.DPM_DATA;
  if (!D) return;

  var C = { id: 0, customer: 1, site: 2, city: 3, country: 4, region: 5, service: 6, status: 7, dpm: 8, eng: 9,
    ordered: 10, target: 11, actual: 12, fte: 13, revenue: 14, aps: 15, priority: 16 };
  var ROWS = D.rows;
  var TARGETS = {};
  D.targets.forEach(function (t) { TARGETS[t[0]] = t[1]; });
  var SVGNS = 'http://www.w3.org/2000/svg';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var nf = new Intl.NumberFormat('en-US');
  function eur(v) { return '€' + nf.format(Math.round(v)); }
  function eurShort(v) { return v >= 1e6 ? '€' + (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? '€' + Math.round(v / 1e3) + 'k' : '€' + Math.round(v); }
  function sum(rows, c) { return rows.reduce(function (s, r) { return s + (Number(r[c]) || 0); }, 0); }

  /* ---------------- filters ---------------- */
  var FILTER_KEYS = { 5: 'region', 6: 'service', 7: 'status', 16: 'priority', 1: 'customer', 8: 'dpm' };
  var filters = {};
  var selects = $$('.filters select');
  var params = new URLSearchParams(location.search);

  selects.forEach(function (sel) {
    var col = +sel.dataset.col;
    var vals = ROWS.map(function (r) { return r[col]; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }).sort();
    if (col === C.priority) vals = ['High', 'Medium', 'Low'].filter(function (v) { return vals.indexOf(v) > -1; });
    sel.innerHTML = '<option value="">All</option>' + vals.map(function (v) { return '<option>' + esc(v) + '</option>'; }).join('');
    var fromUrl = params.get(FILTER_KEYS[col]);
    if (fromUrl && vals.indexOf(fromUrl) > -1) { sel.value = fromUrl; filters[col] = fromUrl; }
    sel.addEventListener('change', function () { setFilter(col, sel.value); });
  });
  function setFilter(col, val) {
    if (val) filters[col] = val; else delete filters[col];
    var sel = $('.filters select[data-col="' + col + '"]');
    if (sel) sel.value = val || '';
    syncUrl(); update();
  }
  function toggleFilter(col, val) { setFilter(col, filters[col] === val ? '' : val); }
  $('#f-reset').addEventListener('click', function () { filters = {}; selects.forEach(function (s) { s.value = ''; }); syncUrl(); update(); });
  function syncUrl() {
    var p = new URLSearchParams();
    Object.keys(filters).forEach(function (c) { p.set(FILTER_KEYS[c], filters[c]); });
    var q = p.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash);
  }
  function filtered() {
    return ROWS.filter(function (r) {
      for (var c in filters) if (r[c] !== filters[c]) return false;
      return true;
    });
  }

  /* ---------------- tooltip ---------------- */
  var tip = document.createElement('div');
  tip.className = 'tip'; tip.setAttribute('role', 'status');
  document.body.appendChild(tip);
  function showTip(e, valueTxt, label, extra) {
    tip.innerHTML = '';
    var b = document.createElement('b'); b.textContent = valueTxt; tip.appendChild(b);
    var s = document.createElement('span'); s.textContent = label; tip.appendChild(s);
    if (extra) { var x = document.createElement('div'); x.textContent = extra; x.style.marginTop = '2px'; tip.appendChild(x); }
    var rect = e.target.getBoundingClientRect();
    var x0 = e.clientX != null && e.clientX ? e.clientX : rect.left + rect.width / 2;
    var y0 = e.clientY != null && e.clientY ? e.clientY : rect.top;
    tip.classList.add('show');
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var left = Math.min(window.innerWidth - w - 8, Math.max(8, x0 + 14));
    var top = y0 - h - 12 < 8 ? y0 + 16 : y0 - h - 12;
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function hideTip() { tip.classList.remove('show'); }

  function el(name, attrs, parent) {
    var n = document.createElementNS(SVGNS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function textEl(parent, attrs, str) { var t = el('text', attrs, parent); t.textContent = str; return t; }

  /* ---------------- horizontal bar chart ----------------
     items: [{label, value, valueTxt, target?, extra?}]  */
  function hbar(host, items, opts) {
    host.innerHTML = '';
    if (!items.length) { host.innerHTML = '<p class="empty-chart">No orders match these filters.</p>'; return; }
    var W = Math.max(280, host.clientWidth || 480);
    var labelW = Math.min(170, Math.max(90, W * 0.32));
    var valW = 76;
    var rowH = 30, gap = 2, pad = 6;
    var H = items.length * rowH + pad * 2;
    var max = Math.max.apply(null, items.map(function (i) { return Math.max(i.value, i.target || 0); })) || 1;
    var plotW = W - labelW - valW;
    var x = function (v) { return labelW + (v / max) * plotW; };
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': opts.aria });
    // recessive gridlines at 25/50/75/100%
    [0.25, 0.5, 0.75, 1].forEach(function (f) { el('line', { class: 'grid-line', x1: labelW + f * plotW, x2: labelW + f * plotW, y1: pad, y2: H - pad }, svg); });
    el('line', { class: 'base-line', x1: labelW, x2: labelW, y1: pad, y2: H - pad }, svg);
    var active = opts.col != null ? filters[opts.col] : null;
    items.forEach(function (it, i) {
      var y = pad + i * rowH;
      var barH = rowH - 10;
      var g = el('g', { tabindex: opts.col != null ? 0 : -1, role: opts.col != null ? 'button' : 'presentation',
        'aria-label': it.label + ': ' + it.valueTxt + (opts.col != null ? '. Press Enter to filter.' : '') }, svg);
      var label = it.label.length > 24 ? it.label.slice(0, 23) + '…' : it.label;
      textEl(g, { class: 'lbl', x: labelW - 8, y: y + rowH / 2 + 4, 'text-anchor': 'end' }, label);
      var w = Math.max(2, x(it.value) - labelW - gap);
      // rounded data-end (4px), square at the baseline
      var r = Math.min(4, w / 2);
      var x0 = labelW + gap, y0 = y + 5, x1 = x0 + w, y1 = y0 + barH;
      el('path', { class: 'bar' + (active && active !== it.label ? ' dim' : ''),
        d: 'M' + x0 + ',' + y0 + 'H' + (x1 - r) + 'Q' + x1 + ',' + y0 + ' ' + x1 + ',' + (y0 + r) + 'V' + (y1 - r) + 'Q' + x1 + ',' + y1 + ' ' + (x1 - r) + ',' + y1 + 'H' + x0 + 'Z' }, g);
      if (it.target) {
        var tx = x(it.target);
        el('line', { class: 'target', x1: tx, x2: tx, y1: y + 2, y2: y + rowH - 2 }, g);
      }
      textEl(g, { class: 'val', x: Math.max(x1, it.target ? x(it.target) : 0) + 8, y: y + rowH / 2 + 4 }, it.valueShort || it.valueTxt);
      var hit = el('rect', { class: 'hit', x: 0, y: y, width: W, height: rowH }, g);
      g.insertBefore(hit, g.firstChild);
      var onMove = function (e) { showTip(e, it.valueTxt, it.label, it.extra); };
      g.addEventListener('pointermove', onMove);
      g.addEventListener('pointerleave', hideTip);
      g.addEventListener('focus', function (e) { showTip(e, it.valueTxt, it.label, it.extra); });
      g.addEventListener('blur', hideTip);
      if (opts.col != null) {
        g.style.cursor = 'pointer';
        g.addEventListener('click', function () { hideTip(); toggleFilter(opts.col, it.label); });
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFilter(opts.col, it.label); } });
      }
    });
    host.appendChild(svg);
  }

  /* ---------------- column chart (months) ---------------- */
  function columns(host, items, opts) {
    host.innerHTML = '';
    if (!items.length) { host.innerHTML = '<p class="empty-chart">No orders match these filters.</p>'; return; }
    var W = Math.max(300, host.clientWidth || 600), H = 220;
    var padL = 34, padR = 8, padT = 18, padB = 34;
    var max = Math.max.apply(null, items.map(function (i) { return i.value; })) || 1;
    var step = max <= 5 ? 1 : max <= 10 ? 2 : 5;
    var top = Math.ceil(max / step) * step;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var bw = plotW / items.length;
    var y = function (v) { return padT + plotH - (v / top) * plotH; };
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': opts.aria });
    for (var t = 0; t <= top; t += step) {
      el('line', { class: t === 0 ? 'base-line' : 'grid-line', x1: padL, x2: W - padR, y1: y(t), y2: y(t) }, svg);
      textEl(svg, { x: padL - 6, y: y(t) + 4, 'text-anchor': 'end' }, String(t));
    }
    var labelEvery = Math.ceil(items.length / Math.floor(plotW / 54));
    items.forEach(function (it, i) {
      var cx = padL + i * bw;
      var inner = Math.min(28, bw - 2);
      var x0 = cx + (bw - inner) / 2;
      var g = el('g', { tabindex: 0, 'aria-label': it.label + ': ' + it.valueTxt }, svg);
      el('rect', { class: 'hit', x: cx, y: padT, width: bw, height: plotH }, g);
      if (it.value > 0) {
        var y0 = y(it.value), y1 = y(0), r = Math.min(4, inner / 2, (y1 - y0) / 2);
        el('path', { class: 'bar', d: 'M' + x0 + ',' + y1 + 'V' + (y0 + r) + 'Q' + x0 + ',' + y0 + ' ' + (x0 + r) + ',' + y0 + 'H' + (x0 + inner - r) +
          'Q' + (x0 + inner) + ',' + y0 + ' ' + (x0 + inner) + ',' + (y0 + r) + 'V' + y1 + 'Z' }, g);
      }
      if (i % labelEvery === 0) textEl(svg, { x: cx + bw / 2, y: H - padB + 16, 'text-anchor': 'middle' }, it.short);
      var show = function (e) { showTip(e, it.valueTxt, it.label, it.extra); };
      g.addEventListener('pointermove', show);
      g.addEventListener('pointerleave', hideTip);
      g.addEventListener('focus', show);
      g.addEventListener('blur', hideTip);
    });
    // label the peak only (selective direct label)
    var peak = items.reduce(function (a, b) { return b.value > a.value ? b : a; });
    var pi = items.indexOf(peak);
    textEl(svg, { class: 'val', x: padL + pi * bw + bw / 2, y: y(peak.value) - 6, 'text-anchor': 'middle' }, String(peak.value));
    host.appendChild(svg);
  }

  /* ---------------- groupings ---------------- */
  function groupBy(rows, col, agg) {
    var m = {};
    rows.forEach(function (r) { (m[r[col]] = m[r[col]] || []).push(r); });
    return Object.keys(m).map(function (k) { return { key: k, rows: m[k], value: agg(m[k]) }; });
  }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var allMonths = (function () {
    var ms = ROWS.map(function (r) { return r[C.ordered].slice(0, 7); }).sort();
    var out = [], y = +ms[0].slice(0, 4), m = +ms[0].slice(5, 7);
    var endY = +ms[ms.length - 1].slice(0, 4), endM = +ms[ms.length - 1].slice(5, 7);
    while (y < endY || (y === endY && m <= endM)) { out.push(y + '-' + String(m).padStart(2, '0')); m++; if (m > 12) { m = 1; y++; } }
    return out;
  })();

  /* ---------------- render ---------------- */
  function isOnTime(r) { return r[C.status] === 'Delivered' && r[C.actual] && r[C.actual] <= r[C.target]; }

  function update() {
    var rows = filtered();
    var n = Object.keys(filters).length;
    $('#f-note').textContent = n
      ? 'Showing ' + rows.length + ' of ' + ROWS.length + ' orders · ' + Object.keys(filters).map(function (c) { return FILTER_KEYS[c] + ' = ' + filters[c]; }).join(' · ')
      : 'Showing all ' + ROWS.length + ' orders. Tip: click any bar to filter by it — click it again to clear.';

    // KPIs
    var delivered = rows.filter(function (r) { return r[C.status] === 'Delivered'; });
    var onTime = delivered.filter(isOnTime).length;
    var rev = sum(rows, C.revenue);
    var kpis = [
      ['Orders', nf.format(rows.length), delivered.length + ' delivered'],
      ['Revenue', eurShort(rev), rows.length ? 'avg ' + eur(rev / rows.length) + ' / order' : '—'],
      ['On-time delivery', delivered.length ? Math.round(onTime / delivered.length * 100) + '%' : '—', onTime + ' of ' + delivered.length + ' delivered on or before target'],
      ['Avg FTE days', rows.length ? (sum(rows, C.fte) / rows.length).toFixed(1) : '—', nf.format(Math.round(sum(rows, C.fte))) + ' FTE days in total'],
      ['APs migrated', nf.format(sum(rows, C.aps)), 'access points across ' + new Set(rows.map(function (r) { return r[C.site]; })).size + ' sites']
    ];
    $('#kpis').innerHTML = kpis.map(function (k) { return '<div class="kpi"><small>' + k[0] + '</small><b>' + k[1] + '</b><span>' + esc(k[2]) + '</span></div>'; }).join('');

    var byCust = groupBy(rows, C.customer, function (g) { return sum(g, C.revenue); }).sort(function (a, b) { return b.value - a.value; });
    hbar($('#c-customer'), byCust.map(function (g) {
      return { label: g.key, value: g.value, valueTxt: eur(g.value), valueShort: eurShort(g.value), extra: g.rows.length + ' orders' };
    }), { col: C.customer, aria: 'Revenue by customer' });

    var byReg = groupBy(rows, C.region, function (g) { return sum(g, C.revenue); }).sort(function (a, b) { return b.value - a.value; });
    hbar($('#c-region'), byReg.map(function (g) {
      var t = TARGETS[g.key];
      return { label: g.key, value: g.value, target: n ? null : t, valueTxt: eur(g.value), valueShort: eurShort(g.value),
        extra: t ? (n ? 'Target applies to the unfiltered region total' : Math.round(g.value / t * 100) + '% of ' + eur(t) + ' target') : '' };
    }), { col: C.region, aria: 'Revenue versus target by region' });
    $('[data-panel="region"] .legend-key').style.visibility = n ? 'hidden' : 'visible';

    var cnt = {};
    rows.forEach(function (r) { var k = r[C.ordered].slice(0, 7); cnt[k] = (cnt[k] || 0) + 1; });
    columns($('#c-month'), allMonths.map(function (k) {
      var m = +k.slice(5, 7);
      var v = cnt[k] || 0;
      return { label: MONTHS[m - 1] + ' ' + k.slice(0, 4), short: MONTHS[m - 1] + (m === 1 || k === allMonths[0] ? ' ’' + k.slice(2, 4) : ''), value: v, valueTxt: v + ' order' + (v === 1 ? '' : 's') };
    }), { aria: 'Orders placed per month' });

    var order = ['Delivered', 'In Progress', 'Staging', 'On Hold', 'Cancelled'];
    var bySt = groupBy(rows, C.status, function (g) { return g.length; })
      .sort(function (a, b) { return (order.indexOf(a.key) + 99) % 99 - (order.indexOf(b.key) + 99) % 99 || b.value - a.value; });
    hbar($('#c-status'), bySt.map(function (g) {
      return { label: g.key, value: g.value, valueTxt: g.value + ' orders', valueShort: String(g.value), extra: Math.round(g.value / rows.length * 100) + '% of orders' };
    }), { col: C.status, aria: 'Orders by status' });

    var bySvc = groupBy(rows, C.service, function (g) { return sum(g, C.fte) / g.length; }).sort(function (a, b) { return b.value - a.value; });
    hbar($('#c-service'), bySvc.map(function (g) {
      return { label: g.key, value: g.value, valueTxt: g.value.toFixed(1) + ' FTE days', valueShort: g.value.toFixed(1), extra: g.rows.length + ' orders' };
    }), { col: C.service, aria: 'Average FTE days by service type' });

    var byDpm = groupBy(rows, C.dpm, function (g) { return g.length; }).sort(function (a, b) { return b.value - a.value; });
    hbar($('#c-dpm'), byDpm.map(function (g) {
      return { label: g.key, value: g.value, valueTxt: g.value + ' orders', valueShort: String(g.value), extra: eur(sum(g.rows, C.revenue)) + ' revenue' };
    }), { col: C.dpm, aria: 'Orders per DPM' });

    renderTable(rows);
  }

  /* ---------------- formulas ("show the formula") ---------------- */
  var HOW = {
    customer: {
      Excel: '=SUMIFS(O:O, B:B, "Carlsberg Group")\n\nOr: Insert ▸ PivotTable → Rows: Customer, Values: Sum of Revenue, then sort descending.',
      SQL: 'SELECT customer, SUM(revenue) AS revenue\nFROM orders\nGROUP BY customer\nORDER BY revenue DESC;',
      DAX: 'Total Revenue := SUM ( Fact_Orders[revenue] )\n\n-- Bar chart: Axis = Customer, Value = [Total Revenue], sort by value',
      link: ['sql.html#clauses-by-level', 'GROUP BY in the SQL track']
    },
    region: {
      Excel: '=SUMIFS(O:O, F:F, "EMEA")            // actual\n=XLOOKUP("EMEA", Targets[Region], Targets[Target])\n=SUMIFS(O:O,F:F,"EMEA") / XLOOKUP(...)  // % of target',
      SQL: 'SELECT o.region,\n       SUM(o.revenue)        AS actual,\n       t.revenue_target,\n       ROUND(100.0 * SUM(o.revenue) / t.revenue_target) AS pct\nFROM orders o\nJOIN targets t ON o.region = t.region\nGROUP BY o.region;',
      DAX: '% of Target :=\nDIVIDE ( [Total Revenue], SUM ( Targets[revenue_target] ) )\n\n-- needs a relationship Targets[region] → Fact_Orders[region]',
      link: ['sql.html#sql-join', 'JOINs in the SQL track']
    },
    month: {
      Excel: '=COUNTIFS(K:K, ">="&DATE(2025,3,1), K:K, "<"&DATE(2025,4,1))\n\nOr: PivotTable → Rows: Order Date (grouped by Months & Years), Values: Count of Order ID.',
      SQL: "SELECT strftime('%Y-%m', order_date) AS month,\n       COUNT(*) AS orders\nFROM orders\nGROUP BY month\nORDER BY month;",
      DAX: 'Orders := COUNTROWS ( Fact_Orders )\n\n-- Column chart: Axis = \'Date\'[Year-Month] (from a marked Date table), Value = [Orders]',
      link: ['excel.html#pivottables', 'PivotTables in the Excel track']
    },
    status: {
      Excel: '=COUNTIF(H:H, "Delivered")\n=COUNTIF(H:H, "Delivered") / COUNTA(H2:H73)   // share',
      SQL: 'SELECT status, COUNT(*) AS orders\nFROM orders\nGROUP BY status\nORDER BY orders DESC;',
      DAX: 'Delivered Orders :=\nCALCULATE ( [Orders], Fact_Orders[status] = "Delivered" )\n\nOn-time % :=\nDIVIDE ( [On-time Orders], [Delivered Orders] )',
      link: ['powerbi.html#power-bi-by-level', 'CALCULATE in the Power BI track']
    },
    service: {
      Excel: '=AVERAGEIFS(N:N, G:G, "SD-WAN Migration")\n=ROUND(AVERAGEIFS(N:N, G:G, "LAN Refresh"), 1)',
      SQL: 'SELECT service_type,\n       ROUND(AVG(fte_days), 1) AS avg_fte,\n       COUNT(*) AS orders\nFROM orders\nGROUP BY service_type\nORDER BY avg_fte DESC;',
      DAX: 'Avg FTE Days := AVERAGE ( Fact_Orders[fte_days] )',
      link: ['excel.html#functions-by-level', 'AVERAGEIFS in the Excel track']
    },
    dpm: {
      Excel: '=COUNTIF(I:I, "Mia Larsson")\n=UNIQUE(I2:I73)            // list every DPM (Excel 365)\n=COUNTIF(I2:I73, UNIQUE(I2:I73))',
      SQL: 'SELECT dpm, COUNT(*) AS orders, SUM(revenue) AS revenue\nFROM orders\nGROUP BY dpm\nHAVING COUNT(*) >= 1\nORDER BY orders DESC;',
      DAX: 'Orders := COUNTROWS ( Fact_Orders )\n\nDPM Rank :=\nRANKX ( ALL ( Fact_Orders[dpm] ), [Orders] )',
      link: ['sql.html#clauses-by-level', 'HAVING in the SQL track']
    }
  };
  $$('.panel').forEach(function (p) {
    var key = p.dataset.panel, how = HOW[key];
    var box = $('.how', p), btn = $('.how-btn', p);
    if (!how) { btn.remove(); return; }
    var tabs = ['Excel', 'SQL', 'DAX'];
    box.innerHTML = '<div class="how-tabs" role="tablist">' + tabs.map(function (t, i) {
      return '<button type="button" role="tab" aria-selected="' + (i === 0) + '" data-t="' + t + '">' + t + '</button>';
    }).join('') + '</div><div class="code"><button class="copy" type="button">Copy</button><span class="code-text"></span></div>' +
      '<a class="how-link" href="' + how.link[0] + '">Learn it: ' + how.link[1] + ' →</a>';
    var codeText = $('.code-text', box);
    function show(t) {
      codeText.textContent = how[t];
      $$('[role="tab"]', box).forEach(function (b) { b.setAttribute('aria-selected', b.dataset.t === t ? 'true' : 'false'); });
    }
    $$('[role="tab"]', box).forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.t); }); });
    show('Excel');
    btn.addEventListener('click', function () {
      var open = !box.classList.contains('open');
      box.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'Hide the formula' : 'Show the formula';
    });
  });

  /* ---------------- data explorer ---------------- */
  var NUMERIC = [C.fte, C.revenue, C.aps];
  var sortCol = C.ordered, sortDir = -1, query = '';
  var lastRows = [];
  function visibleRows(rows) {
    var q = query.toLowerCase();
    var out = q ? rows.filter(function (r) { return r.some(function (v) { return v != null && String(v).toLowerCase().indexOf(q) > -1; }); }) : rows.slice();
    out.sort(function (a, b) {
      var x = a[sortCol], y = b[sortCol];
      if (x == null || x === '') return 1;
      if (y == null || y === '') return -1;
      return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * sortDir;
    });
    return out;
  }
  function renderTable(rows) {
    lastRows = rows;
    var vis = visibleRows(rows);
    var head = '<thead><tr>' + D.excelHeaders.map(function (h, i) {
      var s = i === sortCol ? (sortDir > 0 ? 'ascending' : 'descending') : 'none';
      return '<th scope="col" data-c="' + i + '" aria-sort="' + s + '" tabindex="0">' + esc(h) + '</th>';
    }).join('') + '</tr></thead>';
    var body = '<tbody>' + vis.map(function (r) {
      return '<tr>' + r.map(function (v, i) {
        if (i === C.status) return '<td><span class="status ' + String(v).toLowerCase().replace(/\s+/g, '-') + '">' + esc(v) + '</span></td>';
        if (i === C.revenue) return '<td class="num">' + nf.format(v) + '</td>';
        return '<td' + (NUMERIC.indexOf(i) > -1 ? ' class="num"' : '') + '>' + (v == null ? '<span class="nullv">—</span>' : esc(v)) + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody>';
    var table = $('#x-table');
    table.innerHTML = head + body;
    $('#x-count').textContent = vis.length + ' of ' + ROWS.length + ' rows';
    $$('th', table).forEach(function (th) {
      var go = function () {
        var c = +th.dataset.c;
        if (sortCol === c) sortDir = -sortDir; else { sortCol = c; sortDir = NUMERIC.indexOf(c) > -1 ? -1 : 1; }
        renderTable(lastRows);
        var again = $('th[data-c="' + c + '"]', table); if (again) again.focus();
      };
      th.addEventListener('click', go);
      th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }
  $('#x-search').addEventListener('input', function (e) { query = e.target.value.trim(); renderTable(lastRows); });
  $('#x-export').addEventListener('click', function () {
    var vis = visibleRows(lastRows);
    var cell = function (v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var csv = [D.excelHeaders].concat(vis).map(function (r) { return r.map(cell).join(','); }).join('\r\n');
    var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dpm_orders' + (Object.keys(filters).length ? '_filtered' : '') + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  /* ---------------- go ---------------- */
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(update, 120); });
  update();
})();
