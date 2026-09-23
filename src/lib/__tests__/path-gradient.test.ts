import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getPathProgressionRank, loadAtoms, loadPaths, loadThreads } from "../content";
import { coreNumbers, median, undirectedGraph } from "../graph-robustness";
import { describeDirection, getPathAudience } from "../path-progression";

/**
 * Level, on this site, is distance from the graph's centre.
 *
 * For each path, take the atoms its lessons compose and read two things off
 * the atom graph: in-degree (how many atoms declare an edge toward it) and
 * core number (graph-robustness.ts, entry 268). The ladder walks outward:
 * Foundations teaches atoms with a median in-degree of 62, all of them in
 * the 13-core; the beginner and intermediate paths sit around 14–20; the
 * performer paths fall to 7 and then 2, with half of Mastering the Form's
 * atoms outside the core. The one path labelled "advanced", the reference
 * guide, turns back in — median 25, 93% in the core. So "performer" and
 * "advanced" are opposite directions through the graph, and until tracker
 * entry 281 (2026-09-22) the next-path card and the hubs' arrows called both
 * "the next level up".
 *
 * These guards keep the copy and the measurement together: the direction
 * strings path-progression.ts ships are asserted here against the gradient
 * they describe, so a recomposed path that reverses the gradient, or a
 * rewrite that drops the phrases, fails here rather than on a reader.
 *
 * Reading on 2026-09-22 (rank, path, atoms, share in the 13-core, median
 * in-degree):
 *
 *   0 beginner-foundations         5  100%  62
 *   1 improv-for-life             22   82%  20
 *   1 physics-of-connection       27   89%  17
 *   2 improv-for-teams            19   79%  19
 *   2 systems-of-improv           22   95%  17.5
 *   3 self-coaching-toolkit       28   82%  14
 *   4 advanced-game-and-character 23   74%  7
 *   5 mastering-the-form          16   50%  2
 *   5 teaching-improv             20   65%  17
 *   6 reference-guide             27   93%  25
 *   6 the-art-of-ensemble         24   58%  11.5
 */
