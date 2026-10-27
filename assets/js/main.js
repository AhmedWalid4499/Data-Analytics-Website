/* ============================================================
   DPM Learning Hub — site behaviour (every page)
   - light / dark mode toggle (remembered)
   - header: mobile drawer, "Learn" mega-menu
   - scroll progress bar + back-to-top
   - copy buttons on code blocks
   - tier tabs (Basic / Intermediate / Advanced)
   - static self-check quizzes (Foundations)
   - "On this page" table of contents (track pages)
   - lesson progress: mark complete, per-track progress bars
   - site search (Ctrl/⌘ + K) over assets/js/search-index.js
   - deep links: #lesson-id opens the lesson and its tier tab
   ============================================================ */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- tiny storage wrapper (private mode safe) ---------- */
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };
  window.DPM_STORE = store;

  /* ---------- theme (mode) ---------- */
  var root = document.documentElement;
  function currentMode() {
    var m = root.getAttribute('data-mode');
    if (m) return m;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function setMode(m) {
    root.setAttribute('data-mode', m);
    store.set('dpm-mode', m);
    $$('[data-mode-toggle]').forEach(function (b) {
      b.setAttribute('aria-label', m === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      b.setAttribute('aria-pressed', m === 'dark' ? 'true' : 'false');
    });
    document.dispatchEvent(new CustomEvent('dpm:mode', { detail: m }));
  }
  $$('[data-mode-toggle]').forEach(function (b) {
    b.addEventListener('click', function () { setMode(currentMode() === 'dark' ? 'light' : 'dark'); });
  });
  if (!root.getAttribute('data-mode')) root.setAttribute('data-mode', currentMode());

  /* ---------- header: drawer + mega menu ---------- */
  var drawerBtn = $('[data-drawer-toggle]');
  var drawer = $('#site-drawer');
  function closeDrawer() { if (!drawer) return; drawer.classList.remove('open'); document.body.classList.remove('no-scroll'); if (drawerBtn) drawerBtn.setAttribute('aria-expanded', 'false'); }
  if (drawerBtn && drawer) {
    drawerBtn.addEventListener('click', function () {
      var open = !drawer.classList.contains('open');
      drawer.classList.toggle('open', open);
      document.body.classList.toggle('no-scroll', open);
      drawerBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $$('[data-drawer-close]').forEach(function (el) { el.addEventListener('click', closeDrawer); });
  }

  $$('.menu').forEach(function (menu) {
    var btn = $('.menu-trigger', menu);
    if (!btn) return;
    function set(open) { menu.classList.toggle('open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
    btn.addEventListener('click', function (e) { e.stopPropagation(); set(!menu.classList.contains('open')); });
    menu.addEventListener('keydown', function (e) { if (e.key === 'Escape') { set(false); btn.focus(); } });
    document.addEventListener('click', function (e) { if (!menu.contains(e.target)) set(false); });
  });

  /* ---------- scroll progress + back-to-top ---------- */
  var bar = $('.scrollbar');
  var toTop = $('.to-top');
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    if (bar) bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    if (toTop) toTop.classList.toggle('show', h.scrollTop > 900);
    document.body.classList.toggle('scrolled', h.scrollTop > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* ---------- copy buttons ---------- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.copy');
    if (!btn) return;
    var code = btn.parentElement.querySelector('.code-text');
    var text = code ? code.textContent : btn.parentElement.textContent.replace(/^Copy/, '');
    function done() {
      btn.textContent = 'Copied ✓'; btn.classList.add('done');
      setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('done'); }, 1400);
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (err) { /* ignore */ }
      document.body.removeChild(ta);
    }
  });

  /* ---------- tier tabs ---------- */
  function selectTier(group, tier, focus) {
    var tabs = $('.tiers[data-tiers="' + group + '"]');
    if (!tabs) return;
    $$('.tier-btn', tabs).forEach(function (b) {
      var on = b.dataset.tier === tier;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    $$('.tier-panel[data-tier-panel="' + group + '"]').forEach(function (p) {
      p.classList.toggle('active', p.dataset.tier === tier);
    });
  }
  $$('.tiers[data-tiers]').forEach(function (tabs) {
    var group = tabs.dataset.tiers;
    var btns = $$('.tier-btn', tabs);
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { selectTier(group, b.dataset.tier); });
      b.addEventListener('keydown', function (e) {
        var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
        if (j === null) return;
        e.preventDefault();
        var nb = btns[(j + btns.length) % btns.length];
        selectTier(group, nb.dataset.tier, true);
      });
    });
  });

  /* ---------- static quizzes ---------- */
  $$('.quiz').forEach(function (q) {
    var fb = $('.fb', q);
    $$('.opt', q).forEach(function (o) {
      o.addEventListener('click', function () {
        if (q.dataset.done) return;
        q.dataset.done = '1';
        var right = o.dataset.correct === '1';
        o.classList.add(right ? 'correct' : 'wrong');
        $$('.opt', q).forEach(function (x) { if (x.dataset.correct === '1') x.classList.add('correct'); x.disabled = true; });
        if (fb) {
          fb.innerHTML = '<b>' + (right ? '✓ Correct.' : '✗ Not quite.') + '</b> ' + (fb.dataset.msg || '');
          fb.classList.add('show');
        }
      });
    });
  });

  /* ---------- lesson progress ---------- */
  var PROGRESS_KEY = 'dpm-progress';
  var progress = store.get(PROGRESS_KEY, {});
  function isDone(id) { return !!progress[id]; }
  function setDone(id, on) {
    if (on) progress[id] = Date.now(); else delete progress[id];
    store.set(PROGRESS_KEY, progress);
    refreshProgress();
  }
  window.DPM_PROGRESS = { isDone: isDone, all: function () { return progress; } };

  var lessons = [];
  function decorate(d) {
    if (lessons.indexOf(d) > -1) return;
    lessons.push(d);
    var isSection = d.tagName === 'SECTION';
    var sum = $('summary', d);
    if (sum && !$('.done-dot', sum)) {
      var dot = document.createElement('span');
      dot.className = 'done-dot'; dot.setAttribute('aria-hidden', 'true'); dot.textContent = '✓';
      sum.appendChild(dot);
    }
    var body = isSection ? $('.wrap', d) : $('.body', d);
    if (body && !$('.lesson-foot', body)) {
      var foot = document.createElement('div');
      foot.className = 'lesson-foot';
      foot.innerHTML = '<button type="button" class="mark-btn" data-label="' + (isSection ? 'section' : 'lesson') + '"></button>' +
        '<a class="lesson-link" href="#' + d.id + '" title="Link to this ' + (isSection ? 'section' : 'lesson') + '">#</a>';
      body.appendChild(foot);
      $('.mark-btn', foot).addEventListener('click', function () {
        var on = !isDone(d.id);
        setDone(d.id, on);
        if (on && !isSection) {
          // open the next lesson in the same panel to keep momentum
          var next = d.nextElementSibling;
          while (next && !(next.matches && next.matches('details.lesson'))) next = next.nextElementSibling;
          if (next) { d.open = false; next.open = true; next.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        }
      });
    }
  }
  $$('details.lesson[id]').forEach(decorate);
  // tracks without accordion lessons (Foundations) count their numbered sections instead
  function decorateSections() {
    var track = document.body.dataset.track;
    var ids = track && window.DPM_LESSONS && window.DPM_LESSONS[track];
    if (!ids) return;
    ids.forEach(function (id) { var el = document.getElementById(id); if (el && el.tagName === 'SECTION') decorate(el); });
  }

  function trackStats(track) {
    var ids = (window.DPM_LESSONS && window.DPM_LESSONS[track]) || null;
    if (!ids) ids = lessons.filter(function (d) { return d.closest('[data-track="' + track + '"]') || document.body.dataset.track === track; }).map(function (d) { return d.id; });
    var done = ids.filter(isDone).length;
    return { done: done, total: ids.length, pct: ids.length ? Math.round(done / ids.length * 100) : 0 };
  }
  window.DPM_trackStats = trackStats;

  function refreshProgress() {
    lessons.forEach(function (d) {
      var on = isDone(d.id);
      d.classList.toggle('is-done', on);
      var b = $('.mark-btn', d);
      if (b) { b.textContent = on ? '✓ Completed — undo' : 'Mark ' + b.dataset.label + ' complete'; b.classList.toggle('on', on); }
    });
    $$('[data-progress]').forEach(function (el) {
      var s = trackStats(el.dataset.progress);
      if (!s.total) { el.hidden = true; return; }
      el.hidden = false;
      var fill = $('.pbar-fill', el); if (fill) fill.style.width = s.pct + '%';
      var txt = $('.pbar-txt', el);
      var unit = el.dataset.progress === 'data' ? 'sections' : 'lessons';
      if (txt) txt.textContent = s.done ? (s.done + ' of ' + s.total + ' ' + unit + ' done') : (s.total + ' ' + unit);
      el.setAttribute('aria-label', s.done + ' of ' + s.total + ' lessons complete');
    });
    $$('[data-exam-best]').forEach(function (el) {
      var best = store.get('dpm-exam', {})[el.dataset.examBest];
      el.textContent = best != null ? 'Best exam score: ' + best + '%' : '';
      el.hidden = best == null;
    });
    document.dispatchEvent(new CustomEvent('dpm:progress'));
  }
  document.addEventListener('dpm:exam', function (e) {
    var page = document.body.dataset.track; if (!page) return;
    var ex = store.get('dpm-exam', {});
    ex[page] = Math.max(ex[page] || 0, e.detail.pct);
    store.set('dpm-exam', ex);
    refreshProgress();
  });

  /* ---------- on-this-page TOC ---------- */
  var tocHost = $('[data-toc]');
  if (tocHost) {
    var heads = $$('main section[id] h2');
    if (heads.length > 2) {
      var list = heads.map(function (h) {
        var s = h.closest('section');
        var eyebrow = $('.eyebrow', s);
        return '<li><a href="#' + s.id + '">' + (eyebrow ? eyebrow.textContent : h.textContent) + '</a></li>';
      }).join('');
      tocHost.innerHTML = '<button type="button" class="toc-toggle" aria-expanded="false"><span aria-hidden="true">☰</span> On this page</button>' +
        '<nav class="toc-panel" aria-label="On this page"><p class="toc-title">On this page</p><ol>' + list + '</ol></nav>';
      tocHost.hidden = false;
      var tbtn = $('.toc-toggle', tocHost);
      tbtn.addEventListener('click', function () {
        var open = !tocHost.classList.contains('open');
        tocHost.classList.toggle('open', open); tbtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      $$('a', tocHost).forEach(function (a) { a.addEventListener('click', function () { tocHost.classList.remove('open'); tbtn.setAttribute('aria-expanded', 'false'); }); });
      if ('IntersectionObserver' in window) {
        var links = {};
        $$('a', tocHost).forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              $$('a', tocHost).forEach(function (a) { a.classList.remove('on'); });
              var a = links[en.target.id]; if (a) a.classList.add('on');
            }
          });
        }, { rootMargin: '-40% 0px -55% 0px' });
        heads.forEach(function (h) { io.observe(h.closest('section')); });
      }
    }
  }

  /* ---------- deep links into lessons ---------- */
  function openFromHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    var panel = el.closest('.tier-panel');
    if (panel) selectTier(panel.dataset.tierPanel, panel.dataset.tier);
    if (el.matches('details')) el.open = true;
    setTimeout(function () { el.scrollIntoView({ block: 'start' }); el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 1800); }, 30);
  }
  window.addEventListener('hashchange', openFromHash);
  openFromHash();

  /* ---------- search ---------- */
  var searchDlg = null, searchInput, searchList, activeIdx = 0, results = [];
  var KIND_LABEL = { page: 'Page', section: 'Section', lesson: 'Lesson', download: 'Download', resource: 'Course', term: 'Term' };

  function loadIndex(cb) {
    if (window.DPM_SEARCH) return cb();
    var s = document.createElement('script');
    s.src = 'assets/js/search-index.js';
    s.onload = cb; s.onerror = cb;
    document.head.appendChild(s);
  }
  function norm(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function score(item, terms) {
    var t = norm(item.t), d = norm(item.d), p = norm(item.p), sc = 0;
    for (var i = 0; i < terms.length; i++) {
      var q = terms[i];
      if (t === q) sc += 60; else if (t.indexOf(q) === 0) sc += 30; else if (t.indexOf(q) > -1) sc += 18;
      else if (p.indexOf(q) > -1) sc += 6; else if (d.indexOf(q) > -1) sc += 5; else return 0;
    }
    if (item.k === 'lesson') sc += 3;
    if (item.k === 'page') sc += 4;
    return sc;
  }
  function render() {
    var q = norm(searchInput.value).trim();
    var data = window.DPM_SEARCH || [];
    if (!q) {
      results = data.filter(function (i) { return i.k === 'page'; });
    } else {
      var terms = q.split(/\s+/);
      results = data.map(function (i) { return { i: i, s: score(i, terms) }; })
        .filter(function (x) { return x.s > 0; })
        .sort(function (a, b) { return b.s - a.s; })
        .slice(0, 40).map(function (x) { return x.i; });
    }
    activeIdx = 0;
    if (!data.length) { searchList.innerHTML = '<li class="s-empty">Search index unavailable.</li>'; return; }
    if (!results.length) { searchList.innerHTML = '<li class="s-empty">No matches for “' + esc(searchInput.value) + '”. Try a function name like <b>XLOOKUP</b> or a topic like <b>join</b>.</li>'; return; }
    searchList.innerHTML = results.map(function (r, n) {
      return '<li role="option" id="s-opt-' + n + '" aria-selected="' + (n === 0) + '"><a href="' + esc(r.u) + '" data-theme-dot="' + esc(r.th || 'hub') + '">' +
        '<span class="s-kind">' + (KIND_LABEL[r.k] || '') + '</span>' +
        '<span class="s-main"><span class="s-title">' + esc(r.t) + '</span>' + (r.d ? '<span class="s-desc">' + esc(r.d) + '</span>' : '') + '</span>' +
        '<span class="s-page">' + esc(r.p) + '</span></a></li>';
    }).join('');
    searchInput.setAttribute('aria-activedescendant', 's-opt-0');
  }
  function move(delta) {
    var items = $$('li[role="option"]', searchList);
    if (!items.length) return;
    activeIdx = (activeIdx + delta + items.length) % items.length;
    items.forEach(function (li, n) { li.setAttribute('aria-selected', n === activeIdx ? 'true' : 'false'); });
    items[activeIdx].scrollIntoView({ block: 'nearest' });
    searchInput.setAttribute('aria-activedescendant', 's-opt-' + activeIdx);
  }
  function buildSearch() {
    searchDlg = document.createElement('div');
    searchDlg.className = 'search-dlg';
    searchDlg.setAttribute('role', 'dialog');
    searchDlg.setAttribute('aria-modal', 'true');
    searchDlg.setAttribute('aria-label', 'Search the hub');
    searchDlg.innerHTML = '<div class="search-backdrop" data-search-close></div>' +
      '<div class="search-box"><div class="search-field"><span aria-hidden="true" class="s-icon">⌕</span>' +
      '<input type="search" placeholder="Search lessons, functions, downloads…" aria-label="Search" role="combobox" aria-expanded="true" aria-controls="s-list" autocomplete="off" spellcheck="false">' +
      '<kbd data-search-close>Esc</kbd></div><ul class="search-list" id="s-list" role="listbox"></ul>' +
      '<p class="search-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></p></div>';
    document.body.appendChild(searchDlg);
    searchInput = $('input', searchDlg);
    searchList = $('.search-list', searchDlg);
    searchInput.addEventListener('input', render);
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') {
        var a = $$('li[role="option"] a', searchList)[activeIdx];
        if (a) { e.preventDefault(); closeSearch(); location.href = a.getAttribute('href'); }
      }
    });
    searchList.addEventListener('click', function (e) { if (e.target.closest('a')) closeSearch(); });
    $$('[data-search-close]', searchDlg).forEach(function (el) { el.addEventListener('click', closeSearch); });
    searchDlg.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSearch(); });
  }
  var lastFocus = null;
  function openSearch(prefill) {
    lastFocus = document.activeElement;
    if (!searchDlg) buildSearch();
    closeDrawer();
    searchDlg.classList.add('open');
    document.body.classList.add('no-scroll');
    if (typeof prefill === 'string') searchInput.value = prefill;
    loadIndex(function () { render(); });
    setTimeout(function () { searchInput.focus(); searchInput.select(); }, 10);
  }
  function closeSearch() {
    if (!searchDlg) return;
    searchDlg.classList.remove('open');
    document.body.classList.remove('no-scroll');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  window.DPM_openSearch = openSearch;
  $$('[data-search-open]').forEach(function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); openSearch(b.dataset.searchOpen || ''); });
  });
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
    else if (e.key === '/' && !typing) { e.preventDefault(); openSearch(); }
  });
  if (/Mac|iPhone|iPad/.test(navigator.platform || '')) $$('.kbd-mod').forEach(function (k) { k.textContent = '⌘'; });

  /* ---------- lesson totals for progress bars (needs index) ---------- */
  refreshProgress();
  if ($$('[data-progress]').length) loadIndex(function () { decorateSections(); refreshProgress(); });
})();
