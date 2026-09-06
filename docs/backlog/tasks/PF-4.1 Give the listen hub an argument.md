---
key: PF-4.1
type: task
summary: Rewrite /listen so it argues rather than only listing
parent: "[[PF-4 Listen hub depth]]"
epic: "[[Podcast finalization]]"
status: To Do
priority: Medium
sequence: 1
executable: agent
estimate: 90m
labels: [podcast, seo, content]
blocked_by: []
blocks: []
files:
  - src/app/listen/page.tsx
  - src/lib/__tests__/category-hub-prose.test.ts
---

# PF-4.1 — Give the listen hub an argument

`/listen` is 278 words under two headings — "Featured" and "Three Shows" — for a
section holding three shows and 62 episodes. It is the primary page for its term
and the thinnest hub on the site.

## Precedent to follow

Two hubs were fixed this way already; read both before writing:

- `src/app/practice/techniques/page.tsx` — was 19 words over a list of 49 items
- `src/app/how-it-works/diagnosis/page.tsx` — was one sentence over three grouped lists

Both gained a framing section, a section explaining the structure the page
organises, and a `Questions People Ask About X` block with `h3` questions.

## Run

Write, in the site's voice — direct, specific, willing to state an objection:

1. **What the three shows are for.** They are not three attempts at the same
   thing. Say what distinguishes them and who each is for.
2. **How they relate to the written site.** Episodes are the spoken version of
   pages, and each links back. That is a real relationship worth stating.
3. **A questions section.** Ground each question in something true of these shows
   rather than generic podcast questions. Candidates worth considering, subject
   to checking they are accurate first: whether the episodes duplicate the written
   pages, where to start with 62 of them, and whether listening adds anything if
   you have already read the site.

Do not pad. The guard's floor is a consequence of doing this properly, not the target.

## Verify

```bash
npm run build
npm test
```

Then inspect the built page and confirm the word count and heading count rose:

```bash
node -e "const fs=require('fs');const h=fs.readFileSync('.next/server/app/listen.html','utf8');const b=h.split('</header>').pop().split('<footer')[0];console.log('words',b.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().split(' ').length,'h2',(b.match(/<h2/g)||[]).length)"
```

Then add `/listen` to the `HUBS` array in
`src/lib/__tests__/category-hub-prose.test.ts` with floors set just under what was
achieved, matching the convention used for the other two entries.

## Acceptance criteria

- `/listen` carries a framing argument and a questions section
- It is covered by the category-hub guard
- The full suite passes

## Outcome

_Not started._
