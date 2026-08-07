# levi.xplabs.us — recommended architecture

> **Status: a recommendation, not a decision.** Produced by four independent
> design agents (zero-knowledge crypto, pragmatic crypto, recurrence, documents),
> each adversarially reviewed, then synthesised. **Every one of the four source
> designs was found flawed** — 25 critical defects and 44 overclaims between
> them — and the fixes are folded in and named below. Section 9 lists six
> questions only the owner can answer; question 1 changes the whole architecture.
>
> Nothing here is built. It is kept in this public repo so it is not lost, the
> same reason `subdomain-starter/` is. It contains no credentials.

Where reviewers found a critical flaw in a source design, the fix is incorporated and named.

---

## 1. THE RECOMMENDATION IN ONE PARAGRAPH

Build it as a **Cloudflare Pages project with Pages Functions**, gated by **Cloudflare Access** (Cloudflare-as-IdP, backed by a hardware security key on his Cloudflare account) — that is the "password protection," and it is stronger than anything hand-rolled because there is no login form, no session table, and no password hashing in the code at all. Structured data lives in **D1**; document bytes live in a private **R2** bucket with no public URL and no presigned URLs ever issued. Every sensitive value — event titles, notes, locations, task text, filenames, document contents — is encrypted at the application layer with **AES-GCM-256 under a single 256-bit `DATA_KEY` held as a Worker secret**, with per-record random IVs, AAD binding each ciphertext to its row and column, and a key-id byte in the envelope so the key can actually be rotated. Documents additionally get a **per-document content key**, wrapped by `DATA_KEY`, so the browser can do the bulk encryption (the 10 ms free-tier CPU limit forbids doing it in the Worker) without ever seeing the master key. The front end is **one HTML shell with hash routing plus five plain JS modules** — no npm, no build step, no framework, no external requests, exactly as the rest of the estate. This is a **server-readable** design: Cloudflare can decrypt everything, and that is a deliberate, named trade, argued in §2.

---

## 2. THE ENCRYPTION DECISION, ARGUED

### The two coherent options

**Zero-knowledge (client-side keys).** A passphrase never leaves the browser; the server moves opaque bytes. Protects against: Cloudflare reading the database, a subpoena served on Cloudflare for stored data, a leaked R2 or D1 API token, a stolen `wrangler d1 export`, an accidentally-public bucket, D1 Time Travel snapshots, and a compromise of his Cloudflare *dashboard* (for reading data).

**Server-readable (key in a Worker secret).** Protects against: a leaked R2 API token, an accidentally-public bucket, a stolen Cloudflare token scoped to D1/R2 read but not to secrets, a `wrangler d1 export` that ends up in the wrong place, the always-on 7-day D1 Time Travel snapshots, and any future read-shaped bug in his own code. Does **not** protect against Cloudflare or against full Cloudflare account compromise.

### Why server-readable wins here

**First, the zero-knowledge guarantee is narrower than it sounds, and the gap is fatal to the argument.** The JavaScript that holds the passphrase, derives the key, and decrypts every record is itself served by Cloudflare Pages, from the same Cloudflare account the threat model treats as hostile. Anyone who can deploy — Cloudflare, or anyone with his Cloudflare login — pushes one line and the next unlock exfiltrates the key. Zero-knowledge in a web app is a promise about the *database*, not about the *code*. It defends completely against a subpoena for stored data and not at all against a compelled or malicious code change. So the honest comparison is not "Cloudflare can read it" vs "Cloudflare cannot read it"; it is "Cloudflare can read it" vs "Cloudflare can read everything from the moment it decides to, and cannot read the backlog."

**Second, the cost of the remaining margin is enormous and lands entirely on a non-programmer.** Every reviewed zero-knowledge design contained data-loss-class defects: a lost-update race in the sync sequence counter, no conflict detection on push, unauthenticated tombstones that let a write-capable adversary silently wipe the vault, an anti-rollback manifest that does not work, orphaned R2 objects that can never be deleted, and — in one — a CSP that would have made the app impossible to unlock on day one. The corrected version is 4,000–6,000 lines including a sync protocol with cursors, tombstone horizons, and a client-local freshness anchor. He cannot maintain that. He cannot even tell which parts are safe to touch. Cryptographic failure in personal projects is almost always an implementation bug, not a broken primitive, and this design would be nothing but implementation.

**Third, the usability failure is predictable and self-defeating.** A high-entropy passphrase typed on a phone keyboard every time iOS Safari discards the backgrounded tab means he enables "stay unlocked on this device" within a week, at which point the threat model is "an attacker needs my phone" — and the real risk is worse: friction pushes the genuinely urgent documents into iCloud or an email to himself, where they sit in plaintext on someone else's server. A vault that is perfectly encrypted and half-used is a net loss.

**Fourth, server-readable buys back the one thing that matters most and that E2E cannot give: recoverability.** `DATA_KEY` is 32 random bytes he never has to remember. Print it, put it in a safe, put a copy in his password manager. Losing it requires losing two independent copies of a value he never types. Under zero-knowledge, one memory failure destroys eleven years of documents permanently.

### Exactly who can read his documents under this design

1. **He can**, via Access + MFA.
2. **Anyone who compromises his Cloudflare account.** Dashboard access → deploy a Worker that prints `DATA_KEY`, or read R2 directly, or query D1, or add an Access policy for their own email. There is no cryptographic barrier. **The entire design rests on one Cloudflare login. Put a hardware security key on it and register a second one.** Nothing else on this list matters as much.
3. **Cloudflare employees with production access**, subject to Cloudflare's SOC 2 / ISO 27001 controls. The key, the rows, and the objects are all inside Cloudflare's trust boundary.
4. **Anyone Cloudflare is legally compelled to serve.** A warrant produces plaintext. This is the one property a true end-to-end design would have removed, and it is the one thing being given up.
5. **Anyone with a device holding a live Access session** — bounded by the 24-hour application session and the `CF_Binding` cookie.

Everyone else — a random internet user, a passive network observer, another Cloudflare customer, someone holding only a D1 export or a Time Travel snapshot, someone holding only the R2 bucket contents, someone who found the document URL — gets ciphertext or an Access login page.

### One thing that must never be built

**There must be no endpoint that returns `DATA_KEY` to the browser.** One of the reviewed designs had `GET /api/key`; that converts a bounded 24-hour session compromise into permanent, offline, retroactive decryption of every past and future record. Documents use a per-document content key instead (§5). Write this into the repo as a forbidden change.

---

## 3. ARCHITECTURE

### Components

```
levi.xplabs.us
  └── Cloudflare Access (self-hosted app, path *, Cloudflare IdP, hardware key)
        └── Cloudflare Pages project
              ├── static: index.html + app.js cal.js rrule.js tz.js ui.js + _headers
              └── functions/
                    ├── _middleware.js        ← ROOT. Auth + CSRF + headers for EVERY request
                    └── api/…                 ← thin CRUD
                          ├── D1  (structured data, encrypted fields)
                          └── R2  (document ciphertext, private, no public URL)

levi-backup-cron (separate Worker, Cron Trigger 03:00 daily)
  → reads D1 rows VERBATIM (ciphertext untouched, no DATA_KEY binding)
  → writes to R2 bucket `levi-backups`, plus incremental copy of new document objects
```

