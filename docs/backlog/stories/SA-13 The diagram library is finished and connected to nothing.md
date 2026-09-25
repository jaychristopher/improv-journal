---
key: SA-13
type: story
summary: About 250 purpose-built diagrams render inline on the markdown layers and nowhere else — the 16 route pages have none, and every page's social image is a generated text card instead
epic: "[[Search alignment]]"
status: To Do
priority: Low
labels: [seo, diagrams, images, coverage]
tasks:
  - "[[SA-13.1 Finish the diagram coverage and stop hiding the diagrams]]"
---

# SA-13 — Built well, connected to nothing

`public/images/` holds roughly 250 diagram SVGs, and the machinery around them
is good: `Diagram.tsx` and `inlineDiagrams` read the file at build time so
nothing ships to the client, and each one carries a `<title>` that describes the
information rather than the artefact — "Reception narrowing as cognitive load
rises: everything comes in at first, then tone goes, then physical context, then
habit takes over, and at saturation the performer freezes."

On production the markdown layers use them properly: atoms, threads, library
entries and the improv guides render one to four apiece, and
`/types-of-listening` — the best-positioned page on the site — has four.

Two things stop there.

The **16 route pages have none**: all 11 paths and all 5 traditions return zero,
while comparable markdown pages return one to four. `Diagram.tsx` exists
precisely to reach route pages and has been pointed at three of them.

And the diagrams never leave the page. Inlined SVG is not image-search
inventory, and every page's `og:image` is a generated text card —
`/og?title=Cognitive+Bandwidth&eyebrow=How+It+Works` — on pages that have a real
diagram in the body. The best visual asset this site owns is visible only to
someone already reading the page.
