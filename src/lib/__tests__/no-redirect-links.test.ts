import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { loadAtoms, loadBridges, loadPaths, loadSources, loadThreads } from "../content";

/**
 * Content must link to where a page lives, not to where it used to live.
 *
 * Twenty editorial links pointed at /atoms/<id>, which is not a route. It is a
 * redirect source: next.config generates one per atom, mapping the old flat
 * scheme onto the six prefixes atoms actually use now. Every one of them
 * resolved with a 308 and every one of them rendered correctly, because the
 * markdown renderer rewrites the href before it reaches the page — which is
 * exactly why nobody noticed for as long as they existed.
 *
 * They were still worth fixing. The rendered output was never the problem; the
 * source was, in two ways. An author reading `[Ensemble](/atoms/ensemble)` in a
 * guide learns a URL scheme that does not exist and writes the next one the
 * same way. And the whole set is one deleted redirect rule away from being
 * twenty broken editorial links, with nothing to catch it.
 *
 * The redirect table stays, because external links and old bookmarks still use
 * those URLs. What changes is that the site stops pointing at it from inside.
 */

/** Redirect sources, rebuilt the way src/lib/redirects.ts builds them. */
function redirectSources(atomIds: string[], bridgeSlugs: string[]): Set<string> {
  const sources = new Set<string>();
  for (const id of atomIds) sources.add(`/atoms/${id}`);
  for (const slug of bridgeSlugs) sources.add(`/guides/${slug}`);

  const table = fs.readFileSync(path.join(process.cwd(), "src", "lib", "redirects.ts"), "utf-8");
  for (const m of table.matchAll(/source:\s*"([^"]+)"/g)) {
    // Wildcards like /system/principles/:slug are handled by the prefix check.
    if (!m[1].includes(":")) sources.add(m[1]);
  }
  return sources;
}

function wildcardPrefixes(): string[] {
  const table = fs.readFileSync(path.join(process.cwd(), "src", "lib", "redirects.ts"), "utf-8");
  return [...table.matchAll(/source:\s*"([^"]+)"/g)]
    .map((m) => m[1])
    .filter((s) => s.includes("/:"))
    .map((s) => s.split("/:")[0]);
}

describe("internal links", () => {
  it("never point at a redirect", async () => {
    const [atoms, bridges, threads, paths, sources] = await Promise.all([
      loadAtoms(),
      loadBridges(),
      loadThreads(),
      loadPaths(),
      loadSources(),
    ]);

    const redirects = redirectSources(
      atoms.map((a) => String(a.frontmatter.id)),
      bridges.map((b) => b.slug),
    );
    const prefixes = wildcardPrefixes();

    // A loader returning nothing, or a renamed redirects.ts, would leave this
    // with nothing to detect. There are 171 atoms and 72 guides.
    expect(redirects.size).toBeGreaterThan(200);

    const docs = [
      ...atoms.map((d) => ({ id: `atoms/${d.frontmatter.id}`, content: d.content })),
      ...bridges.map((d) => ({ id: `bridges/${d.slug}`, content: d.content })),
      ...threads.map((d) => ({ id: `threads/${d.frontmatter.id}`, content: d.content })),
      ...paths.map((d) => ({ id: `paths/${d.frontmatter.id}`, content: d.content })),
      ...sources.map((d) => ({ id: `sources/${d.frontmatter.id}`, content: d.content })),
    ];

    const offenders: string[] = [];
    let checked = 0;

    for (const doc of docs) {
      for (const match of doc.content.matchAll(/\[[^\]]+\]\((\/[^)\s]*)\)/g)) {
        const href = match[1].split("#")[0].split("?")[0].replace(/\/$/, "") || "/";
        checked++;
        const hitsWildcard = prefixes.some((p) => href === p || href.startsWith(`${p}/`));
        if (redirects.has(href) || hitsWildcard) offenders.push(`${doc.id} -> ${href}`);
      }
    }

    // A changed link syntax would make this pass on an empty set.
    expect(checked).toBeGreaterThan(300);
    expect(offenders).toEqual([]);
  });
});
