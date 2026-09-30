---
key: PG-2.1
type: task
summary: Draft about ninety single words chosen for texture, flagged for the school room, and get the owner's teacher to cut it to eighty before anything ships
epic: "[[Prompt generator]]"
parent: "[[PG-2 Longform opens on one word and the generator has none]]"
status: In Progress
priority: Medium
sequence: 1
executable: mixed
estimate: 1h
labels: [content, longform, review]
impact: 3
radius: 2
opportunity: 6
complexity: 1
roi: 6.0
blocked_by: []
blocks:
  - "[[PG-2.2 Build the One word kind on a branch and merge after the review]]"
files:
  - docs/one-word-suggestions.md
---

# PG-2.1 — The list, and the teacher's red pen

## What was found

A Harold or an Armando opens on one word from the crowd, and the word that
works is a common noun with a smell, a weight or a history — rust, deposit,
inheritance — not "banana". The plan of 2026-09-30 carries a draft of about
ninety in six groups (things with a smell or a weight; places; paper and
institutions; objects with a history; two meanings; weather and food) with
the words to avoid (Atlantic splits, atom titles the autolinker would catch,
words too grim for a hall).

## Run

Agent: write `docs/one-word-suggestions.md` from that draft — the words in
their groups, one line each on why it has texture, `p` marked where the word
lands on a life (the `landsOnLife` regex in `prompt-bank.test.ts` makes
inheritance, custody, hospital and funeral mechanical), `a` where a
fourteen-year-old cannot play it (mortgage, lease, invoice, pension). No
scores yet.

Human: send the teacher the list as plain text with three questions — which
to cut to eighty, which are missing, which a school room must not see. Time-
box a day. Record the answers at the foot of the file.

## Verify

The file exists with about ninety words, each on one line, each matching
`/^[a-z]+$/`, and a dated "What the teacher said" section at the foot.

## Acceptance criteria

- The list has been read by the teacher and their cuts are recorded.
- No word is an atom id or a lower-cased atom title.

## Scoring

Impact 3, radius 2, opportunity 6, complexity 1, ROI 6.0.

## Outcome

2026-09-30: the agent half is done — `docs/one-word-suggestions.md` carries
ninety-one words in six groups, one line each on why it has texture, `p` and
`a` marked, the three questions for the teacher at the foot. The human half is
open: the owner sends it and records the answers under "What the teacher
said".
