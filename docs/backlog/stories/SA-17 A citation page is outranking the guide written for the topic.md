---
key: SA-17
type: story
summary: Google serves the library's book citation for all fifteen Viewpoints queries, including the four the dedicated guide explicitly targets, and the guide takes none of them
epic: "[[Search alignment]]"
status: Done
priority: High
labels: [seo, cannibalisation, library, collision]
tasks:
  - "[[SA-17.1 Settle who owns Viewpoints, and check the pattern]]"
---

# SA-17 — The citation is beating the guide

`/viewpoints` is a guide. It declares six target keywords, carries a `winnable`
verdict at `serp_min_dr: 6`, and is promoted from all 386 pages because its
results page is one of the three most reachable on the site.

Across the full Search Console window it has **zero impressions on every keyword
it declares**.

All fifteen of them go to `/library/ref-viewpoints-bogart-landau` — the citation
page for the book. Anne Bogart viewpoints, viewpoints theatre, viewpoints
acting, viewpoints acting exercises: four of the six terms the guide was written
to win, served by a reference entry instead, at positions between 53 and 72.

That one citation page is 22% of every impression this site has ever had.

The mechanism is not mysterious. The guide is titled "Anne Bogart Viewpoints:
The Nine Channels" and the citation "The Viewpoints Book — Anne Bogart & Tina
Landau (2005)". Both lead with the same entity, and Google picked one.

What makes it structural rather than unlucky is that nothing could have caught
it. CLAUDE.md names `parent` as the collision test, the guide declares `parent:
"viewpoints"` on four of its keywords, and the citation is an atom — so it has
no `parent`, no keywords and no verdict, and the test has nothing to compare.
The same shape shows up on Spolin, where the book citation takes six queries and
the `/viola-spolin` guide takes none.
