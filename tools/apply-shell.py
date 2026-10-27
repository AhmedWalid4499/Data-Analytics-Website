#!/usr/bin/env python3
"""Apply the shared site shell to every page.

Writes the <head> block, header/navigation, mobile drawer, breadcrumbs, track
progress, prev/next pager, footer, and stable ids on sections and lessons.
Everything it owns sits between <!-- shell:NAME --> ... <!-- /shell:NAME -->
markers, so it is safe to re-run after editing the navigation below:

    python3 tools/apply-shell.py && python3 tools/build-search-index.py
"""
import html
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")

SITE = "DPM Learning Hub"

# Learning tracks, in the recommended order.
TRACKS = [
    # key, file, label, glyph, colour var, one-liner, time
    ("data", "data-foundations.html", "Foundations", "DB", "--c-data",
     "Tables, keys, schemas & OLAP — the groundwork", "2–3 hrs"),
    ("excel", "excel.html", "Excel", "XL", "--c-excel",
     "Formulas, lookups, PivotTables & Power Query", "6–8 hrs"),
    ("sql", "sql.html", "SQL", "SQL", "--c-sql",
     "Query real data live in your browser", "6–8 hrs"),
    ("powerbi", "powerbi.html", "Power BI", "BI", "--c-powerbi",
     "Model, write DAX and build dashboards", "8–10 hrs"),
    ("flow", "powerautomate.html", "Power Automate", "PA", "--c-flow",
     "Automate reports, alerts & approvals", "4–6 hrs"),
]

PAGES = {
    "index.html": dict(title=f"{SITE} — Learn data analytics: Excel, SQL, Power BI & Power Automate",
                       desc="A free, hands-on data analytics academy: Excel, SQL, Power BI and Power Automate with live runners, graded exams and one realistic dataset.",
                       theme="hub", nav="home"),
    "dashboard.html": dict(title=f"Live Dashboard — {SITE}",
                           desc="An interactive analytics dashboard built on the training dataset — filter it, explore it, and see the Excel, SQL and DAX behind every chart.",
                           theme="hub", nav="dashboard", crumb="Live Dashboard"),
    "courses.html": dict(title=f"Courses & Certifications — {SITE}",
                         desc="Hand-picked free courses, video channels and certifications to go deeper in Excel, Power BI, SQL and Power Automate.",
                         theme="hub", nav="courses", crumb="Courses"),
    "downloads.html": dict(title=f"Downloads — {SITE}",
                           desc="Printable cheat sheets, the SQL Server setup guide, a 12-week study plan and the practice datasets.",
                           theme="hub", nav="downloads", crumb="Downloads"),
}
for i, (key, f, label, glyph, cvar, d, t) in enumerate(TRACKS):
    PAGES[f] = dict(title=f"{label} — {SITE}", desc=d + ".", theme=key, nav="learn", crumb=label, track=key, idx=i)

FAVICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E"
           "%3Crect width='32' height='32' rx='8' fill='%230E1729'/%3E"
           "%3Crect x='7' y='17' width='4' height='8' rx='1.5' fill='%23FF9A4D'/%3E"
           "%3Crect x='14' y='11' width='4' height='14' rx='1.5' fill='%23B9A0FF'/%3E"
           "%3Crect x='21' y='6' width='4' height='19' rx='1.5' fill='%234FD1EA'/%3E%3C/svg%3E")

BRAND_SVG = ('<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="11" width="4" height="7" rx="1.3" fill="#FF9A4D"/>'
             '<rect x="8" y="6.5" width="4" height="11.5" rx="1.3" fill="#B9A0FF"/>'
             '<rect x="14" y="2" width="4" height="16" rx="1.3" fill="#4FD1EA"/></svg>')

SUN = ('<svg class="mode-ic-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">'
       '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
       '<svg class="mode-ic-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">'
       '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>')


def tdot(key, glyph, cvar, extra=""):
    cls = "tdot powerbi" if key == "powerbi" else "tdot"
    return f'<span class="{cls}{extra}" style="--c:var({cvar})" aria-hidden="true">{glyph}</span>'


