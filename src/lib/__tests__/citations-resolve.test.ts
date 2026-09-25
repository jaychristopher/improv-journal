import { describe, expect, it } from "vitest";

import { CITATIONS, CITATIONS_READ } from "../citations.mjs";
import { getAtomUrl, loadAtoms, loadBridges } from "../content";
import {
  generateAtomRedirects,
  generateBridgeRedirects,
  generateHubRedirects,
  generateLibraryRedirects,
} from "../redirects";

/**
 * The pages the site's only voluntary links point at have to keep resolving.
 *
 * On 2026-09-25 the link profile was 603 referring domains, and two of them
 * were chosen by anybody: befreed.ai, an AI learning product whose generated
 * podcast lessons list four of the communication guides as sources, and an
 * actress's own post citing one technique (SA-2.1). Five links. Everything
 * else names the site inside an advert for backlinks and points at the
 * homepage.
 *
 * A guide rename is an ordinary edit here, and one would send the best links
 * this site has to a 404 without failing anything — redirects.ts catches the
 * renames somebody remembered to add, not the ones they did not. So the cited
 * paths live in one dated file, the audit prints it, and this fails if a path
 * stops being a page or a redirect source.
 */
describe("cited pages resolve", () => {
  it("keeps every path a citation points at as a page or a redirect", async () => {
    const [bridges, atoms] = await Promise.all([loadBridges(), loadAtoms()]);
    const redirects = [
      ...generateAtomRedirects(),
      ...generateBridgeRedirects(),
      ...generateHubRedirects(),
      ...generateLibraryRedirects(),
    ];
    const live = new Set<string>([
      ...bridges.map((b) => `/${b.slug}`),
      ...atoms.map((a) => getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })),
      ...redirects.map((r) => r.source),
    ]);

    // Guard the guard: the list is the point, so prove it is populated and
    // dated, and that the set it is checked against is the whole site.
    expect(CITATIONS_READ).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(CITATIONS.length).toBeGreaterThanOrEqual(2);
    const paths = CITATIONS.flatMap((c) => c.pages);
    expect(paths.length).toBeGreaterThanOrEqual(5);
    expect(live.size).toBeGreaterThan(250);

    const gone = paths.filter((p) => !live.has(p));
    expect(
      gone,
      "a cited URL no longer resolves — add a redirect in redirects.ts before the link dies",
    ).toEqual([]);
  });
});
