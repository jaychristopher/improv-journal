---
key: SA-3.1
type: task
summary: Seven guides have no serp_verdict, they are the site's core subject at difficulty 0-3, and no audit can see them
epic: "[[Search alignment]]"
parent: "[[SA-3 The pages nobody measured are the ones on the actual subject]]"
status: Done
priority: High
sequence: 1
executable: mixed
estimate: 90m
labels: [seo, serp, coverage, frontmatter]
impact: 4
radius: 3
opportunity: 12
complexity: 2
roi: 6.0
blocked_by: []
blocks: []
files:
  - content/bridges/improv-games-for-kids.md
  - content/bridges/improv-warm-up-games.md
  - content/bridges/improv-team-building.md
  - content/bridges/2-person-improv-games.md
  - content/bridges/how-to-think-on-your-feet.md
  - content/bridges/improv-theory.md
  - content/bridges/viola-spolin.md
  - src/lib/__tests__/bridge-serp-limits.test.ts
---

# SA-3.1 — Read the seven results pages nobody has read

## What was found

Seven of 78 guides carry no `serp_verdict`. Per CLAUDE.md that is the honest
recorded state for "nobody has looked", and the discipline is working — these
are not guesses. But nobody has asked _which_ seven ended up there, and they
are not a random sample.

Ahrefs `keywords-explorer-overview`, US, retrieved 2026-09-25, against the
volume each file already declares in its frontmatter:

| Guide                       | Head term                 | Declared vol | Today   | KD     | TP  | CPC      |
| --------------------------- | ------------------------- | ------------ | ------- | ------ | --- | -------- |
| `improv-games-for-kids`     | improv games for kids     | 600          | **400** | **0**  | 150 | —        |
| `improv-warm-up-games`      | improv warm up games      | 200          | **250** | **3**  | 200 | $2       |
| `viola-spolin`              | viola spolin              | 800          | **700** | **42** | 300 | —        |
| `improv-team-building`      | improv team building      | 200          | **70**  | **0**  | 150 | **$250** |
| `how-to-think-on-your-feet` | how to think on your feet | 300          | 60      | 0      | 90  | $8       |
| `2-person-improv-games`     | 2 person improv games     | 150          | **40**  | 0      | 80  | —        |
| `improv-theory`             | improv theory             | 10           | 10      | —      | —   | —        |

Three things fall out of it.

**The unchecked pile is the core theme.** Every one of these is an improv page —
the subject the site actually teaches. The measured and promoted set is
dominated by question-list and party content at difficulty 30 to 46. The pages
nobody looked at are the ones closest to what the site is _for_, and on today's
numbers five of the seven sit at difficulty 0 to 3, the softest terms it owns.

**The audit cannot see them.** A page with no verdict is not a ranking
candidate, so `npm run seo:audit` and the promotion machinery in `top-guides.ts`
both skip these seven. The apparatus built to find opportunity is structurally
blind to the part of the corpus most aligned with the theme.

**The declared volumes have drifted.** `2 person improv games` is 150 in the
file and 40 today; `improv team building` 200 and 70; `how to think on your
feet` 300 and 60 — though that last one targets `think on your feet`, a
different term, so it is not a like-for-like comparison and should be re-read
rather than assumed stale.

One number worth stopping on: **`improv team building` has a CPC of $250.** It
is the most commercially valuable intent on the entire site by a wide margin,
at difficulty 0, on 70 searches a month — and it has never been checked.

## Run

1. **Read the results page for each of the seven.** That is the work; the
   volumes above are the input, not the answer. Record `serp_checked`,
   `serp_min_dr` and `serp_verdict` in each file, per the schema.
2. **Expect `viola-spolin` to come back `authority`** — 700 volume at difficulty
   42 for a biographical query is the shape of a SERP owned by Wikipedia and
   publishers. If so, record it and stop: `authority` means the page is kept for
   readers and is not a ranking candidate, which is a complete and useful
   outcome, not a failure.
3. **Re-read the volumes while you are in each file.** Where the declared figure
   disagrees with Ahrefs, update it and date it. Never carry a number forward
   because it is already written down.