def head_block(p):
    return f"""<!-- shell:head -->
<title>{html.escape(p['title'])}</title>
<meta name="description" content="{html.escape(p['desc'])}">
<meta name="theme-color" content="#0E1729">
<meta property="og:title" content="{html.escape(p['title'])}">
<meta property="og:description" content="{html.escape(p['desc'])}">
<link rel="icon" href="{FAVICON}">
<script>(function(){{try{{var m=JSON.parse(localStorage.getItem('dpm-mode'));if(m)document.documentElement.setAttribute('data-mode',m);}}catch(e){{}}}})();</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/styles.css">
<!-- /shell:head -->"""


def header_block(fname, p):
    cur = lambda key: ' aria-current="page"' if p.get("nav") == key else ""
    mega = "".join(
        f'<a href="{f}"{" aria-current=\"page\"" if f == fname else ""}>{tdot(k, g, c)}'
        f'<span><b>{i + 1:02d} · {label}</b><span class="d">{d}</span></span></a>'
        for i, (k, f, label, g, c, d, t) in enumerate(TRACKS))
    drawer_tracks = "".join(
        f'<a class="d-link" href="{f}"{" aria-current=\"page\"" if f == fname else ""}>{tdot(k, g, c)}{label}</a>'
        for (k, f, label, g, c, d, t) in TRACKS)
    learn_cur = " current" if p.get("nav") == "learn" else ""
    return f"""<!-- shell:header -->
<a class="skip" href="#main">Skip to content</a>
<div class="scrollbar" aria-hidden="true"></div>
<header class="site-header"><div class="wrap">
  <a class="brand" href="index.html" aria-label="{SITE} — home"><span class="brand-mark">{BRAND_SVG}</span><span>{SITE}<small>Data analytics academy</small></span></a>
  <nav class="main-nav" aria-label="Main">
    <a href="index.html"{cur('home')}>Home</a>
    <div class="menu">
      <button class="menu-trigger{learn_cur}" aria-expanded="false" aria-haspopup="true">Learn <span class="chev" aria-hidden="true">▾</span></button>
      <div class="mega">{mega}
        <div class="mega-foot"><a href="index.html#path">See the recommended path →</a><a href="downloads.html">Cheat sheets &amp; datasets →</a></div>
      </div>
    </div>
    <a href="dashboard.html"{cur('dashboard')}>Live Dashboard</a>
    <a href="courses.html"{cur('courses')}>Courses</a>
    <a href="downloads.html"{cur('downloads')}>Downloads</a>
  </nav>
  <div class="header-tools">
    <button class="search-btn" type="button" data-search-open aria-label="Search the hub"><span class="s-icon" aria-hidden="true">⌕</span><span class="s-label">Search lessons…</span><kbd><span class="kbd-mod">Ctrl</span> K</kbd></button>
    <button class="icon-btn" type="button" data-mode-toggle aria-label="Toggle dark mode">{SUN}</button>
    <button class="icon-btn drawer-btn" type="button" data-drawer-toggle aria-expanded="false" aria-controls="site-drawer" aria-label="Open menu">☰</button>
  </div>
</div></header>
<div class="drawer" id="site-drawer">
  <div class="drawer-backdrop" data-drawer-close></div>
  <div class="drawer-panel" role="dialog" aria-label="Menu">
    <div class="drawer-top"><a class="brand" href="index.html"><span class="brand-mark">{BRAND_SVG}</span>{SITE}</a><button class="icon-btn" type="button" data-drawer-close aria-label="Close menu">✕</button></div>
    <button class="search-btn" type="button" data-search-open style="width:100%"><span class="s-icon" aria-hidden="true">⌕</span>Search lessons…</button>
    <h4>Start</h4>
    <a class="d-link" href="index.html"{cur('home')}>Home</a>
    <a class="d-link" href="dashboard.html"{cur('dashboard')}>Live Dashboard</a>
    <h4>Learning tracks</h4>
    {drawer_tracks}
    <h4>Resources</h4>
    <a class="d-link" href="courses.html"{cur('courses')}>Courses &amp; certifications</a>
    <a class="d-link" href="downloads.html"{cur('downloads')}>Downloads</a>
  </div>
</div>
<!-- /shell:header -->"""


