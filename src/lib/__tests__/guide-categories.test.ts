import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";
import {
  getCategoryBySlug,
  getCategoryForGuide,
  getGuidesInCategory,
  GUIDE_CATEGORIES,
  orderedCategories,
  winnableReach,
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

  /**
   * One unit per sort. `reachOf` used to return the primary keyword's traffic
   * potential where present and the peak declared volume where not, so the
   * seven guides nobody had checked entered the sort on a different number
   * from their neighbours: viola-spolin (volume 800) sat above rules-of-improv
   * (traffic potential 400, verdict winnable) on /topics/improv-skills. A
   * guide with no traffic potential now ranks after every guide in its
   * stranded/non-stranded tier that has one, and among themselves the
   * unchecked sort by volume.
   */
  it("never ranks an unmeasured guide above a measured one in the same tier", async () => {
    const bridges = await loadBridges();
    const bySlug = new Map(bridges.map((b) => [b.slug, b.frontmatter]));
    const stranded = (slug: string) => {
      const fm = bySlug.get(slug);
      if (fm?.serp_verdict === "authority") return true;
      if (fm?.serp_verdict === "winnable") return false;
      const d = (fm?.target_keywords ?? [])[0]?.difficulty;
      return d !== undefined && d > 30;
    };
    const trafficPotential = (slug: string) =>
      (bySlug.get(slug)?.target_keywords ?? [])[0]?.traffic_potential;
    const volume = (slug: string) =>
      Math.max(0, ...(bySlug.get(slug)?.target_keywords ?? []).map((k) => k.volume));

    // Guard the guard: the case this exists for has to be present.
    const unmeasured = bridges.filter((b) => trafficPotential(b.slug) === undefined);
    expect(unmeasured.length).toBeGreaterThanOrEqual(1);

    let unmeasuredSeen = 0;
    for (const category of GUIDE_CATEGORIES) {
      const guides = await getGuidesInCategory(category.slug);
      for (const tier of [false, true]) {
        const inTier = guides.map((g) => g.slug).filter((slug) => stranded(slug) === tier);
        const firstUnmeasured = inTier.findIndex((slug) => trafficPotential(slug) === undefined);
        if (firstUnmeasured === -1) continue;
        const tail = inTier.slice(firstUnmeasured);
        unmeasuredSeen += tail.length;
        // Once an unmeasured guide appears, no measured one may follow it.
        const measuredAfter = tail.filter((slug) => trafficPotential(slug) !== undefined);
        expect(measuredAfter, `${category.slug} (stranded: ${tier})`).toEqual([]);
        // And the unmeasured are in volume order among themselves.
        const volumes = tail.map(volume);
        expect(volumes, `${category.slug} (stranded: ${tier})`).toEqual(
          [...volumes].sort((x, y) => y - x),
        );
      }
    }
    expect(unmeasuredSeen).toBe(unmeasured.length);
  });

  it("keeps every guide listed, rather than hiding the stranded ones", async () => {
    for (const category of GUIDE_CATEGORIES) {
      const guides = await getGuidesInCategory(category.slug);
      expect(guides.length, category.slug).toBe(category.slugs.length);
    }
  });
});

