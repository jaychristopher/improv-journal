---
key: PF-4
type: story
summary: Bring the listen hub up to the standard the other category hubs meet
epic: "[[Podcast finalization]]"
status: To Do
priority: Medium
sequence: 4
story_points: 3
executable: agent
labels: [podcast, seo, content]
blocked_by: []
blocks: []
tasks:
  - "[[PF-4.1 Give the listen hub an argument]]"
---

# PF-4 — Listen hub depth

`/listen` holds three shows and 62 episodes in 278 words under two headings —
"Featured" and "Three Shows". It is the thinnest hub on the site that is the
primary page for its term.

The pattern to follow already exists in this repo. `/practice/techniques` and
`/how-it-works/diagnosis` were both a heading over a list and were rewritten to
carry an argument plus a questions section, with a guard in
`src/lib/__tests__/category-hub-prose.test.ts` that fails a hub which only lists.

Independent of submission. Worth doing whether or not the shows get listed.
