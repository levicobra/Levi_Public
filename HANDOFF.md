# XPLabs website — handoff

Everything a new developer or AI assistant needs to pick this project up.
Written to be read top to bottom once, then used as a reference.

**This file is public.** It deliberately contains no credentials, account
identifiers, registrar codes, or private repository contents. Anything of that
kind has to come from the owner directly.

---

## 1. The prompt

Paste this into a fresh session, along with a clone of this repository.

> You are taking over the XPLabs website. The repository is `levicobra/Levi_Public`.
> The site source is the `xplabs-site/` directory. It deploys to `xplabs.us`.
>
> Read `HANDOFF.md` in the repository root first. It describes what exists, the
> rules the codebase follows, the facts that have been verified, and the
> decisions still open. Follow the constraints in section 6 — they are not
> stylistic preferences, they are the reason the site still works.
>
> The site is six static pages plus a self-contained offline learning app, with a
> seventh area (`levi.xplabs.us`, section 5) still to be built.
> There is no build step, no package manager, and no framework. Every page is a
> single HTML file with inline CSS, and must load with zero external network
> requests. Do not introduce a bundler, a CSS framework, a web font, or an npm
> dependency. If you believe one is necessary, say so and stop rather than
> adding it.
>
> The owner is not a programmer. Any file you touch must remain hand-editable:
> palette in `:root` custom properties, commented sections, plain English
> comments where a decision is non-obvious.
>
> Verify your work by rendering it in a real browser at 320, 360, 768, 1440 and
> 2560 pixels wide and confirming zero horizontal overflow, zero console errors
> and zero failed requests — then by clicking through the actual user path.
> Checking HTTP status codes is not verification. Section 8 has the procedure.
>
> Before starting, tell me which of the open decisions in section 7 you need
> answered, and do not invent answers to them.

---

## 2. What this is

XPLabs LLC is an independent studio. The site is its hub and hosts two free
public resources.

| Area | Path | What it is |
|---|---|---|
| Hub | `/` | Company front page; four games, education, three directories |
| Games catalog | `/games/` | **All four titles, at equal depth.** There is no per-game page |
| XP Education | `/education/` | Offline learning app, 106 subjects, 14 domains |
| Military benefits | `/military-benefits/` | Free directory, 279 resources, 13 categories |
| Engineering | `/engineering/` | How things are built, plus consulting |
| Personal | `/personal/` | About the founder |
| Dashboard | `levi.xplabs.us` | **Not built.** Private personal dashboard — see section 5 |

The four games are **The Last Station** (Unreal Engine 5, mobile),
**Space Glyph** (Swift 6 / SpriteKit, iPhone), **Life XP** (SwiftUI / SceneKit,
iPhone) and **Hearth & Hunt** (Roblox). Their source repositories are private
and are not part of this handoff. The site describes them; it does not contain
them.

---

## 3. Repository layout

```
HANDOFF.md                        this file
README.md                         GitHub profile-facing summary
archive/                          backups of the two sites this replaced
  servestuff-webflow-mirror/      complete pre-migration Webflow mirror
  xplabs-chatgpt-site-original.html
xplabs-site/                      THE SITE — everything below deploys
  index.html                      hub
  favicon-32.png  apple-touch-icon.png  og.jpg
  robots.txt  sitemap.xml
  game-art/                       WebP, production
  game-art-src/                   original PNG masters (not deployed)
  games/index.html                catalog — all four titles
  education/                      offline learning app (see section 4)
  engineering/index.html
  personal/index.html
  military-benefits/
    index.html                    GENERATED — do not hand-edit
    directory_template.html       edit this
    gen_directory.py              then run this
    data.json                     the 279 resources
    linkcheck.py                  link rot auditor
    LINK-AUDIT.md                 last audit result
```

---

## 4. The two generated areas

Most pages are plain HTML you edit directly. Two are not.

### Military benefits

