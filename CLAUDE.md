@AGENTS.md

# Improv Journal

A Zettelkasten-inspired knowledge graph for the art of improvisation, published at
**www.physicsofconnection.com**.

## Architecture

`content/` holds nine directories. Four are the published knowledge graph:

- **Atoms** (`content/atoms/`, ~205) — the primitives. One concept per file. Typed:
  `definition`, `technique`, `pedagogy`, `exercise`, `format`, `law`, `insight`,
  `principle`, `antipattern`, `pattern`, `framework`, `reference`. The type decides
  the published route, so `law` lands at `/how-it-works/<id>` and `technique` at
  `/practice/techniques/<id>`. `reference` atoms are the library — books, papers,
  a Substack — and they punch above their weight in search.
- **Bridges** (`content/bridges/`, ~78) — the guide layer, and the part that targets
  search demand. Long-form pages published at the root: `/how-to-read-the-room`.
  These carry the keyword and SERP metadata described below.
- **Threads** (`content/threads/`, ~25) — atoms woven into a lesson. Several are
  course lessons and render through a component that supplies their headings.
- **Paths** (`content/paths/`, ~11) — curated journeys that sequence threads.

The rest is production material, not the graph: `shows/` (three podcasts),
`sources/`, `personas/`, `outlines/`, `scripts/`.

Route hubs live in `src/app/` rather than in content — `/practice/techniques`,
`/how-it-works/diagnosis`, `/library`, `/listen` and the `/topics/*` clusters are
`page.tsx` files that both list and argue.

Schema types are in `src/lib/schema.ts` and are the authority when this file and
the code disagree.

## Content authoring

- A file's `id` must match its filename without `.md`
- Status progression: `seed` → `draft` → `validated`
- Atom links use relations: `requires`, `enables`, `contrasts`, `extends`, `illustrates`
- Threads declare the atoms they compose; paths declare the threads they sequence
- `aliases` become schema.org `alternateName` and feed site search. Every alias must
  actually appear in the body — a test enforces this.

Prose is auto-linked at render time in `src/lib/content.ts`: citations, source
titles, atom references in backticks, and named people. Two things are deliberately
*not* auto-linked — ambiguous single-word atom titles (`status`, `signal`, `trust`)
via `GENERIC_ONE_WORD_ATOM_TITLES`, and anything already linked on the page. Those
need a hand-written link.

## The SEO discipline

This is the part most likely to be got wrong, because it looks like ordinary
frontmatter and is not.

Bridges declare `target_keywords` with `volume`, `difficulty`, `traffic_potential`
and `parent`, plus `serp_checked`, `serp_min_dr` and `serp_verdict`.

- **Never invent a number.** Every one of these comes from Ahrefs. If Ahrefs is
  unavailable, leave the field out and say so — the schema documents absence as the
  correct state for unchecked results.
- **Every figure is the United States.** All 317 keyword numbers and every SERP
  reading were retrieved with `country=us`, and `market` on a keyword is absent
  when that is so (SA-15.1, 2026-09-25). US is about three quarters of global
  volume on the site's core terms and 20 of its 36 clicks are from elsewhere, so
  this is a choice, and a refresh must make the same one: read a figure in the
  market it carries, and never mix markets inside one guide.
- **`serp_verdict`** is `winnable` or `authority`. `authority` means the results are
  gated behind domains this site will not outrank; those pages are kept for readers
  and are not ranking candidates. Absent means nobody has looked.
- **`parent` is the collision test.** Two pages competing is not detectable from
  distinct keyword strings — it is detectable from a shared parent topic. Check it
  before creating a page that overlaps an existing one.
- **`traffic_potential` beats `volume`** for prioritising. "what is improv" is 1,600
  a month with a traffic potential of 50.
- **Guides carry the whole discipline; atoms carry a reading only where Google
  has already shown them.** `SerpReading` in `schema.ts` is shared. An atom
  Search Console has surfaced (`GSC_SURFACED_ATOMS` in `gsc-surfaced.mjs`)
  records `serp_query` and the results page for it; a keyword block only where
  the index prices that query; and `search_owner` where a guide owns its term.
  Never in bulk — `layer-collisions.test.ts` fails a block on an atom Google has
  not shown (SA-5.1). Library entries and route pages still carry none of it,
  so the collision test cannot see a citation or a hub (SA-17.1).
  Where the fields should live for those layers is SA-5.1's open question — do
  not invent a second location.
