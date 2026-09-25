---
key: SA-16
type: story
summary: Across the full window the library is 8% of the site and 33% of its impressions, a 3.9x lift, while atoms are 45% of the site and 20% of impressions at 0.4x
epic: "[[Search alignment]]"
status: To Do
priority: High
labels: [seo, library, prioritisation, measurement]
tasks:
  - "[[SA-16.1 Back the layer that returns four times its size]]"
---

# SA-16 — Four times its size

Seventeen firings of this audit read Search Console over one window,
2026-06-01 → 2026-09-25, and saw twelve pages. Widened to 2026-02-01 the same
endpoint returns **34 pages, 159 impressions and 83 distinct keywords** — nearly
three times as much evidence, from the same tool, for the sake of a start date.

Read across layers, the result is not the one this backlog has been assuming:

| Layer       | Pages surfaced | Impressions | Keywords | Share of impressions | Share of site | Lift     |
| ----------- | -------------- | ----------- | -------- | -------------------- | ------------- | -------- |
| Bridges     | 9              | 60          | 24       | 38%                  | 20%           | 1.9×     |
| **Library** | **7**          | **52**      | **29**   | **33%**              | **8%**        | **3.9×** |
| Atoms       | 12             | 32          | 17       | 20%                  | 45%           | **0.4×** |
| Hubs        | 2              | 7           | 6        | 4%                   | 6%            | 0.8×     |
| Paths       | 1              | 1           | 1        | 1%                   | 3%            | 0.2×     |

CLAUDE.md says it in the architecture section and nobody has ever acted on it:
"`reference` atoms are the library — books, papers, a Substack — and they punch
above their weight in search." They return **3.9× their share of the corpus**,
and they do it from 32 pages that carry no keyword, no verdict and no parent.

The single best page on the site by keyword diversity is
`/library/ref-viewpoints-bogart-landau`: **15 distinct queries and 35
impressions**, 22% of everything the site has been shown for. It has not
appeared once in seventeen firings of this audit.
