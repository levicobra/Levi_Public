/**
 * PIN gate for a Cloudflare Pages site.
 *
 * Every request to this project passes through here first — HTML, JSON, media,
 * everything. That is the point. A gate that only covers the pages leaves the
 * data underneath them readable by anyone who knows the URL.
 *
 * ── SETUP ────────────────────────────────────────────────────────────────
 * In the Cloudflare dashboard, on this Pages project:
 *
 *   Settings → Variables and Secrets → Add. Set the name and value, then press
 *   ENCRYPT before saving — an unencrypted variable is stored as plain text.
 *     ACCESS_PIN     the code you give the family
 *     COOKIE_SECRET  a long random string, unrelated to the PIN
 *
 *   Settings → Bindings → Add → KV namespace, with the variable name:
 *     RATE           used to lock out brute-force attempts
 *
 * Redeploy once after adding them.
 *
 * ── ON THE PIN ───────────────────────────────────────────────────────────
 * The PIN is the only thing protecting this data. Four digits is 10,000
 * guesses — minutes for a script even with rate limiting. Use at least ten
 * characters. Letters and digits are fine; it only has to be typed once per
 * device per month.
 *
 * ── WHAT THIS DOES NOT DO ────────────────────────────────────────────────
 * It does not stop someone who has the PIN from sharing it, and it does not
 * protect data that a family member has already downloaded.
 *
 * The rate limit is per-IP. That stops one machine grinding through guesses;
 * it does not stop an attacker spread across many addresses, and because KV
 * is eventually consistent a fast attacker hitting several Cloudflare
 * locations at once may get somewhat more than MAX_ATTEMPTS before the count
 * catches up. A long PIN is what actually carries the weight here — the rate
 * limit only buys time. If this ever needs to be airtight, the counter
 * belongs in a Durable Object, not KV.
 *
 * To sign everyone out everywhere, change COOKIE_SECRET: every existing
 * session stops validating immediately. To sign out one device, use
 * /__auth/logout on it.
 */

const COOKIE = "fam_session";
const SESSION_DAYS = 30;
const MAX_ATTEMPTS = 8;          // per IP
const LOCKOUT_SECONDS = 900;     // 15 minutes

/* ---------- helpers ---------- */

const enc = new TextEncoder();

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time compare, so response timing never leaks the secret. */
function safeEqual(a, b) {
  const A = enc.encode(a), B = enc.encode(b);
  let diff = A.length ^ B.length;
  for (let i = 0; i < Math.max(A.length, B.length); i++) diff |= (A[i] ?? 0) ^ (B[i] ?? 0);
  return diff === 0;
}

function readCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

async function validSession(request, secret) {
  const c = readCookie(request, COOKIE);
  if (!c) return false;
  const [expires, sig] = c.split(".");
  if (!expires || !sig) return false;
  if (Number(expires) < Date.now()) return false;               // expired
  return safeEqual(sig, await hmac(secret, `v1|${expires}`));   // untampered
}

async function issueSession(secret) {
  const expires = Date.now() + SESSION_DAYS * 864e5;
  const sig = await hmac(secret, `v1|${expires}`);
  // Lax, not Strict. Strict would drop the cookie whenever someone arrives
  // from a link in a text or an email — which is exactly how family will get
  // here — making them retype the PIN every visit and wasting the 30-day
  // session. Lax still withholds the cookie from cross-site POSTs, which is
  // the case that actually matters.
  return `${COOKIE}=${expires}.${sig}; Path=/; Max-Age=${SESSION_DAYS * 86400}` +
         `; HttpOnly; Secure; SameSite=Lax`;
}

