import json, html, re
import os
HERE=os.path.dirname(os.path.abspath(__file__))
S=HERE
cats=json.load(open(f"{HERE}/data.json"))
e=lambda s: html.escape(s, quote=True)

ORDER=["important-links","directories","health","housing","financial","career","education",
       "family","care-packages-wounded","online-physical-services","travel","entertainment","online-shopping"]
cats.sort(key=lambda c: ORDER.index(c["id"]) if c["id"] in ORDER else 99)

# Shorter titles - the blurb carries the detail, so the tile stays scannable.
RENAME={"travel":"Travel & Recreation",
        "care-packages-wounded":"Care Packages & Wounded Support",
        "online-physical-services":"Everyday Services",
        "important-links":"Start Here"}
for c in cats: c["title"]=RENAME.get(c["id"], c["title"])

BLURB={
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
payload=[{"id":c["id"],"t":c["title"],"n":len(c["links"]),
          "k":CAT_K.get(c["id"],""),
          "l":[{"n":l["name"],"u":l["url"],"h":l["host"],"k":l["k"]} for l in c["links"]]}
         for c in cats]

def section(c):
    rows="\n".join(
      f'      <li><a class="row" href="{e(l["url"])}" target="_blank" rel="noopener">'
      f'<span class="row__n">{e(l["name"])}</span>'
      f'<span class="row__h">{e(l["host"])}</span></a></li>'
      for l in c["links"])
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

def tile(c):
    return f"""      <li><button class="tile" data-cat="{c['id']}">
        <span class="tile__n">{e(c['title'])}</span>
        <span class="tile__c">{len(c['links'])}</span>
        <span class="tile__b">{e(BLURB.get(c['id'],''))}</span>
      </button></li>"""

TPL = open(f"{HERE}/directory_template.html", encoding="utf-8").read()
out = (TPL
  .replace("__TILES__", "\n".join(tile(c) for c in cats))
  .replace("__SECTIONS__", "\n".join(section(c) for c in cats))
  .replace("__DATA__", json.dumps(payload, separators=(",",":")))
  .replace("__TOTAL__", str(tot))
  .replace("__NCATS__", str(len(cats))))
p=f"{HERE}/index.html"
open(p,"w",encoding="utf-8").write(out)
print(f"wrote {p}  ({len(out)/1024:.1f} KB)")
print(f"  {tot} links, {len(cats)} categories")
