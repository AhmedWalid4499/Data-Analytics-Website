# DPM Learning Hub

A self-contained training site for new **Delivery Project Managers (DPMs)** at Orange Business. It teaches the data tools a DPM uses day to day — Excel, SQL, Power BI and Power Automate — plus the data-modelling foundations underneath them. Every track combines short tabbed lessons, hands-on practice (live formula/query runners), a graded randomised exam, and a printable cheat sheet. A **Live Dashboard** capstone shows where it all leads, and site-wide **search**, **progress tracking** and **dark mode** make it easy to find your way.

It is a **static website**: plain HTML, CSS and vanilla JavaScript. There is **no build step, no framework and no backend** — it runs by opening the files in a browser and is hosted on GitHub Pages.

🔗 **Live site:** https://ahmedwalid4499.github.io

---

## Table of contents

- [Who it's for](#who-its-for)
- [Quick start](#quick-start)
- [Site map](#site-map)
- [Repository structure](#repository-structure)
- [Anatomy of a track page](#anatomy-of-a-track-page)
- [Interactive components](#interactive-components)
- [Downloadable documents](#downloadable-documents)
- [Design system](#design-system)
- [Editing &amp; extending](#editing--extending)
- [Validating changes](#validating-changes)
- [Deployment](#deployment)
- [Tech stack](#tech-stack)
- [Roadmap](#roadmap)

---

## Who it's for

New or upskilling DPMs who need practical data skills, and anyone maintaining the hub. No prior coding is assumed by the lessons; the site teaches from the basics up. All examples use a single fictional delivery dataset so the same data carries across Excel, SQL and Power BI.

## Quick start

**View it live:** open the GitHub Pages URL above.

**Run it locally:** because everything is static, you can just open `index.html` in a browser. The SQL runner and exams use `fetch()` for a WebAssembly module and JSON, which some browsers block on the `file://` protocol, so it's best to serve the folder over HTTP:

```bash
# from the repository root
python3 -m http.server 8000
# then open http://localhost:8000
```

There is nothing to install or compile.

## Site map

Nine pages, all sharing one header, footer and stylesheet (applied by `tools/apply-shell.py`). Each track page follows the same shape (see [Anatomy of a track page](#anatomy-of-a-track-page)).

| Page | Theme | What it covers |
|------|-------|----------------|
| `index.html` | hub | Landing page — live data preview, track cards with your progress, the learning path, study plans, and "continue where you left off". |
| `dashboard.html` | hub | **Live Dashboard** — filterable KPIs and click-to-filter charts on the sample data, a sortable data explorer with CSV export, and the Excel / SQL / DAX behind every chart. |
| `data-foundations.html` | data | Relational basics: tables &amp; keys, storage/pages, ER &amp; EER diagrams, star vs snowflake schemas, and **OLAP** (the cube, slice/dice/drill-up/down, OLAP questions). |
| `excel.html` | excel | Formulas &amp; functions by level, a **live formula runner**, a dedicated **PivotTables** section (linked to OLAP), and a long graded exam. |
| `sql.html` | sql | SQL clauses by level, a **live SQL runner** (real SQLite in the browser), good habits, and a graded exam. |
| `powerbi.html` | powerbi | Power BI/DAX by level, a **DAX syntax checker**, good habits, and a graded exam. |
| `powerautomate.html` | flow | Flows &amp; expressions by level, design challenges, and a graded exam. |
| `courses.html` | hub | Curated external courses and learning resources per tool. |
| `downloads.html` | hub | One place to download every cheat sheet, guide and dataset, each with an explanation. |

The header is: **Home · Learn ▾ (the five tracks) · Live Dashboard · Courses · Downloads**, plus search (<kbd>/</kbd> or <kbd>Ctrl</kbd>+<kbd>K</kbd>) and a light/dark toggle. On phones it collapses into a slide-out menu.

## Repository structure

```
dpm-learning-hub/
├── index.html                 # Landing / hub
├── data-foundations.html      # Data modelling & OLAP
├── excel.html                 # Excel track
├── sql.html                   # SQL track
├── powerbi.html               # Power BI track
├── powerautomate.html         # Power Automate track
├── dashboard.html             # Live Dashboard (capstone)
├── courses.html               # External course links
├── downloads.html             # Downloads hub
├── README.md                  # This file
├── assets/
    ├── css/
    │   └── styles.css          # All styling + per-track theme variables
    ├── js/
    │   ├── main.js             # Header/menu, dark mode, search, progress, TOC, copy buttons, tier tabs, quizzes
    │   ├── sample-data.js      # The shared dataset (window.DPM_DATA): headers, columns, 72 rows
    │   ├── excel-engine.js     # Evaluates typed Excel formulas (window.ExcelEngine)
    │   ├── dax-validator.js    # Syntax/style checker for DAX (window.DaxValidator)
    │   ├── exam.js             # Graded, randomised exam engine
    │   ├── playground.js       # Wires the Excel / SQL / DAX runners on the pages
    │   ├── dashboard.js        # The Live Dashboard: filters, charts, explorer, CSV export
    │   └── search-index.js     # GENERATED by tools/build-search-index.py
    ├── vendor/
    │   ├── sql-wasm.js         # sql.js — SQLite compiled to WebAssembly (runs the SQL runner)
    │   └── sql-wasm.wasm
    ├── data/
    │   ├── dpm_projects.csv    # The 72-row sample dataset (clean)
    │   ├── dpm_projects.xlsx
    │   ├── dpm_messy_data.csv  # A deliberately messy version, for cleaning practice
    │   └── dpm_messy_data.xlsx
    └── docs/                   # Downloadable documents (see below)
        ├── Excel-Formula-Cheat-Sheet.pdf
        ├── SQL-Cheat-Sheet.pdf
        ├── DAX-PowerBI-Cheat-Sheet.pdf
        ├── Power-Automate-Cheat-Sheet.pdf
        ├── DPM-12-Week-Study-Plan.pdf
        └── Setting-up-SQL-Server-on-Windows.docx
└── tools/                      # Maintainer scripts that generate the docs above (not served)
    ├── cs_common.py            # Shared cheat-sheet renderer (reportlab)
    ├── build-excel-cheatsheet.py
    ├── build-sql-cheatsheet.py
    ├── build-dax-cheatsheet.py
    ├── build-flow-cheatsheet.py
    ├── build-study-plan.py     # The printable 12-week planner (PDF)
    ├── apply-shell.py          # Applies the shared header/footer/ids to every page
    ├── build-search-index.py   # Regenerates assets/js/search-index.js
    └── build-sqlserver-guide.js  # Generates the Word setup guide (docx)
```

> `tools/` is for maintainers — it regenerates the files in `assets/docs/`, the shared page shell, and the search index. It isn't served and can be ignored by users.

## Anatomy of a track page

The four tool tracks (Excel, SQL, Power BI, Power Automate) share the same top-to-bottom structure so the experience is consistent:

1. **Hero** — title, one-paragraph intro, and any sample-data download links.
2. **Download callout** — a card linking to that track's printable cheat sheet (the SQL page also links the setup guide).
3. **Context** — short reference the lessons rely on (e.g. SQL's "Your tables", Power Automate's "four flow types").
4. **Lessons by level** — a **tabbed** section with three levels (*Basic / Intermediate / Advanced*). Each lesson is a collapsible accordion with a worked example and a *Try it* task that reveals a model answer.
5. **Good habits / tips** — common pitfalls and best practice.
6. **Try it for real** — a live runner where it applies (Excel formulas, SQL queries, DAX syntax).
7. **Exam** — a graded, randomised final test.
8. **Footer** + the page's `<script>` includes.

## Interactive components

All interactivity is plain JavaScript loaded per page. The relevant scripts are included at the bottom of each page.

### `main.js` (every page)
- **Header:** the *Learn* mega-menu, the mobile slide-out drawer, light/dark toggle (remembered in `localStorage`, applied before first paint).
- **Search:** <kbd>/</kbd> or <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>K</kbd> opens a keyboard-driven search over `search-index.js` (pages, sections, lessons, glossary terms, downloads, courses).
- **Progress:** every lesson gets a *Mark lesson complete* button; track pages show a progress bar and best exam score; the home page shows progress per track and a *Continue* card. Stored only in the browser.
- **Navigation aids:** scroll-progress bar, auto-generated *On this page* table of contents, back-to-top, and deep links — `page.html#lesson-id` switches to the right tier tab and opens the lesson.
- **Content helpers:** **Copy** buttons on code blocks, **tier tabs** (arrow-key accessible), and the static self-check **quizzes**.

### `sample-data.js`
Exposes `window.DPM_DATA` — the one dataset used everywhere:
- `excelHeaders` — 17 column names (`Order ID … Priority`), i.e. spreadsheet columns **A–Q**.
- `sqlColumns` / `sqlTypes` — the same data as a SQL table.
- `rows` — **72** records. In spreadsheet terms, data lives in **rows 2–73**.

### `excel-engine.js` — the Excel runner & formula grading
`window.ExcelEngine.evaluate(formula, { headers, rows })` parses and evaluates a real Excel formula against the dataset and returns `{ ok, value }` or `{ ok:false, error }`. It supports the common functions taught on the page (SUM, AVERAGE, COUNT/COUNTA, MIN/MAX, ROUND, IF/IFERROR, AND/OR/NOT, SUMIF(S), COUNTIF(S), AVERAGEIF(S), VLOOKUP, XLOOKUP, LEN/LEFT/RIGHT/MID, UPPER/LOWER/TRIM, CONCAT, TEXTJOIN, SUMPRODUCT, YEAR/MONTH/DAY and arithmetic). It powers both the formula runner and the auto-graded formula questions in the Excel exam.

### `sql.js` (vendored) — the SQL runner
The SQL page loads SQLite compiled to WebAssembly (`assets/vendor/sql-wasm.js` + `.wasm`). `playground.js` builds an in-memory database from `DPM_DATA` (tables `orders` and `targets`) so every query runs **entirely in the browser** — no server. The same database grades the SQL exam questions.

### `dax-validator.js` — DAX checker
`window.DaxValidator.validate(expr)` performs a **syntax &amp; style** check (balanced brackets, known functions, common mistakes). DAX needs a live Power BI model to actually compute, so the Power BI "runner" checks correctness of *form*, not a value.

### `playground.js`
Wires the on-page runners to their engines: `#xl-play` → ExcelEngine, `#sql-play` → sql.js, `#dax-play` → DaxValidator. Also exposes the SQL database build helpers used by the exam.

### `exam.js` — the exam engine
Renders a graded, randomised exam from a JSON bank embedded in the page:

```html
<div class="exam" data-bank="excelBank" data-count="30" data-formulas="10"></div>
<script type="application/json" id="excelBank">[ ...items ]</script>
```

- `data-count` — how many questions to show per attempt (capped at the bank size).
- `data-typed` / `data-formulas` / `data-sql` — how many of those are *typed* questions (you write a formula/query and it's graded). These three attribute names are aliases.

Each attempt picks a fresh random subset and shuffles options. **Test** previews, **Check answers** grades and shows model answers, **New set** reshuffles.

## Downloadable documents

Collected on `downloads.html` and stored in `assets/docs/`:

| File | Type | What it is |
|------|------|------------|
| `Excel-Formula-Cheat-Sheet.pdf` | PDF | Two-page Excel reference (formulas, lookups, arrays, PivotTables, shortcuts). |
| `SQL-Cheat-Sheet.pdf` | PDF | Two-page SQL reference (clauses, joins, window functions, patterns, dialect notes). |
| `DAX-PowerBI-Cheat-Sheet.pdf` | PDF | Two-page Power BI &amp; DAX reference (modelling, CALCULATE, time intelligence, visuals). |
| `Power-Automate-Cheat-Sheet.pdf` | PDF | Two-page flows &amp; expressions reference (controls, functions, OData, patterns). |
| `Setting-up-SQL-Server-on-Windows.docx` | Word | Step-by-step guide to installing SQL Server + SSMS on Windows. |

The four cheat sheets are styled like the classic R/RStudio reference cards (dense, two-page, landscape). They are generated by the scripts in `tools/` — see [Editing &amp; extending](#editing--extending).

## Design system

- **Track accents:** a `data-theme` attribute on `<body>` (`hub`, `data`, `excel`, `sql`, `powerbi`, `flow`) sets `--accent` (fills), `--on-accent` (text on fills) and `--accent-ink` (contrast-safe accent text).
- **Light / dark mode:** `html[data-mode="light|dark"]` swaps every surface, ink and code token; it defaults to the OS setting and is toggled from the header.
- **Responsive:** every page is checked at 390px phone width with no horizontal scroll.
- **Fonts:** Bricolage Grotesque (display), Inter (body), JetBrains Mono (code), loaded from Google Fonts.
- **No inline frameworks:** styling is hand-written CSS; there is no Tailwind/Bootstrap and no JS framework.

## Editing &amp; extending

### After editing any page — two commands
```bash
python3 tools/apply-shell.py         # re-applies header/footer/breadcrumbs and gives new sections & lessons stable ids
python3 tools/build-search-index.py  # refreshes search and the lesson counts behind progress bars
```
To change the navigation, footer links or a track's name/colour, edit the `TRACKS` / `PAGES` lists at the top of `tools/apply-shell.py` and re-run it. The shell lives between `<!-- shell:… -->` markers in each page — don't hand-edit inside them.

### Add or edit a lesson
Lessons are collapsible `<details class="lesson">` blocks inside a `.tier-panel`. Copy an existing one as a template — keep the `<summary>` (name, short description, level tag) and put the explanation, a `.code` block, and an optional `.try` / `reveal` answer in the `.body`. Code blocks need a **Copy** button plus a `.code-text` span holding the exact text to copy.

### Add exam questions
Append items to the page's JSON bank (`<script type="application/json" id="...Bank">`). Three item shapes are supported:

```jsonc
// Multiple choice (default)
{ "q": "Question text (HTML allowed)", "opts": ["A","B","C","D"], "correct": 0, "why": "Explanation shown after grading" }

// Typed Excel formula — graded by ExcelEngine
{ "type": "formula", "q": "...", "answer": "=SUM(O2:O73)", "expect": 1533987, "tol": 0.01, "hint": "...", "why": "..." }

// Typed SQL query — graded against the in-browser SQLite DB
{ "type": "sql", "q": "...", "answer": "SELECT SUM(revenue) FROM orders;", "expect": 1533987, "why": "..." }
```

`expect` is compared to the value the learner's answer produces (numbers within `tol`, default 0.01; strings case-insensitively). **Always verify a new typed question** by running its `answer` through the matching engine before committing (see below). Then, if needed, raise `data-count` / `data-formulas` on the `.exam` div.

### Regenerate a cheat sheet (maintainers)
The PDFs are produced with Python + [reportlab]; the Word guide with Node + the `docx` library.

```bash
pip install reportlab            # one-time
python tools/build-excel-cheatsheet.py   # or build-sql / build-dax / build-flow
```

Each script writes a PDF (see the `OUT` path near the top of the file); copy the result into `assets/docs/`. All four PDF builders share `tools/cs_common.py`, which renders the two-page, three-column layout — edit the `sections` list in a builder to change content, or the colour arguments to re-theme.

## Validating changes

Two cheap checks catch almost everything:

**1. HTML is well-formed** (balanced tags). A quick Python check:

```bash
python3 - <<'PY'
from html.parser import HTMLParser
import glob
class V(HTMLParser):
    void={'br','img','meta','link','hr','input','area','base','col','embed','source','track','wbr'}
    def __init__(s): super().__init__(); s.st=[]; s.err=[]
    def handle_starttag(s,t,a):
        if t not in s.void: s.st.append(t)
    def handle_endtag(s,t):
        if t in s.void: return
        if s.st and s.st[-1]==t: s.st.pop()
        else: s.err.append("mismatch at </%s>"%t)
for f in sorted(glob.glob("*.html")):
    p=V(); p.feed(open(f,encoding="utf-8").read())
    print(f, "OK" if not p.err and not [x for x in p.st if x!="html"] else p.err[:3])
PY
```

**2. Typed exam answers actually grade.** Node can load the engines (they attach to `window`, so set `global.window = global` first) and run each `answer` against the dataset, comparing to `expect`. The SQL engine loads via `require('./assets/vendor/sql-wasm.js')`. This is how the existing banks were verified.

## Deployment

Hosted on **GitHub Pages**. Pushing to the default branch publishes the site (Settings → Pages → deploy from branch). Because there's no build step, what's in the repo is exactly what ships. Paths are all **relative**, so the site also works from a sub-path or a local folder.

## Tech stack

- HTML5, CSS3 (custom properties for theming), vanilla ES5/ES6 JavaScript — no framework, no bundler.
- [sql.js](https://sql.js.org/) (SQLite via WebAssembly) for the in-browser SQL runner.
- Google Fonts (Bricolage Grotesque, Inter, JetBrains Mono).
- Maintainer tooling only: Python + reportlab (cheat-sheet PDFs), Node + docx (Word guide).

## Roadmap

- Bring the **Foundations** page to full parity (tabbed lessons + a graded exam + a cheat sheet).
- Optional typed graders for Power BI (DAX) and Power Automate (expression syntax).
- Possible DPM-specific onboarding content (internal workflows, systems, KPIs) and templates.
- ✅ Done: site-wide search, progress tracking, dark mode, Live Dashboard capstone.

---

*All data in this project is fictional and for training purposes only.*
