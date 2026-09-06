---
key: EC-2.1
type: task
summary: Replace the internal-taxonomy phrasing with something a stranger can use
parent: "[[EC-2 Context written for the visitor, not the taxonomy]]"
epic: "[[Entry-point context]]"
status: Done
priority: High
sequence: 1
executable: agent
estimate: 60m
labels: [ux, context, copy]
blocked_by: []
blocks:
  - "[[EC-1.1 Give every concept page a cold-arrival line]]"
files:
  - src/components/ContextBanner.tsx
---

# EC-2.1 — Write it for the visitor

Current copy: "Part of *The Inner Game Expanded* in *Systems of Improv*".

Both names are internal. Somebody who arrived thirty seconds ago from a search
result has never seen either, and the sentence locates the page inside a structure
they have no model of. It reads as orientation and functions as jargon.

## Run

Decide what one line should carry. Candidates, none of them obviously right, which
is why this is a task rather than an instruction:

- What kind of page this is and what it is for
- What the site is, in a clause rather than a sentence
- The single most useful next step given why they probably arrived

Whatever is chosen has to hold for a library entry about a Substack and for a
principle inside a course, because both render it.

Check the type label already shown above the h1 ("concept", "exercise") before
adding anything — some of this job is already done and repeating it is its own
kind of overload.

## Verify

Read three pages as a stranger would, one from each of: a library entry, an
exercise, a principle in a path. The line should be useful on all three or it is
the wrong line.

## Acceptance criteria

- The context line names nothing that only makes sense from inside the site
- It holds on pages with and without a thread or path
- Still one line

## Outcome

Done 2026-09-06. The line now says what each name is rather than only what it is
called: "*Traditions in Tension* is a lesson in *The Improv Reference Guide* — a
sequence meant to be read in order."

The diagnosis in this task was that the names are internal. The narrower truth
is that they are proper nouns with no type attached — a reader told one is a
lesson and the other an ordered sequence can decide whether to follow it, and a
reader given two titles cannot. Naming the type is what the old copy left out.

"Sequence" rather than "course": only `beginner-foundations` declares a length
and cadence, and calling `reference-guide` a course would be false.

Both halves are optional now. Requiring a thread *and* a path is why 103 of 205
concept pages showed nothing; coverage went from 102 to 137 of the 179 built
concept pages. The remainder belong to neither and are [[EC-1.1 Give every
concept page a cold-arrival line]], which this unblocks. Library entries still
show none — that route does not render through AtomDetail at all.

Read as a stranger on the three page types named above: a principle inside a
course, an exercise, and a format all read sensibly. A library entry has no line
to read, which is the open half.

Two tests failed on this and both were right to. `context-line-position` matched
the line by the string "Part of ", which the new copy mostly does not use — it
found zero pages and would have gone on passing vacuously if the floor had been
lower, so it now matches the phrasing the component emits. `system-counts`
caught the tagline quoted verbatim in a new code comment, which is exactly the
hardcoded count it exists to stop.
