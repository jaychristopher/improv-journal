---
key: SA-4
type: story
summary: Every page Google has surfaced receives fewer internal links than every page the footer promotes, and the promotion block cannot see most of them at all
epic: "[[Search alignment]]"
status: To Do
priority: High
labels: [seo, internal-links, promotion, measurement]
tasks:
  - "[[SA-4.1 Let measured demand into the promotion block]]"
---

# SA-4 — The promoted set and the surfaced set do not overlap

`top-guides.ts` is the site's largest internal-link lever: 27 guides, linked
from all 386 built pages. It is also the most carefully argued file in the
repo — three qualifying routes, a difficulty exclusion, a corroboration rule
for single reachable results, each with the bug that caused it written down.

None of that machinery consults the one thing that has actually happened.

Search Console has surfaced 34 pages since February. Exactly one of them is a
promoted guide — `what-is-improv`, the smallest reach in the promoted set, there
on SERP evidence rather than on size. Ten of the twelve are atoms,
techniques and library references — a layer `getTopGuides` never reads,
because it calls `loadBridges()` and nothing else.

So the promotion block is not mis-ranked. It is measuring a different thing
from the thing that came true, and the estimate has never been reconciled
against the outcome.

**The title of this story overstates it.** It was written from a narrower window
where the intersection really was empty; on the full window it is 1 of 27. The
filename is left alone because three wikilinks resolve through it, and the
finding is unchanged in substance: twenty-six of twenty-seven promoted guides
have never been surfaced, and the one that has is the one promotion chose for
reasons other than traffic potential. See
[[SA-14.1 Read the total, not the sample]].
