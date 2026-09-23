#!/usr/bin/env python3
"""Sync the company header and footer from sites/www/index.html.

The company site has an independent RF/manufacturing design as of September 2026.
Satellite sites retain their own navigation and local runtime assets.
Run from any directory; a second run is a no-op.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'sites/www'
source = (SITE / 'index.html').read_text()
blocks = {}
for name in ['header', 'footer']:
    pattern = rf'<!-- shared-{name}:start -->.*?<!-- shared-{name}:end -->'
    match = re.search(pattern, source, re.S)
    if not match:
        raise SystemExit(f'Missing shared {name} source markers')
    blocks[name] = (pattern, match.group())

changed = 0
for page in sorted(SITE.rglob('*.html')):
    if page == SITE / 'index.html':
        continue
    current = '/' + page.relative_to(SITE).as_posix().removesuffix('index.html')
    before = text = page.read_text()
    for name, (pattern, value) in blocks.items():
        if name == 'header':
            value = value.replace(f'href="{current}"', f'href="{current}" aria-current="page"')
        text, count = re.subn(pattern, lambda _: value, text, flags=re.S)
        if count != 1:
            raise SystemExit(f'Expected one {name} region in {page.relative_to(ROOT)}')
    if text != before:
        page.write_text(text)
        changed += 1
print(f'{changed} company pages updated')
