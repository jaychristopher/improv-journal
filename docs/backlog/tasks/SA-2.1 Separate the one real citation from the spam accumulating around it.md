---
key: SA-2.1
type: task
summary: The referring-domain count grows 30-40 a month on its own, and one genuine DR 43 citation is buried in it
epic: "[[Search alignment]]"
parent: "[[SA-2 The link profile is unreadable, and nobody is watching it]]"
status: To Do
priority: High
sequence: 1
executable: mixed
estimate: 120m
labels: [seo, backlinks, measurement, disavow]
impact: 4
radius: 5
opportunity: 20
complexity: 3
roi: 6.7
blocked_by: []
blocks: []
files:
  - scripts/seo-audit.mjs
---

# SA-2.1 — Separate the real citation from the spam

## What was found

Referring domains, Ahrefs `site-explorer-refdomains-history`, subdomains mode,
monthly:

| Month | Refdomains |
|---|---|
| 2026-03 | 0 |
| 2026-04 | 20 |
| 2026-05 | 43 |
| 2026-06 | 86 |
| 2026-07 | 153 |
| 2026-08 | 173 |
| 2026-09 | 214 |

It has risen every month since the site launched, by roughly 30 to 40 a month,
without anybody doing outreach. This is automated: the site is being scraped
into link-shop directories.

**And a correction to a finding from 2026-09-24.** That audit reported "586
referring domains, all nofollow backlink-shop spam." That is wrong, and it is
wrong in the way that matters. It ordered by domain rating, and the high-DR rows
happened to be nofollow. Ordered by `dofollow_links` instead:

| Domain | DR | Dofollow | First seen |
|---|---|---|---|
| **befreed.ai** | **43.0** | **6** | 2026-09-10 |
| cartermanageus.com | 0.0 | 2 | 2026-09-11 |
| blogerreviewers.com | 0.1 | 2 | 2026-08-13 |
| mokra.shop | 0.0 | 2 | 2026-09-13 |
| lemvi.shop | 0.0 | 2 | 2026-09-13 |
| wecelebrities.com | 6.0 | 2 | 2026-08-04 |
| murvi.shop | 0.0 | 1 | 2026-09-18 |
| nivira.shop | 0.2 | 1 | 2026-09-18 |

Two things the earlier reading missed:

1. **There is one real-looking citation.** `befreed.ai`, DR 43, six dofollow
   links, first seen two weeks ago. It is by a wide margin the best link this
   site has, it arrived without anybody asking, and nothing in the repo knows
   it exists.
2. **Some of the spam is dofollow**, and the `.shop` names — mokra, lemvi,
   murvi, nivira — are one network, first seen within days of each other. Only
   dofollow spam can carry a penalty; nofollow spam is noise. The distinction
   the earlier reading collapsed is exactly the one a disavow decision rests on.

## Why it matters more than its traffic

Nothing on this site ranks for anything contested at DR 0.2, so link
acquisition is the constraint every other task in this epic sits behind. The
number that would tell the owner whether outreach is working rises by 30 to 40
a month regardless. The signal is buried in noise that grows faster than the
signal ever will.

## Run

1. **Find out what befreed.ai is and what it cited.** Fetch the six linking
   pages. If it is a real citation, the question worth answering is *which*
   pages it chose and why — that is a repeatable acquisition channel and the
   only evidence on this site of anyone linking it voluntarily.
2. **Classify the dofollow tail.** Pull every refdomain with
   `dofollow_links > 0`. Separate plausible citations from the link-shop
   network. Report the count of each; do not guess at intent from the name
   alone.
3. **Decide disavow on that evidence, and write the decision down either way.**
   Google's own guidance is that most sites should not use the tool and that it
   generally ignores obvious spam. The bar for filing is dofollow spam at a
   volume that could plausibly be read as a scheme — not discomfort at the
   list. A recorded "no, and here is why" is a complete outcome for this step.
4. **Make the number readable.** Add a refdomain reading to the audit that
   separates dofollow from nofollow and names the known spam networks, so the
   next person can see at a glance whether a real link has arrived. The comment
   block in `scripts/seo-audit.mjs` already carries dated GSC readings and says
   to move the date when refreshing — follow that convention rather than
   inventing a second one.

## Verify

- The six befreed.ai target URLs are recorded, with what they cite.
- Dofollow refdomains are split into plausible and spam, with counts.
- The disavow decision is written down with its reasoning, whichever way it goes.
- Re-reading the audit answers "has a real link arrived since?" without another
  Ahrefs query.

## Scoring

- **impact 4** — this does not bring a visitor by itself, which is why it is not
  5. It is the constraint everything else queues behind: at DR 0.2 no page wins
  a contested term, and this is both the first evidence of a voluntary citation
  and the first sight of dofollow spam. Judging outreach is impossible while the
  metric moves on its own.
- **radius 5** — domain-wide. The link profile is the one input that affects
  every page's ceiling at once.
- **opportunity 20**
- **complexity 3** — not mechanical. It needs a judgement call on disavow, which
  Google warns against making casually and which is unpleasant to unwind, plus
  reading the linking pages rather than the domain names. Not 4: no content
  changes and no URL changes.
- **roi 6.7** — below SA-1.1's 8.0, correctly. That one converts a ranking the
  site already holds, for less work and with a more certain result.

## Outcome

_Not started._
