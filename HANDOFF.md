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
> The source is the `sites/` directory. It is **three separate origins**, each a
> deployable root: `sites/www` → `xplabs.us`, `sites/game` → `game.xplabs.us`,
> `sites/learn` → `learn.xplabs.us`. Each needs its own Cloudflare Pages project.
>
> Everything is on `main`; there is no work sitting on another branch.
>
> Read `HANDOFF.md` in the repository root first. It describes what exists, the
> rules the codebase follows, the facts that have been verified, and the
> decisions still open. Follow the constraints in section 6 — they are not
> stylistic preferences, they are the reason the site still works. `DEPLOY.md`
> covers publishing.
>
> Each origin has a `_headers` file carrying a strict Content-Security-Policy.
> If something you add stops working, check for a CSP violation in the console
> before assuming the code is wrong — and if the fix is to loosen the policy,
> that is a signal the addition does not belong here.
>
> Live areas: four pages on `xplabs.us`, a games catalog on `game.xplabs.us`, and
> a self-contained offline learning app on `learn.xplabs.us`. Two further private
> subdomains (`levi.` and `colby.`, section 5) do not exist yet.
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

Six origins, all on the one domain. Subdomains are free, so this costs nothing
extra — but each is a **separate Cloudflare Pages project**.

| Origin | Source | What it is | Status |
|---|---|---|---|
| `xplabs.us` | `sites/www` | Hub, engineering, personal | Built |
| `game.xplabs.us` | `sites/game` | Games catalog — all four titles, equal depth | Built |
| `learn.xplabs.us` | `sites/learn` | XP Education — 106 subjects, 14 domains | Built |
| `mil.xplabs.us` | `sites/mil` | Military benefits — 279 resources, 13 categories | Built |
| `levi.xplabs.us` | — | Private personal dashboard (section 5) | **Not built** |
| `colby.xplabs.us` | — | Private family ancestry tree (section 5) | **Not built** |

The benefits directory used to live at `xplabs.us/military-benefits/`. It is its
own origin now; `sites/www/_redirects` 301s the old path so existing links and
anything already in print still land.

**Cross-origin links must be absolute.** Within an origin they stay relative; a
link from `xplabs.us` to the catalog is `https://game.xplabs.us/`, not `/games/`.
The nav on every page follows this rule — if you add a page, match it.

The four games are **The Last Station** (Unreal Engine 5, mobile),
**Space Glyph** (Swift 6 / SpriteKit, iPhone), **Life XP** (SwiftUI / SceneKit,
iPhone) and **Hearth & Hunt** (Roblox). Their source repositories are private
and are not part of this handoff. The site describes them; it does not contain
them.

---

## 3. Repository layout

```
HANDOFF.md                        this file
DEPLOY.md                         how the three origins get published
README.md                         GitHub profile-facing summary
archive/                          not deployed — nothing here is served
  servestuff-webflow-mirror/      the Webflow site this replaced
  xplabs-chatgpt-site-original.html
  game-art-src/                   full-resolution PNG masters; game-art/ WebP
                                  are lossy derivatives of these
docs/                             design records
  levi-dashboard-architecture.md  recommended build for levi.xplabs.us
subdomain-starter/                PIN gate for colby.xplabs.us
  functions/_middleware.js        the gate — covers every route
  test/middleware.test.mjs        63 checks, plain Node, no install
  gitignore-template
                                  (copy into its own private repo; not deployed)
sites/
  www/                            -> xplabs.us
    index.html                    hub
    engineering/index.html        how things are built, consulting
    personal/index.html
    _headers                      CSP, HSTS, cache policy
    _redirects                    301s the old /military-benefits/ path to mil.
    favicon-32.png  favicon.ico  apple-touch-icon.png
    og.jpg  robots.txt  sitemap.xml
  mil/                            -> mil.xplabs.us
    index.html                    GENERATED — do not hand-edit
    directory_template.html       edit this
    gen_directory.py              then run this
    data.json                     the 279 resources
    linkcheck.py                  link rot auditor
    LINK-AUDIT.md                 what the last run found
    _headers
    favicon.svg  favicon-32.png  favicon.ico  apple-touch-icon.png
    og.jpg  robots.txt  sitemap.xml
  game/                           -> game.xplabs.us
    index.html                    catalog — all four titles
    game-art/                     WebP, production
    _headers
    favicon-32.png  favicon.ico  apple-touch-icon.png
    og.jpg  robots.txt  sitemap.xml
  learn/                          -> learn.xplabs.us
    index.html  css/  js/  content/  icons/
    tools/gen_og.py               regenerates og.jpg from the catalog
    tools/build_index.py  tools/gen_catalog.py  tools/validate_content.py
    sw.js  manifest.webmanifest   PWA; scope is the whole origin
    _headers                      note: sw.js must stay no-store
    og.jpg  robots.txt  sitemap.xml
```

