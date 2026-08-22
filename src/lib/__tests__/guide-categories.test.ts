import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";
import {
  getCategoryBySlug,
  getCategoryForGuide,
  getGuidesInCategory,
  GUIDE_CATEGORIES,
} from "../guide-categories";

describe("guide categories", () => {
  it("places every guide in exactly one category", async () => {
    const bridges = await loadBridges();
    const unplaced: string[] = [];
    const duplicated: string[] = [];

    for (const bridge of bridges) {
      const matches = GUIDE_CATEGORIES.filter((c) => c.slugs.includes(bridge.slug));
      if (matches.length === 0) unplaced.push(bridge.slug);
      if (matches.length > 1) duplicated.push(bridge.slug);
    }

    expect(unplaced).toEqual([]);
    expect(duplicated).toEqual([]);
  });

  it("never lists a guide that does not exist", async () => {
    const known = new Set((await loadBridges()).map((b) => b.slug));
    const dangling = GUIDE_CATEGORIES.flatMap((c) =>
      c.slugs.filter((s) => !known.has(s)).map((s) => `${c.slug}: ${s}`),
    );

    expect(dangling).toEqual([]);
  });

  it("uses unique category slugs", () => {
    const slugs = GUIDE_CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("resolves a guide back to its category", async () => {
    expect(getCategoryForGuide("how-to-stop-overthinking")?.slug).toBe("personal-growth");
    expect(getCategoryForGuide("team-building-activities")?.slug).toBe("teams");
    expect(getCategoryForGuide("active-listening")?.slug).toBe("communication");
    expect(getCategoryForGuide("not-a-guide")).toBeUndefined();
  });

  it("returns populated, resolvable guides for every category", async () => {
    for (const category of GUIDE_CATEGORIES) {
      const guides = await getGuidesInCategory(category.slug);
      expect(guides.length, category.slug).toBeGreaterThan(0);
      for (const guide of guides) {
        expect(guide.title.length).toBeGreaterThan(0);
        expect(guide.description.length).toBeGreaterThan(0);
      }
    }
  });

  it("returns nothing for an unknown category", async () => {
    expect(getCategoryBySlug("nope")).toBeUndefined();
    expect(await getGuidesInCategory("nope")).toEqual([]);
  });
});

describe("cluster ordering", () => {
  /**
   * First position on a cluster hub is the most valuable slot it has. The
   * declared order was roughly biggest-first, which tracks volume, so
   * /topics/personal-growth opened with two guides at difficulty 34 and 54.
   */
  it("never opens a cluster with a guide that cannot rank", async () => {
    const bridges = await loadBridges();
    const kd = new Map(
      bridges.map((b) => [b.slug, (b.frontmatter.target_keywords ?? [])[0]?.difficulty]),
    );

    const verdictBySlug = new Map(bridges.map((b) => [b.slug, b.frontmatter.serp_verdict]));

    for (const category of GUIDE_CATEGORIES) {
      const guides = await getGuidesInCategory(category.slug);
      if (guides.length < 2) continue;
      const slug = guides[0].slug;
      const verdict = verdictBySlug.get(slug);
      const first = kd.get(slug);
      // Difficulty is the stand-in; a checked verdict overrides it either way.
      const reachable =
        verdict === "winnable" || (verdict !== "authority" && (first === undefined || first <= 30));
      expect(reachable, `${category.slug} opens with ${slug}`).toBe(true);
    }
  });

  it("places reachable guides ahead of stranded ones", async () => {
    const bridges = await loadBridges();
    // Mirrors isStranded: where the results have been checked, that wins over
    // the difficulty estimate — in both directions.
    const stranded = (slug: string) => {
      const fm = bridges.find((b) => b.slug === slug)?.frontmatter;
      if (fm?.serp_verdict === "authority") return true;
      if (fm?.serp_verdict === "winnable") return false;
      const d = (fm?.target_keywords ?? [])[0]?.difficulty;
      return d !== undefined && d > 30;
    };

    for (const category of GUIDE_CATEGORIES) {
      const flags = (await getGuidesInCategory(category.slug)).map((g) => stranded(g.slug));
      const firstStranded = flags.indexOf(true);
      if (firstStranded === -1) continue;
      // Once a stranded guide appears, no reachable one may follow it.
      expect(flags.slice(firstStranded).every(Boolean), category.slug).toBe(true);
    }
  });

  it("keeps every guide listed, rather than hiding the stranded ones", async () => {
    for (const category of GUIDE_CATEGORIES) {
      const guides = await getGuidesInCategory(category.slug);
      expect(guides.length, category.slug).toBe(category.slugs.length);
    }
  });
});
