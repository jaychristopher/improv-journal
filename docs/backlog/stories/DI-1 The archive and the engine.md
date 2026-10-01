---
key: DI-1
type: story
summary: Sixty city pages of improv theaters, classes and shows, read from the web by Claude, verified, ranked, and refreshed daily by a workflow that needs one secret the owner has not yet set
epic: "[[Improv directory]]"
status: In Progress
priority: High
labels: [product, directory, engine]
tasks:
  - "[[DI-1.1 Build the archive, the engine and the pages]]"
  - "[[DI-1.2 Run the daily read as a cloud schedule]]"
  - "[[DI-1.3 Make the first reading of every city]]"
---

# DI-1 — The archive and the engine

A person in Omaha asking where to take an improv class finds a listings page
or a Reddit thread. The site had nothing for them, and it is the one site
that could say what a class will ask of them once they get there. The
archive is sixty pages — the fifty most populous US cities and ten more
whose metros are large — each listing the theaters, schools and recurring
shows an engine could verify, each with its own site linked, ranked by one
rubric: longevity and a permanent home, the class program, regular shows,
standing, a current website.

The engine is a script, not a person: Claude searches the live web for a
city with the web search tool, the script fetches every site it names, keeps
what answers, merges with the file (three passes unseen and an entry goes; a
closed venue goes at once), ranks and writes. A cloud scheduled Claude
session does that every day on the next ten cities of the cycle and commits
what changed, which deploys (DI-1.2, following
`docs/directory-engine-run.md`).

It holds no key. The reading is a research task the session does itself, so
the script plans the day and imports what comes back rather than calling an
API — which is also how the first reading of all sixty cities was made
(DI-1.3), through the same checks.
