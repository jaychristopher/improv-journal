---
key: SA-21
type: story
summary: Two SERPs promoted on the same SERP-floor rule give a low-DR page 194 visits a month and 7 visits a month, and nothing records the difference
epic: "[[Search alignment]]"
status: To Do
priority: High
labels: [seo, serp, promotion, traffic-distribution]
tasks:
  - "[[SA-21.1 Record what the reachable position is worth]]"
---

# SA-21 — Reachable is not valuable

`top-guides.ts` promotes a guide from all 386 pages when `serp_min_dr` is under
6, and the reasoning is explicit and good: "one DR 2 page holding a top-ten
position is a demonstration that Google will rank a site with no authority for
that term, which is the exact question being asked here."

It is the exact question — and it is half of it. Getting a position and getting
traffic are different things, and the difference between them is enormous.

Two SERPs, both promoted on this rule, read on 2026-09-25:

|                                 | `theatre games`               | `del close`                 |
| ------------------------------- | ----------------------------- | --------------------------- |
| Recorded floor                  | `serp_min_dr: 5`              | `serp_min_dr: 2`            |
| Visible traffic on the page     | 4,325                         | 1,071                       |
| Share taken by the top result   | 41%                           | **95%** (Wikipedia)         |
| What the lowest-DR result earns | **194 / month** at position 7 | **7 / month** at position 8 |

The same evidence — a DR 9 page proving the results page is open — is worth 194
visits a month on one and 7 on the other. A factor of twenty-eight, on two terms
the promotion block treats identically.

`del close` is the more striking case because its floor is the _best_ on the
site. It is the page SA-6.1 singles out, promoted on the strongest reachability
evidence the corpus has, into a results page where Wikipedia takes 95% of
everything and position 8 is worth seven visits.
