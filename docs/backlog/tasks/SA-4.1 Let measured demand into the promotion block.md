---
key: SA-4.1
type: task
summary: The best-ranked page on the site gets 26 internal links and a page that has never been surfaced gets 104, because promotion ranks estimates and never reads the outcome
epic: "[[Search alignment]]"
parent: "[[SA-4 The pages that rank and the pages that get promoted are disjoint sets]]"
status: To Do
priority: High
sequence: 1
executable: agent
estimate: 120m
labels: [seo, internal-links, promotion, measurement]
impact: 4
radius: 5
opportunity: 20
complexity: 3
roi: 6.7
blocked_by: []
blocks: []
files:
  - src/lib/top-guides.ts
  - src/lib/__tests__/promotion-reaches-pages.test.ts
---

# SA-4.1 — Let measured demand into the promotion block

## What was found

GSC via Ahrefs `gsc-pages`, project 9723388, 2026-06-01 → 2026-09-25. Twelve
pages have been surfaced in four months:

| Page                                         | Layer  | Position | Impr | Inbound internal links |
| -------------------------------------------- | ------ | -------- | ---- | ---------------------- |
| `/types-of-listening`                        | bridge | **6.9**  | 15   | **26**                 |
| `/how-it-works/performance-state`            | atom   | 49.8     | 8    | 30                     |
| `/practice/techniques/pattern-break`         | atom   | **9.3**  | 3    | **17**                 |
| `/tools/exercise-picker/beginner`            | tool   | 56.0     | 2    | —                      |
| `/team-building-questions`                   | bridge | 86.0     | 1    | 23                     |
| `/practice/vocabulary/justification`         | atom   | **10.0** | 1    | 38                     |
| `/practice/vocabulary/base-reality`          | atom   | 50.0     | 1    | —                      |
| `/practice/techniques/space-work`            | atom   | 29.0     | 1    | —                      |
| `/practice/techniques/pacing`                | atom   | 90.0     | 1    | —                      |
| `/library/ref-sawyer-group-genius`           | atom   | 43.0     | 1    | —                      |
| `/library/ref-attention-and-effort-kahneman` | atom   | **12.0** | 1    | **0**                  |
| `/how-it-works/diagnosis/blocking`           | atom   | 63.0     | 1    | —                      |

Against the promotion block, counted in `.next/server/app` across 386 pages:

| Promoted guide                | Reach   | Impressions ever | Inbound internal links |
| ----------------------------- | ------- | ---------------- | ---------------------- |
| `/theatre-games`              | 2,500   | **0**            | **128**                |
| `/public-speaking-tips`       | 143,000 | **0**            | **112**                |
| `/conversation-starters`      | 146,000 | **0**            | **104**                |
| `/would-you-rather-questions` | 122,000 | **0**            | **101**                |

Three things fall out of it.

**The two sets are disjoint.** Twenty-seven guides are linked from every page
on the site. Twelve pages have ever been surfaced. The intersection is empty.
That is not a near-miss to be tuned; it is an estimate that has never once been
reconciled against an outcome.

**Ten of the twelve cannot be promoted at all.** `getTopGuides` calls
`loadBridges()`, so only the guide layer is eligible. Atoms, techniques,
vocabulary and library references are structurally invisible to the largest
internal-link lever on the site — and they are where five of the site's six
best positions are. `ref-attention-and-effort-kahneman` ranks at position 12
with **zero** inbound internal links, on the same day it was rebuilt into an
affiliate gateway.

**The reach route never reads the SERP floor, even when it is recorded.**
Fifteen of the 17 reach-route promotions have no `serp_top10_dr`, only a
`serp_min_dr` — and those floors are 11 to 40 against a site at DR 0.2:
conversation-starters 28, public-speaking-tips 27, would-you-rather 24,
icebreaker-questions-for-work 31, how-to-be-a-better-manager 40. The file
applies `CORROBORATING_REACHABLE` to small pages precisely because a single
weak result proves little, then promotes the largest pages on a number no
SERP reading supports. The asymmetry the file documents is about _distribution
present vs absent_; this one is different and undocumented — reach bypasses
the floor it already has in hand.

## What this task is not

It is not "delete the question pages from the footer." Their traffic potential
is real and four months at DR 0.2 is not long enough to call a term lost. The
finding is that the block has no input from measurement at all, and the fix is
to give it one — not to invert it.

## Run

1. **Make the promotion block able to see a surfaced page.** The eligibility
   set is `loadBridges()`. Decide, and write down, whether an atom that ranks
   should be promotable. If yes, the smallest honest change is a measured-demand
   route alongside the three estimate routes — a page GSC has surfaced at a
   position worth converting qualifies on that evidence, whatever layer it is
   in. If no, say why in the file's comment block, because the next reader will
   ask.
2. **Read `serp_min_dr` on the reach route.** A guide qualifying only on reach,
   with a recorded floor well above the site's DR and no distribution, is being
   promoted against measured evidence rather than in the absence of it. Do not
   invent a threshold: report the distribution of `serp_min_dr` across the 17
   first, then pick a cut and justify it the way `PROMOTE_IF_FLOOR_UNDER`
   justifies 6.
3. **Fix the zero.** `/library/ref-attention-and-effort-kahneman` has no inbound
   internal links and ranks at 12. Whatever else changes, that is a one-line
   defect. Check whether other `reference` atoms share it — the library "punches
   above its weight in search" per CLAUDE.md, and this is the first measurement
   that agrees.
4. **Guard the reconciliation, not the ranking.** A test that froze today's
   promoted set would be the `nav-reach.test.ts` mistake again — asserting the
   mechanism instead of the outcome. Assert instead that the promoted set and
   the GSC-surfaced set are not disjoint, with the current count recorded and
   dated. If that is still 0 after the change, the change did nothing.

## Verify

- The intersection of promoted guides and GSC-surfaced pages is greater than 0,
  and the test records the number and the date.
- `/library/ref-attention-and-effort-kahneman` has at least one inbound
  internal link.
- `npm run check` green. `flight-share`, `link-tracking`, `anchor-diversity`
  and `promotion-reaches-pages` will all move — re-date each with the account
  of why, do not raise a threshold to clear a failure.
- `npm run seo:rendered` reports 0 critical, as before.
- Re-read `gsc-pages` after 30 days. The metric is whether newly promoted pages
  gain impressions; the control is whether the demoted ones lose them.

## Scoring

- **impact 4** — this reallocates the single largest internal-link lever toward
  pages Google has already chosen to show, which is the cheapest traffic
  available at DR 0.2 and needs no new authority. Not 5: the absolute demand is
  34 impressions across twelve pages, so the near-term number is small, and
  internal links raise a page's ceiling rather than guaranteeing a position.
  The case for 4 is that every surfaced page is under-linked relative to every
  promoted one, without exception — the pattern is total, not anecdotal.
- **radius 5** — the promotion block renders on all 386 pages, and step 1
  decides whether an entire layer of 205 atoms is eligible for promotion at
  all. There is nothing wider on this site.
- **opportunity 20**
- **complexity 3** — no content and no URL changes, so nothing needs a redirect
  or a reindex, and the file is well-commented enough to change safely. Not 2:
  admitting a new layer to the footer changes the flight payload and four dated
  guards at once, and the judgement in step 2 is the kind the file's own
  history shows going wrong twice. Not 4: every part of it is reversible in one
  commit.
- **roi 6.7** — level with SA-2.1 and below SA-1.1's 8.0. SA-1.1 stays ahead
  correctly: it converts a ranking the site already holds for less work. This
  one and SA-2.1 are both about making a lever legible before pulling it.

## Outcome

_Not started._
