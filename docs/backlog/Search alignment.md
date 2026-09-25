---
key: SA
type: epic
summary: Make the site's vocabulary match the vocabulary its readers search with
status: To Do
priority: High
labels: [seo, metadata, content]
created: 2026-09-25
target: Every entry is findable in the words its reader would actually type, without the corpus drifting from the words it means
stories:
  - "[[SA-1 The corpus speaks one vocabulary and readers use several]]"
  - "[[SA-2 The link profile is unreadable, and nobody is watching it]]"
---

# Search alignment

A standing epic for SEO insights found by the recurring audit loop, scored so
another agent can work them in ROI order without re-deriving the case each time.

The theme does not move: this is not about chasing volume or adding pages for
terms the site does not teach. It is about the gap between what the corpus
already says and the words people use to look for it — and about organising,
atomising and linking what exists so every entry can be found by the reader it
was written for.

## Scoring

Every task in this epic carries five numbers in its frontmatter. They exist so
the queue can be ordered without an argument, not to be precise.

| Field | Scale | Means |
|---|---|---|
| `impact` | 1–5 | How much *qualified* traffic this moves. 5 = converts demand the site already ranks for; 1 = speculative. |
| `radius` | 1–5 | How much of the corpus it touches. 5 = every content file; 1 = one page. |
| `opportunity` | 1–25 | `impact × radius`. |
| `complexity` | 1–5 | Effort plus risk of getting it wrong. 5 = new content at scale or a decision that is hard to reverse; 1 = mechanical. |
| `roi` | — | `opportunity ÷ complexity`, to one decimal. The queue order. |

Two rules the scores are worthless without:

**Impact is capped by evidence.** A task whose case rests on a number nobody
retrieved scores 1 on impact, whatever it promises. Ahrefs and GSC are the only
sources for demand, per CLAUDE.md, and absence is a legitimate recorded state.

**Complexity counts the reversal.** Editing a title is a 1. Retargeting a page's
keyword, merging two entries, or changing a URL is a 3 or more, because undoing
it costs a redirect and a reindex.

## Stories

- [[SA-1 The corpus speaks one vocabulary and readers use several]] — readers
  search in words the corpus does not put where search can see them.
- [[SA-2 The link profile is unreadable, and nobody is watching it]] — the
  number that would say whether outreach works rises on its own.
