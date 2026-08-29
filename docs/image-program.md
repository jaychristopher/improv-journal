# Image Program — handoff

**Status:** in progress. Pipeline built, three assets authored, conventions settled.
**Owner:** unassigned (intended for a dedicated agent, working independently of SEO work)
**Created:** 2026-08-25 · **Updated:** 2026-08-27

> **Read the styleguide first.** The design system lives in
> `improv-journal-image-gen/STYLEGUIDE.md` — tokens, patterns, canvas, alt-text rules,
> and the review checklist. This document is now the inventory and its history.
>
> **The three open decisions below are settled.** Diagrams are inlined at build time,
> which resolves both layout shift and dark mode; the canvas is 400px. `Article.image`
> is still open. See the revised sections for the detail.
>
> **The Tier 1 specs below were written from page titles and keyword data, not page
> bodies, and three of ten did not survive contact with the source.** Every remaining
> row should be re-read against its page before authoring. Corrections are inline.

---

## Why this exists

The build has **376 pages and zero `<img>` elements in page bodies**. Measured, not
estimated — every rendered HTML file was walked and none contains a body image.

That closes off Google Images entirely, and it removes the one content type this site
has no version of. Everything here is prose, and a good deal of it describes structures
that are genuinely spatial: the shape of a Harold, nine Viewpoints sorted into two
groups, a lineage running Spolin → Sills → Close → UCB. Those are diagrams being
described in sentences.

### What is already handled — do not duplicate it

Per-page social cards exist and work. `/og?title=…&eyebrow=…` renders a 1200×630 PNG
(verified live: 200, `image/png`, 49 KB), every page declares it as `og:image`, and
`Article` structured data points `image` at it. `src/app/og/route.tsx` owns this and
`article-image.test.ts` guards it.

**The OG card is a text card, not a picture of anything.** It is the right asset for a
link preview and contributes nothing to image search. This program is about content
images and does not touch the OG system.

---

## Verified technical facts

These were tested against the real build, not assumed.

| Fact | How it was established |
|---|---|
| Markdown images render | Added `![alt](/images/test-diagram.svg)` to an atom, built, got `<img src="/images/test-diagram.svg" alt="Test diagram showing the structure">`. Reverted. |
| `src` and `alt` survive the sanitiser | Same test. `.use(html)` runs with the default schema, which permits `img`. |
| Markdown cannot express `width`/`height` | Markdown image syntax has no slot for them, and none appeared in the output. |
| No `public/images/` directory exists | `public/` holds only `audio/`, the Next.js starter SVGs, `llms.txt`, `search-index.json`. |
| `next/image` is not used anywhere | No import of it in `src/`. |
| 24 format atoms, 27 exercise atoms, 7 law atoms | Counted from frontmatter `type:`. |

### Corrections and additions (2026-08-27)

The two unverified items above are resolved, and one assumption in the table was wrong.

| Fact | How it was established |
|---|---|
| **An `<img>`-referenced SVG cannot be themed at all** | An SVG loaded through `<img src>` is an isolated document: no page CSS, so `currentColor` resolves to its own initial black, and no access to the site's typeface. Decision 3 below was unworkable as written. |
| **`remark-html` v16 sanitises by default** | Its `sanitize` option defaults to the GitHub schema. That permits `img`, which is why the original test passed — and would strip an inlined `<svg>` outright. |
| **Diagrams are inlined after sanitising, not before** | `inlineDiagrams()` in `src/lib/diagrams.ts` runs on the rendered HTML as the outermost transform in `loadFiles`. No new dependency, no schema change, and the id rewriting `anchor-targets.test.ts` guards is untouched. |
| **Ids inside a diagram are unsafe** | The sanitiser clobber-prefixes ids with `user-content-`, so `aria-labelledby` would break silently. `<title>` as first child of `<svg role="img">` supplies the accessible name instead. Diagram files carry no ids at all. |
| **The prose measure is 604px, not the container width** | Guides render in `max-w-2xl` with `px-6`. Atom pages give 604 too. Diagrams are authored at 400 and never scale up — see the styleguide for why. |
| **The site's typeface is Arial, not Geist** | `body` in `globals.css` sets `Arial, Helvetica, sans-serif`, overriding the Geist variable. Inlined diagrams inherit it, which is what makes them match their prose. |
| **Three Tier 1 pages have no markdown at all** | `/practice/formats`, `/how-it-works/principles` and `/improv-games` are JSX route pages. They never touch the markdown pipeline, so they use `<Diagram>` (`src/components/Diagram.tsx`) — same files, same tokens, same guards. |

**Working note.** `content.ts` memoizes the atoms load per process, so editing a `.svg`
does not invalidate rendered HTML. The dev server needs a restart to show SVG changes.
Markdown edits hot-reload normally.

---

