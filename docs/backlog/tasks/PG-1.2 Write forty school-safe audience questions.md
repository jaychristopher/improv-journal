---
key: PG-1.2
type: task
summary: The school room has 47 audience questions of 56; write about forty more a fourteen-year-old and an adult can both answer
epic: "[[Prompt generator]]"
parent: "[[PG-1 The school pools are thin for a hand of eight]]"
status: Done
priority: High
sequence: 2
executable: agent
estimate: 2h
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

# PG-1.2 — Forty more questions a school room can ask

## What was found

Of the 56 audience questions, 47 survive the school filter (2026-09-30);
the nine that do not ask about jobs, neighbours, family rules or money. A
question for the audience is the show kind, but in a school room it is the
warm-up that gets thirty people talking, and a hand of eight uses eight.

## Run

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('src/lib/prompt-bank-data.ts','utf8');const i=s.indexOf('PROMPT_ROWS');const a=s.indexOf('= [',i)+2;const b=s.lastIndexOf('];');const body=s.slice(a,b).split('\n').filter(l=>!l.trim().startsWith('//')).join('\n').replace(/,\s*$/,'')+']';const rows=JSON.parse(body);const all=rows.filter(r=>r[0]==='audience-question');const safe=all.filter(r=>!/[pal]/.test(String(r[7]||'')));console.log(safe.length,'school-safe audience questions of',all.length)"
```

Then append about forty `audience-question` rows to `PROMPT_ROWS`:

- Answerable by a fourteen-year-old and by an adult; no jobs, tenancies,
  homes, money, family; none of the `landsOnLife` words. Personal beats
  clever: the question should produce a memory, not a joke.
- At most 110 characters; check near-duplicates against the 56 ("stood in
  line for", "lost", "broke", "fixed" exist). Mid-Atlantic words only.
- Scored honestly: specific and doable high, charge 2–3, grounded 5. A
  coaching line on about eight (what to build from the answer).
- Move the count in the guide's `title`, `description` and H1 and set
  `updated`, as PG-1.1 did; raise the floors in `prompt-bank.test.ts` (bank
  size, and the room-by-category pool) to just under the numbers a run
  reports, with the date and the reason in the comment.

## Verify

```bash
npx vitest run prompt-bank prompt-classic prompt-bank-appendix title-counts question-overlap
```

Then the Run block again: the first number is at least 85.

## Acceptance criteria

- `poolFor(PROMPT_BANK, "audience-question", "school").length` is at least 85.
- The two floors carry the new numbers and a dated account, not a number
  chosen to pass.
- `npm run check` exits 0 before the commit.

## Scoring

Impact 4, radius 2, opportunity 8, complexity 2, ROI 4.0 — as PG-1.1.

## Outcome

2026-09-30: forty-two audience questions appended, none flagged, eight with a
coaching line. The school room's question pool went from 47 to 89 of 98; the
bank from 531 to 573, and the guide's title, description and H1 say 573. The
thinnest pool in any room is now situation in a school room at 64, and the two
floors in prompt-bank.test.ts (bank size, pool depth) and the coached floor in
prompt-classic.test.tsx sit just under the run's numbers with the date.
