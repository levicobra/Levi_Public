# Subdomain starter — PIN gate for Cloudflare Pages

Reusable scaffolding for `levi.xplabs.us` and `colby.xplabs.us`. Copy these into
each subdomain's own **private** repository — they are kept here so they are not
lost, not because they belong to this repo.

## Files

| File | Purpose |
|---|---|
| `functions/_middleware.js` | PIN gate on every request — pages, JSON and media alike. Fail-closed. |
| `test/middleware.test.mjs` | 63 checks against the gate. Runs on plain Node, no install. |
| `gitignore-template` | Rename to `.gitignore`. Blocks raw GEDCOM and scans. |

## Why a PIN page and not Basic Auth

Basic Auth shows an OS credential box that reads like an error to anyone who
isn't technical, cannot be styled or explained, and gives no way to sign out.
The gate here is an ordinary web page with one field, so the archive can say
what it is and who it's for before asking for anything.

It covers **every** route, not just the HTML. A gate over the pages alone would
leave the JSON and the scans readable to anyone who guessed a URL, which on a
genealogy site is the entire dataset.

## Setup

Nothing secret is in these files. Both values live in the Cloudflare dashboard:

1. Workers & Pages → your project → **Settings**
2. **Variables and Secrets** → Add variable → type **Secret** (not Plaintext)
   - `ACCESS_PIN` — the code you give the family
   - `COOKIE_SECRET` — a long random string, unrelated to the PIN
3. **Settings → Functions → KV namespace bindings** → bind one as `RATE`
   (this is what locks out brute-force guessing)
4. Redeploy once for all three to take effect

Generate the cookie secret with something like:

```sh
openssl rand -base64 48
```

### On the length of the PIN

Four digits is ten thousand guesses. Even with the rate limit that is a short
afternoon for a script, and the data behind this gate includes living people.
**Use at least ten characters.** It is typed once per device per month, so
length costs the family almost nothing.

## Sessions

A correct PIN sets a signed, `HttpOnly`, `Secure` cookie good for 30 days.

- **Sign out one device** — visit `/__auth/logout` on it.
- **Sign out everyone** — change `COOKIE_SECRET` in the dashboard. Every
  existing session stops validating immediately. This is also how you rotate
  a PIN that has been shared too widely.

Deep links survive the gate: someone who opens a link to a specific person is
returned to that page after entering the code, not dumped at the front door.

## Run the tests

```sh
node test/middleware.test.mjs
```

No dependencies and no install — it drives the middleware with the same
`Request`, `Response` and `crypto.subtle` the Workers runtime provides. It
covers the fail-closed paths, cookie forgery and expiry-extension, the
brute-force lockout, open-redirect attempts through the return-path field, and
that JSON and media routes are gated rather than just the pages.

## Verify the live gate before sharing the link

Checking that the front page asks for a PIN is **not** enough. Check the data:

```sh
# The pages
curl -s -o /dev/null -w '%{http_code}\n' https://SUBDOMAIN.xplabs.us/
# expect 200 — but it is the PIN page, so also confirm it is not the archive:
curl -s https://SUBDOMAIN.xplabs.us/ | grep -c 'Access code'   # expect 1

# The data underneath — this is the one that matters
curl -s -o /dev/null -w '%{http_code}\n' https://SUBDOMAIN.xplabs.us/data/tree.json
curl -s -o /dev/null -w '%{http_code}\n' https://SUBDOMAIN.xplabs.us/media/any-file.jpg
# expect 401 for both
```

If a data or media URL returns 200 without a cookie, the gate is not covering
it. Do not send anyone the link until it does.

## Do not rely on the Pages "Enable access policy" toggle

It protects **preview deployments only**, not the production custom domain.
Protecting the real subdomain requires a Zero Trust Access application created
against that hostname, or the middleware here.

## What this does not do

It does not stop someone who has the PIN from passing it on, and it does not
protect files a family member has already downloaded.

The rate limit is per-IP, which stops one machine grinding through guesses but
not an attacker spread across many addresses; KV's eventual consistency means a
fast, distributed attacker may get somewhat more than the eight attempts before
the count catches up. The length of the PIN is what actually carries the
weight — the rate limit only buys time.
