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
- **`serp_verdict`** is `winnable` or `authority`. `authority` means the results are
  gated behind domains this site will not outrank; those pages are kept for readers
  and are not ranking candidates. Absent means nobody has looked.
- **`parent` is the collision test.** Two pages competing is not detectable from
  distinct keyword strings — it is detectable from a shared parent topic. Check it
  before creating a page that overlaps an existing one.
- **`traffic_potential` beats `volume`** for prioritising. "what is improv" is 1,600
  a month with a traffic potential of 50.

`npm run seo:audit` reads this metadata; `npm run seo:rendered` checks the built
HTML and flags winnable guides that receive fewer internal links than the median
gated one.

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
- **Cloudflare rewrites `robots.txt`** and returns 403 to AI crawlers — OAI-SearchBot,
  PerplexityBot, ClaudeBot and the user-initiated agents — while the build ships a
  large `llms.txt` for exactly that audience. Googlebot and bingbot are unaffected.
  This is unresolved; `npm run seo:crawlers` shows the current state.
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
