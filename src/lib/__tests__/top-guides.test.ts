import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";
import { getTopGuides } from "../top-guides";

describe("top guides", () => {
  it("returns the requested number of guides", async () => {
    expect(await getTopGuides(8)).toHaveLength(8);
    expect(await getTopGuides(3)).toHaveLength(3);
  });

  it("ranks by peak target volume, descending", async () => {
    const volumes = (await getTopGuides(12)).map((g) => g.volume);
    expect(volumes).toEqual([...volumes].sort((a, b) => b - a));
  });

  it("picks the highest-volume guides on the site", async () => {
    const bridges = await loadBridges();
    const peak = bridges
      .map((b) => Math.max(0, ...(b.frontmatter.target_keywords ?? []).map((k) => k.volume)))
      .sort((a, b) => b - a);

    const top = await getTopGuides(5);
    expect(top.map((g) => g.volume)).toEqual(peak.slice(0, 5));
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
