---
key: SA-5.1
type: task
summary: 205 atoms carry no keyword, verdict or parent, 212 of their URLs are indexable, and ten of the twelve pages Google has surfaced are among them
epic: "[[Search alignment]]"
parent: "[[SA-5 The SEO discipline covers the layer that does not rank]]"
status: Done
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
  - src/lib/gsc-surfaced.mjs
  - scripts/seo-audit.mjs
  - src/lib/__tests__/layer-collisions.test.ts
  - content/atoms/fear-of-failure.md
  - content/atoms/reading-the-room.md
  - content/atoms/yes-and.md
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

And GSC (Ahrefs `gsc-pages`, project 9723388, 2026-06-01 → 2026-09-25) shows
atoms across the surfaced set:

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

> **Correction, 2026-09-25.** That "ten of twelve" is an artefact of the window.
> Widened to 2026-02-01 → 2026-09-25 the surfaced set is **34 pages, not 12**,
> and atoms are 12 of them — 20% of impressions from 45% of the site, a lift of
> **0.4×**. Atoms are the corpus's _under_-performing layer, not its best one;
> the library returns 3.9×. This card's conclusion is unaffected and arguably
> strengthened — a layer with no search metadata that under-returns its size is
> a better reason to measure it, not a worse one — but the sentence claiming it
> is "the layer that is working" was wrong. See [[SA-16.1 Back the layer that
returns four times its size]].

**This has been noticed and not acted on.** `scripts/seo-audit.mjs` carries it
in a comment — the surfaced pages "were atoms, library references and technique
pages — which also hold the best positions on the site, 6 to 12, on terms with
almost no volume." The observation exists; the mechanism does not.

Be precise about what the audit does and does not do, because it is easy to get
wrong: it scores 319 pages, atoms included, via `scoreAtom`. What that grades is
hygiene — title present and under 60 characters, body over 200 characters, tags,
frontmatter links, status, dates, type. Every section that reads demand —
keywords, traffic potential, difficulty, SERP verdict, parent topics, the
reachability ranking — is bridges-only, because those fields exist only on
`BridgeFrontmatter`. So atoms are counted, and atoms are never _measured_.

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

**Done 2026-09-25.** The fields exist on atoms, on the atoms Google has shown
and nowhere else; the twelve are measured; the collision test runs across
both layers and found a third pair; and the audit reports the layer on its
own line.

**Step 1 — where the fields belong.** The seven `serp_*` fields moved out of
`BridgeFrontmatter` into a shared `SerpReading` that both `BridgeFrontmatter`
and `AtomFrontmatter` extend — same fields, same meanings, one place. Atoms
gained three of their own: `serp_query`, the Search Console query the page
was shown for (first-party demand, usually a term the keyword index cannot
price) and the term the reading is of; `target_keywords`, written only where
the index prices that query and the query means this page; and
`search_owner`, the guide that owns the atom's term. The rule the card was
explicit about is in the schema's doc comment, in CLAUDE.md's SEO section
(which no longer describes a guides-only discipline), and in
`layer-collisions.test.ts`: never in bulk. A fourth reading state was needed
and is now named: `serp_top10_dr: []` beside a `serp_checked` date means the
results page was requested and the index holds none for the query.

**Step 2 — the twelve, not nine.** The card's nine were the narrow window;
from 2026-02-01 the query table (`gsc-keywords`, read 2026-09-25) shows
twelve atoms, now `GSC_SURFACED_ATOMS` in `gsc-surfaced.mjs` with the query
each was shown for and its position. Their results pages, in one
`keywords-explorer-overview` call and twelve `serp-overview` calls:

| Atom                  | Shown for                           | Pos  | Index                                    | Reading                                              |
| --------------------- | ----------------------------------- | ---- | ---------------------------------------- | ---------------------------------------------------- |
| pattern-break         | pattern break                       | 10.4 | 60 a month, unpriced                     | winnable, floor DR 2; nothing on the page is improv  |
| justification         | retrospective justification meaning | 10.0 | 0                                        | no results page in the index                         |
| emotion-switch        | emotion switch                      | 11.0 | 10, unpriced                             | no results page                                      |
| yes-and               | yes and rule                        | 31.0 | 50 / KD 11 / TP 1,100, parent "yes and"  | owned by yes-and-improv                              |
| space-work            | space work                          | 38.5 | 100 / KD 42 / TP 7,500, parent "spaces"  | authority — office space, the SA-10.1 trap read      |
| interdependence       | structural interdependence          | 45.0 | 50, unpriced                             | no results page                                      |
| mirroring             | mirroring exercise                  | 46.0 | 30 / KD 0 / TP 10                        | winnable, floor DR 1; half therapy, half drama       |
| performance-state     | stimulation performance             | 48.5 | 20, unpriced                             | no results page                                      |
| base-reality          | base reality meaning                | 50.0 | 0                                        | no results page                                      |
| meaning-is-relational | relational meaning                  | 61.3 | 700 / KD 0 / TP 150, parent "relational" | authority — a dictionary query, floor DR 72          |
| blocking              | resistance blocking                 | 63.0 | 30, unpriced                             | no results page                                      |
| pacing                | what is pacing and leading          | 90.0 | 20, unpriced                             | no results page; the query is NLP's, not this page's |

Seven of twelve are terms Ahrefs holds no results page for at all — the
site's best atom positions are on vocabulary below the index's floor, which
is SA-10.1's finding from the other side. Two pages were readable and open
(pattern break, mirroring exercise) and neither is a page this site would
want to be the answer to: the first is an ambiguous term with no improv
result on it, the second is half couples therapy. Two are gated and one of
those is the "space work" trap, now read rather than warned about: Spaces,
WeWork and coworking listings hold it, and the site's 38.5 is on the wrong
meaning. Eight atoms carry a keyword block, all of them shown; `pacing` does
not, though its query has a volume, because "pacing and leading" is an NLP
term and not what the page is about — a block would target the wrong
meaning.

**Step 3 — the collision test, run across both layers.** Matching atom titles
and aliases against guide keywords found the card's two pairs and nothing
else; the query table found a third: `yes-and` was shown for "yes and rule",
a keyword `yes-and-improv` declares, under the parent "yes and" the guide
owns. All three resolved by ownership, on the atom, as `search_owner`:
fear-of-failure → how-to-overcome-fear-of-failure (the guide declares "fear
of failure", 7,800 / KD 27 / TP 2,400, parent itself — a psychology SERP the
guide already calls authority), reading-the-room → how-to-read-the-room (the
guide declares "reading the room", and today's parent for it, "what is the
best way to read the room?", is the guide's own), yes-and → yes-and-improv.
An owned atom declares no keyword; the guide is the candidate, the atom is
the concept page. No merge, no redirect. The parent test itself, across 150
parents on guides and 8 on atoms, finds no parent claimed twice.

One more thing the cross-layer run showed: two atoms are the head term a
guide sits _under_ — `active-listening` is the parent of the guide
active-listening's keyword, `viewpoints` of the guide viewpoints'. Not a
collision (no page claims those parents as keywords) but the hierarchy
parent-topics.test.ts says does not exist among guides does exist across
layers, twice. Recorded here; rendering it is another card's question.

**Step 4 — the audit sees the layer.** `npm run seo:audit` prints an atom
section under the layer table: 205 files, 212 sitemap URLs — the 205 and the
7 section hubs (/practice/exercises, /techniques, /formats, /vocabulary,
/how-it-works/principles, /diagnosis, /the-core), which is the "212 or
explain" the card asked for — then, read from the frontmatter each run, how
many Google has shown, how many are open, gated, on a query the index holds
no page for, or owned by a guide, how many carry a keyword block, and the
three best positions.

**What was not done, on purpose.** The seven library entries Google has
shown are `reference` atoms and were not measured here; SA-19.1 is about
exactly those pages and should read them. The guide yes-and-improv's own
figure for "yes and rule" (150, KD 4) reads 50 and KD 11 today; that is the
guide's `serp_checked` date's business, noted and not edited.

**What moved.** Fourteen atom files, `updated` 2026-09-25 — fields only, no
prose. Registers 21 done, 20 open; the SA-5 story closes with its only task.
`npm run check` green, 280 files, 1,452 tests.
