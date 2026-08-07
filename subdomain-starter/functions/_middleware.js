/**
 * Password gate for colby.xplabs.us
 *
 * Every request to this site passes through here first. If the visitor has not
 * supplied the right username and password, they get a browser login prompt and
 * nothing else is served.
 *
 * The password is NOT stored in this file. It lives in the Cloudflare dashboard:
 *   Workers & Pages -> (your project) -> Settings -> Variables and Secrets
 * Add two SECRETS (not plaintext variables):
 *   AUTH_USER   e.g. colby
 *   AUTH_PASS   e.g. a long passphrase you text to family
 *
 * To change the password later, edit the secret in the dashboard. You do not
 * need to touch this file or redeploy the site.
 */

/** Constant-time string compare, so the response time never leaks the password. */
function safeEqual(a, b) {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  // Compare lengths in a way that still runs the loop below.
  let diff = ba.length ^ bb.length;
  const len = Math.max(ba.length, bb.length);
  for (let i = 0; i < len; i++) {
    diff |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

function askForPassword() {
  return new Response("Authentication required.", {
    status: 401,
    headers: {
      // Triggers the browser's built-in username/password prompt.
      "WWW-Authenticate": 'Basic realm="Colby Family Records", charset="UTF-8"',
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export async function onRequest(context) {
  const { request, env, next } = context;

  // Fail closed. If the secrets are missing, serve nothing rather than
  // accidentally publishing the whole site.
  if (!env.AUTH_USER || !env.AUTH_PASS) {
    return new Response(
      "This site is not configured yet. Set AUTH_USER and AUTH_PASS in the Cloudflare dashboard.",
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const header = request.headers.get("Authorization") || "";
  const [scheme, encoded] = header.split(" ");

  if (scheme !== "Basic" || !encoded) return askForPassword();

  let decoded;
  try {
    decoded = atob(encoded);
  } catch {
    return askForPassword();
  }

  // Split on the FIRST colon only - passwords are allowed to contain colons.
  const sep = decoded.indexOf(":");
  if (sep === -1) return askForPassword();
  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);

  // Always check both, so a wrong username costs the same time as a wrong password.
  const userOk = safeEqual(user, env.AUTH_USER);
  const passOk = safeEqual(pass, env.AUTH_PASS);
  if (!userOk || !passOk) return askForPassword();

  // Authenticated. Serve the page, but make sure it is never cached by a shared
  // proxy and never indexed by a search engine that somehow gets in.
  const response = await next();
  const out = new Response(response.body, response);
  out.headers.set("Cache-Control", "no-store, private");
  out.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  out.headers.set("X-Content-Type-Options", "nosniff");
  out.headers.set("Referrer-Policy", "no-referrer");
  return out;
}
