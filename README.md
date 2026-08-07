# Levi Colby

Founder of **XPLabs**, a consulting studio in Honolulu — game design and
engineering for clients, four games of its own in development, plus a free
offline learning platform and a free benefits directory for the military
community.

XPLabs is raising; see [xplabs.us/invest](https://xplabs.us/invest/).

- 📍 Honolulu, Hawaii
- 💼 [LinkedIn](https://www.linkedin.com/in/levicolby/)
- 🌐 [xplabs.us](https://xplabs.us/)

---

## Games — [game.xplabs.us](https://game.xplabs.us/)

Four titles, four different engines, deliberately.

**[The Last Station](https://game.xplabs.us/#the-last-station)** — mobile
survivors, Unreal Engine 5. Free-to-play, built for one thumb: you only steer,
equipped cards fire on tap, aim is automatic. The depth is in the loadout — five
part cards across Power, Weapons, Sensors, Jammers and Drones, plus five stat
medallions.

**[Space Glyph](https://game.xplabs.us/#space-glyph)** — puzzle defense,
Swift 6, iPhone. Matching and shooting are the same act. Your first match locks
the board and starts a short Match Phase; every follow-up match refills the
timer, so the whole formation resolves together and a good chain is something
you extend under pressure.

**[Life XP](https://game.xplabs.us/#life-xp)** — life simulation, SceneKit,
iPhone. An offline third-person simulator. Walk a small 3D town and step through
the door of any building into a full-screen interior where you use the station
that belongs there.

**[Hearth & Hunt](https://game.xplabs.us/#hearth-and-hunt)** — PvPvE, Roblox.
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
sites/www/     → xplabs.us        company hub, engineering, about, invest
sites/game/    → game.xplabs.us
sites/learn/   → learn.xplabs.us
sites/mil/     → mil.xplabs.us
```

`xplabs.us` is a hub. It says what the company is and points at the four places
the work lives; it deliberately carries no detail about the games, the subject
list or the benefits categories. That detail belongs on each origin, and putting
a second copy on the hub means maintaining two that drift apart.

No build step, no package manager, no framework, and no external requests. See
[`DEPLOY.md`](DEPLOY.md) for how they are published and
[`HANDOFF.md`](HANDOFF.md) for how they are put together and why.