## The three decisions — two settled, one open

### 1. Layout shift — SETTLED

Inlining solved this. `inlineDiagrams()` reads each SVG's `viewBox` at build time and
emits `width`/`height` on the inlined element, so the diagram reserves its space before
it paints. No CLS, no authoring discipline required, and it covers every markdown layer
including the 205 atoms.

The original three options all assumed the image stayed an `<img>`. Once it is inlined
the problem disappears along with the tag.

### 2. Whether `Article.image` should change — STILL OPEN

`article-image.test.ts` currently asserts every Article names its `/og` card. If a page
gains a real content image, that image is a better candidate for `Article.image` —
Google uses it for Search and Discover, and a diagram beats a text card.

This is a real decision with a guard attached. Do not change the markup without
updating that test and its comment, which documents why the OG card was chosen.

Now that three pages carry real diagrams, this is the one worth resolving next.

### 3. Dark mode — SETTLED

`currentColor` was the right instinct but could not work through an `<img>` tag, which
gets no page CSS at all. Inlining makes it work: a diagram file carries **no colour of
its own**, only `dg-*` class names, and the tokens resolve from `globals.css` in both
themes. One asset, both themes, no second palette.

Verify in a browser against both themes before marking any row done — that part of the
original instruction stands, and it is in the styleguide's review checklist.

---

## Conventions (proposed — confirm, then follow)

- **Location:** `public/images/<page-slug>.svg`. One asset per page keeps the mapping
  obvious; shared assets go in `public/images/shared/`.
- **Format:** SVG for every diagram. It is text, so it diffs in git, scales without
  artefacts, and costs a few KB.
- **No photographs, no stock imagery, no AI-generated pictures presented as real.** This
  site's credibility rests on being accurate about a craft. A decorative photo of
  people laughing adds page weight and no information, and Google has been explicit for
  years that decorative imagery is not a ranking benefit.
- **Budget:** 30 KB per asset. A structural diagram that exceeds this is over-drawn.
- **Colour:** `currentColor` wherever possible. See decision 3.
- **Every image must earn its place by carrying information the prose cannot.** If the
  sentence beside it already says the whole thing, skip the row and mark it declined.

### Alt text and captions

Alt text is the primary thing Google Images reads, and it is also what a screen reader
announces. Both are served by the same rule: **describe the information, not the
artefact.**

- Good: `Three beats of a Harold, each opening with a group game and splitting into
  three scenes that return in the next beat.`
- Bad: `Diagram of the Harold structure` — names the artefact, carries nothing.
- Bad: `improv harold structure diagram improv long form format` — keyword stuffing,
  and it reads as spam to both a crawler and a person.
- Filenames are a weak but real signal: `harold-structure.svg`, not `diagram-1.svg`.
- Add a caption beneath in italics where the diagram needs a sentence of context. The
  caption is indexed as body text; the alt is not.

---

## Inventory

Ordered by value, which here means: pages that Search Console already shows surfacing,
then pages whose terms are most winnable, then the layers where a diagram is inherently
the right form.

Winnability figures below are from each guide's `serp_min_dr` and `traffic_potential`
frontmatter.

### Tier 1 — highest value (10 assets)

These are the pages where a diagram would do the most, either because the page already
surfaces in search or because its term is the most reachable on the site.

**Spec accuracy, checked against page bodies 2026-08-27.** Three of ten specs were wrong
— written from titles and keyword data rather than from what the page argues. Corrected
rows are marked ⚠. Read the source before authoring any remaining row.