describe("path gradient", () => {
  interface Reading {
    id: string;
    rank: number;
    audience: string;
    atoms: string[];
    coreShare: number;
    medianInDegree: number;
  }

  const read = async (): Promise<{ readings: Reading[]; taught: Set<string>; maxCore: number }> => {
    const [atoms, threads, paths] = await Promise.all([loadAtoms(), loadThreads(), loadPaths()]);
    // Guard the guard: 205 atoms, 25 threads and 11 paths on 2026-09-22.
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    expect(threads.length).toBeGreaterThanOrEqual(20);
    expect(paths.length).toBeGreaterThanOrEqual(10);

    const ids = new Set(atoms.map((a) => a.frontmatter.id));
    const graph = undirectedGraph(atoms.map((a) => a.frontmatter));
    const core = coreNumbers(graph);
    const maxCore = Math.max(...core.values());

    // In-degree over declared edges: the count of `{ id: x }` across every
    // atom's links, the figure the tracker entry's scratch measurement used.
    // Directed, unlike the core numbers, because "how many atoms need this
    // one" is the question.
    const inDegree = new Map<string, number>();
    for (const atom of atoms) {
      for (const link of atom.frontmatter.links ?? []) {
        if (link.id !== atom.frontmatter.id && ids.has(link.id)) {
          inDegree.set(link.id, (inDegree.get(link.id) ?? 0) + 1);
        }
      }
    }

    const atomsOfThread = new Map(threads.map((t) => [t.frontmatter.id, t.frontmatter.atoms]));
    const taught = new Set<string>();
    const readings = paths.map(({ frontmatter: p }) => {
      const composed = [...new Set(p.threads.flatMap((t) => atomsOfThread.get(t) ?? []))].filter(
        (id) => ids.has(id),
      );
      // Every lesson a path sequences must exist and compose something, or
      // the reading is of a smaller path than the one the reader walks.
      for (const t of p.threads) expect(atomsOfThread.has(t), `${p.id}: thread ${t}`).toBe(true);
      expect(composed.length, `${p.id}: atoms`).toBeGreaterThan(0);
      for (const id of composed) taught.add(id);
      const inCore = composed.filter((id) => core.get(id) === maxCore).length;
      return {
        id: p.id,
        rank: getPathProgressionRank(p.id),
        audience: getPathAudience(p.id) ?? p.audience[0],
        atoms: composed,
        coreShare: inCore / composed.length,
        medianInDegree: median(composed.map((id) => inDegree.get(id) ?? 0)),
      };
    });
    return { readings, taught, maxCore };
  };

  /** The per-path reading, dated, for every assertion message below. */
  const dated = (readings: Reading[]) =>
    `Reading on ${new Date().toISOString().slice(0, 10)}:\n` +
    [...readings]
      .sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id))
      .map(
        (r) =>
          `  ${r.rank} ${r.id} (${r.audience}): ${r.atoms.length} atoms, ` +
          `${Math.round(r.coreShare * 100)}% in the core, median in-degree ${r.medianInDegree}`,
      )
      .join("\n");

  it("teaches a population worth measuring", async () => {
    const { readings, taught, maxCore } = await read();
    // 137 atoms across the 25 lessons on 2026-09-22 (entry 166), in a 13-core graph.
    expect(taught.size).toBeGreaterThanOrEqual(100);
    expect(maxCore).toBe(13);
    // Both ends of the ladder and the exception are present to be compared.
    const ids = readings.map((r) => r.id);
    expect(ids).toContain("beginner-foundations");
    expect(ids).toContain("self-coaching-toolkit");
    expect(ids).toContain("mastering-the-form");
    expect(ids).toContain("reference-guide");
    expect(readings.filter((r) => r.audience === "performer").length).toBe(3);
  });

  it("walks outward from the centre along the performer track", async () => {
    const { readings } = await read();
    const note = dated(readings);
    const byId = new Map(readings.map((r) => [r.id, r]));
    const at = (id: string) => byId.get(id)!;

    // The first rung is the centre: no other path's atoms are more required.
    const foundations = at("beginner-foundations");
    expect(foundations.coreShare, note).toBe(1);
    for (const r of readings) {
      if (r.id === foundations.id) continue;
      expect(r.medianInDegree, `${r.id} vs foundations\n${note}`).toBeLessThan(
        foundations.medianInDegree,
      );
    }

    // The performer track leaves the core. Each performer rung's median
    // in-degree is under the rung the track climbs from (the toolkit, the
    // last non-performer step on the chain) and under every beginner and
    // intermediate path's; so is its share of the 13-core.
    const performer = readings.filter((r) => r.audience === "performer");
    const inward = readings.filter(
      (r) => r.audience === "beginner" || r.audience === "intermediate",
    );
    expect(inward.length).toBeGreaterThanOrEqual(5);
    const entry = at("self-coaching-toolkit");
    for (const p of performer) {
      expect(p.rank, `${p.id} rank\n${note}`).toBeGreaterThan(entry.rank);
      expect(p.medianInDegree, `${p.id} vs the toolkit\n${note}`).toBeLessThan(
        entry.medianInDegree,
      );
      for (const i of inward) {
        expect(p.medianInDegree, `${p.id} vs ${i.id}\n${note}`).toBeLessThan(i.medianInDegree);
        expect(p.coreShare, `${p.id} vs ${i.id} core share\n${note}`).toBeLessThan(i.coreShare);
      }
    }

    // Rank order and in-degree agree in direction down the chain: each
    // performer step teaches atoms no more required than the rung before it,
    // down to the formats — the structural edge, where half the atoms are
    // outside the core. The last rung, The Art of Ensemble, climbs back a
    // little from that floor (11.5 against 2 on 2026-09-22) while staying
    // under every inward path, which the loop above holds; a strict descent
    // would fail on it, so the descent is asserted as far as the form and
    // the ensemble's ceiling is the toolkit.
    const chain = ["self-coaching-toolkit", "advanced-game-and-character", "mastering-the-form"];
    for (let i = 1; i < chain.length; i += 1) {
      const from = at(chain[i - 1]);
      const to = at(chain[i]);
      expect(to.rank, `${to.id} rank\n${note}`).toBeGreaterThan(from.rank);
      expect(to.medianInDegree, `${from.id} → ${to.id}\n${note}`).toBeLessThanOrEqual(
        from.medianInDegree,
      );
      expect(to.coreShare, `${from.id} → ${to.id} core share\n${note}`).toBeLessThanOrEqual(
        from.coreShare,
      );
    }
    expect(at("mastering-the-form").coreShare, note).toBeLessThanOrEqual(0.5);
  });

  it("names the reference guide as the exception that returns to the core", async () => {
    const { readings } = await read();
    const note = dated(readings);
    const reference = readings.find((r) => r.id === "reference-guide")!;
    expect(reference.audience).toBe("advanced");
    const performer = readings.filter((r) => r.audience === "performer");

    // It ranks with the end of the performer track and reads like the start
    // of it: above every performer path on both measures.
    expect(reference.rank).toBeGreaterThanOrEqual(Math.max(...performer.map((p) => p.rank)));
    for (const p of performer) {
      expect(reference.medianInDegree, `reference vs ${p.id}\n${note}`).toBeGreaterThan(
        p.medianInDegree,
      );
      expect(reference.coreShare, `reference vs ${p.id} core share\n${note}`).toBeGreaterThan(
        p.coreShare,
      );
    }
    // 93% on 2026-09-22; the floor is one atom under.
    expect(reference.coreShare, note).toBeGreaterThanOrEqual(0.88);
  });

  /**
   * The copy and the gradient stay together: the phrases the next-path card
   * and the hub arrows use are the ones this file measures, and each is
   * attached to the audience whose paths move that way.
   */
  it("ships the direction each audience's paths actually move", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src", "lib", "path-progression.ts"),
      "utf-8",
    );
    const outward = "works outward into formats and show craft, the specific end of the graph";
    const returns = "returns to the core ideas in depth, not a continuation of the performer track";
    const inward = "works inward on the ideas everything else depends on";
    for (const phrase of [outward, returns, inward]) expect(source).toContain(phrase);

    for (const id of ["advanced-game-and-character", "mastering-the-form", "the-art-of-ensemble"]) {
      expect(describeDirection(id), id).toBe(outward);
    }
    expect(describeDirection("reference-guide")).toBe(returns);
    for (const id of ["beginner-foundations", "systems-of-improv", "self-coaching-toolkit"]) {
      expect(describeDirection(id), id).toBe(inward);
    }
  });
});