- **A floor is not a value, and reachable is not ours.** `serp_top10_dr` records
  the whole top ten, `serp_floor_traffic` what the lowest-DR result actually
  earns there, `serp_top_share` how much the first result takes, and
  `serp_audience` who the page serves, in prose. The same DR 9 floor was worth
  194 visits a month on one term and 7 on another; a `winnable` page can be a
  results page written for primary-school drama teachers. Read all four in the
  one `serp-overview` call and record them together.
- **The link profile is two citations and a trade.** 603 referring domains on
  2026-09-25, two of them chosen by anyone — `src/lib/citations.mjs` names them
  and the pages they cite. The rest are pages selling backlinks that use this
  site's name as sample text, dofollow and nofollow alike, and the count rises
  on its own. Read anchors, not domain names: an advert names the site, a
  citation names a page. Not disavowed; SA-2.1 has why.

**Verifying an SEO change** — one rule, so the cards stop restating it:

- Site-level progress is `gsc-performance-history`: clicks and CTR, monthly. Not
  average position, which degrades as a long-tail corpus succeeds.
- Page- and query-level readings come from `gsc-pages` and `gsc-keywords` **from
  2026-02-01**; a later start hid two thirds of the pages. Those tables are a
  sample — about 2% of impressions — never the total.
- Positions on the site's own vocabulary come from the Ahrefs Rank Tracker, which
  needs no keyword-index volume; the list to load is
  `docs/seo/rank-tracker-keywords.txt` (SA-18.1). Ahrefs' keyword index returns
  nothing for most of what this site ranks for and is not a verification source.

`npm run seo:audit` reads this metadata; `npm run seo:rendered` checks the built
HTML and flags winnable guides that receive fewer internal links than the median
gated one.

## The improv directory

`/improv-near-you` and `/improv-near-you/<city>` list the improv theatres,
schools and recurring shows in sixty US cities, each verified and linked,
ranked by one rubric. Nothing in it is written by hand.

- **Data**: `data/directory/cities.json` is the city list; `data/directory/<city>.json`
  is what the engine last read (entries keyed by domain, with `firstSeen`,
  `lastSeen`, `missingRuns`, `status`, `rank`). `src/lib/directory.ts` reads
  them at build time; a city with fewer than three verified places is served,
  noindexed, and absent from the sitemap and llms.txt (`isIndexableDirectoryCity`).
- **Engine**: `scripts/directory-engine.mjs` holds everything around the
  reading — `--plan N` says which cities are due and writes a prompt each,
  `--seed <dir>` imports the replies, fetching every site named, merging with
  the file (unseen three passes running → dropped; reported closed → dropped
  at once), ranking, writing, and advancing the cycle past what it imported.
  `--prompt <slug>` prints one city's prompt and `--dry` runs the fixture. The
  pure half is `scripts/lib/directory.mjs`, held by `directory-engine.test.ts`;
  the data by `directory.test.ts`.
- **Schedules**: two cloud scheduled Claude sessions, both following
  `docs/directory-engine-run.md` — the runbook to change if a run should do
  something different. The **reading** goes on the 1st and the 15th, ten
  cities a run, so every city is re-read quarterly, which is about as often
  as a theatre opens, closes or moves. The **link check** goes weekly,
  `--check`, one fetch an entry and no searches, because a website dies the
  day the venue does and that is what a reader feels. **There is no API key**
  and nothing in the repository needs one: the reading is the session's own
  web search (the owner, 2026-10-01). Planning never moves the cursor, so a
  missed run costs nothing. The runs need the Claude GitHub App to hold push
  access to the repository (DI-1.4); without it a run does all the work and
  cannot publish it.
- **The pages are a listing** (the owner, 2026-10-01): no rank number, no
  score, no per-entry date, no section on how the list is made, and no mention
  of Claude or an engine on the hub, a city page, a meta description, the route
  summary or llms.txt. The order the data holds is kept without comment; the
  account of the rubric lives here and in the DI cards.
- **The map** (`src/components/UsCityMap.tsx`) is the hub's second way in: a
  link a city on an Albers USA map, the summary in the link's own name and in
  a tooltip on hover and on focus. Positions are generated —
  `node scripts/build-us-map.mjs` reads `data/map/city-points.json` (US Census
  2023 Gazetteer) and writes `public/us-map.svg` and `src/lib/us-map-data.ts`
  — and a crowded marker is moved only as far as the 24 px target rule needs,
  with a hairline back to the city. Run that script after changing the city
  list. The base map is a CSS mask, never inline SVG: inlining costs its
  weight twice, in the HTML and in the flight payload. `directory-map.test.ts`
  holds the geometry, and re-derives the separation from the width in the
  component, so narrowing the map fails the suite.
