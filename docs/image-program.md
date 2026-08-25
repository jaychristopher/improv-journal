# Image Program — handoff

**Status:** not started. No image has been authored yet.
**Owner:** unassigned (intended for a dedicated agent, working independently of SEO work)
**Created:** 2026-08-25

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

### Not verified — check before relying on it

- **Raw HTML in markdown.** `.use(html)` is called without `allowDangerousHtml`, so a
  literal `<img width="800" …>` written into a `.md` file is probably dropped. Confirm
  before designing around it.
- **Whether the sanitiser permits `loading` or `decoding` attributes.** The default
  schema is restrictive about attributes; assume it does not until tested.

---

## Decide these three things before authoring the second asset

Authoring one diagram is easy. Authoring 40 and discovering the embedding approach was
wrong is not. Settle these first.

### 1. Layout shift

Markdown images carry no dimensions, so every one of them will shift the page as it
loads. That is a Core Web Vitals regression on pages that currently have none, and it
would be self-defeating to trade CLS for image traffic.

Options, in rough order of preference:

- A remark plugin that reads the SVG's `viewBox` at build time and injects `width` and
  `height` — fixes every markdown image at once and needs no authoring discipline.
- A CSS `aspect-ratio` rule on `.prose img` with a fixed default — cheap, but wrong for
  any diagram not matching the default.
- Move images out of markdown into a component invoked from route pages — full control,
  but does not work for the 205 atoms, which are markdown.

The first option is the only one that covers the markdown layers, which is where most
of the inventory lives.

### 2. Whether `Article.image` should change

`article-image.test.ts` currently asserts every Article names its `/og` card. If a page
gains a real content image, that image is a better candidate for `Article.image` —
Google uses it for Search and Discover, and a diagram beats a text card.

This is a real decision with a guard attached. Do not change the markup without
updating that test and its comment, which documents why the OG card was chosen.

### 3. Dark mode

The site renders in both themes. An SVG with hardcoded `#000` strokes disappears on a
dark background. Use `currentColor` for strokes and text, and `fill="none"` or
theme-token backgrounds, so a single asset works in both. Verify against both themes
before marking any row done.

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

| # | Page | Asset | What it must show | Status |
|---|---|---|---|---|
| 1 | `/practice/formats/harold` | `harold-structure.svg` | The full form: opening, three beats, three scenes per beat, group games between, and the returns connecting beat one to beat three. The single most diagrammatic thing on the site. | ☐ |
| 2 | `/practice/formats` | `longform-vs-shortform.svg` | Two timelines side by side — short form as discrete boxed games with announced rules, long form as one continuous piece with material returning. This page draws four subject-term queries. | ☐ |
| 3 | `/theatre-games` | `games-by-what-they-train.svg` | A matrix: game against the skill it trains (attention, ensemble, physicality, spontaneity, emotional range, structure). tp 2,600, minDR 5 — the highest-potential winnable page. | ☐ |
| 4 | `/del-close` | `chicago-lineage.svg` | The line running Spolin → Sills → Second City → Close → iO → UCB, with dates. "del close" is 2,000/mo with a **DR 2** page in its top ten — the most winnable term on the site. | ☐ |
| 5 | `/viewpoints` | `nine-viewpoints.svg` | The nine physical Viewpoints sorted into Time (Tempo, Duration, Kinesthetic Response, Repetition) and Space (Shape, Gesture, Architecture, Spatial Relationship, Topography), with the vocal set separate. | ☐ |
| 6 | `/how-it-works/principles` | `principles-dependency.svg` | The nine principles as a dependency graph — presence as precondition, changeability as what presence is for, honesty/bravery supplying material, simplicity as corrective. The prose describing this is already on the page and the diagram should match it exactly. | ☐ |
| 7 | `/types-of-listening` | `three-listening-modes.svg` | The three modes and what each does to a conversation. This page sits at **position 7.3** — the best non-navigational position the site holds. | ☐ |
| 8 | `/improv-games` | `choosing-a-game.svg` | A decision path: group size, experience, time available, and what you want to train → which game. Targets "improv games" at 3,100/mo, the largest term on the site. | ☐ |
| 9 | `/viola-spolin` | `point-of-concentration.svg` | How a Point of Concentration works — a narrow problem occupying the attention that would otherwise be self-watching, with the wanted behaviour arriving as a side effect. | ☐ |
| 10 | `/rules-of-improv` | `rules-by-tradition.svg` | Which of the five schools actually holds each familiar "rule", showing where they disagree. The page's whole argument is that the rules are not universal. | ☐ |

### Tier 2 — long-form formats (12 assets)

Format atoms whose structure is the content. Same treatment as the Harold, simpler.
The remaining 12 format atoms are short-form games with no structure worth drawing —
skip them.

`armando` · `la-ronde` · `monoscene` · `montage` · `deconstruction` ·
`narrative-longform` · `organic-longform` · `two-person-longform` · `theatresports` ·
`micetro` · `gorilla-theatre` · `genre-format`

Each: `public/images/<slug>-structure.svg`, showing the shape of a set in that form.
Reuse one visual language across all twelve so they read as a family.

### Tier 3 — the laws (7 assets)

`belief-as-architecture` · `cognitive-bandwidth` · `continuous-signaling` ·
`interdependence` · `irreversibility` · `meaning-is-relational` ·
`shared-reality-fragility`

These are the site's most abstract pages and the hardest to illustrate honestly. Attempt
one first — `cognitive-bandwidth` is the most concrete, being a claim about a finite
budget — and only continue if it genuinely helps. **Decline the rest rather than produce
decorative shapes.**

### Tier 4 — exercises (27 assets, lowest priority)

Exercise atoms describe a physical activity, which is the case where a picture helps a
reader most and where a diagram is hardest to draw well. Consider only after Tiers 1–3
land, and only for exercises with a spatial arrangement worth showing (`mirroring`,
`the-machine`, `pass-the-clap`, `zip-zap-zop`, `big-booty`).

**Total if fully delivered: 29 assets across Tiers 1–3**, plus an optional 5 in Tier 4.

---

## After the assets land

- **Image sitemap.** `src/app/sitemap.ts` emits URLs only. Google supports image
  entries within a sitemap and they help discovery. Worth doing once there are enough
  images to matter — not before.
- **A guard.** The house convention is that a fixed thing gets a test so it stays fixed.
  Candidates: every `public/images/*.svg` is referenced by at least one page; every
  content `<img>` has non-empty alt; no alt text exceeds a sane length or repeats the
  page's target keyword verbatim.
- **Update `docs/page-ledger.json`** if it is being maintained — it is currently
  untracked and stale (generated 2026-05-09).

## Out of scope

- The `/og` card system. It works and is guarded.
- Photographs of real people, venues, or performances the site does not own rights to.
- Any image on the 81 generic self-help guides. The site's own audit found subject-term
  pages surface 86% of the time against 6% for generic ones; the generic cluster is not
  where effort belongs.
