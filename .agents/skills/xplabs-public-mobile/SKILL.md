---
name: xplabs-public-mobile
description: Implement or diagnose responsive layout, navigation, accessibility, and offline rendering on xplabs.us, play, learn, or mil in Levi_Public. Use for public website interface work, not the private dashboard or native mobile apps.
---

# Public website mobile checks

Read repository-root `HANDOFF.md` sections 6 and 8 before changing site layout. Keep plain editable HTML/CSS/JS and existing property palettes. Use `xplabs-public-content` when editing generated headers, benefits markup, or education content; its reference identifies the source files and rebuild steps.

- Render the affected pages at 320, 360, 768, 1440, and 2560 pixels using existing browser tooling. Require `document.documentElement.scrollWidth === document.documentElement.clientWidth`, zero page errors, and no failed runtime asset requests. Check exactly one h1, image alt text and explicit dimensions, focus, touch controls, and the actual navigation or search interaction.
- Apply each origin's `_headers` in local verification, or inspect the live origin with its real CSP. Observe `securitypolicyviolation`; do not weaken CSP to hide a broken feature.
- Verify offline rendering and absence of remote fonts, CDN scripts, and tracking requests. Inspect the actual browser network: edge-injected analytics will not appear in source searches.
- Preserve prominent crisis access on mil and working cached lessons on learn. Re-acquire education frame handles after navigation when a frame is replaced.
- State the actual widths, pages, and interactions checked. Reuse existing tools; do not introduce an app dependency, separate dashboard, or generic testing scaffold for a small change.

Use `xplabs-public-release` for the authorized publishing workflow and checks on affected live origins.