4. **Add a guard.** A bridge shipping with `target_keywords` but no
   `serp_verdict` should fail, or at minimum be counted with a dated ceiling the
   way `contrast.test.ts` counts its debt. Seven pages reached production
   unmeasured and nothing noticed; that is the repeatable half of this.

## Verify

- All seven files carry `serp_checked`, `serp_min_dr` and `serp_verdict`.
- `npm run seo:audit` now includes them, and its guide count rises by seven.
- `npm run check` green, including the new guard.
- Any volume that changed is dated in the file.

## Scoring

- **impact 4** — these are the lowest-difficulty terms the site owns in its own
  subject, and they are the qualified traffic this epic exists to find: somebody
  searching "improv warm up games" wants exactly what this site teaches, which
  is not true of everyone searching "21 questions game". Not 5: the volumes are
  modest, and the outcome of looking may honestly be that two or three are
  gated.
- **radius 3** — seven of 78 guides directly, plus a guard that covers every
  guide added after this. Not higher: it changes metadata on 9% of one layer.
- **opportunity 12**
- **complexity 2** — the procedure exists and the fields exist; this is looking
  and recording, not writing. Not 1: reading a SERP and judging `winnable`
  against `authority` is a judgement call, and getting it wrong sends effort at
  a page that cannot win.
- **roi 6.0**

## Outcome

**Done 2026-09-25.** All seven results pages read, all seven files carry the
full SERP reading, every declared volume re-read and re-dated, and the guard
that makes an eighth unjudged guide fail is in `bridge-serp-limits.test.ts`.

