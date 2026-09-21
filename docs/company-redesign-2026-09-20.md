# Company website: RF and additive manufacturing for Hawaiʻi

The company site now leads with RF engineering and additive manufacturing.
Software development is a supporting discipline. The old platform-consulting
positioning has been removed from company pages, metadata, share images, and
satellite navigation descriptions.

## Implementation

- Redesigned the homepage, capabilities, about, community, investors, and 404 pages.
- Added dedicated RF, additive-manufacturing, and software pages.
- Added a cream, forest, and orange design, original vector enclosure and spectrum
  illustrations, optional animation, reduced-motion handling, mobile navigation,
  native FAQ disclosures, and direct project-enquiry email links.
- Local styles and behavior live in sites/www/assets/site.css and site.js.
  There is no framework, build dependency, third-party font, or remote runtime asset.
- Company header/footer generation remains sourced from sites/www/index.html.
  Satellite designs remain independent. Their inherited service descriptions are updated.
- RF prototype status and manufacturing scope limitations remain explicit.
  The capability page retains the government-status disclaimer. Investor content
  includes no financial figures. Existing company URLs and redirects are preserved.

## Verification

- Nine company pages, 162 local asset/link references: no missing targets,
  duplicate IDs, missing navigation controls, or multiple/missing h1 headings.
- JavaScript syntax checked; shared company generator is idempotent.
- Text contrast calculated: forest on paper 10.98:1; muted on paper 5.43:1;
  orange text on paper 5.46:1; muted on the tinted section 4.89:1.
- Education content validator: 106 subjects, 1,613 lessons valid. Search index
  and service-worker version rebuilt after the navigation-label edit.
- Military directory regenerated from its template; existing content retained.
- Original 1,200 × 630 share graphic inspected as an image.

## Before merge

Browser verification is still required: all affected pages at 320, 360, 768,
1440, and 2560 pixels; no overflow, console errors, CSP violations, or failed
requests; keyboard/touch navigation, animation pause/reduced motion, FAQ and
contact links; offline rendering; unchanged satellite interactions. This source
verification does not establish rendered quality or public deployment.

After checks pass, merge the scoped PR and verify the existing Cloudflare Pages
deployments and the live affected URLs. Do not treat this draft as publication.
