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
  - "[[DI-1.2 Set the Actions secret and run the engine once]]"
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
closed venue goes at once), ranks and writes. A GitHub Actions workflow runs
it daily on the next ten cities of the cycle and commits what changed, which
deploys. The one thing it cannot do for itself is hold the key: DI-1.2 is
the owner setting `ANTHROPIC_API_KEY` in the repository's secrets.

The first reading was made before that secret existed, by Claude in a
session, and imported through the same checks the API path uses (DI-1.3).
