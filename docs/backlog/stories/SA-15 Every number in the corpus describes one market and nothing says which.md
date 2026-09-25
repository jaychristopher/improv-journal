---
key: SA-15
type: story
summary: All 317 declared keyword figures were retrieved for the United States, nothing in the schema or CLAUDE.md records that, and 56% of the site's clicks come from somewhere else
epic: "[[Search alignment]]"
status: To Do
priority: Medium
labels: [seo, market, schema, measurement]
tasks:
  - "[[SA-15.1 Record the market the figures describe]]"
---

# SA-15 — One market, unrecorded

Every `volume`, `difficulty` and `traffic_potential` in `content/bridges/*.md`
was retrieved from Ahrefs for the United States. So was every figure in every
card of this epic. `PROMOTION_FLOOR = 10_000` and `STRANDED_DIFFICULTY = 30` are
thresholds against US numbers, and `npm run seo:audit` buckets on the same.

Nothing says so. CLAUDE.md's SEO discipline is the longest section in the file
and it names every field, the rule against inventing numbers, and the meaning of
absence — and never mentions a country. `schema.ts` does not carry the market
either. Anyone refreshing a stale volume could pull a different market and no
guard would notice.

Two measurements make that worth fixing rather than noting.

US search volume is roughly three quarters of global for this site's terms —
"improv games" is 3,100 of about 4,250 worldwide, "theatre games" 1,400 of about
1,850. So every threshold in the repo sits about a third below where it would if
it counted the demand that actually exists.

And the audience is not American. Of 36 clicks since April, **16 are US**. Great
Britain and Australia take five each, India three. Fifty-six per cent of this
site's converted traffic comes from outside the market all of its numbers
describe.
