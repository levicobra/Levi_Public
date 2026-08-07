#!/usr/bin/env python3
"""Give each property its own accent while keeping one shared skeleton.

Run from the repository root:

    python tools/apply_themes.py

The estate reads as one company because the layout, type scale, spacing and
navigation are identical everywhere. What distinguishes a property is its
ACCENT — the colour of links, buttons, the logo tick, focus rings, card hover
borders and the section rules. Changing anything else per property would make
these look like four different companies rather than four parts of one.

--amber deliberately does NOT vary. It is the estate's constant "metadata"
colour (hostnames, spec labels, the invest rule), and holding it steady is
part of what keeps the properties recognisable as siblings.

Contrast was measured against --ink #07090A. Every accent below clears 4.5:1,
which matters because these are used on 11px monospace labels. If you swap a
colour, measure it — do not eyeball it.
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
    'sites/www/consulting/index.html': (
        'Consulting', '#4DA3FF', '7.60:1', '#0D1218', '#131A22',
        'Azure. Reads institutional rather than startup, which is the register\n'
        '   a public-sector or enterprise buyer is reading this page in.'),
    'sites/www/initiatives/index.html': (
        'Public Initiatives', '#2FD4B6', '10.65:1', '#0C1414', '#121C1B',
        'Aqua. Civic and open rather than commercial; it should not look like\n'
        '   the pages that are selling something.'),
}

# The hub, about and invest keep the brand green: green IS XPLabs corporate.
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

    if BRAND_LINE in page:
        page = page.replace(BRAND_LINE, theme_block + '\n  --amber:#F5A524;', 1)
    elif BRAND_LINE_COMMENTED in page:
        page = page.replace(BRAND_LINE_COMMENTED, theme_block, 1)
    else:
        sys.exit('FATAL: no recognisable --signal declaration in %s' % rel)

    tinted = SURFACE_LINE.replace('--surface:#0E1213', '--surface:%s' % surface) \
                         .replace('--surface-2:#141A1B', '--surface-2:%s' % surface2)
    if SURFACE_LINE not in page:
        sys.exit('FATAL: no recognisable surface declaration in %s' % rel)
    page = page.replace(SURFACE_LINE, tinted, 1)

    if page != before:
        write(path, page)
        changed += 1
        print('  %-22s %s  accent %s (%s)' % (name, rel, accent, contrast))

print('\n%d themed. Hub, About and Invest keep the brand green.' % changed)
