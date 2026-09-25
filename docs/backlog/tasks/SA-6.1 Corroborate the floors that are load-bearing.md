---
key: SA-6.1
type: task
summary: Nine guides are promoted to 386 pages on a SERP floor under DR 6, and for most of them the top-ten distribution behind that number was never recorded
epic: "[[Search alignment]]"
parent: "[[SA-6 The number that decides what gets promoted rests on one unrecorded observation]]"
status: To Do
priority: High
sequence: 1
executable: mixed
estimate: 90m
labels: [seo, serp, evidence, promotion]
impact: 3
radius: 4
opportunity: 12
complexity: 2
roi: 6.0
blocked_by: []
blocks: []
files:
  - content/bridges/21-questions-game.md
  - content/bridges/how-to-be-funny.md
  - content/bridges/how-to-stop-caring-what-people-think.md
  - content/bridges/theatre-games.md
  - content/bridges/confidence-building-exercises.md
  - src/lib/top-guides.ts
---

# SA-6.1 — Corroborate the floors that are load-bearing

## What was found

Winnable guides whose `serp_min_dr` is under 6 — the bar `top-guides.ts` sets
for "a site with essentially no domain authority is already ranking there", and
which promotes the page to every one of 386 pages:

| TP         | min DR | KD  | Created    | Guide                                  | Distribution recorded? |
| ---------- | ------ | --- | ---------- | -------------------------------------- | ---------------------- |
| **44,000** | **2**  | 8   | 2026-08-22 | `21-questions-game`                    | **no**                 |
| 4,300      | 1      | 34  | 2026-04-05 | `how-to-stop-overthinking`             | yes                    |
| 3,500      | 2      | 2   | 2026-04-05 | `how-to-be-funny`                      | no                     |
| 3,000      | 4      | 2   | 2026-04-22 | `how-to-stop-caring-what-people-think` | no                     |
| 2,500      | 5      | 3   | 2026-08-22 | `theatre-games`                        | no                     |
| 1,000      | 2      | 4   | 2026-08-23 | `del-close`                            | yes                    |
| 700        | 1      | 8   | 2026-08-22 | `confidence-building-exercises`        | no                     |
| 700        | 1      | 6   | 2026-04-13 | `how-to-overcome-fear-of-failure`      | yes                    |
| 600        | 0      | 0   | 2026-04-22 | `how-to-be-witty`                      | no                     |

For contrast, the four largest guides by traffic potential:

| TP      | min DR | Guide                              |
| ------- | ------ | ---------------------------------- |
| 146,000 | 28     | `conversation-starters`            |
| 143,000 | 27     | `public-speaking-tips`             |
| 122,000 | 24     | `would-you-rather-questions`       |
| 69,000  | 11     | `questions-to-get-to-know-someone` |

Two things fall out of it.

**One page is an order of magnitude ahead of the rest, and its evidence is the
thinnest.** `21-questions-game` carries 44,000 traffic potential against a floor
of DR 2. The next-best proven-open page is 4,300 — ten times smaller. It is also
the only guide on the site qualifying on _both_ promotion routes, reach and
floor. And it has no `serp_top10_dr`, so the corroboration rule
`top-guides.ts` wrote specifically to stop a lone weak result carrying a page
cannot run on it. The number doing the most work in the promotion block is the
one with the least behind it.

**48 of 71 verdicts have no distribution at all.** The rule only applies where
the distribution exists, so for two thirds of the guide layer it is inert. The
audit already prints "6 of these rest on a single reachable result — treat the
minimum with care" and nothing acts on the warning.

## The theme tension, stated rather than buried

`21 questions game` is party content. It is the furthest thing on this site from
what the site teaches, and someone searching it is not, on the face of it, the
reader the epic exists to find. So this task deliberately does **not** conclude
"invest in the 44,000." It concludes that a number nobody can check is currently
making that investment decision automatically, and that the owner should make it
on evidence instead. Confirming the floor and then declining to chase it is a
complete and correct outcome.

A note on dates, because the audit's own comment records getting this wrong
once: five of these nine were created in August and have no search history yet.
Their silence means nothing and must not be read as failure.

## Run

1. **Record `serp_top10_dr` for the six with no distribution**, starting with
   `21-questions-game`. That is the whole job: read the results page, write down
   every domain rating in the top ten, per the schema. Six pages, not 48 — these
   are the ones whose promotion to 386 pages depends entirely on the floor.
2. **Re-run the promotion block and report what moved.** A page whose lone low
   result turns out to be uncorroborated should drop out, exactly as
   how-to-overcome-fear-of-failure was meant to. Report the before and after
   promoted set; do not quietly adjust a constant so the set stays the same.
3. **Decide `21-questions-game` explicitly, and write the decision in the file.**
   If the top ten is genuinely open, say whether the site pursues a party-game
   term at 44,000 traffic potential or declines it on theme. Either answer is
   fine; an unrecorded answer is not, because the promotion block will keep
   making it silently.
4. **Make the audit's warning fail rather than print.** It already identifies
   the guides resting on a single reachable result. A guide promoted sitewide on
   an uncorroborated floor should be counted with a dated ceiling, the way
   `contrast.test.ts` counts its debt, so the next one is caught on arrival
   rather than found by reading output nobody reads.

## Verify

- The six named guides carry `serp_top10_dr` with the full top-ten reading.
- The promoted set before and after is recorded, and any page that dropped out
  is named with the distribution that removed it.
- `21-questions-game` carries a written decision on whether the term is pursued.
- `npm run check` green. If the promoted set changed, `flight-share`,
  `link-tracking` and `anchor-diversity` move — re-date each with the account,
  do not lift a threshold to clear it.
- `npm run seo:audit` still reports 0 critical.

## Scoring

- **impact 3** — the epic scores impact as _qualified_ traffic, and that is what
  caps this. The page in question is party content; a visitor searching "21
  questions game" is not the reader the site is built for, so even a confirmed
  44,000 does not convert to 44,000 of qualified demand. Not 2, because the
  decision this unblocks is the largest single allocation question on the site
  and it is currently being answered by an unverified number. Not 4, because
  reading a SERP moves nobody by itself, and the most likely honest outcome is a
  recorded "no".
- **radius 4** — 48 of 71 verdicts are in the same state, the six read here gate
  the promotion block that renders on 386 pages, and the guard in step 4 covers
  every guide added later. Not 5: it changes frontmatter and one threshold's
  enforcement, not the content model or a layer's eligibility.
- **opportunity 12**
- **complexity 2** — six SERP readings into a field the schema already defines,
  plus a guard. The procedure exists and SA-3.1 sets the precedent. Not 1:
  judging a top ten is the same judgement call that made `CORROBORATING_REACHABLE`
  necessary, and step 2 can legitimately demote a page, which is a visible
  sitewide change.
- **roi 6.0** — level with SA-3.1, which is the right neighbour: both are
  "go and read the results pages", both are bounded, and both end in a recorded
  verdict rather than a traffic gain. Do them together if one agent takes either.

## Outcome

_Not started._
