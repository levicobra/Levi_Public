# Release checks

Paths are relative to the Levi_Public repository root.

1. Inspect working-tree and branch state. Follow the once-per-session workspace sync in `../CLAUDE.md`; coordinate if it was already run. Stage only owned files. Use scoped git rather than a workspace-wide push helper when other changes are present.
2. Run the relevant existing generators/validators identified by `xplabs-public-content`, then review their diffs. `node --test subdomain-starter/test/middleware.test.mjs` checks the bundled gate template; this is useful for template or safety-instruction changes and does not prove the four public sites render. Education content uses `python sites/learn/tools/validate_content.py` from the repository root.
3. For site changes, complete the browser checks in `HANDOFF.md` section 8: responsive rendering, offline behavior, applied CSP, asset references, links, and real user paths. For instruction-only changes, validate skill frontmatter, names, triggers, and referenced paths; do not regenerate untouched site content just to produce a diff.
4. Commit the scoped change, push its branch, create/update the PR, inspect available checks, and merge when ready. Existing Pages projects all deploy from `main`, with empty build commands: `xplabs-www` → `sites/www`, `xplabs-play` → `sites/play`, `xplabs-learn` → `sites/learn`, and `xplabs-mil` → `sites/mil`. Keep private content and source art outside all deployed roots.
5. Check the deployment result and actual affected URLs on `https://xplabs.us/`, `https://play.xplabs.us/`, `https://learn.xplabs.us/`, and `https://mil.xplabs.us/`. An HTTP 200 alone is not a feature test. Confirm changed content or deployed commit, headers, and the relevant interaction. For learn updates also verify `sw.js` remains no-store and a returning client receives the new content version.
6. If production looks old, inspect the build/deployment log and output directory first. A changed build setting requires a deployment. An asset cached as 404 may need an exact-URL purge through the existing authorized tooling; do not broaden a purge or reconfigure infrastructure without a demonstrated need.

Report actual tests, live paths, and release commit/PR. Separate verified results from unavailable deployment metadata or an untested interaction. Preserve credentials and never copy private-site data into public verification artifacts.
