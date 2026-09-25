---
key: SA-1.3
type: task
summary: 212 atom pages take a median 0.938 of their inbound anchors as a single string where the promoted guides were rebuilt down to 0.450, and only 25 alias-anchors exist across the whole layer
epic: "[[Search alignment]]"
parent: "[[SA-1 The corpus speaks one vocabulary and readers use several]]"
status: Done
priority: Medium
sequence: 3
executable: mixed
estimate: 120m
labels: [seo, anchors, aliases, atoms]
impact: 3
radius: 4
opportunity: 12
complexity: 3
roi: 4.0
blocked_by: []
blocks: []
files:
  - src/lib/content.ts
  - content/atoms/pattern-break.md
  - content/atoms/performance-state.md
  - src/lib/__tests__/anchor-diversity.test.ts
  - src/lib/__tests__/one-word-aliases.test.ts
---

# SA-1.3 — One anchor string per concept

## What was found

Inbound anchor text read off the build, 2026-09-25, self-links excluded, for
every atom page receiving five or more internal anchors:

|                                           | Pages | Median dominant-anchor share |
| ----------------------------------------- | ----- | ---------------------------- |
| **Atoms**                                 | 212   | **0.938**                    |
| Promoted guides, after the footer rebuild | 27    | 0.450                        |
| Promoted guides, before it (entry 287)    | 27    | 0.961                        |

**146 of the 212 sit at or above 0.90.** Many sit at exactly 1.00 with a single
distinct anchor across dozens of links — `relationship` 65 links one string,
`the core` 62, `character` 47, `callback` 45, `scene structure` 40.

Entry 287 found 0.961 on the guides, called it a defect, and the footer was
rebuilt over it. The atom layer is at 0.938 and no guard covers it —
`anchor-diversity.test.ts` reads `loadBridges()` and stops there.

**The pages that actually rank are the most monocultural of all:**

| Page                                 | GSC position | Anchors | Distinct | Dominant share |
| ------------------------------------ | ------------ | ------- | -------- | -------------- |
| `/practice/techniques/pattern-break` | **9.3**      | 20      | **1**    | **1.00**       |
| `/practice/vocabulary/justification` | **10.0**     | 64      | 3        | 0.97           |
| `/how-it-works/diagnosis/blocking`   | 63.0         | 92      | 3        | 0.97           |
| `/practice/techniques/space-work`    | 29.0         | 76      | 3        | 0.96           |
| `/practice/vocabulary/base-reality`  | 50.0         | 77      | 3        | 0.96           |

**What this is not.** It is not an over-optimisation penalty risk. Exact-match
_internal_ anchors are a relevance signal, not a link-scheme signal, and the
evidence here points the same way: `pattern break` takes 100% of its anchors as
"pattern break" and holds position 9.3 for the query "pattern break". The
mechanism is working.

The finding is what it costs. The internal link graph asserts exactly one
phrasing per concept, so that is the only phrasing the site has any internal
signal for. `base-reality` receives 96% of 77 anchors as "base reality"; the
query it surfaced on was "base reality **meaning**", at position 50.

**And the fix already exists, mostly unused.** `aliases` are the declared field
for a concept's other names, the linker can turn them into anchors
(`isAutolinkableAlias`), and a guard already requires every alias to appear in
the body — which is what keeps the field honest. Across 205 atoms:

- **33 atoms (16%) declare any alias at all**, 43 aliases in total
- **25 pass the two-word, eight-character autolink bar**
- **18 are blocked**, and they are the useful ones: `Denial` for Blocking,
  `Platform` and `CROW` for Base Reality, `Escalation` for Heightening,
  `Physicalization` for Physicality, `Self-monitoring` for Internal Computation

So the whole atom layer has at most 25 alias-anchors available to it, which is
why the median is 0.938.

