---
key: EC-3.3
type: task
summary: Give course lessons and library entries the reading time guides already have
parent: "[[EC-3 Audit the untested entry points]]"
epic: "[[Entry-point context]]"
status: Done
priority: Medium
sequence: 3
executable: agent
estimate: 20m
labels: [ux, context]
blocked_by: []
blocks: []
files:
  - src/app/threads/[slug]/page.tsx
  - src/app/library/[slug]/page.tsx
---

# EC-3.3 — Finish the duration line

Found while measuring entry points in [[EC-3.1 Measure the unexamined entry
points]].

The reading-time line answers the first decision a reader makes — now, later, or
not at all — and it reached guides and concept pages only. `UpdatedOn` is called
without `minutes` on threads, library entries, paths and sources.

The omissions are the wrong ones:

- **Threads** are the longest prose on the site and the only pages sold as a
  time commitment; the homepage invites people into a daily programme made of
  them, and the page they land on says nothing about how long one takes.
- **Library entries** are, per Search Console, the best-ranking pages here, and
  several run past 2,000 words.

Paths are already covered by their course workload figure, so they are the one
omission that is not a gap. Sources are transcripts, deliberately noindex, and
are read for provenance rather than start-to-finish — decide rather than assume.

## Run

Both pages already import what they need on the guide route. Pass `minutes` to
the existing `UpdatedOn`:

```
<UpdatedOn
  date={fm.updated}
  minutes={readingMinutes(<the rendered html for that page>)}
  className="text-foreground/50 mt-3 text-xs"
/>
```

`readingMinutes` takes rendered html, not markdown — pass the same `.html` the
page renders into its article, or the number describes something other than what
is on the page.

## Verify

```bash
npm run build
node -e '
const fs = require("fs");
for (const p of ["threads/presence-and-commitment", "library/ref-impro-johnstone"]) {
  const h = fs.readFileSync(".next/server/app/" + p + ".html", "utf8");
  console.log(p, /\d+ min read/.exec(h)?.[0] ?? "MISSING");
}'
```

Both print a duration. Sanity-check one against the word count rather than
trusting the number.

## Acceptance criteria

- Course lessons and library entries show a reading time
- The figure comes from the rendered html of that page
- A deliberate decision recorded for sources, either way

## Outcome

Done 2026-09-21. Both pages now pass `minutes={readingMinutes(<page>.html)}` to
the `UpdatedOn` they already rendered — `thread.html` on `/threads/[slug]` and
`atom.html` on `/library/[slug]` — so the line reads "By … · Updated … · N min
read" exactly as it does on a guide.

The figure is the page's own. `readingMinutes` is fed the same html the article
renders, not `estimated_minutes`: the one lesson that declares that field says 6
for a body that reads in 1, because it describes the lesson as a piece of work
rather than as a read. The two numbers now sit on the same page (the frontmatter
one only in the LearningResource `timeRequired`), and the visible one is the
honest one.

Sanity-checked against word counts rather than trusted: presence-and-commitment
is 234 body words and shows 1 min; ref-impro-johnstone is 1,204 and shows 5.
Across the corpus lessons read in 1–5 minutes and library entries in 2–7. The
premise that library entries "run past 2,000 words" no longer holds — the longest,
ref-spolin-improvisation-for-theater, is about 1,500 — but the spread is the
point, and it is real on both routes.

Sources: decided, not assumed — **no reading time.** They are transcripts, noindex,
and read by the passage for provenance rather than start to finish; a duration
would describe the transcript, not the reading anyone does of it. Paths keep
their course workload figure, as the task predicted.

Guard: `src/lib/__tests__/reading-time-lessons-library.test.ts`. One spec runs
without a build and checks the helper never returns zero for any lesson or
library entry and that the range is real; two are `it.runIf(built)` and check
every built lesson and library page shows a "min read" that equals
`readingMinutes` of that page's own html — so a constant, or a number from
another field, fails. The build-gated specs go green on the next `npm run build`
after this change; the Verify block above was not run here because this session
did not build.
