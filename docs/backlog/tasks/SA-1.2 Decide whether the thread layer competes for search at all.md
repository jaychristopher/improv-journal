---
key: SA-1.2
type: task
summary: 36 threads and paths are indexed and linked as though they should rank and titled as though they should not, and in four months not one has been surfaced
epic: "[[Search alignment]]"
parent: "[[SA-1 The corpus speaks one vocabulary and readers use several]]"
status: Done
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
  - content/paths/improv-for-life.md
  - src/app/threads/[slug]/page.tsx
  - src/app/paths/[slug]/page.tsx
  - scripts/seo-audit.mjs
  - src/lib/__tests__/lesson-layer-decision.test.ts
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

**Done 2026-09-25. The layer does not compete, and it is not noindexed
either; the decision is written where the next reader will look, guarded, and
tested on one page rather than assumed on thirty-six.**

**Step 1 — demand, retrieved before deciding.** `keywords-explorer-overview`,
US, 2026-09-25, fifty terms for what the lessons teach — offers, scene work,
character, space and object work, listening, ensemble, group mind, game of
the scene, callbacks and reincorporation, show structure, exercises, theory,
teaching, the plateau, beginners, applied improv, schools, commitment,
principles. Sixteen are not in the index at all, fourteen return volume 0,
seven return 10–30 with no difficulty, potential or parent — 37 of 50 blank
or zero. The thirteen with figures:

| Term                           | Vol | KD  | TP  | Parent (vol)                |
| ------------------------------ | --- | --- | --- | --------------------------- |
| yes and improv                 | 500 | 5   | 900 | yes and (1,200) — the guide |
| improv exercises               | 250 | 0   | 450 | improv exercises (300)      |
| harold improv                  | 100 | 0   | 80  | harold improv (100)         |
| applied improv                 | 50  | 1   | 40  | applied improv (50)         |
| improv exercises for beginners | 40  | 0   | 450 | improv exercises (300)      |
| improv for beginners           | 40  | 0   | 200 | how to improv (150)         |
| long form improv               | 40  | 0   | 20  | long form improv (50)       |
| improv basics                  | 20  | 1   | 200 | improv tips (150)           |
| learn improv                   | 20  | 5   | 30  | improv online (70)          |
| teaching improv                | 20  | 0   | 10  | teaching improv (20)        |
| how to teach improv            | 20  | 0   | 10  | how to teach improv (20)    |
| improv characters              | 20  | 0   | 30  | improv character ideas (30) |
| improv schools                 | 20  | 42  | 10  | famous improv groups (20)   |

`keywords-explorer-matching-terms` for "improv", top 80 by volume, is comedy
clubs, a driving school and "classes near me"; the largest non-local terms
are improv games 3,100 (TP 350), what is improv 2,600 (TP 20), improv comedy
900, improv prompts 800 (TP 1,600), improv meaning 600, yes and improv 500.
Nothing pedagogical appears. The searchable improv vocabulary is venues,
classes, games and definitions — the hubs' and guides' territory, not the
lessons'.

**Step 2 — the collision, and it is with our own hubs.** The `parent` test
found no bridge on any of the measurable parents. The rendered titles did:
every pocket of demand near the layer is already the lead phrase of a route
hub or concept page —

| Term                      | Already led with by                                                               |
| ------------------------- | --------------------------------------------------------------------------------- |
| improv exercises          | `/practice/exercises` "Improv Exercises: What Each One Actually Trains"           |
| improv for beginners      | `/learn/beginner` "Improv for Beginners: Where to Start"                          |
| improv formats, long form | `/practice/formats` "Improv Formats: Long Form, Short Form and How to Choose"     |
| harold                    | `/practice/formats/harold` "The Harold: Improv's Most Important Long-Form Format" |
| improv games              | `/improv-games` "Improv Games: Warm-Ups, Exercises and Scene Games"               |
| yes and                   | `/yes-and-improv`, parent "yes and"                                               |

Retitling `the-practice-lab` to "Improv Exercises for Every Level", the
obvious move and the one this card's file list anticipated, would have put a
lesson against the site's own exercises hub on a results page whose floor is
DR 23 (`serp-overview`, 2026-09-25: Hoopla DR 48 at 2 with 396 visits, Reddit
95, Radical Agreement 36, improwiki 50, Improv Therapy Group 23, OnTheStage
52, Will Hines 94). The hub is the page for that term. Bridges declare a
`parent`; hubs declare nothing, so the parent test cannot see this collision
and the guard below reads the built titles instead.

