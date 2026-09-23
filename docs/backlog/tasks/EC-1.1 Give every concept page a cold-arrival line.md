---
key: EC-1.1
type: task
summary: Render the top-of-page context line on the 68 concept pages that still show none
parent: "[[EC-1 Cold-arrival orientation]]"
epic: "[[Entry-point context]]"
status: To Do
priority: High
sequence: 1
executable: agent
estimate: 90m
labels: [ux, context]
blocked_by:
  - "[[EC-2.1 Rewrite the context line for someone who just arrived]]"
blocks: []
files:
  - src/components/ContextBanner.tsx
  - src/components/AtomDetail.tsx
---

# EC-1.1 — Cover the pages that show nothing

`ContextBanner` renders only when `primaryThread && primaryPath`. Half the atoms
have neither, so they show breadcrumb, title, byline, date, then content.

## Run

Reproduce the count first — do not trust this number, it will have moved:

```bash
npm run build
node -e "const fs=require('fs');let n=0,none=0;for(const f of fs.readdirSync('content/atoms')){const s=fs.readFileSync('content/atoms/'+f,'utf8');const t=(s.match(/^type:\s*(\w+)/m)||[])[1];const D={definition:'practice/vocabulary',technique:'practice/techniques',pedagogy:'practice/techniques',exercise:'practice/exercises',format:'practice/formats',law:'how-it-works',insight:'how-it-works',principle:'how-it-works/principles',antipattern:'how-it-works/diagnosis',pattern:'how-it-works/diagnosis',framework:'how-it-works/diagnosis',reference:'library'};if(!D[t])continue;const p='.next/server/app/'+D[t]+'/'+f.replace('.md','')+'.html';if(!fs.existsSync(p))continue;n++;if(!fs.readFileSync(p,'utf8').includes('Part of '))none++}console.log(n,'pages,',none,'with no context line')"
```

Then give the component a fallback path for atoms with no thread or path. A
library entry is not part of a thread and never will be, so the answer is not to
force it into one — it needs a different sentence, and what that sentence says is
[[EC-2.1 Rewrite the context line for someone who just arrived]].

Keep it to one line. The failure this epic is about runs in both directions, and
a banner that explains the site at length on every page is the other one.

## Verify

The count above reports zero pages without a context line, and
`npm run seo:rendered` still reports 0 critical.

## Acceptance criteria

- Every concept page renders a context line, including all library pages
- No page gains more than one line of it
- Full suite passes

## Outcome

**2026-08-30 — premise inverted, task reframed rather than done.**

The comparison this task assumed was never run. Doing it showed the 102 pages
that *have* a context line are worse off than the 103 without: the line names a
thread and up to three paths, all of them repeated in the sidebar, none of them
meaningful to somebody who arrived thirty seconds ago.

So adding it to the other 103 would have spread the problem. What shipped
instead was the reduction — breadcrumb first, extra paths dropped, 190 characters
to 114 at worst.

This task now depends on [[EC-2.1 Rewrite the context line for someone who just
arrived]] rather than blocking it: there is no point rendering the line on 103
more pages until it says something worth reading. Blocked, deliberately.

**2026-09-21 — unblocked; scope narrowed to the banner.**

[[EC-2.1 Rewrite the context line for someone who just arrived]] is Done, so
nothing blocks this any more. Since it was written, two other blocks have given
every concept page a foot-of-page orientation: the related-concepts card
(`src/lib/whats-next.ts`) and the "Referenced by" block that lists inbound pages,
both in `AtomDetail`; library entries, which do not render through it, carry
"Concepts this work informs" and "Pages that cite it" in the same position. A
stranger who scrolls to the end of any concept page now finds where it sits and
where to go next. That is the purpose this task named, served from the other end
of the page.

What remains is the part it literally describes: `ContextBanner` at the top
still renders only when the atom has a lesson or a path. Recounted with the Run
command above against today's build: the literal check for `Part of ` reports
**205 pages, 205 with no context line**, because EC-2.1 changed the copy and
that string no longer marks the line. Matching the phrasing the component now
emits ("is a lesson in", "is a lesson that works through", "a sequence meant" —
the markers `context-line-position.test.ts` uses) gives **205 pages, 68 with no
context line** — 32 of them the library pages, none of which has one, and 36
other atoms in no lesson or path. The original 103 is now 68,
and the Run command needs its marker updated before it is trusted again.
