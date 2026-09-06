---
key: EC-3.2
type: task
summary: Reconcile the beginner programme's advertised length with its lessons
parent: "[[EC-3 Audit the untested entry points]]"
epic: "[[Entry-point context]]"
status: To Do
priority: High
sequence: 2
executable: mixed
estimate: 30m
labels: [ux, context, content]
blocked_by: []
blocks: []
files:
  - content/paths/beginner-foundations.md
  - src/app/page.tsx
---

# EC-3.2 — Seven days, two lessons

Found while measuring the mid-course entry point in [[EC-3.1 Measure the
unexamined entry points]], which could not be measured because the day it
describes does not exist.

`beginner-foundations` declares `program_length_days: 7` and
`default_cadence: daily`, and lists two threads. The homepage card renders both
numbers a line apart — "Start the 7-day program", then "7 days · daily · 2 core
lessons" — and a reader who accepts the invitation reaches lesson two and meets
a progress bar reading "2 of 2". The programme ends on day two of seven.

This is the most prominent card on the site and the primary conversion path, so
it is worth fixing properly rather than quickly.

## The decision, which is not an agent's to make

Three coherent resolutions, and they are different products:

1. **The programme is two lessons.** Drop `program_length_days`, stop calling it
   a 7-day programme. Honest immediately, and gives up the strongest thing the
   card says.
2. **The programme is seven days and five lessons are unwritten.** Keep the
   claim, write the content. The card becomes true when the content lands, and
   is false until then.
3. **Seven days, two lessons, deliberately.** A daily cadence with practice days
   between lessons is a real design — but then the card has to say so, because
   "7 days · 2 core lessons" reads as an error rather than as a rest day.

Ask before implementing. Option 2 is a content commitment, not a code change.

## Run

Once the answer is known: the numbers render in `src/app/page.tsx` from
`beginnerProgram.frontmatter`, so the fix is in the frontmatter for 1 and 3, and
in `content/threads/` for 2. If 3, the card needs a line explaining the gap
between days and lessons.

## Verify

```bash
npm run build
curl -s https://www.physicsofconnection.com/ | grep -o 'Start the [^<]*'
```

The advertised length and the lesson count tell the same story, and landing on
the final lesson does not contradict the invitation that led there.

## Acceptance criteria

- Advertised duration and lesson count agree, or the page explains why they differ
- The progress indicator on the last lesson agrees with both
- No number in the card is derived from a field the content does not support

## Outcome

_Not started._
