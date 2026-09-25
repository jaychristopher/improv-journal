---
key: SA-1.2
type: task
summary: 36 threads and paths are indexed and linked as though they should rank and titled as though they should not, and in four months not one has been surfaced
epic: "[[Search alignment]]"
parent: "[[SA-1 The corpus speaks one vocabulary and readers use several]]"
status: To Do
priority: Medium
sequence: 2
executable: mixed
estimate: 120m
labels: [seo, metadata, aliases, threads, paths]
impact: 3
radius: 4
opportunity: 12
complexity: 2
roi: 6.0
blocked_by: []
blocks: []
files:
  - content/threads/the-practice-lab.md
  - content/threads/beyond-the-harold.md
  - content/threads/first-rule-you-already-know.md
  - src/lib/schema.ts
---

# SA-1.2 — Decide whether the thread layer competes for search at all

## What was found

The site has made two opposite decisions about its pedagogy layer and never
reconciled them.

**Treated as though it should rank:** 25 threads and 11 paths, every one in the
sitemap and indexable. Rendered length, measured in `.next/server/app`: threads
median **2,507 words** (1,905–3,180), paths median **2,228** (1,959–2,349).
Inbound internal links: threads median **26**, paths median **33**, none with
fewer than 17, one with 79. Roughly a thousand internal links point into this
layer.

**Treated as though it should not:** not one of the 36 declares `aliases`,
`target_keywords` or a `parent`. And the titles:

| Threads — 0 impressions in 4 months                          | Atoms that rank                                               |
| ------------------------------------------------------------ | ------------------------------------------------------------- |
| The Plateau Is a Map: Breaking Through the Intermediate Wall | Pattern Break — Improv Technique \| The Physics of Connection |
| The Hardest Thing You'll Never Plan: Actually Listening      | Justification — Improv Term \| The Physics of Connection      |
| Quieting the Planning Mind: Responding Without Rehearsing    | Base Reality — Improv Term \| The Physics of Connection       |
| The Game Beneath the Game: Advanced Pattern Mechanics        | Space Work — Improv Technique \| The Physics of Connection    |

Every ranking atom leads with the term someone would type. Every thread leads
with an image. The result, GSC 2026-02-01 → 2026-09-25: **zero of 36 surfaced**,
against 34 pages that have. (An earlier draft read a narrower window and said
"ten of twelve surfaced pages are atoms"; on the full window atoms are 12 of 34
and the best-returning layer is the library — see
[[SA-16.1 Back the layer that returns four times its size]]. The zero for
threads and paths is unchanged.)

**Two hypotheses were tested and are wrong** — recorded so nobody re-runs them:

- _The pages are thin._ They are not. Markdown bodies are short (131–1,121
  words) because threads compose atoms, but the rendered page is 1,900–3,200
  words. Ahrefs' crawl flags zero low-word-count pages.
- _They duplicate their atoms._ They do not. Measured with 8-word shingles, a
  thread page shares a mean **7.0%** of its text with the union of its own
  atoms' pages — that is the shared nav and footer. The lessons are original
  prose.

So this is not a quality problem or a duplication problem. It is a layer of
substantial original teaching, carrying the site's voice, that search cannot see
because nothing about it is addressed to search.

And the searchable words often exist already, in the half of the title after the
colon — "Yes, And in Practice", "Actually Listening", "The Longform Landscape",
"Exercises for Every Level" — which is where Google truncates and readers stop
reading. That is the same defect SA-1.1 found in `types-of-listening`, on a layer
SA-1.1 does not cover.

## The decision this task exists to make

Either answer is legitimate and the point is to record one:

- **The layer competes.** Then it needs the metadata every other competing layer
  has, and the titles need a searchable phrase in the first half.
- **The layer does not compete.** Then say so, the way the exercise-picker
  facets say it — those are `noindex, follow` below three exercises, documented
  in the route file, and that is a clean decision. A thread would keep its
  voice and its links and stop being counted as a ranking candidate.

What is not acceptable is the current state, where a thousand internal links and
90,000 rendered words are invested in a layer nobody has decided about.

## Run

1. **Retrieve demand before deciding.** Take the concepts the threads actually
   teach — longform, ensemble, listening, scene diagnosis, practice exercises —
   and get volume, difficulty and `parent_topic` from Ahrefs. Never invent these.
   If the demand is not there, the "does not compete" answer is the right one and
   the task ends at step 2 having saved the retitling.
2. **Check the collision before writing a word.** `parent` is the collision test
   and no thread has one. `/improv-games`, `/improv-prompts`,
   `how-to-get-better-at-improv` and `theatre-games` already target this
   territory. A thread retitled toward a bridge's term is cannibalisation, and it
   would be introduced by the very task meant to improve alignment.
3. **Prove it on three, not twenty-five.** Pick the three with the clearest
   uncontested demand and move a searchable phrase into the first half of the
   title, keeping the image as the subtitle rather than deleting it. Add
   `aliases` for phrasings the body already uses — the existing alias guard
   requires that, which is what keeps this honest. Then stop and wait for data.
4. **Note the missing suffix while you are there.** Atom titles end with
   `| The Physics of Connection` and thread titles do not. That is probably
   unintentional rather than a decision; confirm which, and make it consistent
   either way.

## Verify

- A written decision exists in the repo on whether threads and paths are ranking
  candidates, with the demand figures that informed it and their retrieval date.
- If they compete: three threads retitled, `npm run check` green including the
  alias guard, and no retitled thread shares a `parent` with a bridge.
- If they do not: the exclusion is implemented and documented the way the
  exercise-picker facets are, and the 36 pages stop appearing in any audit's
  ranking-candidate counts.
- `npm run seo:rendered` reports 0 critical either way.
- Re-read after 30 days for the three, from 2026-02-01, watching impressions;
  position is the control, as in SA-1.1. Read the sitewide aggregate from
  `gsc-performance-history` alongside it — `gsc-pages` alone is about 2% of the
  impressions.

## Scoring

- **impact 3** — the measured half of this is the investment and the return: 36
  substantial pages, ~90,000 rendered words, roughly a thousand internal links,
  and zero impressions in four months. What is _not_ retrieved is what the layer
  could earn, and the epic's rule is explicit that impact is capped by evidence,
  which is why this is not 4. It is not 1 or 2 either, because the zero is
  measured rather than assumed and because the cheapest outcome — deciding the
  layer does not compete — costs almost nothing and stops 36 pages being counted
  as candidates they are not.
- **radius 4** — 36 of 386 pages, about a tenth of the site, plus a layer-level
  decision that changes how every audit counts. Not 5: SA-5.1's 212 atom URLs
  and the schema question behind them are the wider case.
- **opportunity 12**
- **complexity 2** — the expensive part is deliberately excluded. Retrieving
  demand is an Ahrefs call, the decision is a paragraph, and the change is three
  titles plus aliases. Reversal is three titles. Not 1: a title is a ranking
  input, the collision check in step 2 is a real judgement, and getting it wrong
  means a thread competing with a bridge the site already ranks better with.
- **roi 6.0** — level with SA-3.1 and SA-6.1. Like those it may honestly end in
  "no, and here is why", and that is a complete outcome rather than a failure.

## Outcome

_Not started._
