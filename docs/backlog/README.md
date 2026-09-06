---
type: readme
summary: How this backlog is structured and how a future run should execute it
epics:
  - "[[Podcast finalization]]"
---

# Backlog

A Jira-shaped backlog in plain markdown. Frontmatter carries the fields, wikilinks
carry the relationships, and Obsidian Bases reads both.

## Layout

```
docs/backlog/
  README.md                     this file
  Podcast finalization.md       the epic
  stories/                      one file per story
  tasks/                        one file per task
  bases/Backlog.base            Obsidian Bases views
```

Wikilinks resolve by filename regardless of folder, so `[[PF-1.1 Add podcast-guid
to all three feeds]]` works from anywhere in the vault.

## Schema

Mirrors Jira's issue model closely enough to be familiar, without pretending to be
an export.

| Field | Applies to | Notes |
|---|---|---|
| `key` | all | `PF`, `PF-1`, `PF-1.1`. Epic, story, task. |
| `type` | all | `epic` / `story` / `task` |
| `summary` | all | One line. The Jira summary field. |
| `status` | all | `To Do` / `In Progress` / `Blocked` / `Done` |
| `priority` | all | `High` / `Medium` / `Low` |
| `epic` | story, task | Wikilink up to the epic — Jira's Epic Link |
| `parent` | task | Wikilink up to the story |
| `stories` / `tasks` | epic, story | Wikilinks down to children |
| `blocked_by` / `blocks` | story, task | Wikilinks. Jira's issue links. |
| `sequence` | story, task | Execution order within its parent |
| `story_points` | story | |
| `estimate` | task | |
| `executable` | story, task | `agent` / `human` / `mixed` — **not a Jira field** |
| `labels` | all | |
| `files` | task | Paths the task is expected to touch |

`executable` is the one addition, and it is the field that makes this runnable
rather than merely readable. It says who can do the work: an agent, a person, or
both in sequence.

## Body sections

Every task carries the same four headings so a run can find them without parsing
prose:

- **Run** — the literal commands or steps
- **Verify** — how to know it worked
- **Acceptance criteria** — what done means
- **Outcome** — filled in when the task is executed

## Executing this in a future run

Point an agent at the epic and it should be able to proceed with no other context:

1. Read the epic. It carries what is already done, so nothing gets redone.
2. Walk `stories` in `sequence` order; within each, walk `tasks` in `sequence` order.
3. Check `blocked_by` before starting anything. If a blocker is not `Done`, skip.
4. Respect `executable`. Do not attempt `human` tasks — report them.
5. On success, set `status: Done` and write what happened under `Outcome`.
6. A story is only `Done` when all its tasks are.

## A caveat about the .base file

`bases/Backlog.base` is written against Obsidian Bases as of 2025, where
frontmatter properties are addressed as `note.<property>`. Obsidian has changed
this syntax once already, so if the views come up empty in your version, try
dropping the `note.` prefix before assuming the data is wrong.

The markdown is the source of truth. The base file is a convenience layer over it
and nothing depends on it — the backlog reads fine as plain notes, and any other
table tool over the same frontmatter would work equally well.
