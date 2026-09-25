---
key: SA-14
type: story
summary: Search Console reports 6,602 impressions and 33 clicks over the window this backlog was built on, and the per-query table it was built from shows 35 impressions and none of the clicks
epic: "[[Search alignment]]"
status: To Do
priority: High
labels: [seo, measurement, gsc, correction]
tasks:
  - "[[SA-14.1 Read the total, not the sample]]"
---

# SA-14 — The sample was read as the total

Thirteen firings of this audit have cited the same evidence: thirteen queries,
twelve pages, 35 impressions, no clicks. It is the backbone of SA-1.1, SA-4.1,
SA-5.1, SA-6.1, SA-10.1, SA-1.2 and SA-1.3.

It is a half-percent sample, and nobody checked the total.

`gsc-performance-history` for the same window returns **6,602 impressions and
33 clicks**. Since April the site has taken **7,755 impressions and 36 clicks**.
Search Console withholds queries below a privacy threshold, so the per-query and
per-page tables show only what clears it — here 35 impressions of 6,602, and
none of the clicks at all.

Two things follow, and they point in opposite directions.

The cheerful one: **the site converts.** August alone took 19 clicks at a CTR of
1.53%. Every card in this epic that says or implies the site earns nothing from
search is overstating a real but narrower finding about specific identified
pages.

The uncomfortable one: **the visible sample is not representative and cannot be
made so.** `gsc-anonymous-queries`, the endpoint built to recover the withheld
portion, returns empty for this project — because it resolves queries against
Ahrefs' index, and SA-10.1 established that this site's vocabulary sits below
that index's floor. Both instruments are blind to the same 99.5%, for two
unrelated reasons.
