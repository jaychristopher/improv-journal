---
key: SA-11
type: story
summary: The traditions routes carry 468 inbound internal links and no search metadata, and io theater chicago at difficulty 1 and annoyance theatre at difficulty 0 are the softest terms twelve audit firings have turned up
epic: "[[Search alignment]]"
status: Done
priority: Medium
labels: [seo, entities, traditions, metadata]
tasks:
  - "[[SA-11.1 Measure the five school pages and settle the two that double a guide]]"
---

# SA-11 — The schools nobody measured

`/traditions` holds five pages — Johnstone, Spolin, iO and the Harold, Upright
Citizens Brigade, the Annoyance — and they are route pages, `page.tsx` files
rather than content files. They have no frontmatter, so they have no
`target_keywords`, no `serp_verdict` and no `parent`, and no audit in the repo
counts them.

They are not marginal. Between them they receive **468 inbound internal links**,
and `/traditions/johnstone` alone takes 143 — more than any promoted guide
except the top three.

They are also the one part of this corpus where the existing apparatus would
work. SA-10.1 established that the craft vocabulary the site ranks for is below
Ahrefs' reporting floor and returns blank for every field the repo's thresholds
test. Entities are different: people and institutions have names, and names have
volume, difficulty and a parent topic. Asked about all five, Ahrefs answered for
all five.

What it answered is the reason for this story. `io theater chicago` is
difficulty **1** with 1,700 traffic potential; `annoyance theatre` is difficulty
**0** with 700. Those are the softest terms twelve firings of this audit have
found, the site already has a page for each, and neither page has ever been
looked at.