`military-benefits/index.html` is **generated**. Editing it directly will be
overwritten. The real sources are:

- `directory_template.html` — layout, styles, and the search implementation
- `data.json` — the 279 resources, grouped into 13 categories
- `gen_directory.py` — combines them

```sh
cd xplabs-site/military-benefits && python3 gen_directory.py
```

The search is not a substring filter. It scores each result: a whole word in the
resource name outranks a prefix match, which outranks the hostname, which
outranks category-level relevance. Matching *categories* are returned as results
in their own right — so "rent" returns the Housing category rather than a boat
rental, and "dental" returns Health & Wellness rather than pretending sixteen
unrelated rows are matches. Terms with no match get an explicit empty state.

**Crisis handling is a safety feature, not a nicety.** The Veterans Crisis Line
sits at the top of every view, reachable in zero taps, and searching *crisis*,
*suicide*, *988* or related terms surfaces it directly. The directory contains no
other crisis resource, so this is the only path to one. Do not move it behind a
tap, and do not remove the search interception.

### XP Education

`education/` is a self-contained single-page app. It has its own pipeline:

```sh
cd xplabs-site/education
python3 tools/validate_content.py && python3 tools/build_index.py
```

`build_index.py` regenerates the search index and stamps the service worker with
a content hash, which is how deployed clients pick up new content. Run it after
any content change. The markers it writes between are generated — never edit
them by hand.

XP Education was built on the branch **`claude/offline-education-platform-c3u3yl`**
and merged into the working branch. That branch is the origin of every file under
`education/`; its history is worth reading before making structural changes,
because the content pipeline and the service worker were developed together.

Content lives in `content/subjects/<id>.json`, one file per subject, indexed by
`content/catalog.json`. College subjects follow the scope and sequence of
OpenStax open textbooks (CC BY 4.0) with attribution and a link to the free book
on every subject page. Keep that attribution.

---

## 5. `levi.xplabs.us` — personal dashboard (to be built)

Not built. This section is the brief.

A private dashboard for the owner's own use, to be engineered separately. It is
**not** part of the public site and should not be linked from it.

**Where it goes.** A subdomain of `xplabs.us`. Subdomains cost nothing on the
hosting plan in section 10, so this needs no new domain and no new bill. Give it
its own Cloudflare Pages project and its own repository.

**It must be access-controlled.** A personal dashboard aggregates things a
stranger should not see. Two workable options:

- *Cloudflare Access* (Zero Trust) — email one-time-PIN, no password to manage,
  per-person revocation. Better if more than one person ever needs in.
- *HTTP Basic Auth via Pages middleware* — one shared username and password held
  as Cloudflare secrets, never in the repository. Simpler, and enough for one
  user.

Two traps, both of which have caught people on this project's sibling work:

1. Cloudflare Pages has an **"Enable access policy"** toggle in project settings.
   It protects **preview deployments only** — not the production custom domain.
   Flipping it, seeing a login screen on a preview URL, and assuming the site is
   protected leaves the real subdomain wide open. Create a Zero Trust Access
   application against the custom domain itself.
2. **Whatever gates the site does not gate the repository.** If the dashboard's
   repo is public, its contents are readable regardless of any password. The
   repository must be private, and anything sensitive it consumes must be
   gitignored.

Fail closed: if the credentials or configuration are missing, serve an error
rather than serving the dashboard.

**Open questions the owner must answer before building:**

- What does it actually show? Candidates from this project alone: game build and
  release status, XP Education content coverage, benefits-directory link rot,
  domain expiry, and open decisions. None of that is settled.
- Where does the data come from — manual entry, files committed to its repo, or
  live APIs? This decides whether it can stay static.
- Is it one user or several? That decides Basic Auth versus Access.
- Does it need to work offline, as XP Education does?

**Recommended starting point.** Static, no build step, matching the rest of the
site's conventions in section 6, reading from a committed JSON file. Add live
data sources only when a specific one proves necessary. A dashboard that renders
from a file cannot break at 2am; one that depends on five APIs can.