**The natural experiment had already run.** One page of the 36 has been
surfaced since 2026-02-01: `/paths/teaching-improv`, on "teaching improv" —
the one title in the layer that leads with a searchable phrase nobody else on
the site leads with. Twenty-five image-first lessons, zero. That is the
mechanism the card hypothesised, observed rather than assumed. (The card's
"zero of 36" was the narrow window; the 34-page table from February has the
path.)

**The decision.** The layer sequences the pages that compete and does not
take their terms: no keyword metadata, no promotion, no title regime. Not
noindex, for three reasons written in the route file: a blank in the keyword
index is unmeasured, not zero (SA-10.1 — the site ranks on vocabulary Ahrefs
cannot see); the prose is original (7% shingle overlap, measured in the card);
and teaching-improv shows a lesson-layer page can be surfaced when its title
leads with an uncontested term. The Verify bullet assumed "does not compete"
meant the facets' `noindex`; this records the opposite and why.

**Step 3 — proved on one, not three.** There are not three uncontested
terms. There is one: "applied improv", own parent, 50 a month, KD 1, and no
page on the site leads with it. `/paths/improv-for-life` — the path about
exactly that — is retitled "Applied Improv for Everyday Life" (30 characters,
so it keeps the brand suffix), with a description that says the term, dated
2026-09-25. "improv characters" (TP 30, parent "improv character ideas" — a
listicle) was the only other candidate and a poor fit. Everything else with
a figure belongs to a hub or a guide.

**Step 4 — the suffix is a rule, not a slip.** `pageTitle()` in `seo.ts`
returns an absolute title when title + " | The Physics of Connection" would
exceed 60 characters, so the brand goes rather than the keyword-bearing end.
Lesson and path titles are long; concept titles are short. Consistent by
design; no change.

**Aliases were not added.** `aliases` is an atom field: the linker,
`alias-candidates.ts` and the alias guard all read atoms. Extending it to a
layer that is not competing would be a schema, search-index and linker change
for no ranking input. Recorded here so it is not re-proposed.

**What was written.**

- `src/app/threads/[slug]/page.tsx` carries the decision above
  `generateMetadata`, the way the exercise-picker facets carry theirs;
  `paths/[slug]/page.tsx` points at it.
- `lesson-layer-decision.test.ts`: no thread or path declares keyword
  metadata; no thread or path title leads with a two-word-or-longer phrase
  that another page's built title already leads with — which would have
  caught the practice-lab retitle — with one dated exception,
  `/threads/diagnosing-scene-failure`, which has shared its lead with
  `/how-it-works/diagnosis/diagnosing-scene-failure` since before this card
  and should lose it when that title is next written; and the two titles
  that lead with an uncontested term stay as they are until the 30-day read.
- `scripts/seo-audit.mjs`: the layer table now has the threads row it was
  missing — 25 pages, 0 surfaced, 0.0× — and a line saying the layer is not
  a candidate by decision. The 36 never appeared in the ranking-candidate
  counts (`graded` requires a difficulty); now the zero is printed rather
  than omitted.

**Figures read on the way, for SA-3.1** (same call, 2026-09-25): improv warm
up games 250 / KD 3 / TP 200, own parent; improv games for kids 400 / 0 /
150, own parent; 2 person improv games 40 / 0 / 80, parent "improv games for
two people" (40); improv team building 70 / 0 / 150, parent "team building
improvisation" (50).

**What moved.** One title, one description, one date. `npm run seo:rendered`:
nothing from this change; the two criticals it reports — `/how-it-works/the-core`
defines its own `@id` twice in JSON-LD, and `/listen/deep-cuts` has 57 pages
against 68 feed items — predate it and belong with the diagrams and the podcast
feeds. `npm run check` green, 278 files, 1,447 tests. Registers 18 done, 23 open.

**Re-read in 30 days:** `gsc-pages` from 2026-02-01 for `/paths/improv-for-life`
— impressions, with position as the control, as in SA-1.1 — and
`gsc-performance-history` alongside it. If it surfaces, the next candidates
are the terms a hub does not lead with; if it does not, the decision stands
as written and the test title can go back.
