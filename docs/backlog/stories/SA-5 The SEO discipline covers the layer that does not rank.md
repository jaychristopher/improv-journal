---
key: SA-5
type: story
summary: Every keyword, SERP and collision field lives on BridgeFrontmatter, so 212 indexable atom URLs carry no search metadata at all — and they are where the site's best positions are
epic: "[[Search alignment]]"
status: To Do
priority: Medium
labels: [seo, schema, atoms, measurement]
tasks:
  - "[[SA-5.1 Measure the atoms Google has already surfaced]]"
---

# SA-5 — The discipline covers the layer that does not rank

CLAUDE.md devotes its longest section to the SEO discipline: `target_keywords`
with volume, difficulty and traffic potential; `serp_checked`, `serp_min_dr`
and `serp_verdict`; and `parent` as the collision test to run before creating a
page that overlaps an existing one. It is careful, it is well enforced, and
`src/lib/schema.ts` declares every one of those fields on `BridgeFrontmatter`
and none of them on `AtomFrontmatter`.

So the discipline reaches 78 files. The sitemap carries 366 URLs, 212 of them
atoms — laws, principles, techniques, exercises, formats, vocabulary and
library references — and every one is indexable, and not one carries a keyword,
a verdict or a parent topic.

Search Console says that is the wrong way round. Of the twelve pages surfaced
between 2026-06-01 and 2026-09-25, ten are atoms, and two of the site's three
page-one positions are atom pages. `scripts/seo-audit.mjs` already says so in a
comment — atoms "also hold the best positions on the site, 6 to 12" — but a
comment is an observation, not a mechanism. Nothing reads them, so nothing can
find the next one.

This is the gap the epic's own target names: total alignment with **all**
entries that we can capture, not the quarter of them the schema happens to
cover.
