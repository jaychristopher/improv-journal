---
key: SA-7
type: story
summary: Every library URL changed on 2026-09-24, two of them held indexed positions, and the only evidence the migration completed would be a GSC reading nobody has scheduled
epic: "[[Search alignment]]"
status: To Do
priority: High
labels: [seo, redirects, indexing, measurement]
tasks:
  - "[[SA-7.1 Watch the library URL migration land]]"
---

# SA-7 — Thirty-two URLs moved and nothing is watching

On 2026-09-24 the `ref-` prefix came off every library URL.
`/library/ref-impro-johnstone` became `/library/impro-johnstone`, 32 times.

The engineering is clean, and this story is not a complaint about it. The
redirects are generated from the atom list rather than hand-maintained, so none
can be forgotten; they are permanent; `library-slug.ts` carries the reasoning
and names the risk out loud — "these are the best-ranking pages on the site and
several have been indexed for months". The build, the sitemap, `llms.txt` and
the search index contain zero references to the old paths. Internally the
migration is finished.

Externally it has not started. A 301 is a request, not a transfer: Google has to
recrawl each old URL, follow it, and move the accumulated signal. That takes
weeks, and during it the only two library URLs Google had indexed — one of them
holding **position 12** — are in flight.

Nothing in the repo records that this happened or watches it finish. And because
three other cards in this epic instruct a re-read of GSC in 30 days, the next
reader will see two URLs disappear from the report. Without the migration date
written down, the obvious reading of that is a ranking loss.
