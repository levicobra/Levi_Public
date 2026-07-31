# ServeStuff link audit

Audited and repaired 2026-07-31. The site was last published 2025-02-05,
so its links had gone roughly 18 months unverified.

## Result

| | Before | After |
|---|---|---|
| Working | 194 | **222** |
| **Dead (404)** | **38** | **0** |
| Bot-blocked (treated as working) | 39 | 39 |
| Inconclusive | 17 | 18 |
| Total | 288 | 279 |

Nine links were removed: two pointed at domains taken over by unrelated
third parties, and seven pointed at programs with no live equivalent.

## Removed — domains lost to third parties

The original organizations lost these domains and someone else now controls them.

| Resource | Old domain | Now resolves to |
|---|---|---|
| Hawaii State Family Program | `hawaiiguardohana.org` | `ypcikutaitimur.id` |
| Rocky Mountain Blue | `rockymountainblue.com` | a domain broker |

## Repaired — 30 links updated to current addresses

Every replacement below was fetched and confirmed to return HTTP 200.

| Resource | New address |
|---|---|
| Linkedin free premium | `https://socialimpact.linkedin.com/programs/veterans/premiumform` |
| Boots to Business | `https://bootstobusiness.sba.gov/` |
| Bunker Labs - Veterans in Residence | `https://ivmf.syracuse.edu/programs/entrepreneurship/bunker-labs/veterans-in-residence/` |
| Easter Seals | `https://www.easterseals.com/DCMDVA/programs-and-services/military-veteran-services/` |
| SANS VetSuccess Academy | `https://www.sans.org/cyber-academy/vetsuccess/` |
| Service2CEO | `https://www.therosienetwork.org/service2ceo-program` |
| Veteran Entrepreneur Investment Program | `https://penfedfoundation.org/our-programs/vep/` |
| Homes 4 Wounded Heroes | `https://militarywarriors.org/main-programs/h4wh` |
| Skills 4 Life | `https://militarywarriors.org/main-programs/s4l` |
| Transportation for Heroes | `https://militarywarriors.org/main-programs/t4h` |
| Military Warriors Support Foundation | `https://militarywarriors.org/about` |
| Salesforce Trailhead | `https://trailhead.salesforce.com/salesforce-military` |
| Give an Hour | `https://giveanhour.org/military/` |
| Military Teen Adventure Camps | `https://extension.purdue.edu/4-H/get-involved/military-teen-adventure-camps/` |
| Cell Phones for Soldiers | `https://cellphonesforsoldiers.com/our-programs/minutes-that-matter/` |
| Air Force Aero Club | `https://myairforcelife.com/aero-clubs/` |
| Hotel Heroes | `https://www.fisherhouse.org/programs/hotel-for-heroes/` |
| Kelty Pro | `https://kelty.com/pages/pro-program` |
| Leatherman Pro | `https://www.leatherman.com/pages/military-discount` |
| MSR Gear | `https://www.msrgear.com/pro-sales.html` |
| Scarpa Pro | `https://us.scarpa.com/pages/pro-policy` |
| Sierra Designs Pro | `https://sierradesigns.com/pages/pro-purchase-program` |
| Spyderco Pro | `https://spyderco.com/pages/special-discounts` |
| Hero Box | `https://www.herobox.org/support-the-troops` |
| A Million Thanks | `https://amillionthanks.org/` |
| Salute Military Golf Association | `https://smga.org/` |
| Valor IT | `https://soldiersangels.org/get-support/` |
| United Services Military Apprenticeship Program | `https://usmap.osd.mil/` |
| www.veteranstransitionsupport.org | `https://veteranstransitionsupport.org/` |
| notforgottenoutreach.org | `https://www.sharenm.org/not-forgotten-outreach-inc/military-family-respite-center` |
| app.spiritune.com | `https://www.spiritune.com/` |

### Programs that changed, not just moved

- **Bunker Labs — Veterans in Residence** was sunsetted. Bunker Labs is now part of
  Syracuse University's IVMF, and Veterans in Residence has been merged into the
  **Military Founders Lab**. The link points there; the entry text may want rewording.
- **Salesforce Trailhead for veterans** is now **Salesforce Military**.
- **USMAP** moved from a Navy-hosted domain to a joint DoD one.
- **A Million Thanks** appears to have restructured its wish program; the link now
  points at the site root rather than a specific application page.

## Unlinked — no live equivalent found (7)

Text kept so the entry is still visible, but the dead link was removed so nobody is
sent to a 404. Each needs a decision: find an alternative, or delete the row.

| Resource | Why |
|---|---|
| `www.flir.com` | TradeForce program confirmed inactive for several years |
| `www.discoveryplus.com` | military discount terms page removed; no replacement found |
| `hamiltonhd.com` | specific promotion ended; dealer homepage is not a benefit |
| `www.dunkindonuts.com` | no official military discount landing page found |
| `www.provengo.com` | site returns 404 at the root |
| `operationlovereunited.wildapricot.org` | site gone; organization status unconfirmed |
| `www1.fsgi.com` | program page removed; no replacement found |

## Inconclusive (18)

Timeouts, rate limits, and server errors. Most are probably fine — government and
retail sites commonly reject automated requests — but they could not be confirmed.

| Resource | Signal |
|---|---|
| Morningstar Investment Research | [Errno 104] Connection reset by peer |
| Veterati | 522 |
| EMentor | Tunnel connection failed: 502 Bad Gateway |
| DOD Skillbridge | [Errno 104] Connection reset by peer |
| Shift Fellowship | [Errno 104] Connection reset by peer |
| Spouse Force | Tunnel connection failed: 502 Bad Gateway |
| Military with PTSD | 301 |
| IT Ready | 500 |
| A Story Before Bed | 503 |
| Birdies for the Brave | Tunnel connection failed: 502 Bad Gateway |
| RB Digital - Ebooks and audiobooks | [Errno 104] Connection reset by peer |
| Waves of Honor | 522 |
| Digital Globe | Tunnel connection failed: 502 Bad Gateway |
| Washington Post | The read operation timed out |
| Fort Fisher Air Force Recreation Center | 520 |
| MGM Resorts Pearl Level | The read operation timed out |
| Veterans Canteen Service | [Errno 104] Connection reset by peer |
| Eders Bowhunting | [Errno 104] Connection reset by peer |

---

Regenerate with `linkcheck.py`. Links reporting 401/403/405/429 are counted as
working, since those indicate bot protection rather than a missing page.