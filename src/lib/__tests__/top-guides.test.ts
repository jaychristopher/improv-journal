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
   */
  it("never promotes a guide on a term it cannot rank for", async () => {
    const stranded = (await getTopGuides(12))
      .filter((g) => g.difficulty !== undefined && g.difficulty > 30)
      .map((g) => `${g.slug} (KD ${g.difficulty})`);

    expect(stranded).toEqual([]);
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
