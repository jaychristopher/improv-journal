---
key: SA-22
type: story
summary: Every reading the site has taken is impressions and positions; how many of its 384 URLs Google holds, and why it dropped the rest, has never been read, and it is the one fact that decides whether the constraint on 32 silent guides is ranking or indexing
epic: "[[Search alignment]]"
status: To Do
priority: High
labels: [seo, indexing, search-console, evidence]
tasks:
  - "[[SA-22.1 Read the Page indexing report and split the silent guides by it]]"
---

# SA-22 — Nothing has ever read whether the site is indexed

Thirty-two of the forty guides old enough to have been crawled have never
appeared in Search Console (`seo-audit.mjs`, "Never surfaced"), carrying 99k of
claimed potential between them. Every explanation the repo has written for that
— authority, topical distance, the generic half of the corpus against the improv
half — assumes the pages are in the index and losing. Nothing has checked the
assumption.

The apparatus cannot see it from here. Ahrefs' Search Console connection
(`gsc-pages`, `gsc-keywords`) returns rows only for pages that have had an
impression, so a page that was crawled and never indexed and a page that was
indexed and never ranked look identical: absent. Ahrefs' own index sees the
whole domain ranking for nothing in the US top 100 (2026-09-28), so it cannot
tell either. The Page indexing report in Search Console itself is the only
instrument that can, and reading it takes a sign-in this loop does not do — the
attempt on 2026-09-28 stopped at Google's "Verify it's you" prompt.

What it decides is not small. If the silent guides are indexed, the site's
problem is ranking, and the levers are the ones already in play: authority,
links, the subject the pages are written on. If a meaningful share of them are
"Crawled – currently not indexed", the problem is that Google looked and
declined, and the lever is consolidation and internal weight, not another
reading of a results page. The two strategies do not overlap, and the repo has
been running the first without knowing it was the right one.

The expected shape is known in advance, which is what makes the reading cheap to
interpret: 17 pages are noindex by design (search, one source, fifteen picker
combinations), 32 library URLs moved on 2026-09-24 and should show as redirects
until Google forgets the old paths, and the 404 page is a 404. Anything else on
the not-indexed side is information.
