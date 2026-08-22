import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";
import { getTopGuides } from "../top-guides";

describe("top guides", () => {
  it("returns the requested number of guides", async () => {
    expect(await getTopGuides(8)).toHaveLength(8);
    expect(await getTopGuides(3)).toHaveLength(3);
  });

  it("ranks by reach, descending", async () => {
    const reach = (await getTopGuides(12)).map((g) => g.reach);
    expect(reach).toEqual([...reach].sort((a, b) => b - a));
  });

  /**
   * The footer is eight links on every page on the site. Ranking it by raw
   * volume put four guides in the list whose terms sit above difficulty 30 and
   * are not reachable, spending half the promotion capacity on pages that
   * cannot convert.
   *
   * Difficulty is the stand-in, not the thing. Where the results have actually
   * been looked at, that reading wins in both directions: a guide found closed
   * is never promoted however easy its difficulty looks, and one found open is
   * promoted even above the difficulty bar. How to stop overthinking is
   * difficulty 34 with a DR 1 site at position five.
   */
  it("never promotes a guide whose results were found closed", async () => {
    const bySlug = new Map((await loadBridges()).map((b) => [b.slug, b]));
    const gated = (await getTopGuides(12))
      .filter((g) => bySlug.get(g.slug)?.frontmatter.serp_verdict === "authority")
      .map((g) => g.slug);

    expect(gated).toEqual([]);
  });

  it("only promotes above the difficulty bar on verified-open results", async () => {
    const bySlug = new Map((await loadBridges()).map((b) => [b.slug, b]));
    const unjustified = (await getTopGuides(12))
      .filter((g) => g.difficulty !== undefined && g.difficulty > 30)
      .filter((g) => bySlug.get(g.slug)?.frontmatter.serp_verdict !== "winnable")
      .map((g) => `${g.slug} (KD ${g.difficulty}, no open verdict)`);

    expect(unjustified).toEqual([]);
  });

  /**
   * Anchor text names the page's own subject. The highest-volume declared
   * keyword can belong to a different parent topic — "overthinking" against a
   * guide targeting "how to stop overthinking" — and using it labels the page
   * as something it is not aiming at, on every page of the site at once.
   */
  it("labels each guide with a keyword from its own topic", async () => {
    const bySlug = new Map((await loadBridges()).map((b) => [b.slug, b]));

    for (const guide of await getTopGuides(8)) {
      const keywords = bySlug.get(guide.slug)!.frontmatter.target_keywords ?? [];
      const primary = keywords[0];
      if (!primary?.parent) continue;
      const match = keywords.find((k) => k.keyword.toLowerCase() === guide.label.toLowerCase());
      expect(match?.parent, `${guide.slug} labelled "${guide.label}"`).toBe(primary.parent);
    }
  });

  it("prefers traffic potential over volume where it is known", async () => {
    const bridges = await loadBridges();
    const bySlug = new Map(bridges.map((b) => [b.slug, b]));

    for (const guide of await getTopGuides(8)) {
      const primary = (bySlug.get(guide.slug)!.frontmatter.target_keywords ?? [])[0];
      if (primary?.traffic_potential) expect(guide.reach).toBe(primary.traffic_potential);
    }
  });

  it("resolves every guide to a real bridge slug with anchor text", async () => {
    const slugs = new Set((await loadBridges()).map((b) => b.slug));

    for (const guide of await getTopGuides(8)) {
      expect(slugs.has(guide.slug)).toBe(true);
      expect(guide.label.length).toBeGreaterThan(0);
      expect(guide.label[0]).toBe(guide.label[0].toUpperCase());
    }
  });

  it("never repeats a guide", async () => {
    const slugs = (await getTopGuides(12)).map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
