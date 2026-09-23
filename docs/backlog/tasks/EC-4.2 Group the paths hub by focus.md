---
key: EC-4.2
type: task
summary: Group the eleven paths on /paths by focus, with the level ladder inside each group
parent: "[[EC-4 Close the April audit's open findings]]"
epic: "[[Entry-point context]]"
status: Done
priority: Medium
sequence: 2
executable: agent
estimate: 45m
labels: [ux, context, audit]
blocked_by: []
blocks: []
files:
  - src/app/paths/page.tsx
  - src/lib/__tests__/ux-audit-status.test.ts
---

# EC-4.2 — Group the paths hub by focus

Row 7B of `docs/ux-audit-matrix.md` (2026-04-22): the paths hub "is organized by
improv progression level. A life seeker doesn't think of themselves as
'beginner → intermediate → performer.'" Commit `86684c3` added the "Not
following the improv track?" line that morning — a hatch, not an organisation —
and the hub kept all eleven on one ladder. Row 5A asked for the same grouping
on `/learn/beginner` ("improv vs life vs teams") and got it the same day; the
hub never did. Tracker entry 293 counts it as one of the audit's two unbuilt
findings.

## Run

In `src/app/paths/page.tsx`, put the eleven paths under three headings by focus,
derived from each path's audience and id rather than a fourth audience
vocabulary:

- **Improv craft** — the level ladder as it stands (`data-track="level-ladder"`),
  Foundations through the performer paths, with the reference guide after it
- **Everyday life** — `improv-for-life`, `physics-of-connection`
- **Teams and teaching** — `improv-for-teams`, `teaching-improv`

Keep the ladder's order inside each group (`AUDIENCE_LADDER` in
`src/lib/path-progression.ts`), keep every link the page has, keep the
recommended-path block and the "Not following the improv track?" line, and
keep `level-ladder` on the timeline so `link-tracking.test.ts` still finds it.

## Verify

```bash
npm run build
node -e "const h=require('fs').readFileSync('.next/server/app/paths.html','utf8');const m=h.split('<main')[1];console.log((m.match(/<h2[^>]*>[\s\S]*?<\/h2>/g)||[]).map(x=>x.replace(/<[^>]+>/g,'')).join(' | '));console.log(new Set(m.match(/href=\"\/paths\/[a-z-]+\"/g)).size)"
npx vitest run src/lib/__tests__/ux-audit-status.test.ts src/lib/__tests__/link-repeats.test.ts src/lib/__tests__/link-tracking.test.ts
```

Three group headings, eleven distinct path hrefs, and the repeat and tracking
guards still pass.

## Acceptance criteria

- `/paths` renders three focus-group headings and links all eleven paths
- Order inside each group is the audience ladder's
- `data-track="level-ladder"` and `data-track="alternate-tracks"` survive
- Row 7B of the audit matrix names this task in its Status cell

## Outcome

Done 2026-09-22. The hub now reads: recommended path, the "Not following the
improv track?" line, then three `h2` groups — **Improv craft** (the timeline:
Foundations and Systems of Improv, the Self-Coaching Toolkit, the three
performer paths, then the reference guide as its last card), **Everyday life**
(Improv for Everyday Life, The Physics of Connection) and **Teams and
teaching** (Improv for Teams and Leaders, Teaching Improv). The teacher rung
left the timeline for the teaching group and Physics of Connection left the
beginner rung for the life group; each keeps its `/learn/*` link. The focus map
is a small const in the page with a comment saying which audience and id
decide each group; the ladder's order inside a group is `audienceRank`, not a
hand list.

Each grouped card's sentence is the path's own frontmatter `description`, read
through `loadPaths()`, rather than copy written into the page. A first draft
held four hand-written sentences and tripped `hub-prose-links.test.ts`, whose
ceiling on prose held in code may only fall; reading content instead put the
page 23 counted words under where it started. The two group ledes are under
sixty characters for the same reason. The hub's own links to
improv-for-life and improv-for-teams now appear twice (the "Not following the
improv track?" line and the card), two repeats inside the hubs' ceiling in
`link-repeats.test.ts`.
