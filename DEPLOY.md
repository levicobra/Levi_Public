# Deploying xplabs.us

Four public origins, four Cloudflare Pages projects, one GitHub repository.
No build step anywhere — every site is plain files, so Pages just publishes a
directory.

**Connect the repo to Cloudflare rather than uploading anything by hand.** Once
it is connected, every push to `main` deploys itself, and there is no API token
to create, store, or leak. That is also the only route that keeps working when
nobody is around to run a command.

---

## Before you start

- `xplabs.us` must be an active zone in the same Cloudflare account. If the
  registrar transfer is still in flight, the zone can be added and the sites
  built now; only the custom-domain step at the end needs the zone live.
- The work must be on `main`. Pages deploys a branch, and pointing production
  at a feature branch is a trap you will forget about.

---

## 1. Create the four projects

For each row below: **Workers & Pages → Create → Pages → Connect to Git**,
choose `levicobra/Levi_Public`, then set:

| Project name | Production branch | Framework preset | Build command | Build output directory |
|---|---|---|---|---|
| `xplabs-www` | `main` | None | *(leave empty)* | `sites/www` |
| `xplabs-play` | `main` | None | *(leave empty)* | `sites/play` |
| `xplabs-learn` | `main` | None | *(leave empty)* | `sites/learn` |
| `xplabs-mil` | `main` | None | *(leave empty)* | `sites/mil` |

All four point at the same repository and differ only in the output directory.

**Create Pages projects, not Workers.** The dashboard pushes Workers first; the
Pages flow is a separate tab. A Workers project built from the default template
answers every path with `Hello world` at 200, `_headers` is ignored, and no
`pages.dev` hostname is issued. If there is no `pages.dev` URL, it is not Pages.

**Leave the build command genuinely empty.** If you let it default to something
like `npm run build`, the deploy fails — there is no `package.json`, by design.

Each project gets a `<name>.pages.dev` URL immediately. Check all four render
before touching DNS; a broken site on `pages.dev` is a broken site on the real
domain, and it is much easier to diagnose before the domain is involved.

---

## 2. Attach the custom domains

Per project: **Custom domains → Set up a custom domain**.

| Project | Domain |
|---|---|
| `xplabs-www` | `xplabs.us` |
| `xplabs-play` | `play.xplabs.us` |
| `xplabs-learn` | `learn.xplabs.us` |
| `xplabs-mil` | `mil.xplabs.us` |

Because the zone is in the same account, Cloudflare writes the DNS records
itself. Nothing to add by hand.

If you also want `www.xplabs.us`, add it to `xplabs-www` as a second custom
domain — do not point it at a different project.

---

## 3. Verify

Not "does it return 200." This project has already shipped a page where every
link was a dead end and every check passed.

```sh
for u in https://xplabs.us/ https://xplabs.us/consulting/ \
         https://xplabs.us/initiatives/ \
         https://xplabs.us/about/ https://xplabs.us/invest/ \
         https://mil.xplabs.us/ \
         https://play.xplabs.us/ https://learn.xplabs.us/; do
  printf '%s  ' "$(curl -s -o /dev/null -w '%{http_code}' "$u")"; echo "$u"
done
```

All seven must be 200. Then check the things a status code cannot tell you:

```sh
# The headers actually applied
curl -sI https://xplabs.us/ | grep -i 'content-security-policy\|strict-transport'

# The service worker is not being cached — if it is, learn can never update
curl -sI https://learn.xplabs.us/sw.js | grep -i cache-control   # expect no-store

# The old benefits path still lands, since it is in print and in bookmarks
curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}\n' \
  https://xplabs.us/military-benefits/          # expect 301 -> https://mil.xplabs.us/

# The share images exist, since a missing one is invisible until someone posts a link
for u in https://xplabs.us/og.jpg https://play.xplabs.us/og.jpg \
         https://learn.xplabs.us/og.jpg https://mil.xplabs.us/og.jpg; do
  printf '%s  ' "$(curl -s -o /dev/null -w '%{http_code}' "$u")"; echo "$u"
done
```

And open `learn.xplabs.us` in a browser, click into a subject, then a lesson.
The education site is a JavaScript app; it is the one that can return 200 on
every URL and still be broken.

---

## 4. After it is live

- **Set a billing notification on the account.** Everything here is inside the
  free tier by two or more orders of magnitude, but a notification is what turns
  a surprise into a warning.
- **Re-run the link audit periodically.** `sites/mil/linkcheck.py`.
  38 links were dead when this started; they will rot again.
- **The domain expires 2027-05-14.** Confirm auto-renew is on now that the
  registrar is Cloudflare, and that a payment method is attached.

---

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