def crumbs_block(p):
    if "crumb" not in p:
        return ""
    mid = '<a href="index.html#tracks">Learn</a><span class="sep">/</span>' if "track" in p else ""
    step = f'<span class="sep">·</span><span>Track {p["idx"] + 1} of {len(TRACKS)}</span>' if "track" in p else ""
    return (f'<!-- shell:crumbs --><nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span class="sep">/</span>'
            f'{mid}<span aria-current="page">{p["crumb"]}</span>{step}</nav><!-- /shell:crumbs -->')


def progress_block(p):
    if "track" not in p:
        return ""
    k = p["track"]
    return f"""<!-- shell:progress -->
  <div class="track-progress" data-progress="{k}" hidden>
    <div class="tp-row"><span><b>Your progress</b> · saved in this browser</span><span class="pbar-txt"></span></div>
    <div class="pbar"><span class="pbar-fill"></span></div>
    <p data-exam-best="{k}" hidden></p>
  </div>
<!-- /shell:progress -->"""


def footer_block(fname, p):
    pager = ""
    if "track" in p:
        i = p["idx"]
        prev_ = TRACKS[i - 1] if i > 0 else None
        next_ = TRACKS[i + 1] if i + 1 < len(TRACKS) else None
        a = f'<a class="prev" href="{prev_[1]}"><small>← Previous track</small><b>{prev_[2]}</b></a>' if prev_ else '<a class="prev" href="index.html#path"><small>← Back to</small><b>The learning path</b></a>'
        b = f'<a class="next" href="{next_[1]}"><small>Next track →</small><b>{next_[2]}</b></a>' if next_ else '<a class="next" href="dashboard.html"><small>Put it together →</small><b>Live Dashboard</b></a>'
        pager = f'<section class="pager-sec"><div class="wrap"><nav class="pager" aria-label="Tracks">{a}{b}</nav></div></section>\n'
    track_links = "".join(f'<li><a href="{f}">{label}</a></li>' for (k, f, label, g, c, d, t) in TRACKS)
    return f"""<!-- shell:footer -->
{pager}</main>
<div class="toc" data-toc hidden></div>
<button class="to-top" type="button" aria-label="Back to top">↑</button>
<footer class="site-footer"><div class="wrap">
  <div class="foot-grid">
    <div>
      <a class="brand" href="index.html"><span class="brand-mark">{BRAND_SVG}</span>{SITE}</a>
      <p style="max-width:40ch;margin-top:14px">A free, self-paced data analytics academy for Delivery Project Managers — and anyone who wants to get fluent with data.</p>
    </div>
    <div><h4>Learn</h4><ul>{track_links}</ul></div>
    <div><h4>Practise</h4><ul><li><a href="dashboard.html">Live Dashboard</a></li><li><a href="excel.html#runner">Excel formula runner</a></li><li><a href="sql.html#runner">SQL runner</a></li><li><a href="powerbi.html#runner">DAX checker</a></li></ul></div>
    <div><h4>Resources</h4><ul><li><a href="downloads.html">Cheat sheets</a></li><li><a href="downloads.html#sample-data">Practice datasets</a></li><li><a href="courses.html">Courses &amp; certifications</a></li><li><a href="index.html#plan">Study plan</a></li></ul></div>
  </div>
  <div class="foot-bottom"><span>All sample data is fictional and for training only.</span><span>Press <kbd>/</kbd> to search · progress is stored only in your browser</span></div>
</div></footer>
<!-- /shell:footer -->"""


def slug(s):
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:48].strip("-") or "section"


def put(text, name, block, fallback_pattern=None, flags=re.S):
    """Replace a marked block, or (first run) the fallback pattern."""
    marked = re.compile(rf"<!-- shell:{name} -->.*?<!-- /shell:{name} -->", re.S)
    if marked.search(text):
        return marked.sub(lambda m: block, text, count=1)
    if fallback_pattern:
        new, n = re.subn(fallback_pattern, lambda m: block, text, count=1, flags=flags)
        if n:
            return new
    raise SystemExit(f"could not place shell:{name}")