Two notes that are load-bearing:

- **The middleware lives at `functions/_middleware.js`, at the root — not `functions/api/_middleware.js`.** A directory-scoped middleware does not run for `index.html`, so the CSP would be attached to JSON responses and absent from the one document where it matters. Do not add `_routes.json` exclusions for static assets; at one user, 50 extra Function invocations a day against 100,000 is not worth the bug. Ship a `_headers` file as well, so the CSP survives even if Pages serves an asset without invoking Functions.
- **The backup Worker has no `DATA_KEY` binding.** It copies ciphertext. A cron that calls a decrypting export path and writes plaintext JSON into R2 destroys the entire encryption layer — every "protects against a leaked R2 token" claim becomes false the moment that file exists.

### The encryption envelope

```
byte 0        version   = 0x01
byte 1        key_id    = 1, 2, …          ← makes rotation possible
bytes 2..13   iv        = 12 random bytes  ← fresh on EVERY write, never a counter
bytes 14..end AES-GCM-256 ciphertext || 16-byte tag
```

- Subkey = `HKDF-SHA256(DATA_KEY_<key_id>, salt=<fixed 16-byte per-key salt>, info="levi:v1:<table>:<column>")`, derived **once per Worker isolate and cached in a module variable** — not once per record. Per-record HKDF was in two of the source designs and it will eat the 10 ms CPU budget on a calendar read of 300 rows for no real benefit; per-record uniqueness comes from the random IV.
- `additionalData = "<table>|<row_id>|<column>|v1"`. This stops anyone with D1 write access from relocating a ciphertext between rows or columns.
- **Because the server holds the key, the server can re-encrypt when it moves a row.** This is not a small detail — it is what makes the "this and all future" series split (§4) safe. Under a zero-knowledge design, every row-copy operation produces permanently undecryptable data, because the server cannot re-derive the AAD. That flaw sank one of the reviewed designs outright.
- **Rotation:** hold `DATA_KEY_1` and `DATA_KEY_2` as separate secrets; decrypt with the `key_id` in the record, encrypt with `env.CURRENT_KEY_ID`. Without the key-id byte, changing the secret silently and permanently bricks every row in one dashboard click.

### Schema

```sql
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
-- 'schema_version', 'current_key_id'

-- ============ EVENTS ============
CREATE TABLE event_series (
  id               TEXT PRIMARY KEY,           -- UUIDv4
  category         TEXT NOT NULL CHECK (category IN ('personal','work','xplabs')),
  is_all_day       INTEGER NOT NULL DEFAULT 0 CHECK (is_all_day IN (0,1)),
  dtstart_local    TEXT NOT NULL,              -- '2026-03-09T09:00:00'  |  '2026-03-09'
  tzid             TEXT,                       -- IANA name. NULL iff is_all_day = 1
  duration_seconds INTEGER,                    -- exact.   NULL iff is_all_day = 1
  duration_days    INTEGER,                    -- nominal. NULL iff is_all_day = 0
  rrule            TEXT,                       -- NULL = single event
  until_date       TEXT,                       -- derived last local DATE; NULL = open-ended
  priority         INTEGER NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  payload_enc      BLOB NOT NULL,              -- {title, notes, location}
  split_from_id    TEXT REFERENCES event_series(id) ON DELETE SET NULL,
  split_at         TEXT,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,           -- server-set; the concurrency token
  deleted_at       INTEGER,
  CHECK (is_all_day = 0 OR (tzid IS NULL     AND duration_seconds IS NULL AND duration_days IS NOT NULL)),
  CHECK (is_all_day = 1 OR (tzid IS NOT NULL AND duration_seconds IS NOT NULL AND duration_days IS NULL))
);
CREATE INDEX idx_series_live ON event_series(deleted_at, category);

CREATE TABLE event_override (
  series_id            TEXT NOT NULL REFERENCES event_series(id) ON DELETE CASCADE,
  recurrence_date      TEXT NOT NULL,          -- LOCAL DATE of the slot the RULE generated
  new_dtstart_local    TEXT,                   -- NULL = not moved
  new_duration_seconds INTEGER,
  payload_enc          BLOB,
  overridden_fields    TEXT NOT NULL,          -- JSON array, e.g. ["title","dtstart"]
  updated_at           INTEGER NOT NULL,
  PRIMARY KEY (series_id, recurrence_date)
);

CREATE TABLE event_exception (
  series_id       TEXT NOT NULL REFERENCES event_series(id) ON DELETE CASCADE,
  recurrence_date TEXT NOT NULL,
  created_at      INTEGER NOT NULL,
  PRIMARY KEY (series_id, recurrence_date)
);

-- ============ TASKS ============
CREATE TABLE task (
  id                  TEXT PRIMARY KEY,
  category            TEXT NOT NULL CHECK (category IN ('personal','work','xplabs')),
  link_type           TEXT NOT NULL DEFAULT 'none'
                        CHECK (link_type IN ('none','series','occurrence')),
  series_id           TEXT REFERENCES event_series(id) ON DELETE SET NULL,
  recurrence_date     TEXT,
  payload_enc         BLOB NOT NULL,           -- {title, notes}
  priority            INTEGER NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  due_date            TEXT,                    -- local DATE, PLAINTEXT (must be sortable)
  sort_order          REAL NOT NULL DEFAULT 0,
  copied_from_task_id TEXT,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL,
  deleted_at          INTEGER,
  CHECK (link_type <> 'occurrence' OR (series_id IS NOT NULL AND recurrence_date IS NOT NULL)),
  CHECK (link_type <> 'none'       OR (series_id IS NULL     AND recurrence_date IS NULL))
);
CREATE INDEX idx_task_board  ON task(deleted_at, category, sort_order);
CREATE INDEX idx_task_due    ON task(deleted_at, due_date);
CREATE INDEX idx_task_series ON task(series_id, recurrence_date);

-- Completion is PER OCCURRENCE. It cannot be a boolean on the task row.
CREATE TABLE task_completion (
  task_id         TEXT NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  recurrence_date TEXT NOT NULL DEFAULT '',    -- '' for non-recurring links
  completed_at    INTEGER NOT NULL,
  PRIMARY KEY (task_id, recurrence_date)
);

-- ============ DOCUMENTS ============
CREATE TABLE document (
  id           TEXT PRIMARY KEY,
  category     TEXT NOT NULL CHECK (category IN ('personal','work','xplabs')),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready')),
  r2_key       TEXT NOT NULL UNIQUE,           -- 'doc/<uuid>'. NEVER the filename.
  cek_wrapped  BLOB NOT NULL,                  -- AES-GCM(DATA_KEY, CEK), aad='document|<id>|cek|v1'
  iv_prefix    BLOB NOT NULL,                  -- 4 bytes
  chunk_count  INTEGER,                        -- NULL until status='ready'
  size_cipher  INTEGER,
  meta_enc     BLOB NOT NULL,                  -- {filename, mime, size_plain, note}
  backed_up_at INTEGER,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  deleted_at   INTEGER
);
CREATE INDEX idx_doc_live ON document(deleted_at, category, created_at DESC);
```