describe("cluster order", () => {
  /**
   * The array was typed Personal Growth first, and /guides and the homepage
   * rendered it as typed: nineteen personal-growth guides above the first
   * communication guide, while the communication cluster held 70% of the
   * guides' traffic potential to Personal Growth's 16% (tracker entry 209,
   * 2026-09-21). The rows inside a cluster had a written rule; the sections
   * had none. Now they do: the sum of reach across each cluster's winnable
   * guides, descending. Computed here from the same fields rather than
   * hard-coded, so the assertion is about the rule and not about today's
   * numbers — and then checked against today's numbers once, so a rule that
   * quietly sorted on the wrong field would still be caught.
   */
  it("orders clusters by the reach of their winnable guides, descending", async () => {
    const bridges = await loadBridges();
    expect(bridges.length).toBeGreaterThanOrEqual(70);
    const bySlug = new Map(bridges.map((b) => [b.slug, b.frontmatter]));

    // Mirrors winnableReach: primary traffic potential, else peak volume,
    // over guides whose SERP has been read and found winnable.
    const reach = (slug: string) => {
      const fm = bySlug.get(slug);
      if (fm?.serp_verdict !== "winnable") return 0;
      const keywords = fm.target_keywords ?? [];
      return keywords[0]?.traffic_potential ?? Math.max(0, ...keywords.map((k) => k.volume));
    };
    const sums = new Map(
      GUIDE_CATEGORIES.map((c) => [c.slug, c.slugs.reduce((n, slug) => n + reach(slug), 0)]),
    );

    const ordered = orderedCategories(bridges);
    expect(ordered.map((c) => c.slug).sort()).toEqual(GUIDE_CATEGORIES.map((c) => c.slug).sort());
    // Guard the guard: the sums have to be real, distinct numbers, or the
    // sort is a no-op and the test passes on any order.
    expect(Math.max(...sums.values())).toBeGreaterThan(0);
    expect(new Set(sums.values()).size).toBe(sums.size);
    const bridgeBySlug = new Map(bridges.map((b) => [b.slug, b]));
    for (const c of ordered) expect(winnableReach(c, bridgeBySlug)).toBe(sums.get(c.slug));

    const expected = [...GUIDE_CATEGORIES]
      .sort((a, b) => sums.get(b.slug)! - sums.get(a.slug)! || a.title.localeCompare(b.title))
      .map((c) => c.slug);
    expect(ordered.map((c) => c.slug)).toEqual(expected);

    const largest = [...sums.entries()].sort((a, b) => b[1] - a[1])[0][0];
    expect(ordered[0].slug).toBe(largest);
    // Today (2026-09-21): communication 752,000; personal-growth 165,100;
    // teams 88,700; improv-skills 11,750. If Ahrefs moves the numbers, this
    // line is the one to update; the rule above is the one that must hold.
    expect(ordered.map((c) => c.slug)).toEqual([
      "communication",
      "personal-growth",
      "teams",
      "improv-skills",
    ]);
  });

  it("is the order both indexes render", () => {
    // Source check: the two pages that list the clusters read the rule, not
    // the array. A page that went back to GUIDE_CATEGORIES.map would render
    // the typed order again without any test noticing from the module alone.
    const root = path.resolve(__dirname, "../../..");
    for (const page of ["src/app/guides/page.tsx", "src/app/page.tsx"]) {
      const source = readFileSync(path.join(root, page), "utf8");
      expect(source, page).toMatch(/orderedCategories\(bridges\)\.map\(/);
      expect(source, page).not.toMatch(/GUIDE_CATEGORIES\.map\(/);
    }
  });
});

describe("cluster routing", () => {
  /**
   * A cluster's guides and their entry paths are two groupings; the hub now
   * says where most of its guides lead (tracker entry 255, 2026-09-21).
   */
  it("names the dominant entry path of every cluster with its share", async () => {
    const { dominantEntryPath, GUIDE_CATEGORIES } = await import("../guide-categories");
    const { loadBridges } = await import("../content");
    const bridges = await loadBridges();
    expect(GUIDE_CATEGORIES.length).toBe(4);
    for (const cat of GUIDE_CATEGORIES) {
      const r = await dominantEntryPath(cat.slug);
      expect(r, cat.slug).not.toBeNull();
      const members = bridges.filter((b) => cat.slugs.includes(b.slug));
      expect(r!.total).toBe(members.length);
      const recount = members.filter((b) => b.frontmatter.entry_path === r!.pathId).length;
      expect(r!.count).toBe(recount);
      expect(r!.count).toBeGreaterThanOrEqual(1);
    }
    // 2026-09-21: communication 27/29, personal-growth 10/19, teams 8/15,
    // improv-skills 4/15. These shares may only rise.
    const comm = await dominantEntryPath("communication");
    expect(comm!.count / comm!.total).toBeGreaterThanOrEqual(0.9);
    const skills = await dominantEntryPath("improv-skills");
    expect(skills!.count / skills!.total).toBeGreaterThanOrEqual(0.25);
  });
});
