---
key: SA-5.1
type: task
summary: 205 atoms carry no keyword, verdict or parent, 212 of their URLs are indexable, and ten of the twelve pages Google has surfaced are among them
epic: "[[Search alignment]]"
parent: "[[SA-5 The SEO discipline covers the layer that does not rank]]"
status: To Do
priority: Medium
sequence: 1
executable: mixed
estimate: 150m
labels: [seo, schema, atoms, serp, collision]
impact: 3
radius: 5
opportunity: 15
complexity: 3
roi: 5.0
blocked_by: []
blocks: []
files:
  - src/lib/schema.ts
  - scripts/seo-audit.mjs
  - content/atoms/fear-of-failure.md
  - content/atoms/reading-the-room.md
---

# SA-5.1 — Measure the atoms Google has already surfaced

## What was found

Counted in the repo, 2026-09-25:

|                    | Files   | `target_keywords` | `serp_verdict` | `parent` |
| ------------------ | ------- | ----------------- | -------------- | -------- |
| `content/bridges/` | 78      | 78                | 71             | 78       |
| `content/atoms/`   | **205** | **0**             | **0**          | **0**    |

`src/lib/schema.ts` is the reason, and it is explicit: every one of those fields
is declared on `BridgeFrontmatter`. `AtomFrontmatter` has none of them. This is
not an oversight in the content — the fields do not exist for that type.

Meanwhile the sitemap carries 366 URLs and 212 of them are atoms: 135 under
`/practice/`, 45 under `/how-it-works/`, 32 under `/library/`. All indexable.
That is 58% of the indexable site with no search metadata of any kind.

And GSC (Ahrefs `gsc-pages`, project 9723388, 2026-06-01 → 2026-09-25) says
that layer is the one working:

| Page                                         | Position | Layer |
| -------------------------------------------- | -------- | ----- |
| `/practice/techniques/pattern-break`         | **9.3**  | atom  |
| `/practice/vocabulary/justification`         | **10.0** | atom  |
| `/library/ref-attention-and-effort-kahneman` | 12.0     | atom  |
| `/practice/techniques/space-work`            | 29.0     | atom  |
| `/library/ref-sawyer-group-genius`           | 43.0     | atom  |
| `/how-it-works/performance-state`            | 49.8     | atom  |
| `/practice/vocabulary/base-reality`          | 50.0     | atom  |
| `/how-it-works/diagnosis/blocking`           | 63.0     | atom  |
| `/practice/techniques/pacing`                | 90.0     | atom  |

Ten of twelve surfaced pages, and two of the site's three page-one positions.

**This has been noticed and not acted on.** `scripts/seo-audit.mjs` carries it
in a comment — the surfaced pages "were atoms, library references and technique
pages — which also hold the best positions on the site, 6 to 12, on terms with
almost no volume." That comment is a year of evidence sitting next to a script
that loads `bridges` and grades nothing else. The observation exists; the
mechanism does not.

**The collision test cannot run.** CLAUDE.md is unambiguous that `parent` is how
overlap is detected — "two pages competing is not detectable from distinct
keyword strings." With no `parent` on any atom, no atom can be tested against
any bridge. Matching atom titles and aliases against bridge keywords finds two
exact collisions today:

| String             | Atom               | Bridge                            |
| ------------------ | ------------------ | --------------------------------- |
| `fear of failure`  | `fear-of-failure`  | `how-to-overcome-fear-of-failure` |
| `reading the room` | `reading-the-room` | `how-to-read-the-room`            |

Two is a small number and worth saying plainly: this is not evidence of
widespread cannibalisation. It is evidence that the test returns a non-zero
answer the first time anyone is able to run it, on a layer where it has never
been run.

## What this task is not

It is not "add `target_keywords` to 205 atoms." That would be a bulk content
edit, it would invent numbers for 200 pages nobody has researched, and it is
exactly the drift the epic exists to prevent. The scope here is the atoms
Google has _already chosen_, plus the mechanism that lets the next one be found.

## Run

1. **Decide where the fields belong, and write the decision down.** Either the
   SEO fields move up to a shared frontmatter type, or `AtomFrontmatter` gains
   an explicitly optional subset. The schema is the authority when it and
   CLAUDE.md disagree, so whichever way it goes, CLAUDE.md's SEO section needs
   to stop describing a bridges-only discipline.
2. **Measure the nine ranked atoms, and only those.** They already have a query
   and a position from GSC — that is the demand evidence, and it is first-party,
   so it outranks anything a tool estimates. Record `serp_checked`,
   `serp_min_dr` and `serp_verdict` per the schema. Where Ahrefs has no volume
   for the term, leave the field out and say so; absence is the correct recorded
   state.
3. **Run the collision test across both layers.** Give the two colliding pairs a
   `parent` and decide which page owns the term. Do not merge or redirect
   anything in this task — deciding ownership is cheap and reversible, merging
   costs a redirect and a reindex and belongs in its own card if it is wanted.
4. **Let the audit see the layer.** `npm run seo:audit` grades bridges. Extend
   it to report the atom layer separately rather than folding it into the guide
   numbers — the two have different jobs and averaging them hides both. The
   comment block at the foot of the script already holds the GSC reading and
   says to move the date when refreshing; reuse that convention.

## Verify

- `npm run check` green, including whatever guard covers frontmatter shape.
- The nine ranked atoms carry `serp_checked`, `serp_min_dr` and `serp_verdict`.
- `npm run seo:audit` reports a page count for the atom layer, and that count is
  212 or explains why it is not.
- The collision test runs across atoms and bridges together and reports its
  count; two known pairs are resolved with an owner recorded.
- No atom that was not surfaced by GSC gained a `target_keywords` block.
- CLAUDE.md's SEO section describes the layers the discipline actually covers.

## Scoring

- **impact 3** — the evidence is retrieved and first-party, but it is small: the
  terms these atoms rank for are, in the audit's own words, "on terms with
  almost no volume." Not 4, because measuring a page does not move it, and the
  honest near-term traffic gain is close to zero. Not 1 or 2 either — the epic's
  rule caps impact where nobody retrieved a number, and here nine positions
  between 9.3 and 90 were retrieved. The case is that this is the layer already
  winning the qualified searches the site is for: somebody typing "retrospective
  justification meaning" is precisely the reader, and there is currently no way
  to find the next one of them.
- **radius 5** — 212 of 366 sitemap URLs, and a schema decision that defines
  whether the discipline covers one content type or all of them. Nothing in this
  epic touches more.
- **opportunity 15**
- **complexity 3** — it needs a schema change rather than only frontmatter, nine
  SERP readings, a collision test spanning two layers, and an audit change. Not
  4: no URLs move, no content is rewritten, nothing needs a redirect, and every
  part is reversible in one commit. Not 2: `schema.ts` is the declared authority
  for the content model and changing it is not a metadata edit.
- **roi 5.0** — last in the queue, correctly. SA-1.1, SA-2.1 and SA-4.1 all act
  on demand that exists today; this one builds the instrument that finds the
  demand nobody has looked for yet. It should be done, and it should be done
  after them.

## Outcome

_Not started._