**What is deliberately plaintext, and what that leaks:** `category`, `priority`, `due_date`, `dtstart_local`, `tzid`, `rrule`, `duration`, all timestamps, and `size_cipher`. Anyone with raw D1 access learns the exact shape of his week — when he is busy, how long things run, that he has 40 Work events and 3 Personal ones, which timezone he is in, that a 4 MB document was uploaded the day of a particular meeting. They learn no title, no note, no location, no filename, no byte of content. That is the trade, stated plainly. It is the price of being able to query and sort in SQL.

### Data flow

- **Read:** browser → Access (edge) → root middleware (JWT verify, CSRF, headers) → Function → D1 → Worker decrypts `*_enc` → JSON over TLS → browser renders. The browser does no cryptography except for document bytes.
- **Write:** browser → JSON → Function encrypts → `UPDATE … WHERE id = ? AND updated_at = ?` → check `meta.changes` → `409` on mismatch. **Every mutating endpoint does this compare-and-swap.** Without it, phone-edit and laptop-edit silently eat each other, and because titles are encrypted there is no server-side history showing what was lost.
- **Document bytes:** never pass through the Worker in plaintext (§5).

### Authentication, concretely

- **Access application:** self-hosted, `levi.xplabs.us`, path `*`. One Allow policy: Emails is `<owner-email>`. IdP: Cloudflare, "Restrict to account members" on. Do **not** enable one-time PIN — it makes his Gmail the credential.
- **A second Access application covering the `*.pages.dev` hostnames**, or disable preview deployments and use Direct Upload. Without this there is a wide-open second front door to the same D1 and R2 bindings.
- **Sessions:** application 24 h, global 7 days. Cookie settings: `SameSite=Lax` (not Strict — Cloudflare warns it causes redirect loops), `HttpOnly` set **explicitly**, **`CF_Binding` cookie on**.
- **In-Worker JWT verification** as an independent backstop, ~50 lines of WebCrypto, no npm. The full checklist, because a mistake here is a total auth bypass: read the `Cf-Access-Jwt-Assertion` **header** (not the cookie); **pin `alg` to RS256** and never take the algorithm from the token; select the JWK by `kid`, and **re-fetch the JWKS once with `cacheTtl: 0` on a kid miss** before rejecting (otherwise an Access key rotation locks him out for an hour with no diagnosable error); verify the signature; check `iss` equals the exact team-domain URL; check that **`aud` is an array containing** the policy AUD; check `exp` and `nbf` with 60 s skew; and check `payload.email.toLowerCase() === env.OWNER_EMAIL` with plain `===`. Do **not** use `crypto.subtle.timingSafeEqual` on the email — there is no timing oracle behind a verified signature, and it throws on unequal lengths, turning a clean 403 into a 500. Cache the JWKS with `fetch(url, { cf: { cacheTtl: 3600, cacheEverything: true } })`.
- **CSRF, on every POST/PUT/PATCH/DELETE:** require `Sec-Fetch-Site: same-origin`, require `X-Requested-With: XMLHttpRequest` (which also makes Access return a `401` instead of an HTML login redirect on session expiry), and require `Content-Type: application/json` on JSON endpoints. Emit no CORS headers, ever. Access authenticates via a cookie; a form POST from `evil.com` sails straight through it without these.
- **Never advance client state on an unparsed response.** If a fetch returns a 3xx or a body that is not JSON, it is an expired Access session serving an HTML login page. Treat it as a hard error and prompt re-login. Do not clear a pending queue on it.

### CSP (`_headers`, and re-set by the middleware for `/api/*`)

```
Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:; connect-src 'self'; frame-src blob:; object-src 'none';
  base-uri 'none'; form-action 'none'; frame-ancestors 'none'
Cache-Control: no-store
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

No `'wasm-unsafe-eval'` is needed, because there is no client-side KDF and no Argon2 WASM. (One reviewed design mandated Argon2-in-WASM and then shipped a CSP that makes WebAssembly refuse to compile — the app could not be unlocked at all in Chrome. That failure mode does not exist here.)

**One discipline rule, and it is the rule:** never use `innerHTML`. Not once, not for "just a title." He will paste text out of emails into event notes; that is untrusted input landing in his DOM. `textContent` and `document.createElement` only. **And no service worker on this origin** — the pattern exists elsewhere in the estate, works well there, and would write API responses to disk in `CacheStorage`, outside the page's control and unaffected by `Cache-Control`.

### How far the estate rule bends

**It survives:** no npm, no `node_modules`, no bundler, no transpiler, no framework, no web fonts, zero external requests at runtime. Deploy is `wrangler pages deploy .` or drag-and-drop.

**It bends in three places, all of which should be written into HANDOFF.md:**
1. There is now a `functions/` directory of server code. Keep it thin: parse, authorise, validate, encrypt/decrypt, run one `batch()`, return rows. **No recurrence logic in the Functions at all.**
2. The front end is one `index.html` shell with hash routing (`#/calendar`, `#/personal`, `#/work`, `#/xplabs`, `#/documents`) plus five shared JS modules, rather than one self-contained file per page. Inlining `rrule.js` four times guarantees the calendar disagrees with itself between pages.
3. `schema.sql` in the repo, and a second small Worker for the backup cron (Pages Functions has no Cron Triggers).

Add one more file: **`DANGER.md`**, naming the three files that are cryptography (`crypto.js`, `_middleware.js`, `rrule.js`), stating in plain English the exact byte layout of the envelope, what `key_id` does, why the IV is random, and what happens if you change any of it. In six months he re-reads that document, not the code.

---

## 4. THE CALENDAR MODEL

This is the part most likely to be built wrong, and timezones will cause more bugs than the cryptography will. Budget accordingly — literally more testing time here than for the crypto.

### Representation: RRULE, with most of it refused

Store an RFC 5545 `RRULE` string. Not a custom scheme — custom schemes converge on RRULE anyway, by the second feature request, with a migration attached. RRULE also means "Export .ics" is a formatting exercise rather than a semantic translation, which is his exit path if this project ever stops being maintained.

**Accept:** `FREQ` (DAILY/WEEKLY/MONTHLY/YEARLY), `INTERVAL` 1–999, `COUNT`/`UNTIL` (mutually exclusive), `BYDAY` (weekly: bare weekday list; monthly/yearly: one ordinal-prefixed day with ordinal ∈ {1,2,3,4,−1}), `BYMONTHDAY` (**1–28 or −1 only**), `BYMONTH` (yearly only), `WKST` (default MO — silently wrong if omitted with `INTERVAL > 1`).

