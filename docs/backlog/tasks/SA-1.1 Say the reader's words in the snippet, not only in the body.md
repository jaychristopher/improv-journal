---
key: SA-1.1
type: task
summary: The site's three page-one rankings all convert at 0%, because their snippets use different words than the queries
epic: "[[Search alignment]]"
parent: "[[SA-1 The corpus speaks one vocabulary and readers use several]]"
status: To Do
priority: High
sequence: 1
executable: agent
estimate: 90m
labels: [seo, metadata, aliases, ctr]
impact: 4
radius: 4
opportunity: 16
complexity: 2
roi: 8.0
blocked_by: []
blocks: []
files:
  - content/bridges/types-of-listening.md
  - src/lib/schema.ts
---

# SA-1.1 — Say the reader's words in the snippet

## What was found

GSC, 2026-06-01 → 2026-09-20, project 9723388. Twelve pages have ever been
surfaced. Three of them rank on page one, and **all three take 0 clicks**:

| Page | Position | Impressions | Clicks |
|---|---|---|---|
| `/types-of-listening` | **6.9** | 15 | 0 |
| `/practice/techniques/pattern-break` | 9.3 | 3 | 0 |
| `/practice/vocabulary/justification` | 10.0 | 1 | 0 |

The other nine sit between 29 and 90, where zero clicks is expected.

The first one is the case worth reading. Its query is:

> `"three listening modes" agreeing disagreeing being with`

A quoted phrase plus three named modes — someone who knows exactly what they
want. The page's own snippet offers:

> **Types of Listening: The Three Modes That Matter**
> Three attention modes — broadcast, evaluative, receptive — the seven
> conventional types mapped onto them…

Different vocabulary. The searcher is looking for *agreeing / disagreeing /
being with* and is shown *broadcast / evaluative / receptive*, so the result
does not read as their answer.

**And the page does answer it.** `content/bridges/types-of-listening.md` uses
"agreeing" 5 times, "disagreeing" 5 times and "being with" 4 times. The answer
is in the body; only the title and the description are in the other dialect.
Google matched the body and the reader judged the snippet.

## Why it generalises

`grep -l "^aliases:" content/bridges/*.md` returns **0 of 78**.

CLAUDE.md documents `aliases` as the mechanism for exactly this — they become
schema.org `alternateName` and feed site search, and a test already enforces
that every alias appears in the body. The guide layer, which is the layer built
to take search demand, does not use it once.

So this is not one page's title. It is that the corpus has one vocabulary per
idea and readers have several, and nothing maps between them.

## Run

1. **Fix the instance.** Rewrite the title and description of
   `types-of-listening` so the snippet carries the reader's words as well as
   the site's. The body is not to be rewritten to chase the query — it already
   contains the terms, and the mapping between the two vocabularies is the
   thing the page is *for*.
2. **Add `aliases`** to `types-of-listening` for the phrasings the body already
   uses. Check the existing alias guard still passes — every alias must appear
   in the body, which is what keeps this honest.
3. **Do the same for the other two page-one pages** only if their bodies
   already carry the query's words. If they do not, stop and open a separate
   task; inventing the terms is drift, not alignment.
4. **Survey, do not bulk-edit.** Report how many of the 78 guides have a
   `target_keywords` entry whose wording appears nowhere in the title or
   description. That number is the size of the real opportunity and the input
   to the next task; it is not a licence to rewrite 78 titles in one pass.

## Verify

- `npm run check` green, including the alias guard.
- `npm run seo:audit` and `npm run seo:rendered` no worse than before.
- The three pages' titles and descriptions each contain at least one phrase from
  their own GSC query.
- Re-read GSC positions for the three pages after 30 days. CTR is the metric;
  position is the control — if position falls, the retitle overreached.

## Scoring

- **impact 4** — this converts demand the site already ranks for, which is the
  cheapest traffic available and needs no new authority at DR 0.2. Not 5: the
  absolute volume today is 15 impressions, so the near-term gain is a click or
  two, and the case for 4 rests on the pattern repeating as more pages rank.
- **radius 4** — the mechanism is unused across all 78 guides and available to
  205 atoms. Not 5: it changes metadata and frontmatter, not the content model.
- **opportunity 16**
- **complexity 2** — metadata plus a frontmatter field the schema already has,
  and no new prose, because the bodies carry the terms. Not 1: a title is a
  ranking input, so a careless rewrite can cost the position it was meant to
  convert, which is why the verify step watches position as well as CTR.
- **roi 8.0**

## Outcome

_Not started._