| # | Page | Asset | What it must show | Status |
|---|---|---|---|---|
| 1 | `/practice/formats/harold` | `harold-structure.svg` | Opening, three beats of three scenes, **two** group games (after beats one and two — not between every beat), each beat labelled discovery/heightening/connection, and the return from beat one to beat three. Dashed, because the page's standard is that connections feel *discovered rather than arranged*. | ✅ |
| 2 | `/practice/formats` | `longform-vs-shortform.svg` | ⚠ **Re-spec:** the structural difference (discrete games vs one continuous piece) is stated plainly in a sentence, so drawing it restates prose. The page names a better one — "for a cast, the useful difference is where the difficulty sits": short form hardest at the start of every game, long form hardest in the middle. Two timelines with the hard stretches marked. First page to use `<Diagram>`. | ✅ |
| 3 | `/theatre-games` | ⚠ `what-to-train-first.svg` | **Not a matrix.** Every game sits under exactly one skill heading, so a game × skill grid would invent intersections the page never claims. What the page *does* bury: attention is "the starting point", emotional range "usually later", the other four unordered. Three tiers. | ✅ |
| 4 | `/del-close` | ⚠ `two-cohorts.svg` | **Not a lineage.** Spolin and Sills barely appear. The page's thesis is that the student list "is usually presented as one undifferentiated roll of famous people" when it was two cohorts: Second City 1973–82 (Belushi, Murray, Radner, Candy) who became *famous*, iO from 1984 (Fey, Poehler, UCB) who became *teachers*. A career timeline with both periods marked. | ✅ |
| 5 | `/viewpoints` | `nine-viewpoints.svg` | Spec accurate. Time (Tempo, Duration, Kinesthetic Response, Repetition) and Space (Shape, Gesture, Architecture, Spatial Relationship, Topography), with the page's own gloss — one about *when*, one about *where*. The vocal set pushes past the 12-element cap; leave it out. **Value is marginal — the page already groups these under H3s.** | ✅ |
| 6 | `/how-it-works/principles` | `principles-dependency.svg` | The nine principles as a dependency graph — presence as precondition, changeability as what presence is for, honesty/bravery supplying material, simplicity as corrective. The prose describing this is already on the page and the diagram should match it exactly. **Spec verified — the only Tier 1 spec that survived contact with its source unchanged.** Drawn as strata rather than arrows: the page says the nine stand in a *rough* dependency, so a precise nine-node graph would invent precision the source disclaims. | ✅ |
| 7 | `/types-of-listening` | `three-listening-modes.svg` | Spec accurate. The three modes as a channel between the other person and you: broadcast mostly occupied by composing a reply, evaluative passing through a judgment filter, receptive left clear. Three *shapes*, not three points on one scale — the page never quantifies evaluative. | ✅ |
| 8 | `/improv-games` | `choosing-a-game.svg` | ⚠ **Re-spec: not a decision path.** The page's choosing section is a symptom → game mapping on one axis ("name what is going wrong and pick the game that isolates it"), and it is already a list — drawing it would restate prose. The diagram on this page is the *other* section: warm-up vs exercise vs performance game, three kinds doing three different jobs, distinguished by the page's own phrases, with the classic mistake (running an exercise as a performance game) accented. | ✅ |
| 9 | `/viola-spolin` | `point-of-concentration.svg` | Spec accurate, near-verbatim from the page. Mechanism pattern: a narrow problem occupying the attention that would otherwise be self-watching, with the wanted behaviour arriving as a side effect. **Value is moderate — it zooms into one paragraph of a four-invention section.** | ✅ |
| 10 | `/rules-of-improv` | ⚠ `where-the-rules-came-from.svg` | **Not five schools, and not a matrix.** The page names three sources (Fey's *Bossypants* four, Close via *Truth in Comedy*, Johnstone's near-absence of rules), and its per-rule sections are structured as corrections — "what people think it means / why it's mostly wrong / the real principle" — not attributions. Only Fey's four are enumerated; a rule × tradition grid would invent most cells. **Re-spec:** the page's argument is provenance, not attribution — the popular five are "the version that circulates, mostly descended from Fey's summary of Close", while Johnstone is "openly suspicious of the impulse to make lists". Drawn as a line of descent with Johnstone outside it; the missing arrow is the claim. | ✅ |

**Not width-dependent after all.** Both candidate matrices dissolved on inspection, so
nothing in the inventory currently needs the styleguide's `overflow-x` exception. If that
holds through Tiers 2–3, delete the exception rather than leave an untested escape hatch
standing.

### Tier 2 — long-form formats (12 assets)

Format atoms whose structure is the content. Same treatment as the Harold, simpler.
The remaining 12 format atoms are short-form games with no structure worth drawing —
skip them.

`armando` · `la-ronde` · `monoscene` · `montage` · `deconstruction` ·
`narrative-longform` · `organic-longform` · `two-person-longform` · `theatresports` ·
`micetro` · `gorilla-theatre` · `genre-format`

Each: `public/images/<slug>-structure.svg`, showing the shape of a set in that form.
Reuse one visual language across all twelve so they read as a family.

**10 of 12 delivered:** `armando`, `montage`, `la-ronde`, `deconstruction`, `theatresports`,
`narrative-longform`, `monoscene`, `micetro`, `organic-longform`, `two-person-longform`.
Outstanding: `gorilla-theatre`, `genre-format`.

The family language transferred from the Harold and held across all ten — label column at
x=16, a spine, marks to the right, one accent. Only two things vary and both are
content-driven: the spine sits further right when a row label is long (`REINCORPORATION`
needed x=200), and the accent takes whatever form the claim needs — a dashed arc for an
emergent return, a solid bar for a stated one, a rotated label in a narrow gutter, a taper's
final sliver.

**Nothing has been declined.** The doctrine expects declines, and Tier 3 is where that gets
tested. But the Tier 2 evidence is that atoms are consistently richer than their one-line
summaries — `monoscene` looked like a certain decline from its name alone and turned out to
name a closed set of four moves. Do not prune a row before reading its atom.

