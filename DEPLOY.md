# Publishing XP Labs websites

The four public websites use existing Git-connected Cloudflare Pages projects.
They publish plain files from `levicobra/Levi_Public` on `main`; no production
build command, package installation, or manual upload is required. Prepare and
test changes on a branch, then use the authorized pull-request and merge workflow.
A merge to `main` can deploy all four origins, so review the complete release.

This is the October 6, 2026 operating procedure. New site creation, domain
migration, and private-site configuration are not part of a routine release.
Start with [the maintenance guide](docs/website-guide.md) for editing and preview.

## Existing public projects

| Project | Production branch | Build command | Output directory | Public origin |
|---|---|---|---|---|
| `xplabs-www` | `main` | Empty | `sites/www` | [xplabs.us](https://xplabs.us/) |
| `xplabs-play` | `main` | Empty | `sites/play` | [play.xplabs.us](https://play.xplabs.us/) |
| `xplabs-learn` | `main` | Empty | `sites/learn` | [learn.xplabs.us](https://learn.xplabs.us/) |
| `xplabs-mil` | `main` | Empty | `sites/mil` | [mil.xplabs.us](https://mil.xplabs.us/) |

All four use the same public repository, with no framework preset. Retain these
projects and domains. Do not replace them with a Worker, Direct Upload project,
or Sites deployment for an ordinary edit. Do not change DNS or manufacture a new
custom-domain verification process when the existing origin is already working.

## Prepare the release

1. Confirm the current owner task, host, checkout ownership, Git remote, branch,
   and working-tree status. Follow current project routing and applicable workspace
   instructions. Preserve other work and stage only the intended release files.
2. Edit the maintained sources, not generated copies. Run the relevant generators
   listed below and inspect their diffs. No generator is required for documentation
   outside the deployed roots.
3. Preview affected origins using `python tools/preview_sites.py`. This local
   loopback server applies each site's security headers and redirect rules; it
   does not publish or alter site files.
4. Complete responsive, accessibility, offline, CSP, asset, link, and behavioral
   checks in the maintenance guide. Record actual results and any untested cases.
5. Commit and push the task branch, create or update its PR, review available
   checks, then merge the scoped change when ready. Standing release authority
   covers this workflow without repeating approval. Stop for genuinely missing
   authority or a materially different destructive operation.

Run only the commands relevant to the edited sources, from the repository root:

```sh
# Company header and footer only
python tools/sync_nav.py

# Shared education and military navigation, then both generated outputs
python tools/sync_satellite_nav.py
python sites/mil/gen_directory.py
python sites/learn/tools/validate_content.py
python sites/learn/tools/build_index.py

# Basic change hygiene
git diff --check
```

For military-only changes, run its generator. For any education change, run its
validator and index/cache generator. If a generator reports an error, stop that
release and fix the cause; do not commit a partial or stale generated output.

## Verify the deployed release

Check the Pages deployment outcome and deployed commit for all four projects,
then use the affected real origins. Keep deployment metadata and feature
verification separate: neither a green build nor an HTTP 200 proves that search,
navigation, or offline lessons work.

For the October redesign, the main paths are:

- [Company](https://xplabs.us/)
- [Manufacturing](https://xplabs.us/additive-manufacturing/)
- [Aeroponics](https://xplabs.us/projects/aeroponics/)
- [Free community resources](https://xplabs.us/initiatives/)
- [About](https://xplabs.us/about/)
- [Investors](https://xplabs.us/invest/)
- [Games](https://play.xplabs.us/) and the four individual game pages
- [Education](https://learn.xplabs.us/)
- [Military resources](https://mil.xplabs.us/)

Verify these release properties:

- The changed content and images are visible, the real CSP is present, and browser
  consoles/network logs show no page errors, blocked assets, external runtime
  requests, or edge-injected analytics.
- The military searches `rent`, `dental`, `suicide`, and an unmatched term behave
  sensibly. Crisis phone/text/chat access remains visible. A 320 × 800 viewport
  reaches the search input without scrolling past a tall introductory panel.
- Education works through home → domain → subject → lesson. After its offline
  library finishes saving, a cached lesson works with the network disabled.
  A returning online client receives the new service worker/cache version.
- `https://learn.xplabs.us/sw.js` still returns a `Cache-Control` policy containing
  `no-store`. Do not apply a long cache lifetime to it.
- Main `/rf/`, `/software/`, `/consulting/`, and `/engineering/` URLs redirect
  to `/additive-manufacturing/`. The old `/military-benefits/` path redirects to
  `https://mil.xplabs.us/`. Confirm bare paths and slash paths.
- Every changed image/meta-image URL resolves to an image, not a cached HTML 404.
  Share metadata uses the intended page title, canonical URL, and local image.

Use the full width matrix for material layout/navigation changes: 320, 360, 768,
1440, and 2560 pixels. Require zero horizontal document overflow, exactly one
`h1`, useful image alternatives and explicit dimensions, keyboard focus,
usable touch controls, and the actual user interaction. Save the release's PR,
commit, affected URLs, and concrete checks; do not present historic evidence as
a fresh verification.

## Recover from a stale or broken release

Inspect the deployment log and output directory before changing infrastructure.
All projects retain their last good deployment if a new deployment fails. A
changed build setting takes effect only on a subsequent deployment.

If one image remains an old 404 after its file is present, confirm the exact
path and content type, then use the existing authorized tooling for an exact-URL
cache purge when needed. Do not use a broad purge to conceal a missing file.

For a code regression, revert the scoped release commit through the normal Git
and PR workflow, keeping related generated files together. Verify the resulting
deployment. Do not reset shared history or discard unrelated working changes.

## Ongoing public maintenance

Keep the domain renewal and account billing settings current through the existing
account. Recheck live settings rather than relying on old expiry dates or cost
estimates in historical notes.

External benefits links and program terms change independently of this website.
Keep an explicit audit date and inspect redirects and provider identity, not just
status codes. The legacy `sites/mil/linkcheck.py` still contains old scratchpad
paths and disables TLS verification; it needs a scoped repair/review before use
as a current auditor. The October visual redesign does not certify all outbound
links or reset their last-audit date.

The private-site notes below are preserved for historical context. They do not
authorize public-site work to change private infrastructure; route private
projects to their own current instructions.

## The two private subdomains

`levi.xplabs.us` and `colby.xplabs.us` are **not** deployed from this repo and
must not be. Each has its own private repository.

### `colby.xplabs.us` — family genealogy

Repo `levicobra/colby-fager-genealogy`. **It is a Cloudflare WORKER, not Pages.**
The app is a vinext (Next.js on Vite) build whose entry point is
`worker/index.ts`, so there is no directory of finished files to publish — they
only exist after the build runs.

| Setting | Value |
|---|---|
| Root directory | `fresh_rebuild/06_family_tree_html` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| `NODE_VERSION` build variable | `22.13.0` |

It needs **R2 enabled on the account** and a bucket named exactly
`colby-family-media`. The 1,955 media files (~1.5 GB) are Git-LFS tracked and
are served from R2, never from the deployed assets — `worker/index.ts` explains
why at length. `npm run media:upload` populates the bucket.

The password gate lives in `worker/index.ts`. It does **not** use
`subdomain-starter/`, which is Pages Functions middleware and does not run in a
Worker. Its secrets are `SITE_PASSWORD` and `GATE_SECRET`; it fails closed if
either is missing.

### `levi.xplabs.us` — personal dashboard

Repo `levicobra/Levi_Priv`, a Pages project (empty build command, output
directory `.`), gated by **Cloudflare Access**. It needs D1 with `schema.sql`
applied, an R2 bucket, and the secrets listed in that repo's `DEPLOY.md`.

**Set the bindings, secrets and Access application up BEFORE attaching the
custom domain.** Between attaching the domain and configuring Access, the
dashboard is reachable by anyone who knows the address.

Three traps that apply to both:

1. The Pages **"Enable access policy"** toggle protects preview deployments
   only, not your production custom domain. Flipping it and seeing a login
   screen on a `pages.dev` URL proves nothing about the real subdomain.
2. **A second Access application must cover the `*.pages.dev` hostnames**, or
   disable preview deployments entirely. Otherwise there is a wide-open second
   front door to the same D1 and R2.
3. Whatever gates the site does not gate the repository. Both repos stay
   private regardless — the genealogy one holds records of living relatives.

---

## Traps that have already bitten this project

Each of these cost real time. They are written down so they cost it once.

**A 404 can be cached for a week.** `_headers` rules match by path, not by
whether the file exists. `sites/play/_headers` sets `/*.png` to
`max-age=604800`; `/logo.png` was requested before the file was committed, the
404 fallback page was served *with that seven-day cache header applied*, and the
edge then served stale HTML for `/logo.png` for a week — through several
redeploys, because redeploying does not purge the edge. If an asset 404s and
then keeps 404ing after you add it, **purge that URL** (Caching → Purge Custom
URL). Adding the file is not enough.

**Editing anything under `sites/learn/` means re-running its build script.**
`sw.js` derives both its precache list and `VERSION` from the content, and
`VERSION` is the cache name. The `activate` handler only deletes caches whose
name differs from the current one — so if you change a file and leave `VERSION`
alone, the old cache can never be evicted and every returning visitor is served
the pre-edit shell forever. Always finish with:

```sh
cd sites/learn && python tools/build_index.py
```

**Changing a Cloudflare build setting does not rebuild anything.** Settings
apply to the *next* deployment. After changing an output directory or a build
command, go to Deployments and hit Retry, or nothing happens and the old build
keeps serving.

**A Pages project whose output directory no longer exists keeps serving the
last good build.** It does not go down — it silently freezes. `sites/game` was
renamed to `sites/play` and `xplabs-play` served a stale site for hours looking
perfectly healthy. If a site looks unchanged after a push, check the build log
before you check anything else.

**Cloudflare Web Analytics injects a third-party script at the edge.** It is not
in this repository and it will not show up in a grep. Every origin here promises
zero external requests and no trackers, and the CSP blocks the beacon anyway, so
it achieves nothing but a console error. Keep automatic setup off for the zone.
