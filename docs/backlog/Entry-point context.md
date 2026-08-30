---
key: EC
type: epic
summary: Entry-point context
status: In Progress
priority: High
labels: [ux, context, entry-points]
reporter: jaychristopher
created: 2026-08-30
target: Every entry point meets the visitor with what they need and nothing they do not
stories:
  - "[[EC-1 Cold-arrival orientation]]"
  - "[[EC-2 Context written for the visitor, not the taxonomy]]"
  - "[[EC-3 Audit the untested entry points]]"
---

# EC — Entry-point context

Most visitors do not arrive at the homepage. They arrive on whichever of 363
pages matched their query, and the page has to answer three questions before it
earns a second one: what is this, why should I trust it, and where do I go next.

The failure has two directions and they are easy to confuse. **Underload** is a
page that assumes context the visitor does not have. **Overload** is a page that
supplies context the visitor did not need. Both feel like the page is not for
them.

## The register

`[[context-mistakes]]` is the running log. Add to it whenever a pass turns up a
new way this goes wrong, whether or not it gets fixed the same day. It is the
point of this epic — the individual fixes are downstream of noticing the pattern.

## Execution protocol

Same as [[Podcast finalization]]: stories in `sequence`, tasks in `sequence`,
check `blocked_by`, honour `executable`, record the `Outcome`. `npm run backlog`
lists what is ready.

## Standing rule for this epic

Measure the entry point before designing for it. Every finding in the register so
far came from counting what a page actually renders, and two of them contradicted
what the code appeared to promise — a context banner that covers half the pages it
was written for, and a sidebar whose load came almost entirely from one group.
