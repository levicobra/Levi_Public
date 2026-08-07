/**
 * Exercises the PIN gate against the same primitives the Workers runtime gives it:
 * Request, Response, FormData, crypto.subtle. Node 18+ has all four.
 */
import { onRequest } from "../functions/_middleware.js";

const PIN = "correct-horse-battery";
const SECRET = "an-unrelated-long-random-string-0123456789";

/* A KV stand-in with the two methods the middleware uses, plus TTL. */
function makeKV() {
  const store = new Map();
  return {
    store,
    async get(k) {
      const e = store.get(k);
      if (!e) return null;
      if (e.exp && e.exp < Date.now()) { store.delete(k); return null; }
      return e.v;
    },
    async put(k, v, opts = {}) {
      store.set(k, { v, exp: opts.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : 0 });
    },
    async delete(k) { store.delete(k); },
  };
}

/* next() stands in for the static asset the archive would actually serve. */
function makeNext(body = "SECRET FAMILY DATA", type = "text/html") {
  return async () =>
    new Response(body, {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000" },
    });
}

async function call({ path = "/", method = "GET", cookie, accept, form, env, next } = {}) {
  const headers = new Headers({ "CF-Connecting-IP": "203.0.113.7" });
  if (cookie) headers.set("Cookie", cookie);
  if (accept) headers.set("Accept", accept);
  const init = { method, headers };
  if (form) { const fd = new FormData(); for (const [k, v] of Object.entries(form)) fd.set(k, v); init.body = fd; }
  const request = new Request(`https://colby.xplabs.us${path}`, init);
  return onRequest({ request, env: env ?? { ACCESS_PIN: PIN, COOKIE_SECRET: SECRET, RATE: makeKV() }, next: next ?? makeNext() });
}

let pass = 0, fail = 0;
function check(name, cond, detail = "") {
  if (cond) { pass++; console.log(`  ok    ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? "  — " + detail : ""}`); }
}

console.log("\nPIN gate\n");

/* 1. Missing configuration must not fall through to the archive. */
{
  const r = await call({ env: {} });
  check("no secrets configured → 503, archive not served", r.status === 503);
  check("  ...and the body is not the archive", !(await r.text()).includes("SECRET FAMILY DATA"));
}
{
  const r = await call({ env: { ACCESS_PIN: PIN } }); // secret missing
  check("PIN set but COOKIE_SECRET missing → still 503", r.status === 503);
}

/* 2. Anonymous requests. */
{
  const r = await call({ accept: "text/html,*/*" });
  const body = await r.text();
  check("anonymous navigation → 200 PIN page", r.status === 200);
  check("  ...shows the form", body.includes('name="pin"'));
  check("  ...does NOT leak the archive", !body.includes("SECRET FAMILY DATA"));
  check("  ...is not cached", (r.headers.get("Cache-Control") || "").includes("no-store"));
  check("  ...is not indexed", (r.headers.get("X-Robots-Tag") || "").includes("noindex"));
}
{
  // The case that matters most: the data underneath the pages.
  const r = await call({ path: "/data/people.json", accept: "application/json", next: makeNext('{"living":true}', "application/json") });
  check("anonymous JSON fetch → 401, not an HTML page", r.status === 401);
  check("  ...no data in the body", !(await r.text()).includes("living"));
}
{
  const r = await call({ path: "/media/scan-1952.jpg", accept: "image/*", next: makeNext("<binary>", "image/jpeg") });
  check("anonymous media fetch → 401", r.status === 401);
}

/* 3. The PIN submission. */
let sessionCookie = null;
{
  const r = await call({ path: "/__auth", method: "POST", form: { pin: PIN } });
  check("correct PIN → 303 redirect", r.status === 303);
  const sc = r.headers.get("Set-Cookie") || "";
  check("  ...sets a cookie", sc.startsWith("fam_session="));
  check("  ...HttpOnly", sc.includes("HttpOnly"));
  check("  ...Secure", sc.includes("Secure"));
  check("  ...SameSite=Lax", sc.includes("SameSite=Lax"));
  sessionCookie = sc.split(";")[0];
}
{
  const r = await call({ path: "/__auth", method: "POST", form: { pin: "wrong" } });
  check("wrong PIN → 401", r.status === 401);
  check("  ...no cookie issued", !r.headers.get("Set-Cookie"));
}
{
  const r = await call({ path: "/__auth", method: "POST", form: {} });
  check("empty PIN → rejected", r.status === 401);
}