- The prose is in `src/lib/directory-copy.ts` (listed in `hub-prose-links`);
  route files stay under the prose ceiling. No keywords are registered for
  these routes until Search Console shows them (DI-2.1).

## Testing

~104 test files under `src/lib/__tests__/`, and they are guards rather than unit
tests. The conventions matter:

- **Assert presence, not markup.** Most failure modes here are absences — a linker
  that silently stops linking, a module that returns an empty list. A test that
  checks markup passes happily on nothing.
- **Guard the guard.** Assert the population too (`expect(atoms.length)
  .toBeGreaterThanOrEqual(200)`), so a changed selector fails instead of passing
  vacuously.
- **Floors, with the debt written down.** When something is partly fixed, set the
  floor just under the achieved number and record the remainder and the date in the
  test's comment. Do not raise a threshold to make a failure go away.
- Tests that read the build use `it.runIf(built)`.
- Explain *why* in the comment. Several tests carry the account of the bug that
  caused them; that is deliberate and worth continuing.

## Commands

```bash
npm run dev            # dev server
npm run build          # prebuild (search index + llms.txt) then next build
npm test               # vitest
npm run check          # format:check + lint + test
npm run lint           # eslint
npm run backlog        # what is actionable in docs/backlog
npm run seo:audit      # frontmatter-level SEO audit
npm run seo:rendered   # built-HTML audit; 0 critical is the bar
npm run seo:crawlers   # what production actually serves each crawler
npm run knip           # unused exports and files
```

`npm run seo:indexnow` submits URLs to search engines. It reaches an external
service — do not run it without being asked.

## Backlog

`docs/backlog/` holds planned work as markdown with Jira-shaped frontmatter: epics
own stories, stories own tasks, related by wikilinks and navigable in Obsidian
through `docs/backlog/bases/Backlog.base`.

**Run `npm run backlog` when a session opens without a specific task, or whenever
asked what to work on.** It reports each epic's progress and splits outstanding
tasks into ready-for-an-agent, ready-but-needs-a-person, and blocked with the
reason. Offer what it finds; do not start backlog work unasked.

Every task carries **Run**, **Verify**, **Acceptance criteria** and **Outcome**.
Read the file before starting — the commands in it are literal. On completion set
`status: Done` and fill in Outcome. Respect `executable`: a `human` task means an
account login or a form, and attempting it wastes a session.

## Deployment

Vercel, with Cloudflare in front. Pushing to `main` triggers a production deploy.

- **Environment variables bake in at build time.** Changing one in Vercel does
  nothing until the next build. To apply one to an existing commit without
  deploying a dirty working tree, use `vercel redeploy <deployment-url>`.
- **Cloudflare returns 403 to ClaudeBot and GPTBot**, the training crawlers, and
  serves everyone else — OAI-SearchBot, PerplexityBot, Google-Extended and the
  user-initiated agents — while the build ships a large `llms.txt` for exactly
  that audience. That is the stated edge policy (search=yes, ai-train=no,
  use=reference), not a fault. It no longer rewrites `robots.txt`: production
  serves what `robots.ts` emits, checked 2026-09-25 (SA-8.1). What the channel
  returns is unmeasured until a Brand Radar report exists; `npm run seo:crawlers`
  shows the current state.
- Apex → www is a 307 rather than a 308. Every canonical points at www, so Google
  consolidates correctly. It is a Vercel domain setting, not fixable in this repo.

## Working in this repo

- **Check the branch before committing.** More than one agent works in this tree.
  Stage only your own files, and if the working tree is on someone else's feature
  branch, land shared artifacts on `main` through a temporary worktree instead.
- **A dev server races production builds.** A type error inside `.next/dev/types/`
  means a concurrent `npm run dev` wrote a partial file. Delete that directory and
  rebuild; the source is fine.
- Use `gh auth switch --user jaychristopher` before any `gh` command.
- **Gate a commit on the exit code of `npm run check`, never on its output.**
  The summary line reads `Test Files  1 failed | 283 passed (284)`, so a grep
  for `passed` matches a red run. Four commits shipped on 2026-09-27 with two
  guards failing behind exactly that grep. `npm run check && git commit …`
  is the whole rule.
