#!/usr/bin/env python3
"""Sync the shared header, footer and nav script across the estate.

sites/www/index.html is the SOURCE. Every other page borrows its nav CSS,
its <header>, its <footer> and its nav <script>. Run this after editing any
of those in the source, from the repository root:

    python tools/sync_nav.py

Why a script instead of hand-editing eight files: the nav is the one thing
that must be byte-identical everywhere. Hand-syncing it is how you end up
with a menu that has five items on one page and six on another, and nobody
notices for a month because you always enter the site on the same page.

Every extraction and substitution asserts it matched. A silent no-op here
would ship a half-updated estate, which is worse than a crash.
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, 'sites', 'www', 'index.html')

# Off-origin pages need absolute links out, and a relative link to themselves.
PLAY_REWRITE = [
    ('href="https://play.xplabs.us/"', 'href="/"'),
    ('href="/"', 'href="https://xplabs.us/"'),          # applied after the line above
    ('href="/consulting/"', 'href="https://xplabs.us/consulting/"'),
    ('href="/initiatives/"', 'href="https://xplabs.us/initiatives/"'),
    ('href="/about/"', 'href="https://xplabs.us/about/"'),
    ('href="/invest/"', 'href="https://xplabs.us/invest/"'),
    ('src="/logo.png"', 'src="/logo.png"'),
]

# page path -> what should carry aria-current in the header.
#   'Label'        marks the top-level <a> with that text
#   'menu:<id>'    marks the menu BUTTON controlling that panel, for pages whose
#                  nav entry is a dropdown rather than a link
#   None           marks nothing
TARGETS = {
    'sites/www/about/index.html':        'About',
    'sites/www/invest/index.html':       'Invest',
    'sites/www/consulting/index.html':   None,
    'sites/www/initiatives/index.html':  'menu:menu-initiatives',
    'sites/play/index.html':             None,
}


def read(p):
    with io.open(p, encoding='utf-8') as f:
        return f.read()


def write(p, s):
    with io.open(p, 'w', encoding='utf-8', newline='') as f:
        f.write(s)


def grab(text, start, end, what):
    i = text.find(start)
    if i < 0:
        sys.exit('FATAL: could not find start of %s in the source' % what)
    j = text.find(end, i)
    if j < 0:
        sys.exit('FATAL: could not find end of %s in the source' % what)
    return text[i:j + len(end)]


src = read(SOURCE)

NAV_CSS = grab(src, '/* ===== NAV — shared block.', '/* ===== end shared nav block ===== */', 'nav CSS')
TICK_CSS = grab(src, '.tick{display:inline-flex', '.tick i:nth-child(3){height:100%}.tick i:nth-child(4){height:50%}', 'tick CSS')
HEADER = grab(src, '<header class="site-header">', '</header>', 'header markup')
FOOTER = grab(src, '<footer class="site-footer">', '</footer>', 'footer markup')
SCRIPT = grab(src, '<script>\n/* Header behaviour.', '</script>', 'nav script')

print('extracted from sites/www/index.html:')
print('  nav CSS   %5d chars' % len(NAV_CSS))
print('  header    %5d chars' % len(HEADER))
print('  footer    %5d chars' % len(FOOTER))
print('  script    %5d chars' % len(SCRIPT))
print()


def set_current(markup, label):
    """Put aria-current="page" on exactly one header element."""
    markup = markup.replace(' aria-current="page"', '')
    if not label:
        return markup

    if label.startswith('menu:'):
        panel_id = label.split(':', 1)[1]
        pat = re.compile(r'(<button class="menu__btn"[^>]*aria-controls="' + re.escape(panel_id) + r'")')
        out, n = pat.subn(lambda m: m.group(1) + ' aria-current="page"', markup, count=1)
    else:
        pat = re.compile(r'(<a href="[^"]*">)(' + re.escape(label) + r')(</a>)')
        out, n = pat.subn(lambda m: m.group(1)[:-1] + ' aria-current="page">' + m.group(2) + m.group(3),
                          markup, count=1)

    if n != 1:
        sys.exit('FATAL: could not set aria-current for %r' % label)
    return out


def rewrite_for_play(markup):
    # Order matters: retarget the self-link first, then absolutise the rest.
    markup = markup.replace('href="https://play.xplabs.us/"', 'href="@@SELF@@"')
    for a, b in [('href="/"', 'href="https://xplabs.us/"'),
                 ('href="/consulting/"', 'href="https://xplabs.us/consulting/"'),
                 ('href="/initiatives/"', 'href="https://xplabs.us/initiatives/"'),
                 ('href="/about/"', 'href="https://xplabs.us/about/"'),
                 ('href="/invest/"', 'href="https://xplabs.us/invest/"')]:
        markup = markup.replace(a, b)
    return markup.replace('href="@@SELF@@"', 'href="/"')


changed = 0
for rel, current in TARGETS.items():
    path = os.path.join(ROOT, rel.replace('/', os.sep))
    if not os.path.exists(path):
        sys.exit('FATAL: target missing: %s' % rel)
    page = read(path)
    before = page

    header = set_current(HEADER, current)
    footer = FOOTER
    if rel.startswith('sites/play/'):
        header = rewrite_for_play(header)
        footer = rewrite_for_play(footer)

    # --- CSS: replace everything from the nav banner through the tick rules ---
    # NAV_CSS is grabbed from the source starting at its comment banner, so the
    # region replaced here has to start at the banner too. Anchoring on
    # `.site-header{` instead left the page's existing banner sitting above the
    # freshly inserted one, and every run added another copy — the pages had
    # accumulated three. Starting at the first banner also cleans up the ones
    # already there, because everything from it to the tick anchor is replaced.
    css_start = page.find('/* ===== NAV — shared block.')
    if css_start < 0:
        # A page written before the banner existed: fall back to the rule.
        css_start = page.find('.site-header{position:sticky')
    if css_start < 0:
        sys.exit('FATAL: no header CSS anchor in %s' % rel)
    tail_anchor = '.tick i:nth-child(3){height:100%}.tick i:nth-child(4){height:50%}'
    css_end = page.find(tail_anchor, css_start)
    if css_end < 0:
        sys.exit('FATAL: no tick CSS anchor in %s' % rel)
    css_end += len(tail_anchor)
    page = page[:css_start] + NAV_CSS + '\n\n' + TICK_CSS + page[css_end:]

    # --- header markup ---
    h0 = page.find('<header class="site-header">')
    h1 = page.find('</header>', h0)
    if h0 < 0 or h1 < 0:
        sys.exit('FATAL: no <header> in %s' % rel)
    page = page[:h0] + header + page[h1 + len('</header>'):]

    # --- footer markup ---
    f0 = page.find('<footer class="site-footer">')
    f1 = page.find('</footer>', f0)
    if f0 < 0 or f1 < 0:
        sys.exit('FATAL: no <footer> in %s' % rel)
    page = page[:f0] + footer + page[f1 + len('</footer>'):]

    # --- nav script: replace if present, otherwise insert before </body> ---
    s0 = page.find('<script>\n/* Header behaviour.')
    if s0 >= 0:
        s1 = page.find('</script>', s0) + len('</script>')
        page = page[:s0] + SCRIPT + page[s1:]
    else:
        b = page.rfind('</body>')
        if b < 0:
            sys.exit('FATAL: no </body> in %s' % rel)
        page = page[:b] + SCRIPT + '\n\n' + page[b:]

    if page != before:
        write(path, page)
        changed += 1
        print('  synced   %s' % rel)
    else:
        print('  same     %s' % rel)

print('\n%d file(s) updated' % changed)
