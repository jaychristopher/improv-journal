import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";

/**
 * Two pages must not sit on one parent topic.
 *
 * The parent topic is the broader term Google ranks a page for when it ranks
 * it at all, so two guides sharing one are competing with each other however
 * different their declared keywords look. That distinction matters because
 * checking the keyword strings catches nothing: no two guides have ever
 * declared the same string, and two collisions shipped anyway.
 *
 * Both arrived through a *secondary* keyword, which is why an audit comparing
 * primaries passed both times.
 */
describe("parent topics", () => {
  it("are claimed by at most one guide each", async () => {
    const bridges = await loadBridges();
    const claims = new Map<string, Map<string, string[]>>();

    for (const bridge of bridges) {
      for (const kw of bridge.frontmatter.target_keywords ?? []) {
        if (!kw.parent) continue;
        const pages = claims.get(kw.parent) ?? new Map<string, string[]>();
        pages.set(bridge.slug, [...(pages.get(bridge.slug) ?? []), kw.keyword]);
        claims.set(kw.parent, pages);
      }
    }

    const collisions = [...claims.entries()]
      .filter(([, pages]) => pages.size > 1)
      .map(([parent, pages]) => {
        const who = [...pages.entries()]
          .map(([slug, kws]) => `${slug} (via ${kws.join(", ")})`)
          .join(" and ");
        return `"${parent}" is claimed by ${who}`;
      });

    expect(collisions).toEqual([]);
  });

  it("are recorded for the keywords that have one", async () => {
    const bridges = await loadBridges();
    const all = bridges.flatMap((b) => b.frontmatter.target_keywords ?? []);
    const withParent = all.filter((k) => k.parent);

    // Not every term has a parent — Ahrefs reports none for the smallest. This
    // guards against the field being quietly dropped wholesale, which would
    // turn the check above into one that silently passes on no data.
    expect(all.length).toBeGreaterThan(150);
    expect(withParent.length).toBeGreaterThan(all.length * 0.9);
  });

  it("agree with the primary keyword on the pages that own their topic", async () => {
    const bridges = await loadBridges();

    // A page whose primary keyword has a parent should be the page that owns
    // it. If a guide's primary parent belongs to a different guide, the guide
    // is aimed at a term another page is already the site's answer for.
    const primaryParent = new Map<string, string>();
    for (const bridge of bridges) {
      const primary = (bridge.frontmatter.target_keywords ?? [])[0];
      if (primary?.parent) primaryParent.set(bridge.slug, primary.parent);
    }

    const duplicated = [...primaryParent.entries()]
      .filter(([slug, parent]) =>
        [...primaryParent.entries()].some(([other, p]) => other !== slug && p === parent),
      )
      .map(([slug, parent]) => `${slug} -> ${parent}`);

    expect(duplicated).toEqual([]);
  });
});
