---
key: EC-2
type: story
summary: Say something the visitor can use, not where the page sits in the graph
epic: "[[Entry-point context]]"
status: To Do
priority: Medium
sequence: 2
story_points: 3
executable: agent
labels: [ux, context]
blocked_by: 
  - "[[EC-1 Cold-arrival orientation]]"
blocks: []
tasks:
  - "[[EC-2.1 Rewrite the context line for someone who just arrived]]"
---

# EC-2 — Context written for the visitor, not the taxonomy

Where the banner does render, it reads "Part of *thread* in *path*". That is a
position in a structure the visitor has never seen. Depends on EC-1 only in the
sense that it is the same component; do EC-1 first so the rewrite lands
everywhere at once rather than twice.
