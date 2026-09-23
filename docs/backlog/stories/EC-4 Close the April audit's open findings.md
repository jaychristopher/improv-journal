---
key: EC-4
type: story
summary: Build the two findings of the April UX audit that nothing else built
epic: "[[Entry-point context]]"
status: Done
priority: Medium
sequence: 4
story_points: 2
executable: agent
labels: [ux, context, audit]
blocked_by: []
blocks: []
tasks:
  - "[[EC-4.1 Add a team-leader line under the homepage quiz]]"
  - "[[EC-4.2 Group the paths hub by focus]]"
---

# EC-4 — Close the April audit's open findings

`docs/ux-audit-matrix.md` (2026-04-22) scored seven page types against seven
personas and marked 21 rows "Tweak". Most were built the same morning, in four
commits nobody cited, and the level hatches among them were then rebuilt from the
graph in September (tracker entries 247, 250, 281) without anyone reading the
audit. Tracker entry 293 (2026-09-22) found the document cited by no test, no
task and no entry, and two of its findings never built:

- **A team-leader signal on the homepage.** The quiz gained "I lead a team" at
  04:48 on the audit's day and lost it at 10:56 when the symptom quiz replaced
  it. The five symptoms are all personal, so a team leader reads the page as not
  theirs.
- **A paths hub grouped by focus.** `/paths` lists all eleven on one improv
  level ladder. The audit's verdict: alienating for anyone who does not think
  of themselves as beginner → intermediate → performer.

The audit itself now carries a Status column, one cell per Tweak row, and
`src/lib/__tests__/ux-audit-status.test.ts` fails if a row loses it — so a
fourth April plan cannot sit unresolved and unmarked.