The one-word block is correct and was expensive to learn: tracker entry 103
records one-word aliases producing 89 wrong links out of 163. This card does
not propose removing it. `ONE_WORD_ALIAS_ALLOWLIST` is already the per-alias
opt-in, admitted "on evidence of its occurrences and not its length", and that
is the door to use.

## Run

1. **Start with the six that rank, not the 212.** They have a real query and a
   real position, which is the only demand evidence this layer has. Add aliases
   only for phrasings **already present in their bodies** — the alias guard
   enforces that, and it is what stops this becoming invention.
2. **Work the allowlist on evidence, one alias at a time.** For each blocked
   one-word alias, count its actual occurrences in the corpus and check what
   else that word means on this site before admitting it. `Denial`, `Platform`
   and `Game` are exactly the shape that produced entry 103's 89 wrong links.
   A rejection recorded with its count is a good outcome.
3. **Extend the guard to the layer.** `anchor-diversity.test.ts` should read
   atoms as well as bridges, with a dated ceiling on the median dominant share
   the way it already carries one for the promoted set. Record 0.938 as the
   starting debt rather than asserting a number nothing yet achieves.
4. **Do not touch prose to create an alias.** If a concept's second name is not
   already in the body, the honest move is to leave it — adding the phrase to
   make the alias legal is writing for the linker, which is the drift this epic
   exists to prevent.

## Verify

- The six ranking atoms carry aliases drawn from phrases already in their
  bodies, and `npm run check` passes including the alias guard.
- Any one-word alias admitted to the allowlist has its occurrence count recorded
  alongside it, and any rejected one has its count too.
- `anchor-diversity.test.ts` covers atoms with a dated ceiling.
- The measured median dominant share is re-read and recorded after the change.
- No atom body gained a phrase it did not already have.

## Scoring

- **impact 3** — this is the only layer with positions worth converting, and it
  broadens the vocabulary the site has any internal signal for. Not 4: SA-1.1
  scores 4 because it converts a measured 0% CTR at a known position, whereas
  the gain here is "more phrasings may surface", and SA-10.1 established these
  terms sit below Ahrefs' floor so the upside cannot be sized. The _defect_ is
  measured precisely; the return is not.
- **radius 4** — 205 atoms, the autolinker that generates prose links on every
  one of 386 pages, and a guard that currently stops at the guide layer. Not 5:
  it changes frontmatter and one allowlist, not the content model.
- **opportunity 12**
- **complexity 3** — the frontmatter work is small and step 4 forbids the
  expensive version. The risk is concentrated in step 2, and it is real and
  documented: the last time one-word aliases were let into the linker they
  produced 89 wrong links out of 163, and wrong links are worse than no links.
  Not 4: nothing needs a redirect and it reverts in one commit. Not 2: a
  judgement with that history behind it is not mechanical.
- **roi 4.0** — mid-low, and the right place. It is the third shape of SA-1's
  fault and the least certain of the three; SA-1.1 stays ahead at 8.0 because it
  converts something already paid for.

## Outcome

**Done 2026-09-25.** Two aliases the prose already said, two one-word
aliases admitted on a reading of every occurrence and one declined with its
count, the guard extended to the layer with the reading recorded as debt —
and a finding the card did not expect: the names Google showed these pages
for are mostly names the pages never say.

**Step 1 — the ranking atoms, and what their bodies already say.** The
population is the twelve atoms Search Console has shown (`GSC_SURFACED_ATOMS`,
from SA-5.1), read against their own prose:

