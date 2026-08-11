#!/usr/bin/env python3
"""Build derived artifacts from the content library:

1. content/search-index.json — every unit/lesson title + key terms, so global
   search works offline without loading all subject files eagerly.
2. sw.js precache list — every app + content file, injected between the
   @PRECACHE markers, with a content-hash VERSION between the @VERSION
   markers so the service worker updates exactly when anything changes.

Run this after any content or app change.
"""
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent


def build_search_index():
    subjects_dir = ROOT / "content" / "subjects"
    out = {"subjects": []}
    for f in sorted(subjects_dir.glob("*.json")):
        data = json.loads(f.read_text(encoding="utf-8"))
        entries = []
        for u in data.get("units", []):
            for l in u.get("lessons", []):
                terms = " ".join(t.get("term", "") for t in l.get("keyTerms", []))
                entries.append({"t": l["title"], "u": u["id"], "l": l["id"], "k": terms})
        out["subjects"].append({"id": data["id"], "entries": entries})
    path = ROOT / "content" / "search-index.json"
    # newline="\n" keeps the bytes identical whatever platform runs this.
    # Without it, Windows writes CRLF — and since content_hash() below hashes
    # this very file, that alone changes VERSION and re-downloads the whole
    # precache for every visitor.
    path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n",
                    encoding="utf-8", newline="\n")
    n = sum(len(s["entries"]) for s in out["subjects"])
    print(f"search-index.json: {len(out['subjects'])} subjects, {n} lessons")


def precache_files():
    # NOTE index.html IS DELIBERATELY ABSENT, and putting it back breaks the
    # site on every returning visitor.
    #
    # Cloudflare Pages answers /index.html with a 308 to /. Precaching it
    # therefore stores a response whose `redirected` flag is true. A
    # navigation request has redirect mode "manual", and handing it a
    # redirected response is a network error — so the FIRST visit worked, the
    # worker installed, and every visit after that failed with ERR_FAILED.
    # "./" is the same page without the redirect, and it is what sw.js serves
    # navigations from.
    files = ["./", "css/app.css", "js/app.js",
             "manifest.webmanifest", "icons/icon.svg",
             "icons/icon-192.png", "icons/icon-512.png",
             "icons/icon-maskable-512.png",
             "content/catalog.json", "content/search-index.json",
             # The downloads shelf's own catalog, so the page listing the big
             # offline material is itself available offline.
             "content/downloads.json"]
    for f in sorted((ROOT / "content" / "subjects").glob("*.json")):
        files.append(f"content/subjects/{f.name}")
    # keep only files that actually exist (plus './')
    return [f for f in files if f == "./" or (ROOT / f).exists()]


def content_hash(files):
    h = hashlib.sha256()
    for f in files:
        if f == "./":
            continue
        h.update(f.encode())
        h.update((ROOT / f).read_bytes())
    return h.hexdigest()[:12]


def inject_sw(files):
    sw = ROOT / "sw.js"
    src = sw.read_text(encoding="utf-8")
    version = "xped-" + content_hash(files)
    listing = ",\n".join(f"  '{f}'" for f in files)
    src = re.sub(r"/\* @VERSION \*/.*?/\* @END-VERSION \*/",
                 f"/* @VERSION */\nconst VERSION = '{version}';\n/* @END-VERSION */",
                 src, flags=re.S)
    src = re.sub(r"/\* @PRECACHE \*/.*?/\* @END-PRECACHE \*/",
                 f"/* @PRECACHE */\nconst PRECACHE = [\n{listing},\n];\n/* @END-PRECACHE */",
                 src, flags=re.S)
    sw.write_text(src, encoding="utf-8", newline="\n")
    total = sum((ROOT / f).stat().st_size for f in files if f != "./")
    print(f"sw.js: {len(files)} precached files, {total / 1048576:.2f} MB, version {version}")


if __name__ == "__main__":
    build_search_index()
    inject_sw(precache_files())