def process(fname):
    p = PAGES[fname]
    path = os.path.join(ROOT, fname)
    t = open(path, encoding="utf-8").read()

    # <head>
    t = put(t, "head", head_block(p),
            r'<title>.*?<link rel="stylesheet" href="assets/css/styles.css">')

    # <body> attributes
    attrs = f'data-theme="{p["theme"]}"' + (f' data-track="{p["track"]}"' if "track" in p else "")
    t = re.sub(r"<body[^>]*>", f"<body {attrs}>", t, count=1)

    # header (old: scrollbar + <nav class="nav">)
    t = put(t, "header", header_block(fname, p),
            r'<div class="scrollbar"></div>\s*<nav class="nav">.*?</nav>')

    # <main> opens right after the header
    if '<main id="main">' not in t:
        t = t.replace("<!-- /shell:header -->", '<!-- /shell:header -->\n<main id="main">', 1)

    # footer (old: <footer class="foot">)
    t = put(t, "footer", footer_block(fname, p), r'<footer class="foot">.*?</footer>')
    # remove any legacy pager section left from a previous run outside the marker
    t = re.sub(r'\n?<section class="pager-sec">.*?</section>\n(?=<!-- shell:footer -->)', "", t, flags=re.S)

    # breadcrumbs + progress inside the hero
    hero = re.search(r'<header class="hero[^"]*"><div class="wrap">', t)
    if hero and "crumbs" not in p.get("skip", ""):
        c = crumbs_block(p)
        if "<!-- shell:crumbs -->" in t:
            t = re.sub(r"<!-- shell:crumbs -->.*?<!-- /shell:crumbs -->", lambda m: c, t, count=1, flags=re.S)
        elif c:
            t = t[:hero.end()] + "\n  " + c + t[hero.end():]
        pr = progress_block(p)
        if "<!-- shell:progress -->" in t:
            t = re.sub(r"<!-- shell:progress -->.*?<!-- /shell:progress -->", lambda m: pr, t, count=1, flags=re.S)
        elif pr:
            end = t.index("</div></header>", hero.end())
            t = t[:end] + pr + "\n" + t[end:]

    # strip the old inline h2 sizing — the stylesheet owns typography now
    t = re.sub(r'<h2 style="font-size:2rem;margin:[^"]*">', "<h2>", t)

    # stable ids on sections (from their h2 / eyebrow)
    used = set(re.findall(r'id="([^"]+)"', t))

    def sec_id(m):
        tag = m.group(0)
        if " id=" in tag or "pager-sec" in tag:
            return tag
        rest = t[m.end():m.end() + 3000]
        h = re.search(r"<h2[^>]*>(.*?)</h2>", rest, re.S)
        nxt = rest.find("<section")
        if not h or (nxt != -1 and h.start() > nxt):
            return tag
        ey = re.search(r'<span class="eyebrow">(.*?)</span>', rest[:h.start()], re.S)
        base = slug(ey.group(1) if ey else h.group(1))
        sid, n = base, 2
        while sid in used:
            sid, n = f"{base}-{n}", n + 1
        used.add(sid)
        return tag[:-1] + f' id="{sid}">'
    t = re.sub(r"<section(?:\s[^>]*)?>", sec_id, t)

    # stable ids on lessons
    prefix = {"excel.html": "xl", "sql.html": "sql", "powerbi.html": "pbi", "powerautomate.html": "pa", "data-foundations.html": "db"}.get(fname, "ls")

    def les_id(m):
        tag = m.group(1)
        if " id=" in tag:
            return m.group(0)
        fn = re.search(r'<span class="fn">(.*?)</span>', m.group(2), re.S)
        base = prefix + "-" + slug(fn.group(1) if fn else "lesson")
        lid, n = base, 2
        while lid in used:
            lid, n = f"{base}-{n}", n + 1
        used.add(lid)
        return tag.replace("<details", f'<details id="{lid}"', 1) + m.group(2)
    t = re.sub(r'(<details class="lesson"[^>]*>)(<summary>.*?</summary>)', les_id, t, flags=re.S)

    open(path, "w", encoding="utf-8").write(t)
    print("shell applied:", fname)


if __name__ == "__main__":
    for f in PAGES:
        if os.path.exists(os.path.join(ROOT, f)):
            process(f)
