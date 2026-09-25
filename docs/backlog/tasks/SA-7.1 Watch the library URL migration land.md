---
key: SA-7.1
type: task
summary: Two of the twelve URLs Google has surfaced no longer exist, both are library pages redirected on 2026-09-24, and one of them ranks at position 12
epic: "[[Search alignment]]"
parent: "[[SA-7 Thirty-two URLs moved and nothing is watching them land]]"
status: To Do
priority: High
sequence: 1
executable: mixed
estimate: 45m
labels: [seo, redirects, indexing, measurement]
impact: 3
radius: 3
opportunity: 9
complexity: 2
roi: 4.5
blocked_by: []
blocks: []
files:
  - src/lib/redirects.ts
  - scripts/seo-audit.mjs
---

# SA-7.1 — Watch the library URL migration land

## What was found

Checking the twelve GSC-surfaced URLs against the current build, **two no longer
exist as pages**:

| GSC URL                                      | Position | Status in the build                                    |
| -------------------------------------------- | -------- | ------------------------------------------------------ |
| `/library/ref-attention-and-effort-kahneman` | **12.0** | gone — 301 to `/library/attention-and-effort-kahneman` |
| `/library/ref-sawyer-group-genius`           | 43.0     | gone — 301 to `/library/sawyer-group-genius`           |

The other ten resolve normally. Both casualties are library entries, and they
are the only two library URLs Google had indexed — which is to say the migration
on 2026-09-24 moved exactly the pages that had something to lose.

**The migration itself is clean, and that is worth recording so nobody re-audits
it.** `generateLibraryRedirects()` derives the mapping from the atom list by
filtering `type === "reference"`, so all 32 are covered and no hand-maintained
list can drift. The redirects are permanent. `library-slug.ts` documents the
reasoning and already names the stake: "these are the best-ranking pages on the
site and several have been indexed for months." And there are **zero**
occurrences of `library/ref-` in the build, the sitemap, `public/llms.txt` or
`public/search-index.json`. Nothing internal points at the old paths.

What is missing is entirely on the far side. A 301 is a request, not a transfer.
Until Google recrawls each old URL and moves the signal, those positions are in
flight, and no file in this repository records that the move happened or when.

**This also corrupts the epic's own evidence.** SA-1.1, SA-4.1 and SA-6.1 each
instruct a GSC re-read in 30 days. That read will show two URLs gone. Without
the migration date written down next to the GSC block, the natural reading is
"we lost two rankings", and the natural response is to undo something that was
correct. SA-4.1 already carries one correction from this same cause: it claimed
the Kahneman page had zero inbound internal links, which was the old path being
counted. The live page has 38, above the library median of 23.

## Run

1. **Verify the redirect in production, not in the config.** Request both old
   URLs and confirm a 301 to the new path with no chain and no hop through the
   apex. The repo already knows apex→www is a 307; a redirect landing on a
   307 first is a weaker signal than one landing directly.
2. **Write the migration date where the evidence lives.** Add it to the GSC
   comment block in `scripts/seo-audit.mjs`, which already holds dated readings
   and already says to move the date when refreshing. One line: on 2026-09-24
   all 32 library URLs changed, and GSC rows for `/library/ref-*` before that
   date describe pages that have moved. This is the step that stops the next
   reader misdiagnosing it.
3. **Re-read `gsc-pages` after 30 days and compare like for like.** The question
   is whether `/library/attention-and-effort-kahneman` appears with a position
   near 12, not whether `/library/ref-attention-and-effort-kahneman` is still
   there. Record both. If the new URL has not appeared after 60 days, that is
   the point at which the redirect is worth doubting.
4. **Decide about IndexNow, and ask before acting.** `npm run seo:indexnow`
   exists for exactly this — telling search engines a set of URLs changed — and
   it reaches an external service, so CLAUDE.md forbids running it unasked.
   This task's job is to put the decision in front of the owner with the
   reasoning, not to make it. Submitting 32 changed URLs after a deliberate
   migration is the textbook use of the tool; it is still their call.

## Verify

- Both old URLs return a permanent redirect to the correct new path, checked
  against production rather than against `next.config.ts`.
- The migration date is recorded in the audit's GSC block.
- A dated GSC re-read records whether the new URLs have been picked up.
- No file in the repo references a `library/ref-` URL.

## Scoring

- **impact 3** — it protects demand the site already holds rather than finding
  new demand, and the pages are the qualified kind: somebody searching "keith
  sawyer group genius" is precisely this site's reader. Not 4, because a
  correctly generated permanent redirect usually just works, so the expected
  loss is small and this is closer to insurance than to growth. Not 2, because
  one of the two is position 12 — the third-best position on the site — and the
  measurement confusion it causes has already produced one wrong claim in this
  epic.
- **radius 3** — 32 of 386 pages directly, plus the evidence base of three other
  cards that schedule a GSC re-read. Not higher: it touches one layer's URLs and
  a comment block, and changes no content and no ranking logic.
- **opportunity 9**
- **complexity 2** — mostly observation, one recorded date, and a decision handed
  to a person. Not 1: it needs a production check rather than a config read, and
  step 3 is a judgement about when a slow transfer becomes a failed one.
- **roi 4.5**

**A note on where this sits in the queue.** ROI puts it last, and ROI is the
wrong instrument for it. Every other card in this epic keeps its value
indefinitely; this one decays, because the window in which a 301 can be
diagnosed and helped is measured in weeks and the clock started on 2026-09-24.
The honest fix is to say so here rather than to inflate a number until the
ordering comes out right — that is the same move as raising a threshold to clear
a failing test. Priority is set High for this reason; an agent working strictly
down the ROI list should still pick step 2 off this card early, because it costs
one line and prevents a wrong diagnosis in three other cards.

## Outcome

_Not started._
