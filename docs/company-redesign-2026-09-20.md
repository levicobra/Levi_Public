# Company website redesign — Hawaiʻi manufacturing

Updated September 22, 2026. The company site leads with additive manufacturing
for the full range of Hawaiʻi's needs: homes, businesses, designers, makers, and
industry. RF engineering is a separate specialty, with supporting software.
The previous platform-consulting positioning is removed from deployed company
pages, metadata, share graphics, and satellite navigation descriptions.

## Implementation

- Redesigned the homepage, capabilities, about, community, investors, and 404 pages;
  added dedicated additive-manufacturing, RF, and software pages.
- Manufacturing includes prototypes, custom and replacement parts, fixtures,
  architectural models, creative products, small runs, enclosures, and CAD preparation.
  Materials, process, quantity, tolerances, and availability remain project-specific.
- Preserved the exact original XP Labs wordmark, favicon, and touch-icon assets.
  The original dark wordmark is used on the light background, including share art.
- Cream, forest, and orange styling; original workbench and spectrum illustrations;
  optional motion, reduced-motion support, mobile navigation, native FAQ disclosures,
  and project-enquiry links. Editable illustration sources are outside deployed roots.
- Plain local HTML/CSS/JS, no framework, runtime dependencies, remote fonts, or tracking.
  Shared company navigation is generated from the homepage; satellites remain independent.
- RF prototype status, manufacturing scope, and government-status disclaimers remain.
  Investor content is figure-free. Existing URLs and redirects are preserved.
- The education content hash now includes the root HTML so navigation changes produce
  a new service-worker version without caching the redirecting index.html URL.

## Verification

- Browser: nine company pages and three satellite homepages at 320, 360, 768,
  1440, and 2560 pixels: 60 views with zero horizontal overflow, exactly one h1,
  loaded images, and no captured page/CSP errors. Company images have alt text and dimensions.
- Desktop and phone visual review; original wordmark and 1200 × 630 share art inspected.
- Mobile menu open/close, Escape with focus return, service navigation, animation pause,
  native manufacturing FAQ, and contact-link targets checked. Chrome reduced-motion
  emulation confirmed the illustration animation becomes `none`.
- Browser served with actual per-site security headers. Chrome Network showed only
  same-origin company runtime assets, no failed page requests or external dependencies
  (the browser automation extension has its own separate resource).
- 188 company URL references resolve; all 15 distinct local page/asset targets return 200.
  No duplicate IDs or missing targets. JavaScript syntax and whitespace checks pass.
- Education: 106 subjects and 1,613 lessons validate; service-worker version rebuilt.
  Home → Mathematics → Prealgebra → Place Value and Rounding renders lesson content.
  Chrome offline mode successfully reloads the education home and opens a cached lesson.
- Benefits search: rent returns relevant resources; dental returns Health & Wellness;
  suicide presents the crisis line; an unmatched term presents the fallback guidance.
- Company pages have local assets and work once loaded without remote dependencies;
  a disconnected cold reload is not supported by the company site, which does not install
  a service worker. Education retains its dedicated offline library.
- Existing contrast evidence: forest/paper 10.98:1, muted/paper 5.43:1,
  orange text/paper 5.46:1, muted/tinted background 4.89:1.

Publishing uses the existing four Git-connected Cloudflare Pages projects. Check
all four deployment results and the affected live URLs after merging the scoped PR.