Each of `www`, `game` and `learn` is a Cloudflare Pages project whose **build
output directory** is that folder, with an empty build command. One repository,
three projects. `DEPLOY.md` has the settings.

**`_headers` is part of the deployable root and must stay there.** It is where
the Content-Security-Policy lives. The policy is close to pure `'self'` with
nothing allowlisted, which these sites can afford because they make no external
requests — if a rule ever has to be loosened to make something work, that is the
signal something was added that does not belong here.

**Nothing outside `sites/` is deployed.** Pages uploads the whole output
directory, so anything placed inside one of those three folders is published,
whatever the documentation says about it. Art masters lived in `sites/game/` for
a while, described as "not deployed"; they would have shipped.

---

## 4. The two generated areas

Most pages are plain HTML you edit directly. Two are not.

### Military benefits

`sites/mil/index.html` is **generated**. Editing it directly will be
overwritten. The real sources are:

- `directory_template.html` — layout, styles, and the search implementation
- `data.json` — the 279 resources, grouped into 13 categories
- `gen_directory.py` — combines them

```sh
cd sites/mil && python3 gen_directory.py
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

`sites/learn/` is a self-contained single-page app, and now owns a whole origin
— its service worker and manifest scope are `/`, which is simpler than the
`/education/` sub-path it used to live under. It has its own pipeline:

```sh
cd sites/learn
python3 tools/validate_content.py && python3 tools/build_index.py
```

`build_index.py` regenerates the search index and stamps the service worker with
a content hash, which is how deployed clients pick up new content. Run it after
any content change. The markers it writes between are generated — never edit
them by hand.

XP Education was built on the branch **`claude/offline-education-platform-c3u3yl`**
and merged into the working branch. That branch is the origin of every file under
`sites/learn/`; its history is worth reading before making structural changes,
because the content pipeline and the service worker were developed together.

Content lives in `content/subjects/<id>.json`, one file per subject, indexed by
`content/catalog.json`. College subjects follow the scope and sequence of
OpenStax open textbooks (CC BY 4.0) with attribution and a link to the free book
on every subject page. Keep that attribution.

---

## 5. The two subdomains (not built)

Two private subdomains are planned. Neither exists yet, and neither is part of
the public site. This section is the brief for both.

Subdomains are free on the hosting plan in section 10 — no new domain, no new
bill. Give each its own Cloudflare Pages project and its own **private**
repository.

### Both of them: how to gate a subdomain

The two subdomains want different answers, and the deciding factor is who is on
the other side. Do not pick one mechanism for both.

- **`levi.xplabs.us` → Cloudflare Access** (Zero Trust), Cloudflare as the
  identity provider, with a hardware security key on the Cloudflare account.
  One user, who already has that account. No login form, no session table, no
  password comparison in the code at all. **Do not enable one-time PIN on this
  policy** — it makes his email inbox the credential.
- **`colby.xplabs.us` → the PIN gate in `subdomain-starter/`.** A group of
  relatives who will not create accounts and who need one code that can be
  texted to them. Access would mean issuing every relative an identity; a
  shared code is the right shape for a family archive.

Basic Auth was the earlier choice for both and was replaced. The browser
credential box reads like an error to anyone non-technical, cannot be styled or
explained, and offers no way to sign out.

Four traps, in order of how badly they bite:

1. **The gate must cover the data, not just the pages.** This is the one that
   actually loses the archive. Gate `/index.html` and leave `/data/tree.json`
   and `/media/*` open and the entire dataset is readable by anyone who guesses
   a URL — the pages are protected and the thing they display is not.
2. **Cloudflare Pages has an "Enable access policy" toggle in project settings.
   It protects preview deployments only — not your production custom domain.**
   Cloudflare's own documentation says so plainly. Flip it, see a login screen
   on a preview URL, assume you are protected, and the real subdomain is open to
   the world. You must create a Zero Trust Access application against the custom
   domain itself.
3. **Whatever gates the site does not gate the repository.** A public repo with
   the generated pages in it is readable by anyone regardless of any password.
   Both repositories must be private.
4. **Fail closed.** If the credentials or configuration are missing, serve an
   error. Never fall through to serving the content.

Verify the gate before sharing any link — and verify the *data*, not the front
page, because trap 1 is invisible from the front page:

```sh
curl -s https://<subdomain>.xplabs.us/ | grep -c 'Access code'   # expect 1
curl -s -o /dev/null -w '%{http_code}\n' https://<subdomain>.xplabs.us/data/tree.json   # expect 401
curl -s -o /dev/null -w '%{http_code}\n' https://<subdomain>.xplabs.us/media/any.jpg    # expect 401
```

If a data or media URL returns 200 without a cookie, the gate is not covering
it. Stop.

### `levi.xplabs.us` — personal dashboard

A private dashboard for the owner's own use.

**Use Cloudflare Access here, not the PIN gate** — the two subdomains want
different answers, and the difference is who is on the other side.

`colby.xplabs.us` is a group of relatives who will not create accounts and who
need one code the owner can text them. A shared PIN is genuinely the right shape
for that.

`levi.xplabs.us` has exactly one user, who already has a Cloudflare account.
Access with Cloudflare as the identity provider means there is **no login form,
no session table, and no password comparison anywhere in the code** — the whole
category of bug the PIN gate has to be tested against stops existing, and a
hardware security key on the Cloudflare account protects it far better than any
string he would actually be willing to type. Do not enable one-time PIN on the
Access policy; that makes his email inbox the credential.

Add in-Worker verification of the `Cf-Access-Jwt-Assertion` header as a
backstop, and put Access on the `*.pages.dev` hostnames too — an unprotected
preview URL is a second front door to the same D1 and R2 bindings.

A full architecture — storage model, encryption envelope, recurrence handling,
document upload, cost analysis against the free tier, and the build order — is
in **`docs/levi-dashboard-architecture.md`**. It is a recommendation, not a
decision; its section 9 lists six questions only the owner can answer, the first
of which changes the whole design.

**What it contains** — specified by the owner:

- A **calendar**, with events he can add, edit and delete, including **repeating
  events**.
- To the right of the calendar, **upcoming events**, colour-coded by imminence
  and priority.
- Above that list, a **task list**. Any event can have a task assigned to it.
- A second page with **three subpages — Personal, Work, XPLabs.** Each is its own
  view and shows the tasks assigned under its label.
- An **important documents** page that accepts uploaded files.

It "must be encrypted well."

**What that requirement actually decides.** This is the one architectural fork,
and it should be settled before any code is written, because retrofitting is a
data migration rather than an edit:

- **Zero-knowledge** — the browser encrypts with a key derived from a passphrase
  that never leaves the device; the server stores ciphertext it cannot read.
  Strongest, and it means a breach of the host yields nothing. Costs: no
  server-side search or recurrence expansion, no password reset (a forgotten
  passphrase is unrecoverable data loss), and document upload has to encrypt
  client-side before it goes anywhere.
- **Server-side encryption at rest** — encrypted in storage, decrypted by the
  Worker to serve. Far easier to build and to live with; recoverable. But
  anything that compromises the Worker or its secrets reads everything.

Pick deliberately. The phrase "encrypted well" reads as the first, and the first
is the one whose costs surface late — a passphrase lost in year two takes the
archive with it.

**Storage.** This is not a static site — it takes writes. Events, tasks and
document metadata belong in **D1**; uploaded files belong in **R2**, served only
through the gated Worker. Do not put documents in the repository.

**Recurrence.** Store the rule, not the instances. Materializing every occurrence
of a repeating event makes "edit this one" and "edit all future" nearly
impossible to get right later. RFC 5545 `RRULE` is the well-trodden path, with an
exception list for occurrences that were individually changed or deleted.

### `colby.xplabs.us` — family ancestry tree

A genealogy site for the owner's family, generated from a **GEDCOM** export. The
repository will be supplied separately.

**This one has a privacy problem the dashboard does not.** A GEDCOM contains full
legal names, dates of birth, birthplaces and family relationships for **living**
people. That combination is the answer key to most bank security questions, and
those relatives did not consent to publication. A public genealogy site is
indexed and scraped within days.

**The owner has decided the site shows the full tree, with no redacted or
privatized version.** It is family-only, behind an access code. That decision
was made explicitly and with the privacy consequence stated; do not quietly
reintroduce a "hide living people" mode as though it were an oversight.

What that decision moves rather than removes: **the access code is now the only
thing protecting living relatives' data.** There is no second layer behind it.
That raises the bar on the gate itself, in two specific ways:

- **The code has to be long.** Four digits is ten thousand guesses. Ten or more
  characters. It is typed once per device per month, so length costs the family
  almost nothing and is the only real defence against a distributed guesser.
- **The gate has to cover every route** — trap 1 above. With no redaction, an
  ungated `tree.json` is not a partial leak, it is the whole archive.

So, three requirements that are not negotiable:

1. **The site is gated on every route** — HTML, JSON and media alike. Family
   only. One access code the owner can text to relatives, no accounts for
   anyone to create.
2. **The repository is private.** Non-negotiable for the reason in trap 3 above.
3. **The raw GEDCOM is never committed** — not even to a private repo. Gitignore
   `*.ged`, `*.gedcom`, `*.ftm`, `*.gramps` and any `raw/` or `originals/`
   directory. The published pages are a derivative; the source stays on the
   owner's machine.

Add `X-Robots-Tag: noindex, nofollow, noarchive` and `Cache-Control: no-store` to
every response as defence in depth, so that if the gate is ever misconfigured the
damage is bounded.

A working PIN-gate middleware for Cloudflare Pages — covering every route,
constant-time comparison, signed 30-day sessions, KV-backed lockout, fail-closed
behaviour and those headers — is kept in **`subdomain-starter/`** in this
repository, with a 63-check test suite that runs on plain Node and a `.gitignore`
template that blocks raw GEDCOM files. Copy it into each subdomain's own private
repo. It lives here so it does not get lost, not because it belongs to the public
site; nothing in it is deployed as part of `xplabs.us`.

**Two deployment blockers specific to this repo**, both discovered by reading it:

- Its `.gitattributes` routes `*.jpg`, `*.pdf`, `*.rmtree` and `*.zip` through
  **Git LFS**, and Cloudflare Pages builds do not fetch LFS objects. Every image
  would deploy as a pointer file.
- Roughly **1.5 GB of media** against a 25 MiB per-file Pages limit and a
  20-minute build timeout. The media has to move to **R2**, served through the
  same gated Worker — not straight from a public bucket, or it bypasses the gate
  entirely.

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
| 1 | **Platform claim for The Last Station.** `README.md` used to say iOS, Nintendo Switch and Switch 2; the game's own design documentation says Unreal Engine 5 mobile, Android live and iOS pending, with Switch appearing nowhere. The README now matches the design docs rather than repeating an unverified console claim. **If the console launch is real, the games catalog needs updating too — not just the README.** | A factual claim on a public marketing page, with two sources disagreeing. Only the owner knows which is true. |
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

**Asset-reference check** — walk every `href`, `src`, manifest icon and image
meta tag and resolve it against the files that actually ship. This catches the
failure a link check cannot: a reference to something that was never built. It
has caught two real ones here — four game images referenced as `.png` when only
`.webp` shipped, and an `og:image` in the meta tags with no file behind it.

Follow only the tags that carry URLs. A first attempt at this check followed
every `<meta content="...">` and reported 48 false positives, because viewport
strings and page descriptions look like paths.

**CSP check** — serve each origin with its own `_headers` applied and load it in
a real browser, listening for `securitypolicyviolation`. A Content-Security-Policy
does not fail loudly; it silently declines to run something. Reasoning about the
policy is not the same as running it.

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
- **A comment saying "not deployed" does not stop a file being deployed.** Pages
  uploads the entire build output directory. 7.2 MB of full-resolution art
  masters sat inside `sites/game/` labelled "(not deployed)" and would have been
  published on the first deploy. If it must not ship, it cannot live under
  `sites/`.
- **`SameSite=Strict` drops the cookie on arrival from an external link.** A
  session cookie set Strict is withheld when someone clicks through from a text
  message or an email — which is how most people reach a link you sent them. It
  looks like the login is broken, or worse, like it silently forgot them. `Lax`
  still blocks the cross-site POST that matters.
- **A cached service worker is a site that can never be updated.** Give `sw.js`
  any `max-age` and readers stay pinned to whatever version they first
  installed, with no way to reach them. It must be `no-store`.

---

## 10. Verified facts

Checked against primary sources on 2026-08-07.

**Domain.** `xplabs.us`, registered 2025-05-14. Held at Gandi SAS for most of
this project's life, with nameservers `a/b/c.dns.gandi.net` and no payment
method on file — which meant it would not have auto-renewed.

**The owner has since transferred it to Cloudflare Registrar and paid for a
further year.** At the time of writing the transfer was still completing, so the
following need confirming once it lands, in the Cloudflare dashboard rather than
from this file:

- the new expiry date (a transfer normally adds a year to the existing one);
- that auto-renew is on and a payment method is attached;
- that the nameservers have moved off Gandi.

The lapse risk that dominated earlier versions of this document is the thing
that transfer was meant to remove. Verify it actually did.

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

**Everything is on `main`.** Pull request #1 was merged; the working branch
`claude/github-repo-content-h574sv` is spent. `claude/offline-education-platform-c3u3yl`
is where XP Education was built and is already merged. There is no work sitting
outside `main`.

### Verified

- Three origins each rendering standalone; zero horizontal overflow at 320, 360,
  768, 1440 and 2560 on every page; zero console errors; zero failed requests.
- Every `href`, `src`, manifest icon and image meta tag across all three roots
  resolved against the files that actually ship — 60 references, all resolve.
- Each origin served locally under its own `_headers` and loaded in Chromium:
  six pages, **zero CSP violations**. Then the education app walked the way a
  reader walks it — home → Languages → American Sign Language → lesson, 4,662
  characters rendered — because hash routing under a strict CSP is exactly where
  this breaks quietly.
- The PIN gate: 63 checks, all passing.
- 284 outbound links on the benefits directory, all carrying `target="_blank"
  rel="noopener"`; 106 subject files matching the 106 subjects the catalog
  declares.

### Not done

- **The site has never been deployed.** It has only ever run on a local server.
  Treat first deployment as unproven work, not a formality. `DEPLOY.md`.
- Neither `levi.xplabs.us` nor `colby.xplabs.us` exists.
- Nothing in section 7 is answered.

### Tooling notes for whoever picks this up

The Cloudflare skills and MCP servers are installed per Cloudflare's official
setup instructions at `developers.cloudflare.com/agent-setup/prompt.md`. Of the
five servers, only `cloudflare-docs` works without authentication; the four that
touch the account (`cloudflare-api`, `bindings`, `builds`, `observability`)
need an interactive OAuth login and are unavailable in a headless session.
**No agent has ever had write access to this Cloudflare account.** Every
dashboard step in `DEPLOY.md` is written to be done by a person, because that is
the only way it has been possible.

Do not paste an API token into a chat session to work around this. Connect the
repository to Pages instead — it needs no token at all, and it is what
`DEPLOY.md` describes.
