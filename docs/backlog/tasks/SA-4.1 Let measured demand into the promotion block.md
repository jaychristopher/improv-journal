---
key: SA-4.1
type: task
summary: The best-ranked page on the site gets 26 internal links and a page that has never been surfaced gets 104, because promotion ranks estimates and never reads the outcome
epic: "[[Search alignment]]"
parent: "[[SA-4 The pages that rank and the pages that get promoted are disjoint sets]]"
status: Done
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
| `/library/ref-attention-and-effort-kahneman` | atom   | **12.0** | 1    | 38 (at its live URL)   |
| `/how-it-works/diagnosis/blocking`           | atom   | 63.0     | 1    | —                      |

Against the promotion block, counted in `.next/server/app` across 386 pages:

| Promoted guide                | Reach   | Impressions ever | Inbound internal links |
| ----------------------------- | ------- | ---------------- | ---------------------- |
| `/theatre-games`              | 2,500   | **0**            | **128**                |
| `/public-speaking-tips`       | 143,000 | **0**            | **112**                |
| `/conversation-starters`      | 146,000 | **0**            | **104**                |
| `/would-you-rather-questions` | 122,000 | **0**            | **101**                |

Three things fall out of it.

**The two sets barely intersect, and the one overlap is the tell.** Twenty-seven
guides are linked from every page on the site. Read over the full window
(2026-02-01 → 2026-09-25, per [[SA-14.1 Read the total, not the sample]]) nine
bridges have ever been surfaced, and **exactly one of them is promoted**:
`what-is-improv`.

An earlier draft of this card said the sets were disjoint. On the narrow window
first used they were; on the full window the intersection is 1 of 27. The
correction sharpens the finding rather than softening it — `what-is-improv`
carries the _smallest_ reach in the promoted set, 250, and it is there via the
SERP-width route rather than on traffic potential. The one promoted page that
has ever surfaced is the one promotion did not choose for its size.

**Ten of the twelve cannot be promoted at all.** `getTopGuides` calls
`loadBridges()`, so only the guide layer is eligible. Atoms, techniques,
vocabulary and library references are structurally invisible to the largest
internal-link lever on the site — and they are where five of the site's six
best positions are. `ref-attention-and-effort-kahneman` ranks at position 12
at position 12 — though see the correction in step 3 below: its link count was
my error, not a defect.

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
3. **Do not chase the zero — it was mine.** An earlier draft of this card said
   `/library/ref-attention-and-effort-kahneman` had no inbound internal links.
   That was a counting error: the `ref-` prefix was dropped from library URLs on
   2026-09-24 and I counted the pre-redirect path. The live page,
   `/library/attention-and-effort-kahneman`, has 38 inbound links — above the
   library layer's median of 23 and above `/types-of-listening`'s 26. No library
   page has zero. The library's link position is healthy; see [[SA-7.1 Watch the
library URL migration land]] for what is actually at stake there.
4. **Guard the reconciliation, not the ranking.** A test that froze today's
   promoted set would be the `nav-reach.test.ts` mistake again — asserting the
   mechanism instead of the outcome. Assert instead the size of the overlap
   between the promoted set and the GSC-surfaced set, with the count recorded
   and dated. It is **1 of 27** today; if it is still 1 after the change, the
   change did nothing.

## Verify

- The intersection of promoted guides and GSC-surfaced pages is greater than 1,
  and the test records the number and the date.
- `npm run check` green. `flight-share`, `link-tracking`, `anchor-diversity`
  and `promotion-reaches-pages` will all move — re-date each with the account
  of why, do not raise a threshold to clear a failure.
- `npm run seo:rendered` reports 0 critical, as before.
- Re-read `gsc-performance-history` **and** `gsc-pages` after 30 days, from
  2026-02-01. The metric is clicks and CTR sitewide plus whether newly promoted
  pages gain impressions; the control is whether the demoted ones lose them.
  Reading `gsc-pages` alone measures about 2% of the site's impressions.

## Scoring

- **impact 4** — this reallocates the single largest internal-link lever toward
  pages Google has already chosen to show, which is the cheapest traffic
  available at DR 0.2 and needs no new authority. Not 5: the absolute demand is
  159 impressions across 34 pages, so the near-term number is small, and
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

**Done 2026-09-25.** The promoted set went from 24 guides to 23, and the
overlap with what Google has actually shown from 1 to 2 — the block can now
see an outcome.

**Step 1, measured demand as a route — for guides, with the atom answer
written down.** `top-guides.ts` gained a fourth route beside size, width and
depth: a guide Search Console has shown inside the top ten qualifies on that
alone (`PROMOTE_IF_SURFACED_WITHIN = 10`). That admits exactly
`types-of-listening`, the best-positioned page on the site at 6.9, which every
estimate the block ran on had excluded — reach 400, floor 21, one result under
DR 50. Ten rather than fifty is argued in the file: page one is a
demonstration, page four is not, and three guides at 37–48 are left to the
30-day re-read. Atoms stay outside the block for now and the reason is in the
same comment: the labels come from a guide's keywords and the hrefs from
`/${slug}`, neither exists for an atom, and where an atom's SEO fields live is
SA-5.1's unresolved question. When that lands, this route is their door.

The "surfaced" fact lives in one dated place, `src/lib/gsc-surfaced.mjs`, read
by both the promotion block and the audit — which had kept its own hand-typed
copy under a different date. Refresh it from `gsc-pages` from 2026-02-01.

**Step 2, the reach route reads the floor it already had.** Across the
seventeen reach-route guides the recorded floors were
`[2, 8, 11, 12, 15, 15, 17, 18, 18, 19, 20, 20, 24, 27, 28, 31, 40]`. The cut
is the site's own line, not a new one: `REACH_ROUTE_MAX_FLOOR = 30`, mirroring
`STRANDED_DIFFICULTY = 30`, because the floor is the better-measured cousin of
difficulty — read off the results page rather than estimated from backlinks.
It removes `icebreaker-questions-for-work` (31) and
`how-to-be-a-better-manager` (40): neither with a distribution recorded,
neither ever surfaced, both against a site at DR 0.2. An `authority` verdict
still removes at any floor; an unrecorded floor still admits on size, because
absent data is not evidence of being shut out.

**Step 3 was my error, corrected earlier in this card.** No library page has
zero inbound links; the "zero" was the pre-redirect URL being counted.

**Step 4, the guard.** `promotion-overlap.test.ts` asserts the overlap between
the promoted set and the GSC-surfaced set — 2 today, named — and that every
guide Google shows on page one is promoted. `promotion-reaches-pages` was
re-dated rather than lifted: it encoded "above the floor ⇒ linked", which the
reach cut breaks on purpose for two guides, so it now skips guides excluded on
a recorded floor and asserts that set by name, so it cannot grow unseen. No
constant in it changed.

**What moved.** Promoted 24 → 23. `anchor-diversity` did not need re-dating
this time; the footer's share shifted within its ceilings. `npm run check`
green, 276 files, 1443 tests.

**Re-read in 30 days**, per CLAUDE.md's rule: `gsc-performance-history` for
clicks and CTR, `gsc-pages` from 2026-02-01 for whether `types-of-listening`
gained impressions and whether the two demoted guides lost any — they had
none to lose.
