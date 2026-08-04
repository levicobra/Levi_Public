# XP Education

A free learning platform that works fully offline. 106 subjects across 14
domains — K–8 foundations through college courses — served as a static,
dependency-free PWA at `xplabs.us/education/`.

## How it works

- **No build step.** Plain HTML/CSS/JS. `index.html` is an SPA shell;
  `js/app.js` renders every view from hash routes (`#/`, `#/d/<domain>`,
  `#/s/<subject>`, `#/l/<subject>/<unit>/<lesson>`, `#/search`, `#/library`,
  `#/settings`, `#/about`).
- **All content ships with the app.** `content/catalog.json` lists domains and
  subjects; each subject's full curriculum (units → lessons with sections,
  worked examples, key terms, and practice questions) lives in
  `content/subjects/<id>.json`.
- **Offline-first.** `sw.js` precaches the app shell *and the entire content
  library* on first visit, so every lesson works with no connection. The
  precache list and cache version are generated — never hand-edit between the
  `@PRECACHE`/`@VERSION` markers.
- **Installable.** `manifest.webmanifest` + icons make it an app on
  Android/desktop (install prompt) and iOS (Add to Home Screen).
- **Progress stays local.** Completion, streaks, and settings live in
  `localStorage`; exportable/importable from Settings. No accounts, no
  analytics.

## Content pipeline

```
tools/gen_catalog.py        # source of truth for domains/subjects → content/catalog.json
content/subjects/<id>.json  # curriculum files (see schema in tools/validate_content.py)
tools/validate_content.py   # schema check; pass subject ids to check a subset
tools/build_index.py        # → content/search-index.json + sw.js precache/version
```

After changing any content or app file:

```
python3 tools/validate_content.py && python3 tools/build_index.py
```

`build_index.py` stamps `sw.js` with a content hash, so deployed clients pick
up the new version on their next online launch.

## Licensing

College subjects are aligned to the scope and sequence of
[OpenStax](https://openstax.org) textbooks (CC BY 4.0), with original prose,
attribution, and a link to the full free book on every subject page. Original
XP Education courses are released under CC BY 4.0 as well.
