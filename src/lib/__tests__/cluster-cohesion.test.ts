import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  ALSO_CLOSE_LIMIT,
  alsoCloseTo,
  clusterCohesion,
  clusterMap,
  crossClusterPairs,
  sharedEntryAtoms,
  STRONG_PAIR_ATOMS,
} from "../cluster-cohesion";
import { loadBridges } from "../content";
import { alsoCloseToCluster, GUIDE_CATEGORIES } from "../guide-categories";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * The topic clusters measured against the guides' own `entry_atoms` (tracker
 * entry 290, 2026-09-22). Three clusters are neighbourhoods: a pair inside
 * shares about twice the atoms of a pair straddling it. One is a bucket.
 *
 * The bar for a neighbourhood is inside mean at least 1.5 times the outside
 * mean — under the 2× the three cohesive clusters clear today (Communication
 * 1.64 / 0.91, Teams 1.48 / 0.73, Personal Growth 1.43 / 0.71), so a few
 * re-declared guides do not fail it, and well above the 1.1× a bucket shows.
 */
const COHESION_RATIO = 1.5;

/**
 * Improv Skills is the named exception: 0.72 inside against 0.65 outside, a
 * ratio of 1.12 on 2026-09-22. Whether its fifteen split into "the craft" and
 * "questions and games" or join the other three is the author's call (entry
 * 290, "if adopted"); until then this records the reading and fails only if
 * the cluster becomes anti-cohesive (ratio under 1.0) or if a second cluster
 * slips under the bar, since one bucket is a known debt and two is a pattern.
 */
const BUCKET = "improv-skills";
const BUCKET_RATIO_FLOOR = 1.0;

describe("cluster cohesion", () => {
  it("counts the entry atoms two guides share", () => {
    const a = {
      slug: "a",
      frontmatter: { title: "A", description: "", entry_atoms: ["x", "y", "z"] },
    };
    const b = {
      slug: "b",
      frontmatter: { title: "B", description: "", entry_atoms: ["z", "x", "q"] },
    };
    const c = { slug: "c", frontmatter: { title: "C", description: "", entry_atoms: [] } };
    expect(sharedEntryAtoms(a, b)).toBe(2);
    expect(sharedEntryAtoms(b, a)).toBe(2);
    expect(sharedEntryAtoms(a, c)).toBe(0);
  });

  it("has the population it measures", async () => {
    const bridges = await loadBridges();
    expect(GUIDE_CATEGORIES.length).toBe(4);
    expect(bridges.length).toBeGreaterThanOrEqual(70);
    const placed = clusterMap(GUIDE_CATEGORIES);
    // Every guide is in the map, or the means below are over a subset.
    expect(bridges.filter((b) => !placed.has(b.slug)).map((b) => b.slug)).toEqual([]);
    const cohesion = clusterCohesion(bridges, GUIDE_CATEGORIES);
    expect(cohesion.map((c) => c.cluster).sort()).toEqual(
      GUIDE_CATEGORIES.map((c) => c.slug).sort(),
    );
    for (const c of cohesion) {
      expect(c.size, c.cluster).toBeGreaterThanOrEqual(10);
      expect(c.insideMean, c.cluster).toBeGreaterThan(0);
      expect(c.outsideMean, c.cluster).toBeGreaterThan(0);
    }
  });

  it("finds three neighbourhoods and one named bucket", async () => {
    const bridges = await loadBridges();
    const cohesion = clusterCohesion(bridges, GUIDE_CATEGORIES);
    const under = cohesion.filter((c) => c.ratio < COHESION_RATIO).map((c) => c.cluster);
    // A second cluster under the bar is a new finding, not the known one.
    expect(under).toEqual([BUCKET]);
    for (const c of cohesion) {
      if (c.cluster === BUCKET) continue;
      expect(
        c.ratio,
        `${c.cluster} ${c.insideMean.toFixed(2)} / ${c.outsideMean.toFixed(2)}`,
      ).toBeGreaterThanOrEqual(COHESION_RATIO);
    }
    const bucket = cohesion.find((c) => c.cluster === BUCKET)!;
    // Dated reading, 2026-09-22: 0.72 / 0.65 = 1.12. This is the line to
    // delete when the cluster is split or re-declared and the one above
    // starts covering it; it is not the line to lower.
    expect(bucket.ratio).toBeGreaterThanOrEqual(BUCKET_RATIO_FLOOR);
    expect(bucket.insideMean).toBeCloseTo(0.72, 1);
    expect(bucket.outsideMean).toBeCloseTo(0.65, 1);
  });

  /**
   * The strongest pairs are the ones the map splits: 134 of the 277 pairs
   * sharing three or more entry atoms cross a cluster line (2026-09-22). A
   * ceiling, because a re-declaration that moves a guide to the cluster its
   * atoms say it belongs in lowers it; a guide filed against its atoms raises
   * it. Guard the guard: the within-cluster count is asserted too, so a
   * broken pair walk that found nothing would fail rather than pass at zero.
   */
  it("records the strong cross-cluster pairs as a ceiling", async () => {
    const bridges = await loadBridges();
    const cross = crossClusterPairs(bridges, GUIDE_CATEGORIES);
    expect(cross.length).toBeGreaterThanOrEqual(100);
    expect(cross.length).toBeLessThanOrEqual(134);
    for (const pair of cross) {
      expect(pair.shared).toBeGreaterThanOrEqual(STRONG_PAIR_ATOMS);
      expect(pair.clusterA).not.toBe(pair.clusterB);
      expect(pair.a < pair.b, `${pair.a} ~ ${pair.b}`).toBe(true);
    }
    // Strongest first; the entry's two examples share five each.
    const shared = cross.map((p) => p.shared);
    expect(shared).toEqual([...shared].sort((x, y) => y - x));
    const top = cross.slice(0, 4).map((p) => `${p.a}~${p.b}`);
    expect(top).toContain("funny-questions-to-ask~how-to-be-funny");
    expect(top).toContain("how-to-have-difficult-conversations~how-to-stop-people-pleasing");
    const placed = clusterMap(GUIDE_CATEGORIES);
    let within = 0;
    for (let i = 0; i < bridges.length; i++) {
      for (let j = i + 1; j < bridges.length; j++) {
        if (placed.get(bridges[i].slug) !== placed.get(bridges[j].slug)) continue;
        if (sharedEntryAtoms(bridges[i], bridges[j]) >= STRONG_PAIR_ATOMS) within += 1;
      }
    }
    expect(within).toBeGreaterThanOrEqual(120); // 143 on 2026-09-22
  });
});

