---
key: SA-9.1
type: task
summary: Improv Skills' 15 guides cohere at 1.4x chance where the other three clusters manage 3.3x to 4.1x, and it is the homepage's door for improv intent and the home of most winnable guides
epic: "[[Search alignment]]"
parent: "[[SA-9 The cluster named for the subject is the one that is not a topic]]"
status: To Do
priority: Medium
sequence: 1
executable: mixed
estimate: 180m
labels: [seo, structure, clusters, information-architecture]
impact: 3
radius: 4
opportunity: 12
complexity: 3
roi: 4.0
blocked_by: []
blocks: []
files:
  - src/lib/guide-categories.ts
  - src/lib/home-doors.ts
  - src/lib/cluster-cohesion.ts
---

# SA-9.1 — Split or rename the cluster that is a bucket

## What was found

Entry atoms shared between pairs of guides, measured 2026-09-25 against a
proper null — the overlap two guides would show by chance given how many atoms
each actually declares, drawn from a pool of 80:

| Cluster                       | n      | Observed | Expected by chance | Lift     |
| ----------------------------- | ------ | -------- | ------------------ | -------- |
| Relationships & Communication | 29     | 1.64     | 0.40               | **4.1×** |
| Teams & Leadership            | 15     | 1.48     | 0.38               | **3.9×** |
| Personal Growth               | 19     | 1.43     | 0.44               | **3.3×** |
| **Improv Skills**             | **15** | **0.72** | **0.50**           | **1.4×** |

Tracker entry 290 reached the same conclusion on 2026-09-22 by comparing inside
to outside. This is the stronger form of the test and it survives it.

**The obvious escape was tested and closed.** If improv guides simply declared
fewer entry atoms, a low overlap would be arithmetic rather than meaning. They
declare the _most_: mean 6.33 against 5.53 to 5.95 elsewhere, minimum 5, none
with zero. That is why their expected-by-chance figure is the highest of the
four. Declaring more atoms and still overlapping least is the opposite of an
artifact.

**Why it matters more than a hub's tidiness.** `CRAFT_CLUSTER = "improv-skills"`
in `home-doors.ts` is the homepage's door for a visitor who says they want to
practise improv — the most qualified arrival this site gets, and the reason the
two-door hero exists. That door opens onto the one cluster with no internal
structure. The same fifteen guides also hold most of what the site can actually
win: theatre-games, del-close, yes-and-improv, viewpoints, what-is-improv and
improv-prompts are all here, and all reach the promoted set through SERP
evidence rather than size (see SA-4.1, SA-6.1).

And the site already contradicts itself about it. The related-guides widget
ranks by shared atoms, so on every page in this cluster it recommends different
neighbours than the cluster rail does.

**What the fifteen look like when read rather than counted.** Three plausible
groupings, offered as a starting hypothesis and not as the answer:

- _games and exercises_ — theatre-games, improv-games-for-kids,
  improv-warm-up-games, 2-person-improv-games, improv-prompts
- _theory, history and vocabulary_ — what-is-improv, rules-of-improv,
  improv-theory, viola-spolin, del-close, viewpoints, yes-and-improv
- _getting better_ — how-to-get-better-at-improv, how-to-be-funny,
  framing-effect

## Run

1. **Test the hypothesis before acting on it.** Recompute the lift for each
   proposed grouping. A split is only justified if the sub-clusters clear the
   3× the other three manage; if the best split still lands near 1.5×, the
   honest conclusion is that these guides genuinely have little in common and
   the fix is a rename, not a restructure.
2. **Check it against demand, not only against atoms.** The guides carry
   `parent` topics and those are the demand-side clustering. A split that agrees
   with both the atom graph and the parent topics is a real seam; one that only
   agrees with the atoms is an editorial preference.
3. **Prefer renaming to splitting if the evidence is thin.** "Improv Skills"
   promises a topic. If the content is a subject rather than a topic, a hub that
   says so honestly — and orients by what the reader is trying to do, which is
   what the other hubs' `orientation` copy already does — costs one string and
   no URLs.
4. **If you split, carry the URLs.** A new cluster hub is a new URL and a moved
   guide changes its breadcrumb. Redirect the old hub, keep `CRAFT_CLUSTER`
   pointing at whichever cluster the homepage door should now open, and check
   the door still reads as an answer to "I want to practise improv" rather than
   as a filing category.

## Verify

- The lift for every cluster, before and after, is recorded with its date.
- No cluster ends below the lift it had.
- `npm run check` green, including the cluster-cohesion guards.
- If a hub URL changed, the old one redirects permanently and nothing in the
  build, sitemap, `llms.txt` or search index references it — the check SA-7.1
  had to invent after the library move.
- The homepage's craft door still resolves, and `buildHomeDoors` still excludes
  exactly one cluster.
- `npm run seo:rendered` reports 0 critical.

## Scoring

- **impact 3** — it improves the route taken by the site's most qualified
  arrivals and reorganises the guides most likely to rank, which is the right
  kind of traffic rather than the most of it. Not 4: no retrieved number says a
  better-structured hub earns more, restructuring creates no demand, and the
  honest best case is a clearer path rather than a new position. Not 2: the
  measurement is retrieved, reproducible, and survives the artifact test, and
  the cluster in question is the one the whole two-door homepage was built to
  feed.
- **radius 4** — 15 guides, a hub page, the homepage door constant, the
  breadcrumb hierarchy and the related-guides rail. Not 5: it leaves 63 guides,
  205 atoms and the content model untouched.
- **opportunity 12**
- **complexity 3** — the epic's own rule is that changing a URL is a 3 or more
  because undoing it costs a redirect and a reindex, and the likely outcome here
  is a new hub URL plus moved breadcrumbs. Not 4: no content is rewritten, the
  cohesion maths already exists in `cluster-cohesion.ts`, and step 3 offers a
  genuine one-string exit if the evidence does not support a split.
- **roi 4.0** — last in the queue, and that is the right place for it. It is the
  most architecturally interesting finding in this epic and the least certain to
  move a number; those two facts belong together rather than being traded off.

## Outcome

_Not started._
