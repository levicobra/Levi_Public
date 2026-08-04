#!/usr/bin/env python3
"""Validate every content/subjects/<id>.json against the XP Education schema
and the catalog. Exits non-zero with a per-file error report if anything is
off. Run after editing or generating content.
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SUBJECTS_DIR = ROOT / "content" / "subjects"


def err(errors, fid, msg):
    errors.append(f"{fid}: {msg}")


def check_str(errors, fid, obj, field, ctx, min_len=1):
    v = obj.get(field)
    if not isinstance(v, str) or len(v.strip()) < min_len:
        err(errors, fid, f"{ctx}.{field} missing/empty")
        return False
    return True


def validate_subject(fid, data, catalog_ids, errors):
    for f in ("id", "title", "domain", "level", "description"):
        check_str(errors, fid, data, f, "subject")
    if data.get("id") != fid:
        err(errors, fid, f"id field '{data.get('id')}' != filename")
    if fid not in catalog_ids:
        err(errors, fid, "not present in catalog.json")
    outcomes = data.get("outcomes")
    if not isinstance(outcomes, list) or not (3 <= len(outcomes) <= 8):
        err(errors, fid, "outcomes must be a list of 3-8 strings")
    units = data.get("units")
    if not isinstance(units, list) or not (3 <= len(units) <= 10):
        err(errors, fid, f"units must be a list of 3-10 (got {len(units) if isinstance(units, list) else 'none'})")
        return
    seen_unit_ids = set()
    for ui, u in enumerate(units):
        ctx = f"units[{ui}]"
        check_str(errors, fid, u, "id", ctx)
        check_str(errors, fid, u, "title", ctx)
        check_str(errors, fid, u, "summary", ctx)
        uid = u.get("id")
        if uid in seen_unit_ids:
            err(errors, fid, f"{ctx} duplicate unit id '{uid}'")
        seen_unit_ids.add(uid)
        lessons = u.get("lessons")
        if not isinstance(lessons, list) or not (2 <= len(lessons) <= 8):
            err(errors, fid, f"{ctx}.lessons must be a list of 2-8")
            continue
        seen_lesson_ids = set()
        for li, l in enumerate(lessons):
            lctx = f"{ctx}.lessons[{li}]"
            check_str(errors, fid, l, "id", lctx)
            check_str(errors, fid, l, "title", lctx)
            check_str(errors, fid, l, "intro", lctx, min_len=40)
            lid = l.get("id")
            if lid in seen_lesson_ids:
                err(errors, fid, f"{lctx} duplicate lesson id '{lid}'")
            seen_lesson_ids.add(lid)
            if not isinstance(l.get("minutes"), int) or not (3 <= l["minutes"] <= 90):
                err(errors, fid, f"{lctx}.minutes must be int 3-90")
            secs = l.get("sections")
            if not isinstance(secs, list) or not (2 <= len(secs) <= 6):
                err(errors, fid, f"{lctx}.sections must be a list of 2-6")
            else:
                for si, s in enumerate(secs):
                    sctx = f"{lctx}.sections[{si}]"
                    check_str(errors, fid, s, "heading", sctx)
                    body = s.get("body")
                    if not isinstance(body, list) or not body or \
                       not all(isinstance(p, str) and len(p.strip()) >= 40 for p in body):
                        err(errors, fid, f"{sctx}.body must be non-empty list of substantial paragraphs")
                    ex = s.get("example")
                    if ex is not None:
                        if not isinstance(ex, dict):
                            err(errors, fid, f"{sctx}.example must be object or null")
                        else:
                            check_str(errors, fid, ex, "problem", f"{sctx}.example")
                            check_str(errors, fid, ex, "answer", f"{sctx}.example")
                            if not isinstance(ex.get("steps"), list) or not ex.get("steps"):
                                err(errors, fid, f"{sctx}.example.steps must be non-empty list")
            terms = l.get("keyTerms")
            if not isinstance(terms, list) or not (2 <= len(terms) <= 10):
                err(errors, fid, f"{lctx}.keyTerms must be a list of 2-10")
            else:
                for t in terms:
                    if not isinstance(t, dict) or not t.get("term") or not t.get("def"):
                        err(errors, fid, f"{lctx}.keyTerms entries need term+def")
                        break
            prac = l.get("practice")
            if not isinstance(prac, list) or not (2 <= len(prac) <= 6):
                err(errors, fid, f"{lctx}.practice must be a list of 2-6")
            else:
                for qi, q in enumerate(prac):
                    qctx = f"{lctx}.practice[{qi}]"
                    if not isinstance(q, dict):
                        err(errors, fid, f"{qctx} must be object")
                        continue
                    check_str(errors, fid, q, "q", qctx)
                    check_str(errors, fid, q, "explain", qctx)
                    ch = q.get("choices")
                    if not isinstance(ch, list) or not (3 <= len(ch) <= 5) or \
                       not all(isinstance(c, str) and c.strip() for c in ch):
                        err(errors, fid, f"{qctx}.choices must be list of 3-5 strings")
                    ans = q.get("answer")
                    if not isinstance(ans, int) or not isinstance(ch, list) or \
                       not (0 <= ans < len(ch)):
                        err(errors, fid, f"{qctx}.answer must be valid choice index")


def main():
    catalog = json.loads((ROOT / "content" / "catalog.json").read_text(encoding="utf-8"))
    catalog_ids = {s["id"] for d in catalog["domains"] for s in d["subjects"]}
    only = set(sys.argv[1:])  # optional: validate just these subject ids
    if only:
        files = sorted(SUBJECTS_DIR / f"{i}.json" for i in only)
    else:
        files = sorted(SUBJECTS_DIR.glob("*.json"))
    errors = []
    parsed = 0
    for f in files:
        if not f.exists():
            errors.append(f"{f.stem}: MISSING subject file")
            continue
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            errors.append(f"{f.stem}: JSON parse error — {e}")
            continue
        parsed += 1
        validate_subject(f.stem, data, catalog_ids, errors)

    if not only:
        present = {f.stem for f in files}
        for m in sorted(catalog_ids - present):
            errors.append(f"{m}: MISSING subject file")

    lessons = 0
    for f in files:
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            lessons += sum(len(u.get("lessons", [])) for u in data.get("units", []))
        except Exception:
            pass

    print(f"Checked {len(files)} files ({parsed} parsed) — "
          f"{len(catalog_ids)} catalog subjects, {lessons} lessons total")
    if errors:
        print(f"\n{len(errors)} problem(s):")
        for e in errors:
            print("  -", e)
        sys.exit(1)
    print("All content valid.")


if __name__ == "__main__":
    main()