describe("also close to", () => {
  it("lists, for every cluster, the outside guides its own guides are closest to", async () => {
    const bridges = await loadBridges();
    const placed = clusterMap(GUIDE_CATEGORIES);
    const bySlug = new Map(bridges.map((b) => [b.slug, b]));
    for (const category of GUIDE_CATEGORIES) {
      const rail = await alsoCloseToCluster(category.slug);
      expect(rail).toEqual(alsoCloseTo(category.slug, bridges, GUIDE_CATEGORIES));
      expect(rail.length, category.slug).toBeGreaterThanOrEqual(1);
      expect(rail.length).toBeLessThanOrEqual(ALSO_CLOSE_LIMIT);
      expect(new Set(rail.map((g) => g.slug)).size).toBe(rail.length);
      const counts = rail.map((g) => g.shared);
      expect(counts).toEqual([...counts].sort((x, y) => y - x));
      for (const g of rail) {
        expect(placed.get(g.slug), g.slug).not.toBe(category.slug);
        expect(g.cluster).toBe(placed.get(g.slug));
        expect(g.clusterTitle).toBe(GUIDE_CATEGORIES.find((c) => c.slug === g.cluster)!.title);
        expect(placed.get(g.closestTo), `${g.slug} closest to ${g.closestTo}`).toBe(category.slug);
        expect(g.shared).toBeGreaterThanOrEqual(STRONG_PAIR_ATOMS);
        expect(sharedEntryAtoms(bySlug.get(g.slug)!, bySlug.get(g.closestTo)!)).toBe(g.shared);
        // Closest means closest: no in-cluster guide shares more.
        for (const member of bridges) {
          if (placed.get(member.slug) !== category.slug) continue;
          expect(sharedEntryAtoms(bySlug.get(g.slug)!, member)).toBeLessThanOrEqual(g.shared);
        }
        expect(g.title.length).toBeGreaterThan(0);
        expect(g.closestToTitle.length).toBeGreaterThan(0);
      }
    }
    // The entry's example, seen from both sides of the line it crosses.
    const skills = await alsoCloseToCluster("improv-skills");
    expect(skills[0]).toMatchObject({
      slug: "funny-questions-to-ask",
      closestTo: "how-to-be-funny",
      shared: 5,
      cluster: "communication",
    });
    const comm = await alsoCloseToCluster("communication");
    expect(comm.map((g) => g.slug)).toContain("how-to-be-funny");
  });

  it("returns nothing for an unknown cluster", async () => {
    expect(await alsoCloseToCluster("nope")).toEqual([]);
  });

  it.runIf(built)("renders on every topic hub with at least one guide", async () => {
    for (const category of GUIDE_CATEGORIES) {
      const file = path.join(APP, "topics", `${category.slug}.html`);
      expect(fs.existsSync(file), `${category.slug} is not built`).toBe(true);
      const html = fs.readFileSync(file, "utf-8");
      const start = html.indexOf('data-track="topic-also-close"');
      expect(start, `${category.slug} has no also-close rail`).toBeGreaterThan(-1);
      const rail = html.slice(start, html.indexOf("</nav>", start));
      const expected = await alsoCloseToCluster(category.slug);
      expect(expected.length).toBeGreaterThanOrEqual(1);
      for (const g of expected) {
        expect(rail, `${category.slug} rail lacks ${g.slug}`).toContain(`href="/${g.slug}"`);
        // "Relationships & Communication" renders with the ampersand escaped.
        expect(rail).toContain(g.clusterTitle.replace(/&/g, "&amp;"));
      }
      expect(rail.match(/href="\/[a-z0-9-]+"/g)?.length).toBe(expected.length);
    }
  });
});