**Refuse, at write time, with a clear message:**
- `BYMONTHDAY` 29/30/31 and `BYDAY` ordinal 5. "The 31st of every month" silently produces nothing in five months of the year, the user experience is *the calendar lost my event*, and it is unfixable at render time because the rule is behaving correctly. Offer `BYMONTHDAY=-1` ("last day of the month") instead. **This is the single most valuable refusal in the list.**
- `BYSETPOS` — costs him "last working day of the month"; the escape hatch is twelve single events a year. First candidate for v2.
- `SECONDLY`/`MINUTELY`/`HOURLY`, `BYYEARDAY`, `BYWEEKNO`, `BYHOUR`/`BYMINUTE`/`BYSECOND`, `RDATE`, multiple `RRULE` lines, and floating time (no `TZID`).

**Invariant worth more than the rest: `DTSTART` must itself be a valid instance of its own rule.** RFC 5545 says the first occurrence is `DTSTART` even when it violates `BYDAY`, which produces a "every Tuesday" series whose first occurrence is a Thursday, forever, with no UI that explains why. Have the editor snap `DTSTART` forward to the first matching datetime before submitting; have the server reject with 422 if it doesn't match. Every downstream algorithm gets simpler.

### Storage: rules only, never instances

Materialising occurrences means every series edit is delete-all-plus-reinsert-all — 5,220 row writes for one edit to a decade-long weekday series, against a verified 100,000 rows/day free cap (and index writes count as extra rows). Worse, a materialised table is a cache the schema presents as truth: the day the expander is fixed, every row already written is stale and nothing in the database knows it.

### `recurrence_id` is a LOCAL DATE, not a datetime

This is the single best simplification available, and it falls out of the accept-list above. Because every accepted rule produces **at most one occurrence per local date**, the slot key can be the date alone.

Consequences:
- Moving a series from 9am to 10am orphans **nothing**. The ugly "time-shift special case" that rewrites every override key — which one source design admitted was inelegant and which its reviewer showed would also silently orphan every `task_completion` and occurrence-linked task — disappears entirely.
- `RECURRENCE-ID` is reconstructed at `.ics` export time from the date plus the series time-of-day. Export is unaffected.
- **`recurrence_date` is the date the RULE generated, never where the occurrence currently sits.** Move the 9 March standup to 10 March and its `recurrence_date` stays `2026-03-09` while `new_dtstart_local` becomes `2026-03-10T09:00:00`. The slot is the identity; the position is data. Key on position and moving an occurrence twice creates two rows for one occurrence. This is the origin of most calendar corruption.

### The three edit scopes

| Scope | Mechanism |
|---|---|
| **This occurrence** | `INSERT INTO event_override … ON CONFLICT(series_id, recurrence_date) DO UPDATE SET` — touching only the supplied columns. **Never `INSERT OR REPLACE`**: REPLACE deletes and re-inserts, so an edit that supplies only a new time silently wipes a previously overridden title and its `overridden_fields` entry. Delete any matching exception row in the same `batch()`. |
| **Whole series** | `UPDATE event_series SET … WHERE id = ? AND updated_at = ?`. Field-level propagation: apply the series change to each override **only** for fields absent from that override's `overridden_fields`. Rename the series and the moved occurrence gets renamed too, but stays moved. That is what everyone expects and what most calendars get wrong in one direction or the other. |
| **This and all future** | **Split the series.** Do not add a `scope` flag to the row. |

**The split, in order:**
1. Compute `P` = the last occurrence of `S` strictly before `R`. Set `S.rrule`'s `UNTIL` to `P` (as a UTC instant; `UNTIL` is *inclusive*). Do not use `R − 1 second`.
2. Insert `S'` with the edited fields, `DTSTART = R`, `split_from_id = S.id`, `split_at = R`. The Worker re-encrypts `payload_enc` under the new row's AAD.
3. **Move every override and exception with `recurrence_date >= R` from `S` to `S'`** — as *set-based single statements* (`UPDATE event_override SET series_id = ? WHERE series_id = ? AND recurrence_date >= ?`), not row-by-row. D1 Free allows 50 queries per Worker invocation; a series with 30 per-occurrence edits blows that if you loop. Re-encrypt each moved `payload_enc` in the same pass. **This step is the one everyone forgets** — left behind, those rows reference slots `S` no longer generates: invisible rot that surfaces months later as a ghost event or a silently-lost edit.
4. Move occurrence-linked tasks with `recurrence_date >= R`; **copy** series-linked tasks to `S'` (recording `copied_from_task_id`). "Bring the report every week" applies to both halves of a split series. Cap this: five splits in a year should not leave five copies of the same standing task on truncated series he will never see — prune copies whose parent series is fully in the past.
5. Recompute `until_date` for `S` **in the same statement** that writes the new `rrule`. It is a derived cache with three ways to go stale, and a wrong value does not error — it makes events invisible.
6. If `R` is the first occurrence of `S`, there is no `P`: edit `S` in place, do not create an empty truncated series.

*This whole flow is safe here specifically because the server holds the key.* Under a zero-knowledge design, steps 2–4 move ciphertext into rows whose AAD no longer matches, and "edit this and all future occurrences" silently destroys the title and notes of every per-occurrence edit it touches. That is a real defect a reviewer found in one of the source designs, and it is a concrete win for this architecture.

### Exceptions and orphans

**Never delete override or exception rows on a rule change. Compute orphan status at expansion time.**

- **Orphaned exceptions are inert — keep them silently.** One row. If the rule later changes back, the deletion is honoured again, which is right. Delete them and a previously-cancelled occurrence silently resurrects.
- **Orphaned overrides hold content he wrote.** On a rule change that would orphan overrides, the Function returns **409** with the affected dates and writes nothing. The UI says: *"3 occurrences you had edited no longer fall on this schedule. Keep them as separate one-off events, or delete them?"* and resubmits with `orphan_policy` **plus the same `updated_at` it originally read** — the resubmit is a two-round-trip read-modify-write and needs the same compare-and-swap as every other write, or it is a TOCTOU window.
- **Exception beats override.** Deleted is deleted.
- Extending a series (`COUNT` 10 → 20) needs nothing; existing keys still match. And with date-keyed slots, a pure time-of-day change needs nothing either.

**Where orphan detection runs:** in the browser, before the request. The client computes the orphan set and the `DTSTART`-validity check and sends both; the server does *structural* RRULE validation against the accept-list and the compare-and-swap, and never expands anything. This resolves the contradiction two source designs had — you cannot both refuse to put the expander on the server and require the server to expand.

### Timezones

```
dtstart_local     '2026-01-05T09:00:00'   -- no offset, no Z
tzid              'America/New_York'      -- IANA NAME. Not '-05:00'. Not 'EST'.
duration_seconds  3600                    -- duration, not DTEND
```

