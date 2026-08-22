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
