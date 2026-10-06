# XP Labs

Additive manufacturing for Hawaiʻi’s homes, businesses, makers, and industries.
Based in Honolulu and founded by Levi Colby. Contact
[levi@xplabs.us](mailto:levi@xplabs.us).

The [company website](https://xplabs.us/) focuses on
[custom parts, prototypes, tools, and small runs](https://xplabs.us/additive-manufacturing/).
Its first featured project is [aeroponics towers](https://xplabs.us/projects/aeroponics/),
currently a concept rather than a product offered for sale. Materials, process,
dimensions, quantity, suitability, and availability are confirmed per project.

## Games

[XP Labs Games](https://play.xplabs.us/) has its own dark violet identity and
dedicated pages for four titles:

- [The Last Station](https://play.xplabs.us/the-last-station/) — a mobile survival game about a dying offshore station.
- [Space Glyph](https://play.xplabs.us/space-glyph/) — matching, aiming, and puzzle defense.
- [Life XP](https://play.xplabs.us/life-xp/) — a life simulation in a walkable town.
- [Hearth & Hunt](https://play.xplabs.us/hearth-and-hunt/) — building and exploration on Roblox.

Promotional concept artwork is identified as such; it is not presented as
gameplay. Platform and release links belong to each game’s verified current
public information, not assumptions based on artwork.

## Free community resources

[XP Education](https://learn.xplabs.us/) is a warm, editorial learning library:
106 subjects, 1,613 lessons, and 14 domains, from K–8 foundations through college
and practical skills. The library includes lessons, worked examples, and practice.
OpenStax-aligned material retains its source and CC BY attribution. Open it online
and confirm the offline library has finished saving before relying on it without
a connection. Progress stays on the reader’s device.

[Military resources](https://mil.xplabs.us/) is an independent directory for
service members, veterans, and families. It contains 671 resources: 479 in the
main directory and 192 National Guard programs. The board offers 15 choices:
14 main categories plus National Guard by state. Crisis access stays prominent;
program eligibility and current terms must be confirmed with the provider.

Both resources are free to use, with no account, paywall, or tracking. They are
community projects, not a claim of registered charity status. The website source
is public; public visibility alone does not grant an open-source license. Check
the license of each material before reuse.

## Maintaining the websites

Start with [the website maintenance guide](docs/website-guide.md). It explains
where to edit each page, how to refresh generated content, how to keep the four
themes distinct, and what to check before publishing.

| Public origin | Editable root | Visual direction |
|---|---|---|
| [xplabs.us](https://xplabs.us/) | `sites/www` | Dark charcoal and green manufacturing; light teal community page |
| [play.xplabs.us](https://play.xplabs.us/) | `sites/play` | Dark violet game studio and individual game pages |
| [learn.xplabs.us](https://learn.xplabs.us/) | `sites/learn` | Warm paper library, domain colors, optional dark mode |
| [mil.xplabs.us](https://mil.xplabs.us/) | `sites/mil` | Navy and teal directory; red reserved for crisis access |

These are plain HTML, CSS, and JavaScript with local runtime assets. There is no
framework, package installation, or production bundler. Maintained Python
generators update navigation, the military directory, and education’s search
index and offline cache version before release.

The existing four Git-connected Cloudflare Pages projects publish from `main`.
See [deployment instructions](DEPLOY.md), [agent instructions](AGENTS.md), and
the current standards at the top of [the historical handoff](HANDOFF.md).
Private dashboards, genealogy records, credentials, and private game source
never belong in these deployed roots.
