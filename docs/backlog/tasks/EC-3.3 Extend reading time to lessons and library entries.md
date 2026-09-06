---
key: EC-3.3
type: task
summary: Give course lessons and library entries the reading time guides already have
parent: "[[EC-3 Audit the untested entry points]]"
epic: "[[Entry-point context]]"
status: To Do
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

_Not started._