Two things to carry into the remaining eleven. Read the atom first: the doc's one-line
descriptions are the same kind of title-derived summary that proved wrong for half of Tier 1.
And look for the claim the prose states weakly — Armando's was "early scenes *tend* to be
close to the monologue; later scenes grow more abstract", which is a gradient prose handles
badly and a dashed accent axis handles well (dashed because the page says *tend*).

### Tier 3 — the laws (7 assets)

`belief-as-architecture` · `cognitive-bandwidth` · `continuous-signaling` ·
`interdependence` · `irreversibility` · `meaning-is-relational` ·
`shared-reality-fragility`

These are the site's most abstract pages and the hardest to illustrate honestly. Attempt
one first — `cognitive-bandwidth` is the most concrete, being a claim about a finite
budget — and only continue if it genuinely helps. **Decline the rest rather than produce
decorative shapes.**

**Outcome: 6 drawn, 1 declined. Tier 3 is complete.**

The tier's working rule turned out to be: **the law is never the diagram — a mechanism
inside the page is.** `cognitive-bandwidth` gave an ordered degradation, not a budget.
`irreversibility` gave the arithmetic of blocking, not the arrow of time. `interdependence`
gave overlapping partial views. `meaning-is-relational` gave one offer branching into two
opposite meanings. Ask "does this page contain a mechanism with a shape", not "does this
law have a shape".

**`belief-as-architecture` — DECLINED.** Three reasons, any one sufficient:

1. Its organising device is a *metaphor* (beliefs as load-bearing walls, living in rubble).
   Metaphors are already visual; drawing one is illustration, which is the decorative
   shape this tier was warned about.
2. Its structural claims are each complete in a single sentence — "cheapest almost always
   means: change the peripheral belief, the inference, or the credibility of the source
   — anything except the structural belief". A diagram restates that with arrows.
3. Its one genuinely spatial idea — rigid core, malleable edge, "edges first, core last"
   — belongs to a different atom, `rigid-core-malleable-edge`. Drawing it here would put
   another page's diagram on this one.

If someone later wants a diagram on this page, the honest candidate is Kahan's finding
that greater cognitive ability *widens* the gap on identity-threatening evidence — two
lines with opposite slopes. It was rejected here as a one-sentence claim rendered as two
lines, but it is the closest thing the page has to a real shape.

### Tier 4 — exercises (27 assets, lowest priority)

Exercise atoms describe a physical activity, which is the case where a picture helps a
reader most and where a diagram is hardest to draw well. Consider only after Tiers 1–3
land, and only for exercises with a spatial arrangement worth showing (`mirroring`,
`the-machine`, `pass-the-clap`, `zip-zap-zop`, `big-booty`).

**Total if fully delivered: 29 assets across Tiers 1–3**, plus an optional 5 in Tier 4.
**Tier 1 complete — 10 of 10.**

**Five of the ten specs had to be rewritten** (rows 2, 3, 4, 8, 10) and a sixth (row 1) needed
correcting in detail. Four were accurate as written (rows 5, 6, 7, 9). The pattern: specs
derived from titles and keyword data describe the page's *subject*; what a diagram needs is
the page's *argument*, and those diverge about half the time. Read the source first.

**Neither width-dependent pattern was ever needed.** Both candidate matrices and the one
decision path dissolved on inspection — the pages turned out to hold partitions, lineages and
comparisons instead. The styleguide's `overflow-x` exception went unused across all ten. If
Tiers 2–3 also avoid it, delete it rather than leave an untested escape hatch standing.

Expect the total to fall. Two Tier 1 rows already turned out to be the wrong diagram, and
the doctrine in the styleguide says a row whose information the prose already carries
should be declined rather than filled. Tier 3 in particular was written expecting most of
its seven to be declined.

---

## After the assets land

- **A guard — DONE.** `src/lib/__tests__/diagrams.test.ts`, 12 assertions: viewBox present
  and no fixed dimensions, no `<style>` and no ids, size budget, every asset referenced,
  every reference resolves, alt is 12–40 words and does not name the artefact, and the
  inliner emits `role="img"` plus a `<title>`. Note the original "every content `<img>`
  has non-empty alt" candidate no longer applies — after inlining there are no content
  `<img>` elements.
- **Image sitemap.** `src/app/sitemap.ts` emits URLs only. Google supports image
  entries within a sitemap and they help discovery. Worth doing once there are enough
  images to matter — not before.
- **Update `docs/page-ledger.json`** if it is being maintained — it is currently
  untracked and stale (generated 2026-05-09).

## Out of scope

- The `/og` card system. It works and is guarded.
- Photographs of real people, venues, or performances the site does not own rights to.
- Any image on the 81 generic self-help guides. The site's own audit found subject-term
  pages surface 86% of the time against 6% for generic ones; the generic cluster is not
  where effort belongs.