function clearSession() {
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

/**
 * Where to send someone after they enter the PIN. Only a path on this site is
 * ever accepted — anything protocol-relative, absolute, or backslashed is
 * discarded, so this cannot be turned into an open redirect.
 */
function safeReturnTo(value) {
  const v = String(value || "");
  if (!v.startsWith("/")) return "/";
  if (v.startsWith("//") || v.startsWith("/\\")) return "/";
  if (v.startsWith("/__auth")) return "/";
  return v;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- the PIN page ---------- */

function pinPage(message, returnTo = "/") {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Family archive</title>
<meta name="robots" content="noindex,nofollow">
<style>
:root{--ink:#1B1A18;--dim:#5E5A52;--paper:#F4F1EA;--line:#8B8478;--bad:#9E1B13}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--paper);
 color:var(--ink);font:17px/1.6 Georgia,"Iowan Old Style",serif;padding:1.5rem}
.card{width:100%;max-width:24rem}
h1{font-size:1.5rem;margin:0 0 .4rem;letter-spacing:-.01em}
p{margin:0 0 1.5rem;color:var(--dim);font-size:.9375rem}
label{display:block;font:600 .75rem/1 system-ui,sans-serif;letter-spacing:.08em;
 text-transform:uppercase;color:var(--dim);margin-bottom:.5rem}
input{width:100%;font:17px Georgia,serif;padding:.75rem .85rem;border:2px solid var(--line);
 background:#fff;color:var(--ink)}
input:focus{outline:3px solid var(--ink);outline-offset:1px}
button{width:100%;margin-top:.75rem;font:700 .8125rem/1 system-ui,sans-serif;letter-spacing:.08em;
 text-transform:uppercase;padding:.85rem;border:2px solid var(--ink);background:var(--ink);
 color:var(--paper);cursor:pointer}
button:hover{background:transparent;color:var(--ink)}
.msg{margin-top:1rem;font:.875rem/1.5 system-ui,sans-serif;color:var(--bad)}
</style></head><body>
<div class="card">
  <h1>Colby &middot; Fager family archive</h1>
  <p>This archive is private. Enter the family access code to continue.</p>
  <form method="POST" action="/__auth">
    <input type="hidden" name="next" value="${escapeHtml(returnTo)}">
    <label for="pin">Access code</label>
    <input id="pin" name="pin" type="password" autocomplete="current-password"
           autofocus required inputmode="text">
    <button type="submit">Enter</button>
  </form>
  ${message ? `<p class="msg">${escapeHtml(message)}</p>` : ""}
</div></body></html>`;
}

function deny(message, status = 401, returnTo = "/") {
  return new Response(pinPage(message, returnTo), {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
    },
  });
}

/* ---------- middleware ---------- */

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Fail closed. Missing configuration must never fall through to the archive.
  if (!env.ACCESS_PIN || !env.COOKIE_SECRET) {
    return new Response("This site is not configured yet.", {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  /* --- sign this one device out --- */
  if (url.pathname === "/__auth/logout") {
    return new Response(null, {
      status: 303,
      headers: {
        Location: "/",
        "Set-Cookie": clearSession(),
        "Cache-Control": "no-store",
      },
    });
  }

  /* --- the PIN submission --- */
  if (url.pathname === "/__auth" && request.method === "POST") {
    const rateKey = `pin:${ip}`;
    const tries = env.RATE ? Number((await env.RATE.get(rateKey)) || 0) : 0;

    const form = await request.formData();
    const pin = String(form.get("pin") || "");
    const returnTo = safeReturnTo(form.get("next"));

    if (tries >= MAX_ATTEMPTS) {
      return deny("Too many attempts. Try again in 15 minutes.", 429, returnTo);
    }

    if (!safeEqual(pin, env.ACCESS_PIN)) {
      if (env.RATE) {
        await env.RATE.put(rateKey, String(tries + 1), { expirationTtl: LOCKOUT_SECONDS });
      }
      return deny("That code is not right.", 401, returnTo);
    }

    if (env.RATE) await env.RATE.delete(rateKey);
    return new Response(null, {
      status: 303,
      headers: {
        Location: returnTo,
        "Set-Cookie": await issueSession(env.COOKIE_SECRET),
        "Cache-Control": "no-store",
      },
    });
  }

  /* --- everything else requires a valid session --- */
  if (!(await validSession(request, env.COOKIE_SECRET))) {
    // 200 on the PIN page for a normal navigation; 401 for anything else, so a
    // fetch for JSON or media fails loudly instead of receiving HTML.
    const wantsHtml = (request.headers.get("Accept") || "").includes("text/html");
    // Remember where they were headed so a deep link survives the PIN.
    const returnTo = safeReturnTo(url.pathname + url.search);
    return wantsHtml ? deny(null, 200, returnTo) : new Response("Unauthorized", {
      status: 401, headers: { "Cache-Control": "no-store" },
    });
  }

  /* --- authenticated: serve, but never let it be cached or indexed --- */
  const response = await next();
  const out = new Response(response.body, response);
  out.headers.set("Cache-Control", "no-store, private");
  out.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  out.headers.set("X-Content-Type-Options", "nosniff");
  out.headers.set("Referrer-Policy", "no-referrer");
  out.headers.set("X-Frame-Options", "DENY");
  // No includeSubDomains and no preload — this pins only this hostname, so it
  // cannot strand a sibling subdomain that is not on HTTPS yet.
  out.headers.set("Strict-Transport-Security", "max-age=31536000");
  return out;
}