**Why not UTC instants:** a weekly 09:00 New York standup anchored as an instant and expanded by adding 7 × 86,400 seconds lands at 10:00 local after the March transition, stays an hour late for eight months, then silently corrects itself in November. Adding seven days in UTC is not adding seven days in local time. A UTC instant is a point on the timeline; a recurrence rule is a statement about the local calendar.

**Why an IANA name, not an offset:** an offset is the *answer* to a timezone question at one instant. The rule needs the question. `-05:00` cannot tell you what happens in July.

**Why duration, not `DTEND`:** store `DTEND` as a second wall clock and an event running 01:30 → 02:30 on spring-forward day computes a length of zero. `duration_seconds` gives 60 real minutes on every occurrence.

**Expansion algorithm:** iterate in the local civil calendar — generate candidate `(year, month, day, hour, minute)` tuples by calendar arithmetic, no `Date`, no epoch maths. `FREQ=WEEKLY;INTERVAL=1` is `day += 7` with month/year carry. Convert to a UTC instant only at the last step, for sorting and rendering, via `Intl.DateTimeFormat(undefined, { timeZone: tzid, timeZoneName: 'shortOffset' })`.

**DST policy — write these down, they are one-line decisions with multi-year consequences:**
- **Nonexistent local time** (spring forward, 02:30 on the transition day): **shift forward** to 03:30.
- **Ambiguous local time** (fall back, 01:30 happens twice): **take the first**, the earlier pre-transition offset.

These match `Temporal`'s `disambiguation: 'compatible'` and what Apple and Google do. Inconsistency makes an event flicker between offsets year on year — a bug that takes three years to notice and an afternoon to disbelieve.

**No Temporal.** Verified as of Aug 2026: Firefox 139, Chrome/Edge 144, **not stable Safari**. He will open this on an iPhone, where every browser is WebKit. The polyfill is ~100 KB and an npm dependency. So: ~80 lines of commented `Intl`-based helper in `tz.js`. **Do not feature-detect and branch** — two code paths means two sets of bugs and only one gets tested. Revisit when Safari ships it and delete the helper in one commit.

### All-day events

Not midnight-to-midnight. Three separate failures: they are timezone-free by nature ("birthday, 14 June" is 14 June in Tokyo too); multi-day spans are *nominal* days, so a 3-day event across a DST boundary is 71 or 73 hours, not 72; and a midnight-anchored all-day event sorts *among* timed events at 00:00, appearing below the 6 a.m. alarm instead of as a header for the day.

So: `is_all_day = 1`, `dtstart_local = '2026-06-14'` (a DATE, no time component), `tzid` and `duration_seconds` **NULL, enforced by the CHECK constraints in the schema**, `duration_days = 1`. Recurrence over dates never touches DST — it is pure integer arithmetic on the civil calendar. `DTEND` is *exclusive* for DATE values, so a one-day event on 14 June exports as `DTSTART;VALUE=DATE:20260614` / `DTEND;VALUE=DATE:20260615`; storing `duration_days` sidesteps that off-by-one everywhere except the export line. Sort key is derived client-side as midnight of that date in the *viewer's current* zone, with all-day events first within their date — derived, never stored.

**Leap day:** detect Feb 29 + `FREQ=YEARLY` on save and ask — *"every 29 February (leap years only)"* or *"the last day of February every year"* (`FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1`). The spec-correct behaviour is almost never what was intended.

### Read path, upcoming list, and colour

```sql
-- series that could produce an occurrence in [from, to]
SELECT * FROM event_series
 WHERE deleted_at IS NULL
   AND (until_date IS NULL OR until_date >= :from)
   AND substr(dtstart_local,1,10) <= :to
UNION
-- plus any series with an override landing in the window (an occurrence MOVED past UNTIL)
SELECT s.* FROM event_series s
  JOIN event_override o ON o.series_id = s.id
 WHERE s.deleted_at IS NULL
   AND substr(coalesce(o.new_dtstart_local, o.recurrence_date),1,10) BETWEEN :from AND :to;
```

The UNION arm is not optional. Without it, an occurrence moved forward past its series' `UNTIL` disappears from the calendar entirely, along with any task attached to it.

Then two more selects for that series set's overrides and exceptions. Three queries against a 50-per-invocation limit; a few hundred rows against 5,000,000 reads/day. Window is the visible month ± 1 month, plus a separate 90-day-forward query for the upcoming list.

**Expansion happens in the browser**, in `rrule.js`, once, shared by the calendar and all three dashboards. Apply exceptions via a `Set` of `` `${series_id}|${recurrence_date}` ``, overrides via a `Map` on the same key honouring `overridden_fields`, merge, sort, take the first N. ~1,500 candidate datetimes in the realistic case. Single-digit milliseconds of *browser* CPU, nowhere near the 10 ms Function budget, which this path never touches.

**Colour is two independent axes.** `priority` is stored, user-set, 1–3. **Imminence is derived at render time** from `occurrence_instant − now`, bucketed (< 2 h, < 24 h, < 7 d, beyond). Never stored. Collapse the 3 × 4 grid into five CSS custom properties in `:root` — `--cal-urgent`, `--cal-soon`, `--cal-normal`, `--cal-later`, `--cal-done` — so the palette is five editable lines.

**The consequence people miss:** because imminence is time-derived, **colours must be recomputed on a timer, not on load.** A tab left open overnight shows yesterday's urgency. `setInterval` at 60 s recomputing only the bucket class — no refetch, no re-expansion, no request, zero quota cost.

### Task ↔ event linking

Three link types, because there are three legitimate answers to "which occurrence?": `series` ("bring the report" — renders on every occurrence), `occurrence` ("prep for the 9 March one" — renders only there), and `none` (free-standing to-do with a category). Completion lives in `task_completion` keyed on `(task_id, recurrence_date)` — a series-linked task checked off for 2 March must be unchecked for 9 March, and a boolean on the task row cannot express that.

**Deleting a series unlinks its tasks (`link_type='none'`, `series_id=NULL`), never deletes them.** Deleting a calendar entry should never delete an item off his to-do list; those are different intents.

**Bound the unbounded case:** a weekly series-linked task never checked off generates one incomplete item per occurrence, forever. Surface only occurrences inside the expansion window, and show only the *next* unstarted instance per series-linked task with a count badge for the backlog.

**Category lives independently on the task and on the event.** It defaults from the linked event at creation and then diverges freely — a Work meeting legitimately generates a Personal task ("book the dentist while you're out"). The three subpages filter on `task.category`, in SQL, which is one of the concrete payoffs of the server-readable decision.

### `sort_order` warning

Fractional indexing with `REAL` exhausts: repeatedly dropping an item into the same gap halves the interval, and after ~50 operations in one position two tasks collide on an identical value and the order goes nondeterministic. Detect a gap below `1e-6` and rewrite the column for that category once.