**Step 1 — the seven results pages** (`serp-overview`, US, 2026-09-25;
organic results with a domain rating, in position order; floor = the lowest
DR, with its position and that page's monthly visits):

| Guide                     | Top ten DR                      | Floor (pos, visits) | Top share | Verdict       |
| ------------------------- | ------------------------------- | ------------------- | --------- | ------------- |
| improv-games-for-kids     | 95, 30, 29, 31, 24, 62, 48, 99  | 24 (7, 149)         | 0.14      | winnable      |
| improv-warm-up-games      | 31, 95, 53, 31, 99, 50, 52, 48  | 31 (1, 201)         | 0.22      | winnable      |
| improv-team-building      | 36, 75, 100, 48, 48, 70, 45, 24 | 24 (9, 5)           | 0.51      | winnable      |
| 2-person-improv-games     | 1, 100, 85, 48, 52, 99, 49, 53  | 1 (2, 73)           | 0.004     | winnable      |
| how-to-think-on-your-feet | 95, 19, 99, 53, 3, 93, 94, 38   | 3 (7, 9)            | 0.40      | winnable      |
| improv-theory             | 97, 97, 85, 87, 21, 21, 82, 70  | 21 (6, 508)         | 0.0       | winnable      |
| viola-spolin              | 97, 35, 32, 75, 96, 85, 41, 23  | 23 (10, 29)         | 0.58      | **authority** |

Six of seven are open, and the `serp_audience` line on each file says what
the opening is worth, which is the half the number cannot:

- **improv games for kids** — parents, camp leaders and children's drama
  teachers: a summer camp at 3, a kids' drama site at 4 and 5, a children's
  theatre PDF at 8, Reddit at 2 asking what to teach 8–13s, an AI Overview at
  1. Four results under DR 32 hold 3, 4, 5 and 7 on 99–291 visits — the
     best-shaped page of the seven.
- **improv warm up games** — improv theatres' rehearsal lists: Sacramento
  Comedy Spot at 1 on DR 31, improv.ca, learnimprov, improwiki. The one page
  of the seven where a site like this one already holds position one.
- **improv team building** — half the page sells a workshop (DC Improv,
  improv.org, WIT, 3rd Space) and the rest are HR listicles for a manager
  planning an offsite; a DR 36 blog holds 1 on 109 visits. The $250 CPC the
  card stopped on is booking intent, and this guide has nothing to book, so
  the position is reachable and worth its informational share only.
- **2 person improv games** — a DR 1 personal blog holds 2 on 73 visits; the
  rest are the general improv-games listicles that rank for everything
  (Backstage's 17,320 is that page's whole traffic, not this term's).
- **how to think on your feet** — professionals caught off guard: LinkedIn,
  MindTools, a memory-training site, CNN; DR 3 at 7 on 9 visits. The bare
  phrase "think on your feet" (250 a month, TP 50) is a different page — the
  Think on Your Feet training brand at 1, the Cambridge dictionary at 3 — so
  the guide's primary is now the how-to term (60 a month, TP 90), which is
  what its title says and what its results page serves. Both pages read.
- **improv theory** — Wikipedia, Backstage and MasterClass hold 1–5, two DR
  21 improv-school pages hold 6 and 7, jazz theory videos hold 10. Ten
  searches a month, below the keyword index's floor; open by the shape and
  worth nothing measurable. The guide's case is its readers.
- **viola spolin** — a biographical query: Wikipedia, then the estate's own
  three sites (violaspolin.org DR 35, spolin.com DR 32, spolingamesonline.org
  DR 23), Second City, Amazon and Backstage on 1–9 visits. The sub-40 results
  are the family's, which no outsider outranks on her name. Authority, as the
  card expected; kept for readers.

**Step 3 — every declared figure re-read** (`keywords-explorer-overview`,
US, 2026-09-25). Primaries: improv games for kids 600 → 400, improv warm up
games 200 → 250, improv team building 200 → 70, 2 person improv games 150 →
40, viola spolin 800 → 700, improv theory 10 → 10. Secondaries moved too:
improv games for high school 100 → 80, improv warm ups 90 → 80, improv for
business 100 → 70, improv training for business 50 → 40, two person improv
games 150 → 40; the rest held. Difficulty, potential and parent are now on
all 18 keywords the index returns them for. Two keywords left
`improv-theory`: "improv philosophy" (declared 170) is no longer in the index
at all, and a number the index will not return cannot be carried forward;
"viola spolin games" (20, parent "viola spolin theatre games") moved to
`viola-spolin`, which owns that parent — two guides on one parent is the
collision `parent-topics` exists to fail.

**Step 4 — the guard.** `bridge-serp-limits.test.ts` fails any guide that
declares a keyword without `serp_checked`, `serp_min_dr` and `serp_verdict`.
Exact, no ceiling: the count is zero today, and it fails at the moment a
keyword is declared rather than when somebody next sweeps the API.

**What moved.** Seven files, `updated` 2026-09-25. Two guides enter the
promoted set through the SERP-floor route on the readings recorded here —
`2-person-improv-games` (floor 1, three results under DR 50) and
`how-to-think-on-your-feet` (floor 3, three under 50) — on positions worth
73 and 9 visits. That is the route working as written, and it is the case
SA-20.1 is open to decide: the floor says reachable and `serp_floor_traffic`
says what for.

**Re-dated, each with its account in the file.** `guide-cohorts` (April 14
authority / 26 winnable, August 5 / 32, 20 authority in all; August's median
potential 27,000 → 16,000 over 37 guides, because the six newly priced pages
are small terms), `parent-topics` (150 distinct parents: 94 self, 10
same-guide, 0 cross-guide, 46 unclaimed — the one cross-guide edge was the
moved keyword), `related-bridges` (improv-theory left the starved set and
scores into rails on its own, so party-games' fair-share slot went back to its
computed neighbour and the same-cluster count is 244 again — not a scoring
change), `sitemap-priority` (no guide is unjudged any more, so the comparison
is against the one winnable guide the index cannot price), `youtube-plan` (the
one unexplained pair is explained by the later read), `flight-share` (paths'
flight ceiling: two guides joined the footer's prop on every page). Two guards
asked for content rather than a date: `contextual-inbound` wanted a second
hand link to `2-person-improv-games` and to `improv-games-for-kids`, both now
in `improv-warm-up-games` with anchors that are not the keyword; `spelling`
caught "theatres" in a new audience line beside that file's "theater" and
the line was reworded.

`npm run check` green, 279 files, 1,449 tests. `npm run seo:audit`: 78
verdicts recorded, not yet checked 0. `npm run seo:rendered`: the same two
pre-existing criticals SA-1.2 recorded, nothing new.