/* 4. Sessions. */
{
  const r = await call({ cookie: sessionCookie });
  check("valid session → archive served", r.status === 200 && (await r.text()).includes("SECRET FAMILY DATA"));
}
{
  const r = await call({ cookie: sessionCookie });
  check("authenticated response is no-store", (r.headers.get("Cache-Control") || "").includes("no-store"));
  check("  ...overrides the asset's own max-age", !(r.headers.get("Cache-Control") || "").includes("max-age=31536000"));
  check("  ...noindex", (r.headers.get("X-Robots-Tag") || "").includes("noindex"));
  check("  ...nosniff", r.headers.get("X-Content-Type-Options") === "nosniff");
  check("  ...no-referrer", r.headers.get("Referrer-Policy") === "no-referrer");
  check("  ...DENY framing", r.headers.get("X-Frame-Options") === "DENY");
}
{
  // Forgery: keep the expiry, change the signature.
  const [name, val] = sessionCookie.split("=");
  const [exp] = val.split(".");
  const forged = `${name}=${exp}.${"0".repeat(64)}`;
  const r = await call({ cookie: forged, accept: "text/html" });
  check("forged signature → rejected", r.status !== 200 || !(await r.text()).includes("SECRET FAMILY DATA"));
}
{
  // Extension: keep the signature, push the expiry out a year.
  const [name, val] = sessionCookie.split("=");
  const [, sig] = val.split(".");
  const far = Date.now() + 365 * 864e5;
  const r = await call({ cookie: `${name}=${far}.${sig}`, accept: "text/html" });
  check("extended expiry with old signature → rejected", !(await r.text()).includes("SECRET FAMILY DATA"));
}
{
  // An expired-but-authentic cookie.
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const past = Date.now() - 1000;
  const sig = [...new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`v1|${past}`)))]
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  const r = await call({ cookie: `fam_session=${past}.${sig}`, accept: "text/html" });
  check("expired session → rejected", !(await r.text()).includes("SECRET FAMILY DATA"));
}
{
  const r = await call({ cookie: "fam_session=garbage", accept: "text/html" });
  check("malformed cookie → rejected, no crash", r.status === 200 && !(await r.text()).includes("SECRET FAMILY DATA"));
}
{
  // A session signed with a different secret — i.e. after a PIN rotation.
  const kv = makeKV();
  const r = await call({ cookie: sessionCookie, env: { ACCESS_PIN: PIN, COOKIE_SECRET: "rotated-secret", RATE: kv }, accept: "text/html" });
  check("rotating COOKIE_SECRET invalidates old sessions", !(await r.text()).includes("SECRET FAMILY DATA"));
}

/* 5. Rate limiting. */
{
  const env = { ACCESS_PIN: PIN, COOKIE_SECRET: SECRET, RATE: makeKV() };
  let lockedAt = null;
  for (let i = 1; i <= 12; i++) {
    const r = await call({ path: "/__auth", method: "POST", form: { pin: `guess-${i}` }, env });
    if (r.status === 429 && lockedAt === null) lockedAt = i;
  }
  check("brute force locks out", lockedAt !== null, "never locked");
  check(`  ...at attempt ${lockedAt} (limit 8)`, lockedAt === 9, `got ${lockedAt}`);
  // The lockout must hold even against the right PIN, or it is not a lockout.
  const r = await call({ path: "/__auth", method: "POST", form: { pin: PIN }, env });
  check("  ...and holds against the correct PIN", r.status === 429);
}
{
  // A success must clear the counter, so a family member who fumbles it twice isn't punished.
  const env = { ACCESS_PIN: PIN, COOKIE_SECRET: SECRET, RATE: makeKV() };
  await call({ path: "/__auth", method: "POST", form: { pin: "no" }, env });
  await call({ path: "/__auth", method: "POST", form: { pin: "no" }, env });
  const good = await call({ path: "/__auth", method: "POST", form: { pin: PIN }, env });
  check("success clears the attempt counter", good.status === 303 && (await env.RATE.get("pin:203.0.113.7")) === null);
}

