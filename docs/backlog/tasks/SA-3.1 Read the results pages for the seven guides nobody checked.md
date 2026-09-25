---
key: SA-3.1
type: task
summary: Seven guides have no serp_verdict, they are the site's core subject at difficulty 0-3, and no audit can see them
epic: "[[Search alignment]]"
parent: "[[SA-3 The pages nobody measured are the ones on the actual subject]]"
status: To Do
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
  - content/bridges/viola-spolin.md
  - content/bridges/improv-theory.md
---

# SA-3.1 — Read the seven results pages nobody has read

## What was found

Seven of 78 guides carry no `serp_verdict`. Per CLAUDE.md that is the honest
recorded state for "nobody has looked", and the discipline is working — these
are not guesses. But nobody has asked *which* seven ended up there, and they
are not a random sample.

Ahrefs `keywords-explorer-overview`, US, retrieved 2026-09-25, against the
volume each file already declares in its frontmatter:

| Guide | Head term | Declared vol | Today | KD | TP | CPC |
|---|---|---|---|---|---|---|
| `improv-games-for-kids` | improv games for kids | 600 | **400** | **0** | 150 | — |
| `improv-warm-up-games` | improv warm up games | 200 | **250** | **3** | 200 | $2 |
| `viola-spolin` | viola spolin | 800 | **700** | **42** | 300 | — |
| `improv-team-building` | improv team building | 200 | **70** | **0** | 150 | **$250** |
| `how-to-think-on-your-feet` | how to think on your feet | 300 | 60 | 0 | 90 | $8 |
| `2-person-improv-games` | 2 person improv games | 150 | **40** | 0 | 80 | — |
| `improv-theory` | improv theory | 10 | 10 | — | — | — |

Three things fall out of it.

**The unchecked pile is the core theme.** Every one of these is an improv page —
the subject the site actually teaches. The measured and promoted set is
dominated by question-list and party content at difficulty 30 to 46. The pages
nobody looked at are the ones closest to what the site is *for*, and on today's
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

_Not started._
