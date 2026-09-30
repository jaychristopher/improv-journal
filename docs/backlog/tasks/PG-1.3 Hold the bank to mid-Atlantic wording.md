---
key: PG-1.3
type: task
summary: Turn the island-vocabulary scan into a guard, so no new row brings back a lift, a lorry or a fiver
epic: "[[Prompt generator]]"
parent: "[[PG-1 The school pools are thin for a hand of eight]]"
status: To Do
priority: Medium
sequence: 3
executable: agent
estimate: 45m
labels: [guard, prompts, bank]
impact: 2
radius: 3
opportunity: 6
complexity: 1
roi: 6.0
blocked_by: []
blocks: []
files:
  - src/lib/__tests__/mid-atlantic.test.ts
  - src/lib/prompt-bank-data.ts
---

# PG-1.3 — A guard for the wording rule

## What was found

On 2026-09-30 forty-five prompts were rewritten in words both sides of the
Atlantic use (commit 744aeda2); nine flagged by the scan were kept on purpose.
The rule now lives in a memory note and a scratchpad script, so the next
eighty rows (PG-1.1, PG-1.2) could bring the words back and nothing would
object.

## Run

Write `src/lib/__tests__/mid-atlantic.test.ts`: every `PROMPT_BANK` text is
tested against a word list — lift, lorry, fiver, jumper, caravan, car boot,
allotment, pub quiz, launderette, Mum, queue, headteacher, postman, lodger,
landlady, towpath, motorway, marquee, removers, new starter, fancy dress,
holiday, and the rest of the session's regex — as whole words, case-
insensitive. The nine keepers are allowed as whole texts (the referee, the
ferry, the pier, the hospice, the bookshop, the kettle that boils, the
laundromat at two, the singer in a flat, the teacher's reference), never as
allowed words. Population guard: the bank is at least the floor
`prompt-bank.test.ts` holds. Explain the why in the comment: the guide's
volume is three quarters American and a teacher in Ohio should not have to
translate.

## Verify

```bash
npx vitest run mid-atlantic
```

Green on the bank as it stands; red if any row in `prompt-bank-data.ts` is
edited to say "lift".

## Acceptance criteria

- The guard names the words and the nine keepers, and fails on a planted
  "queue" during development (then removed).
- `npm run check` exits 0.

## Scoring

Impact 2, radius 3 (every future row), opportunity 6, complexity 1, ROI 6.0.

## Outcome

_Not started._