---

## 5. DOCUMENTS

### Upload

```
POST /api/documents/init
  → Worker: generate doc id (UUID), r2_key = 'doc/<uuid>', CEK = 32 random bytes,
            iv_prefix = 4 random bytes; store cek_wrapped = AES-GCM(DATA_KEY, CEK,
            aad='document|<id>|cek|v1'); INSERT the row with status='pending'
            AND all key material, BEFORE a single byte is uploaded.
  → returns {id, iv_prefix, cek}          ← ONE document's key. Never DATA_KEY.

client: chunk the plaintext at 1 MiB; for chunk i:
  iv  = iv_prefix(4) || uint64be(i)
  aad = doc_id || uint64be(i) || uint64be(total_chunks) || is_final(1)
  AES-GCM-256(CEK, chunk, iv, aad)
  append to a Blob

PUT /api/documents/{id}/content         ← the Blob as the request body
  → Worker: env.DOCS.put(r2_key, request.body)  — pure I/O, no CPU
  → then UPDATE document SET status='ready', chunk_count=?, size_cipher=?, meta_enc=?
```

**The row is written first, before the bytes.** If it were written after — as one source design specified — a failure between `put()` and `INSERT` (D1 error, tab closed, phone locked during the last request, dropped connection on the response) leaves the ciphertext in R2 with its only key in a dead tab's memory. Unreadable forever, invisible to the app. Inverting the order makes the worst case a visible, cleanable `pending` row.

**Why the client encrypts:** the free-tier 10 ms CPU limit makes bulk AES in the Worker a hard wall, not a tuning problem. `put(key, request.body)` is I/O and costs essentially no CPU.

**Why per-document keys and not `DATA_KEY`:** blast radius. If a page-level XSS or a hostile browser extension steals a key, it steals *one document's* key, valid for one document, not the master key that would give permanent offline retroactive decryption of every record and every backup forever.

**Why deterministic counter IVs and full AAD:** the CEK is used for exactly one bytestream, so counters can never repeat and IV reuse is structurally impossible rather than probabilistically bounded. Without `chunk_index` an attacker with R2 write access can reorder chunks; without `doc_id` they can splice chunks from another document; without `total_chunks` + `is_final` they can truncate a document and every remaining chunk still authenticates perfectly. Truncation is the classic attack on naively chunked GCM.

**The one-key-one-bytestream invariant is absolute and must be commented in the code.** Re-uploading or replacing a document mints a **new CEK and a new `r2_key`**. R2 has no versioning; a `put()` over an existing key with a reused CEK restarts the counter at zero under the same key and forfeits both confidentiality and integrity for that document. Thumbnails, if ever added, get their own key and their own columns — never the document's CEK.

**Size cap: 50 MB, enforced client-side and re-checked server-side.** WebCrypto is not streaming, so chunking keeps encryption memory flat at ~3 MiB, but the assembled Blob and the upload still have to happen on a phone. The Cloudflare free-zone request-body ceiling is 100 MB; 50 leaves real headroom. **No multipart upload.** Multipart would add four endpoints, an `uploadId` lifecycle, R2's part-uniformity rule, and stale-upload cleanup, for a capability this vault does not need. This is not a media store — a 2 GB video is 20% of the entire free R2 allowance and could never be played back anyway, because seeking requires random-access decryption.

### Retrieval, and how a leaked URL is contained

```
GET /api/documents/{id}/content   → streams R2 ciphertext (obj.body, nothing buffered)
GET /api/documents/{id}/key       → returns that one document's unwrapped CEK
```

**No presigned URLs are issued anywhere in this system.** A presigned URL is a bearer token — possession is authorisation, valid up to 7 days, with **no documented revocation**; the only kill switch is rotating the R2 API token that signed it, which breaks every other outstanding URL simultaneously. It also requires a CORS policy on the bucket whose failure mode is silent over-permission.

The result is the property that actually matters: **no URL in this system is ever a capability. It is a name.** Disclosing a name is not disclosing a document.

| Scenario | Result |
|---|---|
| URL pasted into a group chat | Recipient hits Cloudflare Access → login page → nothing |
| URL in browser history, laptop stolen, thief opens it | Access session may be live → thief gets **ciphertext**; the CEK is a separate authenticated call |
| Bucket contents obtained directly | Ciphertext under random UUID keys that reveal nothing |
| Cloudflare account compromised | **Everything.** This is the one that matters; see §2 |

**Bucket configuration, checked quarterly:** no public bucket, **the `r2.dev` public development URL never enabled** (the docs carry an explicit warning: once enabled, the bucket stays publicly readable via `r2.dev` even after you put Access or the WAF in front of a custom domain), no custom domain, no bucket locks or retention policies. The only path to the bytes is the R2 binding inside the Worker.

**Serve `/content` with `Content-Type: application/octet-stream`, `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`.** But understand that those headers are largely inert here, because the browser never navigates to that URL — JavaScript fetches it and materialises the real file client-side. **The actual control is client-side and it is not optional:**

> After decrypting, construct the Blob with a **MIME allowlist**: `application/pdf`, `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `text/plain`. Everything else is forced to `application/octet-stream` and is download-only. **Never `text/html`. Never `image/svg+xml`.** Use `<a download>`; never `window.open()` or `location =` on a `blob:` URL. Revoke the object URL the instant it has loaded.

A `blob:https://levi.xplabs.us/...` URL is **same-origin**. An uploaded `.svg` or `.html` — a perfectly ordinary thing to keep in a documents vault — previewed inline runs JavaScript with full same-origin access to every API endpoint, including the CEK endpoints. This is the interaction that two of the source designs missed.

PDF preview: decrypt to a Blob with `type: 'application/pdf'`, `createObjectURL`, render in an `<iframe>`, let the browser's built-in viewer do the rest. Five lines, zero dependencies. `pdf.js` would allow page-by-page rendering and PDF thumbnails; it is a large npm dependency and the answer is no. **Thumbnails for images only; PDFs get a type icon plus the decrypted filename.** That is the honest limit of the no-dependency rule, and it is a small loss.

### Deletion

1. Soft-delete: `UPDATE document SET deleted_at = ?`. Vanishes from the UI. **Keep `r2_key` and `cek_wrapped`** — a trash that has already destroyed the key is a trash you cannot restore from. 30-day retention.
2. Empty trash (explicit, typed confirmation): **delete the R2 object first, then hard-delete the D1 row.** In that order, a failure at step 2 leaves a visible tombstone pointing at nothing — harmless and self-healing. Reverse the order and a failed R2 delete leaves an object nothing references: invisible, unlistable, and permanently consuming the 10 GB allowance.
3. Destroying `cek_wrapped` makes the R2 ciphertext permanently unreadable whether or not the object delete ever succeeded. No object store guarantees the physical blocks are overwritten; crypto-shredding is the actual answer to that, not a workaround for it.

### Reconciliation cron: **reports, never deletes**

