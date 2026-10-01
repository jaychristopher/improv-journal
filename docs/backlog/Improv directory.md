---
key: DI
type: epic
summary: An archive of improv theaters, classes and shows in sixty US cities that reads the web and keeps itself, with Claude as the engine
status: In Progress
priority: High
labels: [product, directory, engine, seo]
created: 2026-10-01
target: Every major US city has a page listing the improv theaters, schools and regular shows a person could go to, each verified and linked, ranked by one rubric, and re-read by an engine without anyone opening a file
stories:
  - "[[DI-1 The archive and the engine]]"
  - "[[DI-2 Nobody can see whether the city pages are found]]"
---

# DI — Improv directory

The owner's goal of 2026-10-01: an archive of improv shows and classes in
every major US city, searched and updated daily and autonomously with Claude
as the engine, fully ranked, linking out to the organisations' own sites.

What exists now: /improv-near-you and /improv-near-you/[city] for sixty
cities (data/directory/cities.json), read from data/directory/<city>.json
by src/lib/directory.ts; scripts/directory-engine.mjs, which asks Claude to
search the live web for a city, verifies every website answers, merges with
the archive (an entry unseen three passes running is dropped; a closed venue
goes at once), ranks by the rubric and writes the file; and
.github/workflows/directory-engine.yml, which runs it daily on the next ten
cities of the cycle and commits what changed. The first reading of every city
was made by Claude in a session and imported through the same checks.

The demand (Ahrefs, US, 2026-09-30): "improv classes near me" 3,600 a month,
"improv near me" 800, "improv classes" 1,300, "improv classes nyc" 700,
chicago and los angeles 150 each. Nothing is registered in ROUTE_KEYWORDS
until Search Console shows the pages (DI-2).

## Standing rules for this epic

Nothing is listed by hand. A reader is never sent to a site nobody could
reach. A city with fewer than three verified places is served and noindexed.
Every number on a card is Ahrefs, Search Console or the archive's own log on
a date.

## Execution protocol

Same as [[Search alignment]]: stories in `sequence`, tasks in `sequence`,
honour `executable`, record the `Outcome`. `npm run backlog` lists what is
ready.
