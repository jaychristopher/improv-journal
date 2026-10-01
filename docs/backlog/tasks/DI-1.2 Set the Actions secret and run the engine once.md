---
key: DI-1.2
type: task
summary: Add ANTHROPIC_API_KEY to the repository's Actions secrets so the daily engine can run, then run the workflow once by hand and read its commit
epic: "[[Improv directory]]"
parent: "[[DI-1 The archive and the engine]]"
status: To Do
priority: High
sequence: 2
executable: human
estimate: 15m
labels: [directory, engine, account]
impact: 5
radius: 4
opportunity: 20
complexity: 1
roi: 20.0
blocked_by: []
blocks: []
files:
  - .github/workflows/directory-engine.yml
  - scripts/directory-engine.mjs
---

# DI-1.2 — The one thing the engine cannot do for itself

## What was found

`.github/workflows/directory-engine.yml` runs daily at 09:17 UTC on the
next ten cities of the cycle and commits what changed. Its first step checks
`ANTHROPIC_API_KEY` and fails plainly without it; no commit is made and
nothing deploys. The key is the owner's to add. The run costs tokens plus
web searches at the Claude API's per-search rate (up to twelve searches a
city by default, `DIRECTORY_MAX_SEARCHES`); ten cities a day is the budget
the workflow was sized for.

## Run

1. On GitHub: the repository → Settings → Secrets and variables → Actions →
   New repository secret: name `ANTHROPIC_API_KEY`, value a key from the
   Claude Console with web search enabled for the organisation.
2. Actions → directory-engine → Run workflow. Leave `cities` empty for the
   next ten on the cycle, or give a slug to read one city.
3. Watch the job: the "Read the cities" step prints one line a city
   (`chicago: 14 entries (+2 ~12 -0, 0 unverified, 1 rejected), 9 searches`)
   and the last step commits `Directory engine: <cities> (<date>)`.

## Verify

```bash
git log --oneline -3 -- data/directory
```

A commit by `directory-engine` after the run, and the city pages on
production carry a later "Last pass" date than the first reading.

## Acceptance criteria

- The scheduled run commits on its own the next morning.
- `data/directory/engine-state.json` shows the cursor moving.

## Scoring

Impact 5, radius 4, opportunity 20, complexity 1, ROI 20.0: fifteen minutes
that make the archive autonomous.

## Outcome

_Not started._