A weekly job that lists R2 keys and deletes any with no matching D1 row is a data-destruction bomb. D1 is the authority and R2 is slaved to it, so *any* event that loses D1 rows — a Time Travel restore to an earlier point, a partial migration, a mistyped `DELETE` — causes the cron to permanently destroy the corresponding ciphertext within a week, converting a recoverable D1 mistake into unrecoverable loss, on a schedule, while nobody is looking. **The cron writes orphan keys into an `orphans` table and stops.** Purging requires a deliberate human action.

---

## 6. WHAT THIS COSTS

For one user, everything is one to three orders of magnitude below the free ceilings, with exactly one exception.

| Resource | Free tier | Realistic use | Headroom |
|---|---|---|---|
| Workers/Pages Functions requests | 100,000/day (shared pool) | ~200–500/day incl. static assets | ~200× |
| Worker CPU | 10 ms/request | 3 queries + <50 AES-GCM decrypts on the heaviest read | tight but OK — see below |
| D1 storage | 500 MB/db, 5 GB/account | a few MB in a decade | ~100× |
| D1 rows written | 100,000/day (index writes count) | a few hundred/day | ~300× |
| D1 rows read | 5,000,000/day | a few thousand/day | ~1000× |
| D1 queries per invocation | 50 (Free) | 3 on read; split flows must be set-based | fine if the rule is followed |
| D1 bound params per query | 100 | avoid `IN` lists past 100 series | fine |
| Subrequests | 50 external + 1,000 to Cloudflare services | 1 external (JWKS, cached 1 h); D1/R2 count against the 1,000 | fine |
| R2 Class A ops | 1,000,000/month | uploads + incremental backup copies: a few thousand | ~200× |
| R2 Class B ops | 10,000,000/month | trivial | — |
| R2 egress | free | — | — |
| Zero Trust seats | 1 needed | 1 | — |
| KV | not used | — | — |

### The only thing that can ever bill: R2 storage

10 GB-month free, and **the backup bucket doubles every stored byte.** At a 50 MB cap and a few hundred documents you land around 2 GB primary + 2 GB backup. Four large files and the picture changes.

**Controls, all mandatory:**
- Hard 50 MB per-document cap, enforced client-side *and* server-side.
- The backup cron copies **incrementally** — only objects whose `backed_up_at` is null or older than `updated_at`. Never a nightly full re-copy.
- Retain 30 daily D1 snapshots and prune older ones. D1 snapshots are tiny (a few MB of ciphertext).
- **Set a Cloudflare billing notification on the account.** This is the one place a mistake becomes an invoice.

### The one thing that could force a paid plan

The 10 ms Worker CPU limit. The heaviest path is a calendar read that decrypts every returned `payload_enc`. The design mitigates it three ways: subkeys derived once per isolate rather than once per record; a windowed query that keeps typical responses under 50 rows; and no bulk crypto in the Worker at all. **Benchmark the calendar read in a deployed Worker before committing.** If it ever exceeds, the fix is the Workers Paid plan at $5/month, which raises the default to 30 s CPU. That is a deliberate decision with a known price, not a surprise.

### What is *not* free-tier related but is worth stating

**D1 Time Travel is 7 days on the free plan, always on, dashboard-only. It is disaster recovery, not a backup and not an undo button.** It is also a data-exposure feature — anything deleted is recoverable by anyone with account access for a week, which is one of the specific reasons the application-layer encryption earns its place.

---

## 7. BUILD ORDER

The rule: **a dashboard that does one thing well beats a half-finished five-page app.** Steps 1–4 produce nothing usable and must all be done anyway, because they are the things that are impossible to retrofit. Step 5 is the first thing he can actually use, and he should use it for two weeks before anything else is built.

1. **Cloudflare Access on `levi.xplabs.us`, one policy, one email, Cloudflare IdP.** Register **two** MFA factors and put a hardware security key on the Cloudflare account itself. Then enable Access on the `*.pages.dev` hostnames too, and verify from a logged-out browser that both are actually closed. Before a line of code.
2. **Generate `DATA_KEY`, set it as a secret, print it, put the paper in a safe, and put a copy in his password manager.** Before a single event or document exists. This is not paperwork; it is the only thing standing between a Cloudflare-account accident and total loss.
3. **`schema.sql`, `crypto.js`, root `_middleware.js`, `_headers`, and `DANGER.md` — together.** Round-trip test the envelope (encrypt → store → read → decrypt) with a `key_id` of 1 and 2 both present, so rotation is proven to work before there is data to lose. Test that the CSP is present on `index.html` and not just on `/api/*`.
4. **The backup cron Worker, and a tested restore into a scratch D1 database.** A backup that has never been restored is not a backup — and this is the step at which one of the reviewed designs discovered the restore tool had never been built, on the day the database was gone. Do it now, while the database is empty and a mistake costs nothing.
5. **Tasks and the three category dashboards. Ship this.** A to-do list with Personal / Work / XPLabs views, priorities, due dates, drag reorder, soft delete. No recurrence, no timezones, no documents. It is genuinely useful on its own, it exercises the auth, the envelope, the 409 concurrency path, and the deploy loop, and every bug found here is found cheaply. **Live on it for two weeks.**
6. **Single (non-recurring) events**: month grid, the upcoming-events list, colour by priority × imminence with the 60-second recompute, and event↔task linking with `link_type` in `('none','occurrence')`. Now the dashboard is the thing he asked for, minus repeats.
7. **`.ics` export — the same day the calendar first renders.** Ten lines of string building, and it means his calendar imports into Google, Apple, or Outlook forever regardless of whether this project survives. Highest value per line in the whole document.
8. **Recurrence.** `tz.js` and `rrule.js`, alone, last, with a test file full of DST transitions, month ends, leap days, and the `BYMONTHDAY=-1` cases. Then the three edit scopes, the override/exception tables, the orphan 409 flow, and the split. **Budget more time for this than for the cryptography.**
9. **Documents.** Init-then-upload, 50 MB cap, chunked client encryption, the MIME allowlist, the trash, the orphan-reporting cron.
10. **Full JSON export + import.** With the import *UI page* built at the same time — a restore path only reachable from a browser page that does not exist is not a restore path.

---

## 8. HONEST WARNINGS

### Where this is harder than it sounds

