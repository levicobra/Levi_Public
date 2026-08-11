import json, html, re
import os
HERE=os.path.dirname(os.path.abspath(__file__))
S=HERE
cats=json.load(open(f"{HERE}/data.json", encoding="utf-8"))
# Per-state National Guard programs + the map that fronts them. Optional so a
# checkout without the file still builds the rest of the directory.
GUARD_PATH=f"{HERE}/guard.json"
guard=json.load(open(GUARD_PATH, encoding="utf-8")) if os.path.exists(GUARD_PATH) else {"states":[]}
e=lambda s: html.escape(s, quote=True)

ORDER=["important-links","directories","health","housing","financial","career","education",
       "reserve","family","care-packages-wounded","online-physical-services","travel",
       "entertainment","online-shopping"]
cats.sort(key=lambda c: ORDER.index(c["id"]) if c["id"] in ORDER else 99)

# Shorter titles - the blurb carries the detail, so the tile stays scannable.
RENAME={"travel":"Travel & Recreation",
        "care-packages-wounded":"Care Packages & Wounded Support",
        "online-physical-services":"Everyday Services",
        "important-links":"Start Here"}
for c in cats: c["title"]=RENAME.get(c["id"], c["title"])

BLURB={
 "reserve":"Federal benefits for Reserve-component members — health care, GI Bill kicker, tuition help.",
 "important-links":"Records, ID cards, claims and enrollment.",
 "directories":"Official databases and master lists that index everything else.",
 "health":"Medical, mental health, dental, vision, fitness and recovery.",
 "housing":"Rent, mortgage help, home repair and modification.",
 "financial":"Taxes, credit, debt, banking and fraud protection.",
 "career":"Jobs, hiring programs, apprenticeships and transition help.",
 "education":"GI Bill, tuition, certification and exam credit.",
 "family":"Spouses, children, childcare, youth programs and caregivers.",
 "care-packages-wounded":"Support for deployed and wounded service members.",
 "online-physical-services":"Legal help, phone, moving, vehicles and everyday services.",
 "travel":"Lodging, flights, campgrounds, resorts and recreation.",
 "entertainment":"Tickets, streaming, events and attractions.",
 "online-shopping":"Retail and gear discounts, commissary and exchange.",
}
tot=sum(len(c["links"]) for c in cats)

# ---- data payload the page's search reads ----
CAT_K={
 "reserve":"reserve reserves reservist reservists drilling tricare reserve select trs mgib-sr montgomery gi bill selected reserve tuition assistance retirement points userra employment rights",
 "health":"health medical doctor mental therapy counseling counselling psychiatry depression ptsd anxiety dental teeth vision eyes glasses hearing prescription medication fitness gym wellness recovery substance rehab sober",
 "housing":"housing home rent renting mortgage homeless shelter eviction utilities repair modification loan bah",
 "financial":"financial finance money tax taxes credit debt loan banking budget insurance savings retirement scam fraud investing",
 "education":"education school college university degree gi bill tuition scholarship certification exam clep dsst training course bootcamp student",
 "career":"career job jobs work employment hiring resume interview apprenticeship internship skillbridge transition clearance entrepreneur business startup",
 "family":"family spouse spouses children kids childcare daycare youth camp marriage parenting caregiver survivor",
 "travel":"travel hotel hotels lodging flight flights airline campground resort cruise vacation recreation park",
 "entertainment":"entertainment movies theater tickets streaming music events sports concert attractions",
 "online-shopping":"shopping discount discounts retail store gear clothing outdoor deals commissary exchange",
 "online-physical-services":"services legal law attorney phone internet moving storage vehicle car auto repair",
 "care-packages-wounded":"care package packages deployed wounded injured disabled donation support morale letters",
 "directories":"directory directories list database index search find resources benefits",
 "important-links":"records dd214 claim claims disability compensation pension card enrollment ebenefits official",
}
# Search knows the blurb too, so "what the benefit is" words are findable, and
# the guard programs join search as their own pseudo-category whose id is the
# real section on the page.
def search_k(l):
    return (l.get("k","") + " " + l.get("b","").lower()).strip()

payload=[{"id":c["id"],"t":c["title"],"n":len(c["links"]),
          "k":CAT_K.get(c["id"],""),
          "l":[{"n":l["name"],"u":l["url"],"h":l["host"],"k":search_k(l),"b":l.get("b","")} for l in c["links"]]}
         for c in cats]

if guard["states"]:
    guard_links=[]
    for st in guard["states"]:
        for l in st["links"]:
            guard_links.append({"n":f'{st["name"]}: {l["name"]}',"u":l["url"],
                                "h":l.get("host") or re.sub(r"^https?://([^/]+).*$", r"\1", l["url"]),
                                "k":f'{st["name"].lower()} {st["code"].lower()} national guard state ' + l.get("b","").lower(),
                                "b":l.get("b","")})
    payload.append({"id":"guard-by-state","t":"National Guard by state",
                    "n":len(guard_links),
                    "k":"national guard state states tuition assistance education benefits army air guard",
                    "l":guard_links})

def row(l, blurb_key="b"):
    b=l.get(blurb_key,"")
    blurb=f'<span class="row__b">{e(b)}</span>' if b else ""
    return (f'      <li><a class="row" href="{e(l["url"])}" target="_blank" rel="noopener">'
            f'<span class="row__n">{e(l["name"])}</span>'
            f'<span class="row__h">{e(l["host"])}</span>'
            f'{blurb}</a></li>')

