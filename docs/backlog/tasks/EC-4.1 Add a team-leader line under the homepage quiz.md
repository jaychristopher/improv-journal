---
key: EC-4.1
type: task
summary: One line under the homepage quiz for people here for a team, not themselves
parent: "[[EC-4 Close the April audit's open findings]]"
epic: "[[Entry-point context]]"
status: Done
priority: Medium
sequence: 1
executable: agent
estimate: 20m
labels: [ux, context, audit]
blocked_by: []
blocks: []
files:
  - src/app/page.tsx
  - src/lib/__tests__/ux-audit-status.test.ts
---

# EC-4.1 — A team-leader line under the homepage quiz

Row 1C of `docs/ux-audit-matrix.md` (2026-04-22): "Nothing on the homepage
signals 'this is for teams/leaders.'" The audit offered two fixes — a quiz option
or a callout below the quiz. Commit `a318790` added the option that morning;
commit `53e7f30` replaced the quiz with the symptom quiz six hours later and the
option went with it. From then until this task the homepage said "teams"
nowhere above the guide clusters, and the quiz's five symptoms (overthinking,
nothing to say, awkward, forcing funny, stage fright) are all first-person.

## Run

In `src/app/page.tsx`, directly after `<HomepageQuiz />`, add one short
paragraph wrapped in `data-track="home-teams"` with two links: the teams
cluster at `/topics/teams` and the path at `/paths/improv-for-teams`. One line,
in the site's voice; not a card, not a third entry point competing with the
"Start here" card and the quiz. Do not touch `homepage-symptoms.ts` — the quiz
stays personal; this is the hatch out of it.

## Verify

```bash
npm run build
node -e "const h=require('fs').readFileSync('.next/server/app/index.html','utf8');const b=h.split('data-track=\"home-teams\"')[1].split('</p>')[0];console.log(b.replace(/<[^>]+>/g,' ').replace(/\s+/g,' '));console.log(b.match(/href=\"[^\"]+\"/g))"
npx vitest run src/lib/__tests__/ux-audit-status.test.ts
```

The block renders after the quiz, links both targets, and the test's build-gated
case passes.

## Acceptance criteria

- The built homepage carries `data-track="home-teams"` with links to
  `/topics/teams` and `/paths/improv-for-teams`
- It sits after the quiz and before "Where this applies"
- `homepage-symptoms.ts` is unchanged
- Row 1C of the audit matrix names this task in its Status cell

## Outcome

Done 2026-09-22. One paragraph after the quiz: "Here for a team rather than for
yourself? The guides for teams and leaders start from the meeting, and Improv
for Teams and Leaders is the path that runs them in order." Two links, tracked
as `home-teams`. The topics cluster was already linked further down the page in
the guide-cluster grid, so the line adds one new target (the path) and one
repeat, well inside the hubs' ceiling in `link-repeats.test.ts`. Row 1C of the
audit reads "Open until 2026-09-22" and names this task;
`ux-audit-status.test.ts` checks the block, the two hrefs and that it sits
between the quiz and "Where this applies".
