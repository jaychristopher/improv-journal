---
key: PG-2.2
type: task
summary: Add the One word kind — its own bank outside the scene-starter count, a guide section that lists every word, a tile beside the classic — on a branch, and merge once PG-2.1 has the teacher's cuts
epic: "[[Prompt generator]]"
parent: "[[PG-2 Longform opens on one word and the generator has none]]"
status: Done
priority: Medium
sequence: 2
executable: agent
estimate: 4h
labels: [product, prompts, longform, guide, guard]
impact: 3
radius: 3
opportunity: 9
complexity: 3
roi: 3.0
blocked_by:
  - "[[PG-2.1 Draft the one-word list and hand it to the teacher]]"
blocks:
  - "[[PG-4.1 Read a week of generator events in PostHog]]"
files:
  - src/lib/prompt-words-data.ts
  - src/lib/prompt-bank.ts
  - src/lib/prompt-generator.ts
  - src/components/PromptGenerator.tsx
  - content/bridges/improv-prompts.md
  - src/app/tools/improv-prompt-generator/page.tsx
  - src/lib/prompt-generator-copy.ts
  - src/lib/__tests__/prompt-words.test.ts
---

# PG-2.2 — The kind

## What was found

A seventh category inside `PROMPT_BANK` would push the words into the guide's
title ("567 Scene Starters"), the hero's count, the appendix and three
"six categories" guards. A separate bank touches none of that: the same
row-to-prompt function builds `WORD_BANK` with category `word` and ids
`word:<hash>`, `PromptKind` widens by one, and the appendix, the title count
and `PROMPT_CATEGORIES` stay as they are. The full design, the scoring rule
for a word and the guard edits are in the plan of 2026-09-30.

## Run

On branch `one-word`, two commits:

1. **B1, the bank**: `src/lib/prompt-words-data.ts` with the scoring rule in
   its header; `WordCategory`, `rowToPrompt`, `WORD_BANK` and `WORD_KIND`
   (label "One word", heading "One Word for a Longform Opening", concepts
   `["opening"]`, drill `organic-opening-exercise`) in `prompt-bank.ts`;
   `poolFor` typed on `Prompt["category"]`; `prompt-words.test.ts` (population
   ≥ 75, one lower-case word each, unique, `word:` ids, axes 1–5, no cast, not
   combinable, the flag regex, school and team pools ≥ 40, three bands per
   room, coaching lines, no atom title). `PROMPT_KINDS` untouched.
2. **B2, the kind**: `PROMPT_KINDS = [CLASSIC_KIND, WORD_KIND, ...six]`;
   `drawFrom` picks the bank by kind; `forgetAll` forgets both banks; the hero's
   top row holds the classic and the word kind side by side; a `word` icon; the
   guide section after "Questions to Ask an Audience" with every word in
   bold-labelled comma runs (never `- ` lines: three guards read those as
   scene starters), and a guard that holds the runs equal to the bank; the
   tool page's paragraph and question; the count guards moved with dated
   accounts (`PROMPT_KINDS.length` 7 → 8; the concept map gains `word`).

Fold the teacher's cuts in as B3, then `npm run check`, merge to `main`, push.

## Verify

```bash
npm run build
npx vitest run prompt-words prompt-bank prompt-classic prompt-concepts prompt-generator-component prompt-generator-personas prompt-generator-rendered sidebar-load hub-prose-links
```

Then in Chrome against `next start -p 3211` at 1440 and 390 wide: eight
`[data-kind]` buttons on both pages, the top two sharing a row with widths
within 2 px, no short last row of tiles, a word draws and never repeats, a
hand of four words, the school room draws no `p`/`a` word, "Forget what this
device has seen" empties `word:` ids, the guide's contents list the new H2,
`/practice/techniques/opening` carries "Try it: prompts for one word".

## Acceptance criteria

- The guide's title still counts scene starters only; the hero label reads
  `PROMPT_BANK.length` unchanged.
- Every word in the guide section is in the bank and every word in the bank
  is in the section.
- The built `sidebar-load` reading stays at or under its ceiling.
- `npm run check` exits 0 on the branch before the merge, and production
  serves the eight buttons after the deploy.

## Scoring

Impact 3: the one real ask the kinds lacked. Radius 3: two pages, a concept
page and the guide. Opportunity 9. Complexity 3: a data model, a guide
section and eight guards. ROI 3.0.

## Outcome

2026-09-30: built on branch `one-word` in two commits (02f135bc the bank,
00b7cadf the kind) and merged to main on the owner's word ahead of the
teacher's read, which becomes a bank edit when it arrives. A hundred words in
their own bank outside the 573; the kind beside the classic on the hero's top
row; the guide's section with every word in runs; the tool page's paragraph
and question; eight guards moved or added with dated accounts; the concepts
layer's flight ceiling re-dated for the six concept pages the section names.
Verified in Chrome at 1440 and 390 wide against the served build: eight kinds,
the pair at equal width, no short row, a word draws and never repeats, a
school-room hand of four with nothing flagged, the section and its contents
entry, the try line on the opening page.
