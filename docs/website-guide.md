# XP Labs website maintenance guide

Use this guide to update XP Labs content, images, navigation, and public websites
without changing their hosting or losing their individual identities. The sites
are plain editable files in this GitHub repository. Work on a branch, refresh any
generated files, check the actual pages, and release through the existing
Cloudflare Pages connection to `main`.

These standards reflect the owner’s October 6, 2026 direction. The company is
focused on additive manufacturing, with aeroponics towers as its first featured
project. The games and free community resources keep their own visual themes.

## Where each website lives

| Website | Source | Purpose and theme |
|---|---|---|
| [Company](https://xplabs.us/) | `sites/www` | Dark charcoal and green additive manufacturing |
| [Games](https://play.xplabs.us/) | `sites/play` | Dark violet studio catalog and individual game pages |
| [Education](https://learn.xplabs.us/) | `sites/learn` | Warm editorial library, domain colors, optional dark mode |
| [Military resources](https://mil.xplabs.us/) | `sites/mil` | Navy and teal directory; red only for crisis information |

The company’s `/initiatives/` page and homepage community section deliberately
use a light teal theme. Do not repaint the whole collection to match the company
or copy one site’s navigation styling into another.

Anything inside a deployed root is public. Keep credentials, customer files,
private game source, dashboard data, genealogy records, and unreleased private
documents out of all four roots. Keep source-art masters outside them as well;
only the optimized images needed by the pages should ship.

## Find the file to edit

Paths below are relative to the repository root.

| Change | Maintained source |
|---|---|
| Company homepage, contact section, shared company header/footer | `sites/www/index.html` |
| Company colors, layout, behavior | `sites/www/assets/site.css` and `site.js` |
| Manufacturing offering | `sites/www/additive-manufacturing/index.html` |
| Aeroponics project and concept status | `sites/www/projects/aeroponics/index.html` |
| Free resource overview | `sites/www/initiatives/index.html` |
| About or investor copy | `sites/www/about/index.html` or `invest/index.html` |
| Game catalog | `sites/play/index.html` |
| One game’s story, features, images, or links | Its `sites/play/<game>/index.html` |
| Game marketing styles | `sites/play/assets/games.css` |
| Education home, routes, lesson display | `sites/learn/js/app.js` |
| Education design and reading sizes | `sites/learn/css/app.css` |
| Education curriculum | `sites/learn/content/subjects/<subject>.json` |
| Education domain/subject catalog source | `sites/learn/tools/gen_catalog.py` |
| Military layout, search, crisis banner | `sites/mil/directory_template.html` |
| Main military entries | `sites/mil/data.json` |
| National Guard entries | `sites/mil/guard.json` |
| Shared education/military navigation | `tools/sync_satellite_nav.py` |

Do not hand-edit `sites/mil/index.html`, education’s search index, or the marked
cache-version/precache blocks in `sites/learn/sw.js`. Their generators will
overwrite those edits. Game legal, privacy, accessibility, and support pages
have their own existing content and styles; a marketing change must not erase
or silently rewrite their commitments.

## Change company content

Edit visible text in the relevant HTML page. Keep its single main `h1` heading,
working links, image descriptions, and the `shared-header`/`shared-footer`
markers. Company navigation and footer originate in `sites/www/index.html`.
After changing those shared regions, run from the repository root:

```sh
python tools/sync_nav.py
```

That command updates company pages only. It does not update games, education, or
military pages. Within one website, links can be root-relative, such as
`/projects/aeroponics/`. Links between websites must be absolute, such as
`https://learn.xplabs.us/`; `/learn/` would mean a different path on the current
website.

When adding or renaming a company page, update its navigation where appropriate,
canonical URL, page description, social metadata, and `sites/www/sitemap.xml`.
Use the actual substantive edit date for `lastmod`. Preserve redirects in
`sites/www/_redirects`: old consulting, RF, software, and engineering paths now
lead to additive manufacturing, and old benefits links lead to the military
origin. Maintain those legacy URL redirects; do not restore the retired offerings.

## Keep claims and project status accurate

The company offers additive-manufacturing discussions and project-specific work,
not RF, software, or AI consulting. Materials, build size, tolerances, process,
quantity, cost, and timing must be confirmed for the actual project. Do not add
unverified certifications, metal printing, safety-critical qualification,
government contract vehicles, or past performance.

Aeroponics is a concept project, not yet a finished product offered for sale.
When its status genuinely changes, update all relevant locations together:

1. Homepage hero caption, project status label, and project summary.
2. Aeroponics page status panel, illustration captions, next steps, and limits.
3. Related page descriptions/social metadata and the README summary.
4. Any newly published specification, availability, or ordering link.

A new image does not validate water savings, yield, plant capacity, food-contact
suitability, weather resistance, or safety. Publish those claims only when the
actual design and materials have supporting evidence. Do not turn an enquiry
button into a purchase button without a real destination and confirmed offer.

The investor page stays free of funding stage, raise size, valuation, revenue,
or projections. Personal biography and product release/platform claims require
verified owner/project information. Free community projects are not a claim of
registered charity status. Publicly visible source is not automatically licensed
as open source; preserve each learning material’s actual license and attribution.

## Update game pages

The four detail paths are `/the-last-station/`, `/space-glyph/`, `/life-xp/`, and
`/hearth-and-hunt/`. Keep the catalog and the relevant detail page consistent.
Check other game pages if editing a repeated game navigation link or footer.
Their layout is independent of `tools/sync_nav.py`.

Keep verified store links, support links, privacy information, and accessibility
pages intact. Do not infer a release from a playable build or create a missing
store URL. New promotional concepts must remain distinguished from gameplay
screenshots. The existing station artwork for The Last Station is labeled as
artwork, not a demonstration of the current interface.

## Maintain the learning library

The October 6 catalog contains 106 subjects, 1,613 lessons, and 14 domains. These
are content counts, not permanent promises; use the validator’s current result
after curriculum changes. `renderHome()` in `js/app.js` builds the library home.
Subject colors come from the catalog; the editorial visual layer is in section
20 of `css/app.css`. Preserve the saved dark theme, text sizes, local progress,
lesson routes, practice feedback, download shelves, and source/license credits.

After any change under `sites/learn`, run:

```sh
python sites/learn/tools/validate_content.py
python sites/learn/tools/build_index.py
```

If changing the catalog definition, first update `tools/gen_catalog.py` and
regenerate its catalog. Do not run catalog generation merely for a style edit.
Stop if validation fails, fix the reported subject or schema error, then rebuild.

The index builder refreshes both search data and the service-worker content
version. It also places matching content-hash query versions on the CSS and
JavaScript URLs in the HTML and offline precache, so stale CDN entries cannot
pin returning readers to an old interface. Do not hand-edit those query values.
Regression checks run with `python sites/learn/tools/test_build_index.py`.
New local runtime images or other files must also be listed in
`precache_files()` inside `tools/build_index.py`; placing them in the folder is
not enough. The root cache entry is `./`, not `/index.html`, which production
redirects. Keep `sw.js` configured as `no-store` in `_headers`.

Readers need one successful online download before offline use. Confirm the
library status and open a lesson before disconnecting. Browser storage can be
limited or cleared; do not promise that an interrupted first visit saved every
lesson. Preserve the Settings export/import workflow for local progress.

## Maintain military resources

Edit the template for layout and search, `data.json` for main entries, and
`guard.json` for state programs. The generator combines them:

```sh
python sites/mil/gen_directory.py
```

As of October 6, the 671 resources comprise 479 main entries plus 192 Guard
entries. The 15 board choices are 14 main categories plus Guard by state.
Do not manually replace generated counts. The generator’s console separately
reports the base directory; the page includes the Guard collection.

Keep the crisis banner before the main introduction, visible without opening a
menu. Keep click-to-call 988 with the “press 1” instruction, text 838255, online
chat, and the crisis-search interception. Red is reserved for this information.
The independent/non-affiliation notice and provider eligibility caveat stay.

On narrow screens, the explanation sidebar is omitted so that crisis access,
a compact masthead, and search come first. The small state map gives way to the
same programs in accessible state lists. Do not add a large introductory image
or panel above mobile search.

External links need their own audit. Do not change the displayed audit date when
only regenerating the page. `linkcheck.py` is a legacy auditor with hardcoded
scratchpad paths and disabled TLS verification; repair and review those settings
before using it for a new audit. Inspect redirects/provider identity manually
where needed, and distinguish bot blocks from dead links. A visual or internal
link check does not establish that all 671 external resources remain current.

## Update shared resource navigation

Edit `LINKS`, the header definition, or the namespaced styles/behavior in
`tools/sync_satellite_nav.py`, then run:

```sh
python tools/sync_satellite_nav.py
python sites/mil/gen_directory.py
python sites/learn/tools/validate_content.py
python sites/learn/tools/build_index.py
```

The shared estate header is non-sticky; the education app header and military
search control their own sticky behavior. Avoid two unrelated bars competing for
`top:0`. Check Menu, submenus, Escape, focus, and the correct absolute cross-site
links. The Manufacturing destination is `https://xplabs.us/additive-manufacturing/`.

## Replace or add images

Use local optimized assets, descriptive `alt` text, and actual `width`/`height`
attributes. Keep an immediately visible caption when an image is illustrative.
Use lazy loading for below-the-fold pictures, not the primary hero image. Update
all references, captions, social image metadata, and education precache entries
that depend on the changed asset. Check the image at both mobile and desktop crops.

| Deployed asset | What it represents |
|---|---|
| `sites/www/assets/aeroponics-concept.webp` | AI-generated aeroponics tower concept, not a finished or tested product |
| `sites/www/assets/printed-parts-concept.webp` | AI-generated material/part illustration, not completed customer work |
| `sites/play/game-art/space-glyph-world.webp` | Promotional Space Glyph concept, not gameplay |
| `sites/play/game-art/life-xp-world.webp` | Promotional Life XP concept, not gameplay |
| `sites/play/game-art/hearth-hunt-world.webp` | Promotional Hearth & Hunt concept, not gameplay |

The [October 6 art provenance record](art-provenance-2026-10-06.md) preserves the
five exact generation prompts and output formats for these concepts.
Keep original-size masters and generation/source records outside `sites/`.
For future generated art, retain the exact prompt, reference rights, date, and
any required disclosure in a suitable art record. Do not infer a license or
provenance from a file being available online. Preserve the original XP Labs
wordmarks and icons; choose the light or dark logo according to its background.

## Colors and accessibility

Edit named color tokens, not scattered one-off values. The company’s tokens are
at the top of `assets/site.css`; games have their own `assets/games.css` tokens.
Do not use the old string-replacement `tools/apply_themes.py` as a blanket theme
operation on the redesigned sites.

These company color-pair ratios were calculated for the October palette. They
are references for editing, not a substitute for checking the rendered page.

| Use | Foreground and background | Contrast |
|---|---|---|
| Main text on charcoal | `#F1F5EC` on `#0B0F0D` | 17.47:1 |
| Secondary text on charcoal | `#B3BFB5` on `#0B0F0D` | 10.14:1 |
| Secondary text on panel | `#B3BFB5` on `#131B16` | 9.23:1 |
| Green accent on charcoal | `#B6E477` on `#0B0F0D` | 13.19:1 |
| Structural border on charcoal | `#708077` on `#0B0F0D` | 4.63:1 |
| Structural border on raised panel | `#708077` on `#1C2720` | 3.71:1 |
| Community text on light background | `#163E36` on `#F4F7EF` | 10.92:1 |
| Community secondary text on white | `#476359` on `#FFFFFF` | 6.57:1 |
| Community teal accent on light background | `#0B6B60` on `#F4F7EF` | 5.90:1 |
| Community game eyebrow on light background | `#624189` on `#F4F7EF` | 7.36:1 |

Require at least 4.5:1 for normal text and 3:1 for meaningful control boundaries
and focus indicators. Decorative hairlines do not substitute for visible control
boundaries. When changing colors, check text, hover/focus states, dark headers on
light pages, and every domain accent in both education themes. Keep reduced-motion
support, readable touch controls, keyboard access, and exactly one main heading.

## Preview and test before publishing

From the repository root, start the maintained local preview:

```sh
python tools/preview_sites.py
```

| Local URL | Website |
|---|---|
| `http://127.0.0.1:8810/` | Company |
| `http://127.0.0.1:8811/` | Games |
| `http://127.0.0.1:8812/` | Education |
| `http://127.0.0.1:8813/` | Military resources |

The server applies the roots’ `_headers` and redirects and disables directory
listing. Its diagnostic script is inserted only into local responses; it must
never be copied into deployed HTML. Stop the server with Ctrl-C. Absolute
cross-site links still point to public origins, so open each local entry directly
when inspecting unpublished changes.

For material layout/navigation changes, render affected pages at 320, 360, 768,
1440, and 2560 pixels. Require no horizontal document overflow, one `h1`, useful
image alternatives and dimensions, and no page, asset-request, or CSP errors.
Use the actual menus, links, search, and lesson interactions. Inspect browser
network activity for unexpected external requests; source searches cannot detect
analytics injected at the hosting edge.

Check military searches for `rent`, `dental`, `suicide`, and a nonsense term.
Check that the mobile crisis banner stays visible and the search input appears
in the first 320 × 800 viewport. Walk education home → domain → subject → lesson,
try practice feedback, and verify a previously cached lesson with the server/network
unavailable. Reconnect and verify that a returning client receives the new cache
version after an education update. Test readable light and dark education themes.

Check internal links and local asset references, including icons, manifests, CSS
URLs, and social images. A 200 response can still be an HTML error page where an
image belongs. Preserve CSP instead of weakening it to hide a broken feature.

## Publish and recover

Follow [DEPLOY.md](../DEPLOY.md). Existing projects are `xplabs-www`,
`xplabs-play`, `xplabs-learn`, and `xplabs-mil`, each publishing its respective
root from `main` with an empty build command. Do not create replacement hosting
or change DNS for a content update.

Review the diff, commit the scoped branch, push it, open/update the PR, check the
results, and merge when ready under the standing release authority. All four
projects may deploy from that merge. Confirm deployment state and repeat the
relevant user path on each affected live origin. Keep the PR, commit, URLs, and
actual test results together as the release record.

If production remains old, inspect its deployment log and output directory first.
For a stale asset 404, confirm the exact path before using an authorized exact-URL
purge. For a bad code release, use a scoped revert through the normal Git workflow;
do not reset shared history or discard unrelated work.

## October 6 local verification record

Local pre-release checks for this redesign covered 14 changed pages at five
widths each: 70 views at 320, 360, 768, 1440, and 2560 pixels. Each had no document
overflow, one `h1`, image alternatives/dimensions, and no asset-request, CSP, or
page errors under the real headers. A static audit covered 26 HTML files,
526 references, and 47 images with no unresolved internal references.

Browser checks covered the company mobile Menu/Escape/aeroponics path, the game
catalog to Space Glyph with its store destination, military category and crisis
search behavior plus the empty state, and education navigation and practice
feedback. Military search began at document position 423px in the 320 × 800
viewport. An education cached reload worked after the preview server stopped,
and a returning local client received cache version `xped-242f9ab07b16`.

The local HTTP audit covered 64 unique internal page/asset URLs, all returning
200 with CSP. Six retired service URLs returned 301 to additive manufacturing
and then 200. Syntax checks passed for nine scripts, including four inline
military scripts. The education worker returned
`Cache-Control: no-cache, no-store, must-revalidate`.

This is local release evidence, not production confirmation. Record live
deployment results in the release PR after publication. The redesign did not
include a complete external audit of all military resource links.

## Useful requests for future updates

- “Update the aeroponics page with these actual prototype photos and test results. Keep concept labels anywhere the image is still illustrative, update matching homepage copy, and release through the existing website workflow.”
- “Add this verified military resource to the correct category. Keep crisis access intact, regenerate the directory, and test its search result before release.”
- “Update this lesson while preserving attribution and offline access. Run the content validator and rebuild the service-worker version, then verify a returning reader gets the update.”

Provide the changed facts, source files/photos, intended page, and desired result.
The existing project route and these standards should supply the rest; no new
website account or hosting migration is needed for normal maintenance.
