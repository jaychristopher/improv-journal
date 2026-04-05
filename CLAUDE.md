@AGENTS.md

# Improv Journal

A Zettelkasten-inspired knowledge graph for the art of improvisation.

## Architecture

Three content layers, each in `content/`:

- **Atoms** (`content/atoms/`) — Validated primitives. Smallest meaningful unit of improv knowledge. Link to other atoms via `links` array in frontmatter.
- **Threads** (`content/threads/`) — Atoms woven into full thoughts. Reference atoms by ID in frontmatter `atoms` array.
- **Paths** (`content/paths/`) — Curated journeys for specific audiences. Reference threads by ID in frontmatter `threads` array.

All content is markdown with YAML frontmatter. Schema types are in `src/lib/schema.ts`.

## Content Authoring

- Each content file's `id` field must match its filename (without `.md`)
- Status progression: `seed` → `draft` → `validated`
- Atom links use relation types: `requires`, `enables`, `contrasts`, `extends`, `illustrates`
- Threads declare which atoms they compose (ordered)
- Paths declare which threads they sequence (ordered) and their target audience

## Tech Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Content loaded via `gray-matter` + `remark` at build time
- Graph compiled from content relationships, exposed at `/api/graph`

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint
```

## GitHub

Use `gh auth switch --user jaychristopher` before any `gh` commands.
