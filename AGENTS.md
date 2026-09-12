# XP Labs public websites

Follow `../CLAUDE.md` for workspace sync, scoped release authority, and owner communication. Preserve unrelated edits and stage only task-owned files.

- Four public deployable roots: `sites/www`, `sites/play`, `sites/learn`, and `sites/mil`. Private dashboard and genealogy data never belong here; everything within a deployed root is public.
- Read `HANDOFF.md` before substantial site work, especially its constraints and verification sections. Its older status and private-site setup claims are historical; current code and verified deployments take precedence.
- Keep plain editable files, local runtime assets, strict CSP, and zero external runtime requests. No app framework or bundler. Maintain accessibility and zero document overflow from 320px through desktop widths.
- Edit generated navigation/content at its source and run the existing generator. Any change under `sites/learn/` requires rebuilding its index and service-worker content version.
- Preserve crisis-resource visibility, factual capability disclaimers, and the figure-free invest page. Do not invent product launch claims, owner biography, or missing product URLs.
- Complete relevant tests and browser checks before publishing. Pushing `main` deploys all four Pages projects; unfinished risky work goes on a branch. Use the authorized commit, push, PR, merge, and live verification workflow without repeating approval.

Task guidance is discoverable under `.agents/skills/`: `xplabs-public-content`, `xplabs-public-mobile`, and `xplabs-public-release`. Load the relevant skill and conditional references instead of every project document.