| Atom                  | Shown for                           | In the body?                          | Alias                     |
| --------------------- | ----------------------------------- | ------------------------------------- | ------------------------- |
| pattern-break         | pattern break                       | "pattern interrupt" ×3                | **Pattern interrupt**     |
| performance-state     | stimulation performance             | "arousal" ×13, "stimulation" ×4       | **Arousal** (allowlisted) |
| justification         | retrospective justification meaning | "retrospective justification" ×3      | already declared          |
| base-reality          | base reality meaning                | "platform" ×6, "CROW" ×4              | declared; CROW admitted   |
| space-work            | space work                          | "object work" ×6                      | already declared          |
| blocking              | resistance blocking                 | "denial" ×6, "resistance" ×2          | declared; both declined   |
| mirroring             | mirroring exercise                  | "mirror exercise" ×2 — not the plural | none                      |
| meaning-is-relational | relational meaning                  | no — only "meaning is relational"     | none                      |
| interdependence       | structural interdependence          | no                                    | none                      |
| emotion-switch        | emotion switch                      | the title                             | none                      |
| yes-and, pacing       | —                                   | owned / wrong intent (SA-5.1)         | none                      |

Three of the phrases readers used — "structural interdependence",
"relational meaning", "mirroring exercise" — were tried and came straight
out again: the alias guard found each one in the file only because SA-5.1
had written it into the frontmatter that morning, and the body never says
it. Step 4 rules out writing the phrase in to make the alias legal, so the
finding stands as a finding: the vocabulary Google matched these pages on is
not the vocabulary the pages use. That is a prose question for a card that
edits prose, not a linker question.

**Step 2 — the allowlist, on evidence, one word at a time.** The bar is the
one `ONE_WORD_ALIAS_ALLOWLIST` was admitted on: every occurrence read, no
more than one in five the ordinary word.

- **Arousal → admitted.** 29 occurrences in 6 documents, 16 of them off the
  atom, every one Yerkes and Dodson's word — nerves before a show, the
  inverted U, the IZOF band — and none the ordinary sense. 4 links in the
  build (confidence-building-exercises, fear-of-public-speaking,
  stage-fright, the-performers-edge), each the word as the sentence wrote it.
- **CROW → admitted.** Already declared on `base-reality`, declined by the
  one-word rule. 12 occurrences in 6 documents, all the acronym for
  Character, Relationship, Objective, Where; the corpus has no birds. 4
  links (two-person-scene, environment, ref-salinsky-improv-handbook,
  ref-ucb-manual).
- **Resistance → declined, not declared.** The word Google showed `blocking`
  for: 17 occurrences in 12 documents and the ordinary word in nearly all of
  them — "resistance to the implications", "removes most of the resistance".
- **Denial and Platform → stay declined**, on the samples already recorded
  in `alias-candidates.ts` (1 of 5 wrong each, at the bar; Denial declared
  by two atoms, so a link would have two targets).

The accounts sit beside the allowlist in `content.ts`;
`one-word-aliases.test.ts` carries the link floors (3 and 3, under the 4 and
4 measured).

**Step 3 — the guard covers the layer.** `anchor-diversity.test.ts` now
reads atom inbound anchors the way it reads the guides' — `<main>` and the
footer, self-links out — over every atom with five or more: median dominant
share and the count at or above 0.90, under ceilings that may only fall.
Measured that way the layer was 0.917 over 205 atoms with 122 at or above
0.90 before the card and 0.915 with 122 after; the card's 0.938 over 212
counted the whole page. Ceilings 0.92 and 122, as the debt stands.

**Step 4 — no prose touched.** Two files changed a frontmatter line each
(pattern-break, performance-state); the three reverted aliases left no
trace.

**What moved, and what did not.** The named pages after the change:
performance-state 0.78 dominant over 45 anchors — "arousal" 4 and "flow state"
3 beside "performance state" — and base-reality 0.90 over 82, with "CROW" 4. pattern-break, justification, blocking and space-work are
unchanged at 0.95–0.96, because the phrases that would vary them are said
on their own pages and nowhere else — the alias is on the page for search
and alternateName, and the link graph cannot use it until another page says
the words. That is the honest size of this lever: aliases diversify anchors
only where the corpus already uses the second name, and for the ranking
atoms it mostly does not. Registers 22 done, 19 open; the SA-1 story closes
with its third task. `npm run check` green, 280 files, 1,453 tests.
