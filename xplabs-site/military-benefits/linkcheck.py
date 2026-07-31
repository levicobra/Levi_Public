#!/usr/bin/env python3
"""Check every outbound link on the ServeStuff mirror and classify the result.

Deliberately conservative: many government and military sites block bots or
reject HEAD, so a non-200 is not automatically "dead". Only 404/410 and DNS
failures are reported as definitely broken; everything else is flagged for a
human to eyeball.
"""
import json, re, os, sys, ssl, socket
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse
import urllib.request, urllib.error

SRC = "/tmp/claude-0/-home-user-Levi-Public/83eb0e9d-716c-5dee-885b-a0cc28f020b5/scratchpad/ss/servestuff.webflow.io/index.html"
OUT = "/tmp/claude-0/-home-user-Levi-Public/83eb0e9d-716c-5dee-885b-a0cc28f020b5/scratchpad/linkcheck.json"

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0 Safari/537.36")

html = open(SRC, encoding="utf-8", errors="replace").read()

# Pull hrefs with their anchor text so the report is actionable.
pairs = re.findall(r'<a[^>]*href="(https?://[^"]+)"[^>]*>(.*?)</a>', html, re.S | re.I)
seen, links = set(), []
for url, text in pairs:
    if url in seen:
        continue
    seen.add(url)
    label = re.sub(r"<[^>]+>", "", text)
    label = re.sub(r"\s+", " ", label).strip()[:80]
    links.append({"url": url, "label": label})

print(f"{len(links)} unique outbound links", flush=True)

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE


def check(item):
    url = item["url"]
    rec = dict(item)
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        })
        with urllib.request.urlopen(req, timeout=25, context=ctx) as r:
            rec["code"] = r.status
            rec["final"] = r.url
            # Redirected to a different host entirely = often a parked/acquired domain.
            rec["host_changed"] = urlparse(r.url).netloc.lstrip("www.") != urlparse(url).netloc.lstrip("www.")
            rec["verdict"] = "ok"
    except urllib.error.HTTPError as e:
        rec["code"] = e.code
        rec["final"] = url
        rec["host_changed"] = False
        if e.code in (404, 410):
            rec["verdict"] = "DEAD"
        elif e.code in (401, 403, 405, 406, 429):
            rec["verdict"] = "blocked"   # very likely fine, bot protection
        else:
            rec["verdict"] = "check"
    except urllib.error.URLError as e:
        rec["code"] = None
        rec["final"] = url
        rec["host_changed"] = False
        reason = str(getattr(e, "reason", e))
        if any(s in reason.lower() for s in ("name or service", "nodename", "getaddrinfo", "no address")):
            rec["verdict"] = "DNS_FAIL"   # domain gone entirely
        elif "timed out" in reason.lower():
            rec["verdict"] = "timeout"
        else:
            rec["verdict"] = "check"
        rec["error"] = reason[:120]
    except Exception as e:
        rec["code"] = None
        rec["final"] = url
        rec["host_changed"] = False
        rec["verdict"] = "check"
        rec["error"] = str(e)[:120]
    return rec


results = []
with ThreadPoolExecutor(max_workers=12) as ex:
    for i, r in enumerate(ex.map(check, links), 1):
        results.append(r)
        if i % 25 == 0:
            print(f"  {i}/{len(links)}", flush=True)

json.dump(results, open(OUT, "w"), indent=1)

counts = {}
for r in results:
    counts[r["verdict"]] = counts.get(r["verdict"], 0) + 1
print("\nSUMMARY:", json.dumps(counts, indent=1), flush=True)
print("DONE", flush=True)
