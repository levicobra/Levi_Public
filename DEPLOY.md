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
for u in https://xplabs.us/ https://xplabs.us/engineering/ \
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
must not be. Each belongs in its own private repository:

- `colby.xplabs.us` — family genealogy, gated by the PIN middleware in
  `subdomain-starter/`. Follow that README; the gate needs two secrets and a KV
  binding, and it fails closed until all three exist.
- `levi.xplabs.us` — personal dashboard, gated by **Cloudflare Access**, not the
  PIN gate. See `docs/levi-dashboard-architecture.md`.

Two traps that apply to both:

1. The Pages **"Enable access policy"** toggle protects preview deployments
   only, not your production custom domain. Flipping it and seeing a login
   screen on a `pages.dev` URL proves nothing about the real subdomain.
2. Whatever gates the site does not gate the repository. Both repos stay
   private regardless.
