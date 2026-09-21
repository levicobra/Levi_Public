# XP Labs

RF engineering and additive manufacturing for Hawaiʻi, with focused software
that connects devices, data, and workflows. Based in Honolulu and founded by
Levi Colby. Contact: [levi@xplabs.us](mailto:levi@xplabs.us).

- [Company](https://xplabs.us/)
- [RF engineering](https://xplabs.us/rf/)
- [Additive manufacturing](https://xplabs.us/additive-manufacturing/)
- [Supporting software](https://xplabs.us/software/)

The company website is deliberately separate from the game catalog and public
community resources below. RF work is at prototype stage; manufacturing scope,
materials, process, and availability are confirmed per project. The website does
not claim fielded equipment, certified production, or government past performance.

---

## Games — [play.xplabs.us](https://play.xplabs.us/)

Four titles, four different engines, deliberately.

**[The Last Station](https://play.xplabs.us/#the-last-station)** — mobile
survivors, Unreal Engine 5. Free-to-play, built for one thumb: you only steer,
equipped cards fire on tap, aim is automatic. The depth is in the loadout — five
part cards across Power, Weapons, Sensors, Jammers and Drones, plus five stat
medallions.

**[Space Glyph](https://play.xplabs.us/#space-glyph)** — puzzle defense,
Swift 6, iPhone. Matching and shooting are the same act. Your first match locks
the board and starts a short Match Phase; every follow-up match refills the
timer, so the whole formation resolves together and a good chain is something
you extend under pressure.

**[Life XP](https://play.xplabs.us/#life-xp)** — life simulation, SceneKit,
iPhone. An offline third-person simulator. Walk a small 3D town and step through
the door of any building into a full-screen interior where you use the station
that belongs there.

**[Hearth & Hunt](https://play.xplabs.us/#hearth-and-hunt)** — PvPvE, Roblox.
Server-authoritative, built so two-player teams who want something relaxed and
solo players who want something competitive can share a match. Keepers stay home
and grow the homestead; Hunters go out and contest objectives.

## XP Education — [learn.xplabs.us](https://learn.xplabs.us/)

A free learning platform that works fully offline. **106 subjects across 14
domains** — K–8 foundations through college math, science, history, business,
languages, trades and arts — with real lessons, worked examples and practice
questions. College courses align to [OpenStax](https://openstax.org) open
textbooks (CC BY 4.0) and link to the full free books.

Installable as a PWA: visit once and the library lives on your device. No
account, no tracking, no paywall, and no external requests of any kind.

## Military benefits — [mil.xplabs.us](https://mil.xplabs.us/)

A free, no-signup directory pulling scattered benefits and discounts into one
place. **279 resources across 13 categories** — education and GI Bill, health and
mental health, housing, careers and apprenticeships, family and childcare,
travel and more. Each entry is a plain description and a direct link.

Every link is checked and repaired rather than assumed; the auditor that does it
is in the repo.

---

## This repository

The sites above are built here as four static roots, one per origin:

```
sites/www/     → xplabs.us        hub, consulting, initiatives, invest, about
sites/play/    → play.xplabs.us
sites/learn/   → learn.xplabs.us
sites/mil/     → mil.xplabs.us
```

`sites/www` is the RF and additive-manufacturing company website. Its shared
styles and behavior live in `sites/www/assets/site.css` and `site.js`.
To change company navigation or the footer, edit `sites/www/index.html`, then run
`python3 tools/sync_nav.py`. Each service page is ordinary editable HTML.
Satellite sites retain their existing design and content; company navigation is
no longer copied into the games site.

No build step, no package manager, no framework, and no external requests. See
[`DEPLOY.md`](DEPLOY.md) for how they are published and
[`HANDOFF.md`](HANDOFF.md) for how they are put together and why.
