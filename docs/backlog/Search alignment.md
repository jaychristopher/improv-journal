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
  - "[[SA-3 The pages nobody measured are the ones on the actual subject]]"
  - "[[SA-4 The pages that rank and the pages that get promoted are disjoint sets]]"
  - "[[SA-5 The SEO discipline covers the layer that does not rank]]"
  - "[[SA-6 The number that decides what gets promoted rests on one unrecorded observation]]"
  - "[[SA-7 Thirty-two URLs moved and nothing is watching them land]]"
  - "[[SA-8 The answer-engine channel is invested in and never measured]]"
  - "[[SA-9 The cluster named for the subject is the one that is not a topic]]"
  - "[[SA-10 The prioritisation fields are null for most of the demand the site captures]]"
  - "[[SA-11 The five school pages are unmeasured and two of them sit on the softest terms found]]"
  - "[[SA-12 Three hundred episodes ship to a feed nothing points at]]"
  - "[[SA-13 The diagram library is finished and connected to nothing]]"
  - "[[SA-14 The query table is a half-percent sample and the backlog read it as the total]]"
  - "[[SA-15 Every number in the corpus describes one market and nothing says which]]"
  - "[[SA-16 The library returns four times its size and nobody has ever looked at it]]"
  - "[[SA-17 A citation page is outranking the guide written for the topic]]"
  - "[[SA-18 The site has no rank tracking and the one tool that would work is empty]]"
  - "[[SA-19 The library splits in two and only the long half has ever surfaced]]"
  - "[[SA-20 The verdict records whether we can rank and never whether we should]]"
  - "[[SA-21 A reachable position is not a valuable one]]"
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

| Field         | Scale | Means                                                                                                                 |
| ------------- | ----- | --------------------------------------------------------------------------------------------------------------------- |
| `impact`      | 1–5   | How much _qualified_ traffic this moves. 5 = converts demand the site already ranks for; 1 = speculative.             |
| `radius`      | 1–5   | How much of the corpus it touches. 5 = every content file; 1 = one page.                                              |
| `opportunity` | 1–25  | `impact × radius`.                                                                                                    |
| `complexity`  | 1–5   | Effort plus risk of getting it wrong. 5 = new content at scale or a decision that is hard to reverse; 1 = mechanical. |
| `roi`         | —     | `opportunity ÷ complexity`, to one decimal. The queue order.                                                          |

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
- [[SA-3 The pages nobody measured are the ones on the actual subject]] — the
  unchecked guides are the core theme at the site's lowest difficulty.
- [[SA-4 The pages that rank and the pages that get promoted are disjoint sets]]
  — the biggest internal-link lever has never read an outcome.
- [[SA-5 The SEO discipline covers the layer that does not rank]] — the keyword
  and SERP fields exist only on bridges, and atoms are what Google surfaces.
- [[SA-6 The number that decides what gets promoted rests on one unrecorded observation]]
  — `serp_min_dr` gates promotion sitewide and two thirds of it is uncorroborated.
- [[SA-7 Thirty-two URLs moved and nothing is watching them land]] — the library
  migration is clean internally and unobserved externally. Time-sensitive.
- [[SA-8 The answer-engine channel is invested in and never measured]] — 88KB a
  deploy for an audience nobody has counted.
- [[SA-9 The cluster named for the subject is the one that is not a topic]] —
  the homepage's improv door opens onto the corpus's least structured cluster.
- [[SA-10 The prioritisation fields are null for most of the demand the site captures]]
  — every threshold here is built on fields Ahrefs leaves blank for this site.
- [[SA-11 The five school pages are unmeasured and two of them sit on the softest terms found]]
  — entity queries are the one corner where the apparatus can see, and nobody pointed it there.
- [[SA-12 Three hundred episodes ship to a feed nothing points at]] — three
  directory-ready podcasts with no directory.
- [[SA-13 The diagram library is finished and connected to nothing]] — 250
  diagrams, 16 route pages without one, and a text card for every social image.
- [[SA-14 The query table is a half-percent sample and the backlog read it as the total]]
  — the evidence under six of these cards was 0.5% of the real number. Do it first.
- [[SA-15 Every number in the corpus describes one market and nothing says which]]
  — all 317 figures are US-only and undeclared; 56% of clicks are not.
- [[SA-16 The library returns four times its size and nobody has ever looked at it]]
  — 8% of the site, 33% of its impressions, and 32 finite pages.
- [[SA-17 A citation page is outranking the guide written for the topic]] — all
  fifteen Viewpoints queries go to the book entry. Settle it before SA-16.1.
- [[SA-18 The site has no rank tracking and the one tool that would work is empty]]
  — nineteen cards promise a verification nothing can currently perform.
- [[SA-19 The library splits in two and only the long half has ever surfaced]] —
  a real split, an unproven cause, and a three-page test rather than a rewrite.
- [[SA-20 The verdict records whether we can rank and never whether we should]] —
  theatre-games is promoted sitewide into a children's drama SERP.
- [[SA-21 A reachable position is not a valuable one]] — the same floor evidence
  is worth 194 visits on one term and 7 on another. Read the nine SERPs once.