---

## 6. Constraints — read before changing anything

These are the rules the site is built on. Each exists for a reason.

1. **No build step, no npm, no framework, no bundler.** The owner is not a
   programmer. The hard part of a small project is not building it, it is
   opening it again in six months. Nothing here can rot.

2. **Zero external requests.** No web fonts, no CDN, no analytics, no trackers.
   Every page must render fully offline. This is enforceable: load a page with
   the network disabled and it must be complete. Fonts are deliberate stacks of
   faces that ship on real machines — if you need display type, draw it as
   inline SVG rather than loading a font.

3. **Responsive 320px to 2560px, zero horizontal overflow.** 320 is not
   theoretical; it is a real phone in a real hand.

4. **WCAG AA on every text/background pair.** Contrast ratios are written into
   the CSS comments next to the tokens. If you change a colour, recompute the
   ratio and update the comment. Structural borders need 3:1, not 4.5:1, but
   they do need 3:1 — a border nobody can see is not a border.

5. **Every page must be editable by a non-programmer.** Palette in `:root`,
   sections commented, no clever minified tricks. Someone must be able to change
   a job posting from "wanted" to "filled" without help — and the instructions
   for doing so must list *every* place that needs changing, not just the
   heading.

6. **The hub's colour rule.** Each game owns one colour. Teal, ultramarine and
   rust are dark enough for white type. **Mustard is not** — that card uses dark
   type, and mustard must never be used as text on the bone background, where it
   measures 2.5:1. This rule is written into `index.html` so it survives editing.

7. **Never claim capability that does not exist.** The consulting page describes
   defense and government technology as background and capability, explicitly not
   as availability, with no contract vehicle or engagement claimed. The benefits
   directory carries a disclaimer that it is not affiliated with or endorsed by
   the DoD, the VA, or any government agency. Both are deliberate. Do not
   "improve" either into a claim.

---

## 7. Open decisions — the owner must answer these

Do not guess at any of them.

| # | Decision | Why it is blocked |
|---|---|---|
| 1 | **Platform claim for The Last Station.** The site and `README.md` say iOS, Nintendo Switch and Switch 2. The game's own design documentation says Unreal Engine 5 mobile, with the Android build live and iOS pending. Switch appears nowhere in it. | This is a factual claim on a public marketing page and the two sources disagree. Only the owner knows which is true. |
| 2 | **Space Glyph naming.** Its release checklist requires professional trademark and marketplace clearance before substantial marketing spend. The title currently appears on the public catalog. | Legal/commercial judgement, not a technical one. |
| 3 | **Hearth & Hunt link.** The card says "Live build" but links nowhere, because the Roblox URL is not recorded anywhere in this repository. | Must not be invented. |
| 4 | **Scope of `/personal/`.** Currently a short honest stub. | It is a page about a person, written from repository contents. It needs his voice. |
| 5 | **Where XP Education sits.** It is currently presented as a peer of the games rather than a project under them. A 106-subject offline school may eventually deserve its own domain. | Brand and strategy decision. |
| 6 | **Missing benefits content.** The directory has no coverage of disability claims, the PACT Act, DD-214 records, food assistance, PCS/moving, burial benefits, or hearing and vision. | These are real gaps in a public resource. Adding entries is a content decision the owner owns. |

---

## 8. How to verify work

Checking that a URL returns 200 is not verification. It was done on this project
and it missed that every page was a dead end.

**Structural check** — render at 320, 360, 768, 1440, 2560 and assert:

```
document.documentElement.scrollWidth - document.documentElement.clientWidth === 0
```

plus zero console errors, zero failed requests, exactly one `<h1>`, every image
with `alt` and explicit `width`/`height`.

**Offline check** — the page must render completely with no network. Any
`https://` in a `link`, `script` or `@font-face` is a failure.

