---
key: DI-1.4
type: task
summary: The cloud runs do the whole job and cannot publish it — the Claude GitHub App has no push access to this repository, so every scheduled run ends with a 403
epic: "[[Improv directory]]"
parent: "[[DI-1 The archive and the engine]]"
status: To Do
priority: Highest
sequence: 4
executable: human
estimate: 5m
labels: [directory, engine, account]
impact: 5
radius: 4
opportunity: 20
complexity: 1
roi: 20.0
blocked_by: []
blocks: []
files:
  - docs/directory-engine-run.md
---

# DI-1.4 — The runs cannot push

## What was found

The first scheduled run (2026-10-01, by hand to test it) did the whole job
and could not publish a word of it. It planned the ten cities due, researched
every one, imported all ten through the engine, passed the data guard and
committed — then:

```
remote: Claude doesn't have GitHub access to jaychristopher/improv-journal
        for your organization.
fatal: unable to access 'https://github.com/jaychristopher/improv-journal/':
       The requested URL returned error: 403
```

The container is ephemeral, so that commit is gone. Nothing was lost beyond
the run itself: the cursor only advances on a successful import that gets
pushed, so the same ten cities are due next time.

This is the one thing a run cannot fix for itself, and until it is fixed
every scheduled run is wasted work.

## Run

Either:

1. Install or extend the Claude GitHub App for this repository:
   <https://github.com/apps/claude/installations/select_target> — pick
   `jaychristopher/improv-journal`.
2. Or reconnect GitHub from claude.ai settings:
   <https://claude.ai/customize/connectors?auth_start=github&auth_start_force=1>

## Verify

Run either routine by hand from <https://claude.ai/code/routines> and watch
it finish. The link check is the cheap one to test with — it needs no
searches, and most weeks it has nothing to commit, so a clean finish with
"nothing changed" is the proof that access works.

Then, on the next reading, `git log --oneline -- data/directory` shows a
commit by the run.

## Acceptance criteria

- A scheduled run pushes to `main` without a 403.
- The commit touches `data/directory` and nothing else.

## Scoring

Impact 5, radius 4, opportunity 20, complexity 1, ROI 20.0.

## Outcome

Open. Note what this is not: it is not an API key. Nothing is minted,
nothing is stored in the repository and nothing expires — it is the GitHub
App being allowed to see one repository, once.
