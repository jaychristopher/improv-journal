---
key: PG
type: epic
summary: Make the prompt generator the best in the world for the people the site is for, by evidence rather than by feature count
status: In Progress
priority: High
labels: [product, prompts, generator, content]
created: 2026-09-30
target: A teacher, a host and a longform team each get the start they came for in one tap, from pools deep enough for a term, and the two prompt pages are found by the words people type
stories:
  - "[[PG-1 The school pools are thin for a hand of eight]]"
  - "[[PG-2 Longform opens on one word and the generator has none]]"
  - "[[PG-3 The tool page never says suggestion]]"
  - "[[PG-4 Nothing reads the generator events back]]"
---

# PG — Prompt generator

Two studies on 2026-09-30 are the ruling: `docs/improv-prompts-competitors.md`
(thirty generators, every feature the field has, and where each went without a
control) and `docs/improv-prompts-personas.md` (twenty-four people and what
slowed each). The same day the generator became one question — what kind of
start — with the rooms blended by default and a cog holding the settings.

What the evidence says next, gathered that evening:

- Real improv's starts are already the seven kinds, except one: the single
  word a Harold or an Armando opens on.
- Andi Smith's noun buckets earn nothing (Ahrefs, US, 2026-09-30: occupations,
  objects, emotions and one-word suggestions all 0) and contradict the guide's
  case that a bare noun is the weakest start. The two things that page has
  worth taking — a hand of one to eight and a timer — are in the cog already.
- After the school filter, relationships and audience questions are 47 each,
  and a hand of eight to six pairs drains that in one lesson.
- "improv suggestion generator" is 150 a month (US) and the tool page never
  says it.

## Standing rules for this epic

Nothing new on the card; a setting lives in the cog. A noun bucket is not a
start. Every number on a card is Ahrefs, Search Console or PostHog on a date,
and the card says which. Prompt wording reads on both sides of the Atlantic.

## Execution protocol

Same as [[Search alignment]]: stories in `sequence`, tasks in `sequence`,
honour `executable`, record the `Outcome`. `npm run backlog` lists what is
ready. The One word kind (PG-2) is built on a branch and merges only after the
owner's teacher has read the list.