**Link check** — crawl every internal link from every page and assert 200.
Ignore JavaScript template strings, which look like links and are not.

**Behavioural check** — this is the one that matters. Click the real path a user
takes. For the benefits directory: search *rent*, *dental*, *suicide* and a
nonsense word, and confirm each returns something sensible. For education: home
→ domain → subject → lesson, and confirm the lesson body actually renders.

**Link rot** — the benefits directory links to 279 external sites. They decay.
Re-run `linkcheck.py` every few months. The last audit found 38 dead links and
two domains that had been taken over by unrelated third parties.

---

## 9. Traps that have already caught someone

Each of these cost real time. They are recorded so they cost nobody else.

- **A `wget` mirror of a Webflow site silently drops the stylesheet**, because it
  lives on a different CDN host. Use `--span-hosts --domains=...`.
- **That mirror also misses jQuery**, which Webflow loads from its own CDN and
  which its dropdown menus depend on. Verify a downloaded dependency against the
  integrity hash the original page published.
- **A form with no `action` attribute** works on Webflow, because their
  JavaScript intercepts it, and silently discards submissions anywhere else.
- **`[hidden]` loses to a component's `display` rule.** Add
  `[hidden]{display:none!important}` or elements you hid will show.
- **A curriculum that teaches HTML contains `</script>`.** Inlining that JSON
  into a `<script>` block ends the block early and corrupts the page. Escape
  `</` as `<\/`.
- **`srcdoc` re-parses the whole document on every hash change.** For a
  hash-routed app of any size this is fatal. Use a blob URL.
- **A Playwright frame handle goes stale** when the frame's document is
  replaced. Re-acquire it after every navigation or you will measure a dead
  document and conclude the page is broken.
- **A "free tier" can forbid commercial use.** One major host restricts its free
  plan to non-commercial personal use, which a studio site with a job posting is
  not. Another pauses *every* project on the account when one exceeds its
  allowance — including your ability to deploy a fix.

---

## 10. Verified facts

Checked against primary sources on 2026-08-07.

**Domain.** `xplabs.us`, registered 2025-05-14, expires **2027-05-14**,
registrar Gandi SAS, nameservers `a/b/c.dns.gandi.net`. Registry status is
**active** — the transfer lock has been removed.

There is no payment method on the registrar account, which means the domain
**will not auto-renew**. It lapses on its expiry date unless transferred or
renewed. This is the single most important operational fact in this document.

`.us` carries a continuing nexus requirement: the registrant must remain a US
citizen, permanent resident, or US-domiciled organisation. It is not a one-time
check, and non-compliance leads to cancellation without refund.

**Hosting plan.** Cloudflare Pages, on the free tier, from this repository.
Static assets are unmetered, there is no commercial-use restriction, and a
bandwidth bill is not possible. Custom domains and TLS are included. Subdomains
cost nothing, so one domain covers every area.

**Cost.** Roughly $6.50/year, all of it the domain. Everything else is free.

**Do not** deploy with Direct Upload. Cloudflare's own documentation states that
a project created that way cannot be switched to Git integration later — it has
to be recreated. Connect the repository from the start.

---

## 11. State at handoff

Branch `claude/github-repo-content-h574sv`, open as pull request #1 against
`main`.

Verified at handoff: six pages, 49 internal links, **zero dead**; zero horizontal
overflow at 320, 360, 768, 1440 and 2560; zero console errors; zero external
requests; 284 outbound links on the benefits directory, all carrying
`target="_blank" rel="noopener"`; 106 subject files matching the 106 subjects
declared in the education catalog.

Branches that matter: `claude/github-repo-content-h574sv` is the working branch
and pull request #1. `claude/offline-education-platform-c3u3yl` is where XP
Education was built, already merged.

**Not done.** The site has never been deployed — it has only ever run on a local
server, so treat first deployment as unproven work rather than a formality.
`levi.xplabs.us` does not exist. Nothing in section 7 is answered.