- **Recurrence plus DST is the hardest thing in the project, by a wide margin.** Harder than the crypto. Correct expansion means converting to wall clock in `tzid`, stepping the rule in the civil calendar, and converting back per occurrence via `Intl.DateTimeFormat`, because JavaScript has no timezone-aware date arithmetic. Get it wrong and every recurring event silently shifts an hour twice a year — the kind of bug a non-programmer cannot diagnose. Source designs budgeted this at "roughly 80 lines"; that is off by a large factor once the exception overlay is included. Plan for it, and write the DST test file *before* the expander.
- **The 409 flows** — optimistic concurrency, plus the orphan-policy round trip — are the fiddliest server code in the project and the easiest to skip. Skipping them means two tabs silently eat each other's edits, with no server-side history to show what was lost because the titles are encrypted.
- **`until_date` is a derived cache with three ways to go stale** (COUNT-terminated rules with no UNTIL, a `tzid` change, all-day series). A wrong value does not throw — it makes events invisible. It must be written in the same statement as `rrule`, every time, with a client-side consistency check on load.
- **BLOB round-tripping.** D1 returns blobs to a Worker as arrays of numbers, and JSON responses cannot carry raw bytes. Every encrypted column needs one consistent base64 convention across D1 ↔ Worker ↔ browser. This is not a security bug, but it is exactly the kind of detail that, gotten subtly wrong in one place, produces a vault that decrypts today and not after the next edit. Write the base64 helpers once, in one file, with a comment.

### Where the owner will get stuck

- **The `_middleware.js` location.** Directory-scoped middleware not running for static assets is invisible, silent, and produced a real vulnerability in one of the reviewed designs. If he ever "tidies" the middleware into `functions/api/`, the CSP disappears from the HTML.
- **Applying schema changes.** `wrangler d1 execute --file=schema.sql --remote` versus the dashboard console; forgetting `--remote` and changing local state instead. Keep `schema.sql` in the repo as both migration file and disaster-recovery artifact, and never edit the production schema by hand.
- **Secrets before deployment.** Pages secrets must exist *before* the deployment that uses them, and are not readable after saving. If he ever loses both the secret and the paper, everything encrypted is gone.
- **He will not know why he is locked out** when an Access key rotation hits a JWKS cache with no kid-miss refetch. Implement the refetch.

### What could lose his data

1. **Losing both copies of `DATA_KEY`.** Every encrypted field and every document becomes permanently unrecoverable, and the backups do not help because the backups are ciphertext. Two independent copies, one of them physical, on day one.
2. **A schema migration that changes anything feeding the AAD.** The AAD is `<table>|<row_id>|<column>|v1`. Rename a table or a column and every ciphertext in it fails authentication. If a rename is ever needed, it must be done as a decrypt-and-re-encrypt pass, not an `ALTER TABLE`.
3. **The reconciliation cron, if anyone ever "improves" it into deleting.** See §5.
4. **Empty trash.** Irreversible by design. Behind a typed confirmation, and never behind a single button.
5. **Missing 409 concurrency checks.** Silent last-write-wins across phone and laptop.
6. **A D1 loss with no tested restore.** D1 Time Travel is 7 days. That is not a backup. The nightly ciphertext export plus a *drilled* restore is.
7. **`INSERT OR REPLACE` on `event_override`.** Silently wipes previously overridden fields.

### What could expose it

1. **Cloudflare account compromise.** Total, immediate, unmitigable by anything in this design. Hardware key, two factors registered, and treat that login as the crown jewels.
2. **An uploaded SVG or HTML previewed inline.** Same-origin script execution with access to every endpoint. The MIME allowlist is the control, and it lives in client code where it is easy to "simplify" away.
3. **The `r2.dev` toggle.** One dashboard click, no code review, and the docs warn it stays public even after you put Access in front of a custom domain. Check quarterly.
4. **Unprotected `*.pages.dev` and preview URLs.** A second front door to the same D1 and R2 bindings.
5. **A plaintext JSON export sitting in `~/Downloads`.** It is the least protected copy of the data, and Spotlight, Windows Search, and any iCloud/OneDrive Desktop sync will index or upload it. Move it to an encrypted external drive immediately, or don't generate it.
6. **`innerHTML` anywhere.** One line, one pasted email, one stored XSS.
7. **A service worker.** Writes API responses to disk in `CacheStorage`, outside the page's control.

### Things the reviewers flagged as unverified — check these before relying on them

- **The Zero Trust free-plan seat count.** Marketing pages and community threads say 50 users; it is not stated on the developer limits page. Academic for one user, but confirm at signup.
- **Whether independent Access MFA is available on the free plan.** The docs page describing it states no plan requirement; absence of a note is not proof. Confirm in the dashboard.
- **The 100 MB request-body limit.** Verified as a Free *zone plan* upload limit, but it does not appear on the Workers limits page that one design cited. The 50 MB document cap gives real headroom either way; verify before relying on the headroom argument.
- **Pages Functions has no Cron Triggers.** They are documented exclusively as a Workers feature with a `scheduled()` handler, and no Pages equivalent exists in the docs. Treat as "absent from the docs," not "proven impossible" — this is why the backup lives in a separate Worker.
- **PBKDF2/WebCrypto throughput and AES-GCM CPU cost inside workerd.** Not benchmarked by anyone. The §6 CPU arithmetic is an engineering expectation, not a measurement. Measure it.
- **Temporal not in stable Safari.** True as of Aug 2026. It will change; when it does, `tz.js` gets deleted in one commit.
- **Subrequest accounting.** Free is 50 *external* subrequests plus 1,000 to Cloudflare services; D1 and R2 binding calls count against the 1,000, not the 50. Two source designs got this wrong in tables labelled "verified."

### One thing to state plainly to the owner

If this ever needs to be genuinely end-to-end encrypted — not readable by Cloudflare — that is a different project, not a setting. It costs a passphrase on every unlock, permanent unrecoverable loss on a forgotten passphrase, roughly three to five times the code, all of it cryptographic code he cannot read or repair, no server-side filtering for the three category dashboards, and a class of data-loss bug in the sync layer that every reviewed attempt actually contained. It buys protection against Cloudflare reading the *stored* data — and not against Cloudflare, or anyone with his Cloudflare login, changing the JavaScript that holds the key. That is the whole trade, and it is his to make knowingly.

---

## 9. QUESTIONS FOR THE OWNER

1. **Is "Cloudflare, and anyone who gets into my Cloudflare account, can read my documents" acceptable?** If yes, build this. If no, the entire design changes and he accepts that forgetting one passphrase destroys everything permanently, with no reset and no support ticket. This is the only question that changes the architecture.

2. **Where does the printed `DATA_KEY` live, physically?** Name the place before generating it. A key with no agreed home is a key that ends up in a photo on his phone.

3. **What timezone, and does he travel?** If everything is one zone forever, `tzid` can be defaulted and hidden in the UI and a whole class of bug never surfaces. If he works across zones, the timezone picker has to be visible on every event and the DST work gets more testing.

4. **"Colour-coded to show the most recent" — does that mean *starting soonest*, or *recently created/edited*?** These are different columns and different behaviours, and guessing wrong means rebuilding the upcoming list.

5. **When a task is attached to a repeating event, does it belong to the whole series or to that one occurrence — by default?** Both are supported; the default determines what happens most of the time and is nearly impossible to change later without confusing him.

6. **Biggest document he genuinely needs to store, and roughly how many in total?** This sets the 50 MB cap and is the only input to the one line item that can ever produce an invoice.