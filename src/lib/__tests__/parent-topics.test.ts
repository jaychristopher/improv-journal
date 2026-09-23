import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";
import { classifyKeywordParents } from "../keyword-parents.mjs";

/**
 * The same classification `npm run seo:audit` prints, on the same frontmatter,
 * so the report and this guard cannot drift apart.
 *
 * The population guards live here rather than in each test: every reading
 * below is a count over these guides, and a count over an empty list passes
 * every assertion that is not an equality. 70 and 300 sit under the 78 guides
 * and 317 keywords of 2026-09-22 — a changed loader fails instead of reporting
 * a smaller corpus honestly.
 */
async function parents() {
  const bridges = await loadBridges();
  const classified = classifyKeywordParents(
    bridges.map((bridge) => ({
      id: bridge.slug,
      keywords: bridge.frontmatter.target_keywords ?? [],
      verdict: bridge.frontmatter.serp_verdict ?? null,
    })),
  );
  expect(classified.guideCount).toBeGreaterThanOrEqual(70);
  expect(classified.keywords).toBeGreaterThanOrEqual(300);
  return classified;
}

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

  /**
   * What the field records, read as the 4 places a parent can sit.
   *
   * The collision test above is the only thing that read `parent` and it
   * cannot fail on this data: no 2 guides have ever shared one, and most
   * parents are the declaring guide's own keyword (entry 99). The
   * classification is the reading that does say something — it is a demand
   * map, with 44 head terms above the pages the site has (entry 352).
   *
   * Dated reading, 2026-09-22: 137 distinct parents — 86 the keyword itself,
   * 6 another keyword on the declaring guide (92 together, the parents that
   * guide owns), 1 on a different guide, 44 claimed by no page at all. These
   * move when a guide is added or its keywords are re-pulled from Ahrefs. Move
   * them with the date, do not delete the reading.
   */
  it("sit in 1 of 4 places, and the corpus knows which", async () => {
    const classified = await parents();

    expect({
      self: classified.self.length,
      sameGuide: classified.sameGuide.length,
      otherGuide: classified.otherGuide.length,
      unclaimed: classified.unclaimed.length,
    }).toEqual({ self: 86, sameGuide: 6, otherGuide: 1, unclaimed: 44 });

    // The 4 buckets are the whole population, so a parent the classifier
    // cannot place would show up as a gap here rather than being dropped.
    expect(
      classified.self.length +
        classified.sameGuide.length +
        classified.otherGuide.length +
        classified.unclaimed.length,
    ).toBe(classified.distinct);
  });

  /**
   * The self-parents are the site's candidate set, and a floor rather than a
   * reading: a parent equal to the keyword it is attached to is Ahrefs saying
   * this page's term *is* the head. 86 of them on 2026-09-22.
   *
   * It may only rise. A page quietly retargeted from a head term to one of its
   * children loses its self-parent, which is a decision worth seeing rather
   * than a number to lower — the same decision entry 217 found in the twin
   * pages, taken from the other side.
   */
  it("count the pages that are the head term, and that count may only rise", async () => {
    const classified = await parents();

    expect(classified.self.length).toBeGreaterThanOrEqual(86);
    // Both halves of the owned reading, so a self-parent silently becoming a
    // second keyword on the same guide is visible instead of netting out.
    expect(classified.self.length + classified.sameGuide.length).toBeGreaterThanOrEqual(92);
  });

  /**
   * The page hierarchy this field could draw, and how little of it exists.
   *
   * A child keyword whose parent is claimed by a *different* guide is the only
   * shape in the corpus that puts one page under another. Dated reading,
   * 2026-09-22: 1 edge in 78 guides — `improv-theory` declares "viola spolin
   * games" under "viola spolin theatre games", which `viola-spolin` owns.
   *
   * 1 edge is not a hierarchy, which is why no page carries a "part of" line.
   * This assertion is the signal for when that changes: the day the count
   * rises, a hierarchy has started to exist and is worth rendering.
   */
  it("draw 1 edge between guides, and it is improv-theory under viola-spolin", async () => {
    const classified = await parents();

    expect(classified.crossGuideEdges.map((e) => `${e.from} -> ${e.to}`)).toEqual([
      "improv-theory -> viola-spolin",
    ]);
  });
});
