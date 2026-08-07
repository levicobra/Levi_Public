# Subdomain starter — password gate for Cloudflare Pages

Reusable scaffolding for `levi.xplabs.us` and `colby.xplabs.us`. Copy these into
each subdomain's own **private** repository — they are kept here so they are not
lost, not because they belong to this repo.

## Files

| File | Purpose |
|---|---|
| `functions/_middleware.js` | HTTP Basic Auth on every request. Fail-closed. |
| `gitignore-template` | Rename to `.gitignore`. Blocks raw GEDCOM and scans. |

## Setting the password

The password is **not** in these files. It lives in the Cloudflare dashboard:

1. Workers & Pages → your project → **Settings**
2. **Variables and Secrets** → Add variable → type **Secret** (not Plaintext)
3. Add `AUTH_USER` and `AUTH_PASS`
4. Redeploy once for the secrets to take effect

Changing the password later is a dashboard edit — no code change.

## Verify the gate before sharing the link

```sh
curl -sI https://SUBDOMAIN.xplabs.us | head -1              # expect 401
curl -sI -u 'USER:PASS' https://SUBDOMAIN.xplabs.us | head -1   # expect 200
```

If the first returns 200 the gate is not active. Do not send anyone the link.

## Do not rely on the Pages "Enable access policy" toggle

It protects **preview deployments only**, not the production custom domain.
Protecting the real subdomain requires a Zero Trust Access application created
against that hostname, or the middleware here.