def section(c):
    rows="\n".join(row(l) for l in c["links"])
    return f"""    <section class="cat" id="{c['id']}" aria-labelledby="h-{c['id']}">
      <div class="cat__head">
        <h2 id="h-{c['id']}">{e(c['title'])}</h2>
        <p class="cat__blurb">{e(BLURB.get(c['id'],''))}</p>
        <p class="cat__n">{len(c['links'])} resources</p>
      </div>
      <ul class="rows">
{rows}
      </ul>
    </section>"""

# ---- the National Guard map ------------------------------------------------
# A tile-grid cartogram: every jurisdiction is a button on a CSS grid laid out
# roughly like the country. It is an ENHANCEMENT — each state's programs are
# real <details> blocks in the HTML below the map, so the section works with
# JavaScript disabled, which is a rule of this site.
GRID={
 "AK":(1,1),"ME":(11,1),
 "VT":(10,2),"NH":(11,2),
 "WA":(1,3),"ID":(2,3),"MT":(3,3),"ND":(4,3),"MN":(5,3),"WI":(6,3),"MI":(8,3),"NY":(9,3),"MA":(10,3),"RI":(11,3),
 "OR":(1,4),"NV":(2,4),"WY":(3,4),"SD":(4,4),"IA":(5,4),"IL":(6,4),"IN":(7,4),"OH":(8,4),"PA":(9,4),"NJ":(10,4),"CT":(11,4),
 "CA":(1,5),"UT":(2,5),"CO":(3,5),"NE":(4,5),"MO":(5,5),"KY":(6,5),"WV":(7,5),"VA":(8,5),"MD":(9,5),"DE":(10,5),
 "AZ":(2,6),"NM":(3,6),"KS":(4,6),"AR":(5,6),"TN":(6,6),"NC":(7,6),"SC":(8,6),"DC":(9,6),
 "OK":(4,7),"LA":(5,7),"MS":(6,7),"AL":(7,7),"GA":(8,7),
 "HI":(1,8),"TX":(4,8),"FL":(8,8),
 "PR":(10,8),"GU":(2,8),"VI":(11,8),
}

def guard_section():
    if not guard["states"]: return ""
    states=sorted(guard["states"], key=lambda s: s["name"])
    total=sum(len(s["links"]) for s in states)
    tiles="\n".join(
      f'        <button class="st" data-state="{e(s["code"])}" '
      f'style="grid-column:{GRID.get(s["code"],(11,8))[0]};grid-row:{GRID.get(s["code"],(11,8))[1]}" '
      f'aria-label="{e(s["name"])} National Guard benefits">{e(s["code"])}</button>'
      for s in states if s["links"])
    blocks="\n".join(
      f'''      <details class="state" id="gd-{e(s["code"])}">
        <summary>{e(s["name"])} <span class="state__n">{len(s["links"])}</span></summary>
        <ul class="rows">
{chr(10).join(row({"url":l["url"],"name":l["name"],"host":l.get("host") or re.sub(r"^https?://([^/]+).*$", r"\1", l["url"]),"b":l.get("b","")}) for l in s["links"])}
        </ul>
      </details>'''
      for s in states if s["links"])
    return f"""    <section class="cat" id="guard-by-state" aria-labelledby="h-guard">
      <div class="cat__head">
        <h2 id="h-guard">National Guard benefits, state by state</h2>
        <p class="cat__blurb">Every state and territory runs its own Guard programs — tuition help, tax breaks, and more. Pick yours on the map, or open it from the list.</p>
        <p class="cat__n">{len(states)} states &amp; territories &middot; {total} programs</p>
      </div>
      <div class="usmap" role="group" aria-label="Pick a state or territory">
{tiles}
      </div>
{blocks}
    </section>"""

def tile(c):
    return f"""      <li><button class="tile" data-cat="{c['id']}">
        <span class="tile__n">{e(c['title'])}</span>
        <span class="tile__c">{len(c['links'])}</span>
        <span class="tile__b">{e(BLURB.get(c['id'],''))}</span>
      </button></li>"""

def guard_tile():
    if not guard["states"]: return ""
    total=sum(len(s["links"]) for s in guard["states"])
    return f"""      <li><button class="tile" data-cat="guard-by-state">
        <span class="tile__n">National Guard by State</span>
        <span class="tile__c">{total}</span>
        <span class="tile__b">Your state&#39;s own Guard programs &mdash; tuition help, tax breaks and more, on a map.</span>
      </button></li>"""

TPL = open(f"{HERE}/directory_template.html", encoding="utf-8").read()
guard_total=sum(len(s["links"]) for s in guard["states"])
out = (TPL
  .replace("__TILES__", "\n".join(tile(c) for c in cats) + "\n" + guard_tile())
  .replace("__SECTIONS__", "\n".join(section(c) for c in cats) + "\n" + guard_section())
  .replace("__DATA__", json.dumps(payload, separators=(",",":")))
  .replace("__TOTAL__", str(tot + guard_total))
  .replace("__NCATS__", str(len(cats))))
p=f"{HERE}/index.html"
# newline="\n" so a run on Windows emits the same bytes as a run anywhere
# else — without it every line comes out CRLF and the whole file diffs.
open(p,"w",encoding="utf-8",newline="\n").write(out)
print(f"wrote {p}  ({len(out)/1024:.1f} KB)")
print(f"  {tot} links, {len(cats)} categories")
