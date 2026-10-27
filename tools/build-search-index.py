#!/usr/bin/env python3
"""Build assets/js/search-index.js — the site-wide search index and the
lesson list each track's progress bar counts.

Run after editing any page (and after tools/apply-shell.py):

    python3 tools/build-search-index.py
"""
import html
import json
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "assets", "js", "search-index.js")

PAGES = [
    # file, page label, theme, track key (or None), page description
    ("index.html", "Home", "hub", None, "Start here — the tracks, the learning path and the study plan."),
    ("dashboard.html", "Live Dashboard", "hub", None, "Interactive dashboard on the training data, with the formula behind every chart."),
    ("data-foundations.html", "Foundations", "data", "data", "Tables, keys, ER diagrams, star schemas and OLAP."),
    ("excel.html", "Excel", "excel", "excel", "Formulas, lookups, PivotTables, Power Query and a live formula runner."),
    ("sql.html", "SQL", "sql", "sql", "SELECT to window functions, with a real SQLite database in your browser."),
    ("powerbi.html", "Power BI", "powerbi", "powerbi", "Get data, model, DAX and visuals — with a DAX checker."),
    ("powerautomate.html", "Power Automate", "flow", "flow", "Triggers, actions, conditions, loops and expressions."),
    ("courses.html", "Courses", "hub", None, "Hand-picked free courses and certifications."),
    ("downloads.html", "Downloads", "hub", None, "Cheat sheets, guides and practice datasets."),
]


def text(s):
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def main():
    items, lessons = [], {}
    for fname, label, theme, track, desc in PAGES:
        path = os.path.join(ROOT, fname)
        if not os.path.exists(path):
            continue
        src = open(path, encoding="utf-8").read()
        items.append(dict(k="page", t=label, d=desc, p=label, u=fname, th=theme))

        # sections
        for m in re.finditer(r'<section[^>]*\bid="([^"]+)"[^>]*>(.*?)(?=<section|\Z)', src, re.S):
            sid, body = m.group(1), m.group(2)
            h2 = re.search(r"<h2[^>]*>(.*?)</h2>", body, re.S)
            if not h2:
                continue
            ey = re.search(r'<span class="eyebrow">(.*?)</span>', body, re.S)
            lead = re.search(r'<p class="lead"[^>]*>(.*?)</p>', body, re.S)
            items.append(dict(k="section", t=text(h2.group(1)),
                              d=(text(ey.group(1)) + " — " if ey else "") + (text(lead.group(1))[:140] if lead else ""),
                              p=label, u=f"{fname}#{sid}", th=theme))
            if track == "data" and ey and re.match(r"\s*\d", text(ey.group(1))):
                lessons.setdefault(track, []).append(sid)

        # lessons
        for m in re.finditer(r'<details id="([^"]+)" class="lesson"[^>]*><summary>(.*?)</summary>(.*?)</details>', src, re.S):
            lid, summ, body = m.groups()
            fn = re.search(r'<span class="fn">(.*?)</span>', summ, re.S)
            tag = re.search(r'<span class="tag">(.*?)</span>', summ, re.S)
            rest = re.sub(r'<span class="(fn|tag|caret)">.*?</span>', "", summ, flags=re.S)
            first_p = re.search(r"<p>(.*?)</p>", body, re.S)
            d = text(rest)
            if first_p:
                d = (d + " — " if d else "") + text(first_p.group(1))[:120]
            items.append(dict(k="lesson", t=text(fn.group(1)) if fn else text(rest), d=d,
                              p=label + (f" · {text(tag.group(1))}" if tag else ""), u=f"{fname}#{lid}", th=theme))
            if track:
                lessons.setdefault(track, []).append(lid)

        # glossary-style terms
        for m in re.finditer(r'<div class="d"><b>(.*?)</b>(.*?)</div>', src, re.S):
            secs = re.findall(r'<section[^>]*\bid="([^"]+)"', src[:m.start()])
            url = f"{fname}#{secs[-1]}" if secs else fname
            items.append(dict(k="term", t=text(m.group(1)), d=text(m.group(2))[:140].lstrip(" —:-"), p=label, u=url, th=theme))

        # downloads
        if fname == "downloads.html":
            for m in re.finditer(r'<div class="card dl-card"[^>]*>(.*?)</div>\s*</div>', src, re.S):
                h3 = re.search(r"<h3>(.*?)</h3>", m.group(1), re.S)
                p = re.search(r"<p>(.*?)</p>", m.group(1), re.S)
                a = re.search(r'href="(assets/[^"]+)"', m.group(1))
                if h3 and a:
                    items.append(dict(k="download", t=text(h3.group(1)), d=text(p.group(1))[:140] if p else "", p="Downloads", u=a.group(1), th=theme))

        # external resources
        for m in re.finditer(r'<a class="res" href="([^"]+)"[^>]*>(.*?)</a>', src, re.S):
            name = re.search(r'<span class="name">(.*?)</span>', m.group(2), re.S)
            why = re.search(r'<p class="why">(.*?)</p>', m.group(2), re.S)
            if name:
                items.append(dict(k="resource", t=text(name.group(1)), d=text(why.group(1))[:140] if why else "", p="Courses", u=m.group(1), th=theme))

    js = ("/* Generated by tools/build-search-index.py — do not edit by hand. */\n"
          "window.DPM_SEARCH = " + json.dumps(items, ensure_ascii=False, separators=(",", ":")) + ";\n"
          "window.DPM_LESSONS = " + json.dumps(lessons, separators=(",", ":")) + ";\n")
    open(OUT, "w", encoding="utf-8").write(js)
    print(f"{len(items)} search entries; lessons per track:", {k: len(v) for k, v in lessons.items()})


if __name__ == "__main__":
    main()
