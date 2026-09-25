---
key: SA-10
type: story
summary: Seven of the ten queries the site actually ranks for have no traffic_potential, no difficulty and no parent_topic in Ahrefs, and those three fields are what every threshold in the repo is built on
epic: "[[Search alignment]]"
status: To Do
priority: High
labels: [seo, measurement, demand-model, long-tail]
tasks:
  - "[[SA-10.1 Source long-tail demand from GSC instead of from a tool that cannot see it]]"
---

# SA-10 — The instrument cannot see the demand

Every prioritisation decision in this repository runs on three Ahrefs fields.
`top-guides.ts` promotes on `traffic_potential` against a floor of 10,000 and
excludes on `difficulty` above 30. `seo-audit.mjs` ranks and buckets on the same
two. CLAUDE.md names `parent` as the collision test and says plainly that
"`traffic_potential` beats `volume` for prioritising".

Search Console says the site has ranked for thirteen queries in four months.
Asked about ten of them, Ahrefs returns **no `traffic_potential` for seven, no
`difficulty` for seven, and no `parent_topic` for seven**. Three come back at
volume 0 — including the query the site holds **position 10** for.

This is not a complaint about Ahrefs. A keyword tool has a reporting floor, and
that floor is above where this site currently lives. The problem is that the
repo built every threshold on fields that are empty for most of what it
actually captures, and then reads those thresholds as though a blank meant
"worthless" rather than "below the instrument".

The one query in the set with a healthy figure makes the point sharper than the
blanks do. "Space work" returns 7,500 traffic potential under the parent topic
**"spaces"** — office and workspace searches. The site ranks 29th on it for
improv space work. Where the field is populated it can be confidently about a
different subject entirely.