/* 6. Paths that must not slip past. */
for (const p of ["/index.html", "/data/tree.json", "/media/a.jpg", "/api/search?q=x", "/_next/static/chunk.js", "/.git/config", "/__auth"]) {
  const r = await call({ path: p, accept: "text/html" });
  const body = await r.text();
  check(`gate covers ${p}`, !body.includes("SECRET FAMILY DATA"));
}
{
  // GET /__auth is not the submission route; it must not be a bypass.
  const r = await call({ path: "/__auth", method: "GET", accept: "text/html" });
  check("GET /__auth is not a bypass", !(await r.text()).includes("SECRET FAMILY DATA"));
}

/* 7. Deep links survive the PIN. */
{
  const r = await call({ path: "/person/I1234?tab=media", accept: "text/html" });
  const body = await r.text();
  check("PIN page remembers the destination",
    body.includes('name="next" value="/person/I1234?tab=media"'), body.match(/name="next"[^>]*/)?.[0]);
}
{
  const r = await call({ path: "/__auth", method: "POST", form: { pin: PIN, next: "/person/I1234?tab=media" } });
  check("login returns you to the deep link", r.headers.get("Location") === "/person/I1234?tab=media");
}
{
  const r = await call({ path: "/__auth", method: "POST", form: { pin: "wrong", next: "/person/I1234" } });
  check("a wrong guess keeps the destination", (await r.text()).includes('value="/person/I1234"'));
}

/* 8. The `next` field must not become an open redirect. */
for (const hostile of [
  "https://evil.example/",
  "//evil.example/",
  "/\\evil.example/",
  "http://evil.example",
  "javascript:alert(1)",
]) {
  const r = await call({ path: "/__auth", method: "POST", form: { pin: PIN, next: hostile } });
  const loc = r.headers.get("Location");
  check(`next="${hostile}" cannot redirect off-site`, loc === "/", `sent to ${loc}`);
}
{
  const r = await call({ path: "/__auth", method: "POST", form: { pin: PIN, next: "/__auth" } });
  check("next cannot loop back to the login route", r.headers.get("Location") === "/");
}
{
  // A crafted path must not be able to inject markup into the PIN page.
  const r = await call({ path: '/x"><script>alert(1)</script>', accept: "text/html" });
  const body = await r.text();
  check("crafted path cannot inject markup", !body.includes("<script>alert(1)</script>"));
}
{
  // Sharper: a form field is NOT percent-encoded by the URL parser, so this is
  // the value that actually reaches the template raw.
  const hostile = '/ok"><script>alert(1)</script><x y="';
  const r = await call({ path: "/__auth", method: "POST", form: { pin: "wrong", next: hostile } });
  const body = await r.text();
  check("raw hostile `next` is escaped, not reflected",
    !body.includes("<script>alert(1)</script>") && body.includes("&quot;&gt;&lt;script&gt;"));
}

/* 9. Logout. */
{
  const r = await call({ path: "/__auth/logout", cookie: sessionCookie });
  const sc = r.headers.get("Set-Cookie") || "";
  check("logout redirects", r.status === 303);
  check("  ...clears the cookie", sc.includes("fam_session=;") && sc.includes("Max-Age=0"));
  check("  ...does not serve the archive", !(await r.text()).includes("SECRET FAMILY DATA"));
}
{
  const r = await call({ path: "/__auth/logout", accept: "text/html" });
  check("logout works without a session too", r.status === 303);
}

/* 10. Cookies reach the site from an emailed link (the SameSite question). */
{
  const r = await call({ path: "/__auth", method: "POST", form: { pin: PIN } });
  const sc = r.headers.get("Set-Cookie") || "";
  check("cookie is SameSite=Lax, so texted links keep the session", sc.includes("SameSite=Lax"));
  check("  ...still HttpOnly and Secure", sc.includes("HttpOnly") && sc.includes("Secure"));
}
{
  const r = await call({ cookie: sessionCookie });
  check("authenticated response sets HSTS", (r.headers.get("Strict-Transport-Security") || "").includes("max-age="));
  check("  ...without includeSubDomains", !(r.headers.get("Strict-Transport-Security") || "").includes("includeSubDomains"));
}
{
  const r = await call({ accept: "text/html" });
  check("PIN page itself is nosniff / no-referrer / DENY",
    r.headers.get("X-Content-Type-Options") === "nosniff" &&
    r.headers.get("Referrer-Policy") === "no-referrer" &&
    r.headers.get("X-Frame-Options") === "DENY");
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
