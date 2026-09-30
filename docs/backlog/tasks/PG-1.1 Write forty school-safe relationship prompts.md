---
key: PG-1.1
type: task
summary: The school room has 47 relationship prompts of 94; write about forty more to the rubric so a hand of eight lasts a term
epic: "[[Prompt generator]]"
parent: "[[PG-1 The school pools are thin for a hand of eight]]"
status: To Do
priority: High
sequence: 1
executable: agent
estimate: 3h
labels: [content, prompts, school, bank]
impact: 4
radius: 2
opportunity: 8
complexity: 2
roi: 4.0
blocked_by: []
blocks: []
files:
  - src/lib/prompt-bank-data.ts
  - content/bridges/improv-prompts.md
  - src/lib/__tests__/prompt-bank.test.ts
---

# PG-1.1 — Forty more relationships a school room can play

## What was found

`suitsUseCase(p, "school")` keeps out every row flagged `p`, `a` or `l`. Of
the 94 relationship prompts, 47 survive it (2026-09-30). Family pairs are `p`
throughout the bank and jobs are `a`, so what survives is the pairs a
fourteen-year-old has been or met. The cog deals a hand of up to eight; six
pairs in one lesson use forty-eight.

## Run

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('src/lib/prompt-bank-data.ts','utf8');const i=s.indexOf('PROMPT_ROWS');const a=s.indexOf('= [',i)+2;const b=s.lastIndexOf('];');const body=s.slice(a,b).split('\n').filter(l=>!l.trim().startsWith('//')).join('\n').replace(/,\s*$/,'')+']';const rows=JSON.parse(body);const all=rows.filter(r=>r[0]==='relationship');const safe=all.filter(r=>!/[pal]/.test(String(r[7]||'')));console.log(safe.length,'school-safe relationship prompts of',all.length)"
```

Then append about forty rows to `PROMPT_ROWS` in `src/lib/prompt-bank-data.ts`,
each `["relationship", text, specific, open, charge, doable, grounded, flags?, coach?]`:

- No `p`, `a` or `l`, and none of the words the `landsOnLife` regex in
  `prompt-bank.test.ts` names (parents, hospital, money, fired…). Pairs a
  fourteen-year-old has been or met: lab partners, teammates, the new kid, a
  referee, a lifeguard, a librarian, a bus driver, a crossing guard, a guide.
- At most 110 characters; unique against the whole bank (the guard
  normalises case and punctuation). Mid-Atlantic words only.
- `x` where the relationship names its own place or moment; keep at least
  twenty-five combinable so the classic's who-line deepens too.
- Scored honestly: doable 4–5, charge 2–4, specific 4–5, grounded 5. A
  coaching line (≤ 110 characters) on about eight.
- Move the count in the guide's `title`, `description` and H1 to
  `PROMPT_BANK.length` (the appendix guard pins all three) and set `updated`
  to the commit date; `public/llms.txt` regenerates at prebuild and belongs
  in the commit.

## Verify

```bash
npx vitest run prompt-bank prompt-classic prompt-bank-appendix title-counts
```

Then the Run block again: the first number is at least 85.

## Acceptance criteria

- `poolFor(PROMPT_BANK, "relationship", "school").length` is at least 85.
- Every new row clears the bank guards unchanged (uniqueness, the phone cap,
  the school filter, the flag regex, the classic's combinability).
- The guide's title, description and H1 say the new total, and the built
  appendix lists the new rows under "Relationships".
- `npm run check` exits 0 before the commit.

## Scoring

Impact 4: the room the site says it is for, and the setting that drains it.
Radius 2: the generator on two pages and the appendix. Opportunity 8.
Complexity 2: writing to a rubric, no code. ROI 4.0.

## Outcome

_Not started._
