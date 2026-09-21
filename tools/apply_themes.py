#!/usr/bin/env python3
"""Maintain satellite accent palettes.

The company website uses sites/www/assets/site.css and is not processed here.
Run from the repository root: python3 tools/apply_themes.py.
"""
import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# path -> (name, accent, contrast, surface, surface-2, why this colour)
THEMES = {
    'sites/play/index.html': (
        'Games', '#A98BFF', '7.43:1', '#101016', '#17161F',
        'Violet. The most playful hue in the set, and the furthest from the\n'
        '   corporate green — a catalog should not look like a capabilities deck.'),
}

BRAND_LINE = '  --signal:#3FAC33; --amber:#F5A524;'
BRAND_LINE_COMMENTED = '  --signal:#3FAC33;     /*  6.8:1 on --ink — sampled from the logo */'
SURFACE_LINE = '  --ink:#07090A; --ink-2:#0A0D0E; --surface:#0E1213; --surface-2:#141A1B;'


def read(p):
    with io.open(p, encoding='utf-8') as f:
        return f.read()


def write(p, s):
    with io.open(p, 'w', encoding='utf-8', newline='') as f:
        f.write(s)


changed = 0
for rel, (name, accent, contrast, surface, surface2, why) in THEMES.items():
    path = os.path.join(ROOT, rel.replace('/', os.sep))
    if not os.path.exists(path):
        sys.exit('FATAL: missing %s' % rel)
    page = read(path)
    before = page

    theme_block = (
        '  /* ---- %s theme ----------------------------------------------\n'
        '     %s\n'
        '     Accent measures %s on --ink, so it stays legible on the 11px\n'
        '     monospace labels it is used for. The surfaces are the shared\n'
        '     near-black nudged a few points toward the accent hue: felt\n'
        '     rather than seen, which is the point.\n'
        '     --amber does not vary across the estate. Leave it alone. */\n'
        '  --signal:%s;     /* %s on --ink */'
        % (name, why, contrast, accent, contrast)
    )

    tinted = SURFACE_LINE.replace('--surface:#0E1213', '--surface:%s' % surface) \
                         .replace('--surface-2:#141A1B', '--surface-2:%s' % surface2)

    if BRAND_LINE in page:
        page = page.replace(BRAND_LINE, theme_block + '\n  --amber:#F5A524;', 1)
    elif BRAND_LINE_COMMENTED in page:
        page = page.replace(BRAND_LINE_COMMENTED, theme_block, 1)
    elif theme_block in page and tinted in page:
        # The file already carries exactly what this script writes — a
        # previous run themed it. Skip it so re-running is always safe.
        # A file matching NEITHER the brand strings nor our own output
        # still falls through to the FATAL below: that means the tokens
        # were edited by hand, and guessing would overwrite that work.
        print('  %-22s %s  already themed, skipping' % (name, rel))
        continue
    else:
        sys.exit('FATAL: no recognisable --signal declaration in %s' % rel)

    if SURFACE_LINE not in page:
        sys.exit('FATAL: no recognisable surface declaration in %s' % rel)
    page = page.replace(SURFACE_LINE, tinted, 1)

    if page != before:
        write(path, page)
        changed += 1
        print('  %-22s %s  accent %s (%s)' % (name, rel, accent, contrast))

print('\n%d satellite pages themed. Company styles stay in sites/www/assets/site.css.' % changed)
