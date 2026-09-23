import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";
import { PAIRING_RELATIONS } from "../drill-pairs";
import { drillsPreparingFor, FORMAT_DRILLS_CAP, formatsFedBy } from "../format-drills";
import type { AtomFrontmatter, Link } from "../schema";
import { buildTrainsIndex } from "../trains";

/**
 * The author's shortlist for forward edges the graph does not hold.
 *
 * `enables` runs up the abstraction ladder (tracker entry 314;
 * enables-direction.test.ts): technique → format is wired twice in the whole
 * graph and drill → format 25 times, while the derived surfaces — "Drills
 * that prepare for this" on a format (format-drills.ts, entry 283) and the
 * "feeds" line on a drill — already compute the downward join from shared
 * targets. Where a derived surface shows a pair and no `enables`, `requires`
 * or `illustrates` edge joins the two in either direction, the derivation is
 * asserting something the frontmatter does not, and that pair is the one an
 * author should look at first: the join is on the page today, and an edge
 * would make it the graph's own claim.
 *
 * Two joins are read. Drill → format is what the site renders: every pair
 * `drillsPreparingFor` puts under a format plus every pair `formatsFedBy`
 * puts on a drill, each cut at FORMAT_DRILLS_CAP. Drill → technique has no
 * derived surface yet — a technique's drills come from `illustrates` edges,
 * so a technique page names only the drills already wired to it — and is
 * computed here by the same rule (shared PAIRING_RELATIONS targets, a trains
 * share counting double, cut at the same cap per drill), so the shortlist
 * says which technique a drill would feed if the surface existed.
 *
 * An `extends` or `contrasts` edge between the pair does not remove it: the
 * question is whether a *directional* edge joins them, and `extends` says
 * "a variant of", not "prepares for". Those pairs are marked in the printed
 * list so the author sees the edge that is there.
 *
 * Nothing here is bounded except the population; the top ten is printed on
 * every run and carried in the assertion message, so
 * `npx vitest run missing-forward-edges` is the shortlist.
 *
 * Reading, 2026-09-22: 210 pairs — 151 drill → format, out of the 200 slots
 * the two surfaces render (93 under formats, 107 on drills, some the same
 * pair seen from both ends), and 59 drill → technique out of 108 capped
 * joins. Of the top ten, seven are already joined by `extends`.
 */
describe("missing forward edges", () => {
  /** The relations that would make the pair the graph's own claim. */
  const DIRECTIONAL: ReadonlySet<Link["relation"]> = new Set([
    "enables",
    "requires",
    "illustrates",
  ]);

  interface Pair {
    kind: "drill → format" | "drill → technique";
    drill: string;
    target: string;
    score: number;
    through: string[];
    /** A non-directional edge (`extends`, `contrasts`) between the two, if any. */
    otherEdge: Link["relation"] | null;
  }

  function edgeBetween(
    byId: ReadonlyMap<string, AtomFrontmatter>,
    a: string,
    b: string,
    relations: ReadonlySet<Link["relation"]>,
  ): Link["relation"] | null {
    for (const [from, to] of [
      [a, b],
      [b, a],
    ]) {
      const hit = (byId.get(from)?.links ?? []).find(
        (l) => l.id === to && relations.has(l.relation),
      );
      if (hit) return hit.relation;
    }
    return null;
  }

  /** The concept ids an atom's pairing edges point at, as format-drills reads them. */
  function pairingTargets(fm: AtomFrontmatter, byId: ReadonlyMap<string, AtomFrontmatter>) {
    const out: string[] = [];
    for (const link of fm.links ?? []) {
      if (!PAIRING_RELATIONS.includes(link.relation)) continue;
      const target = byId.get(link.id);
      if (!target || target.type === "exercise" || target.type === "reference") continue;
      if (!out.includes(link.id)) out.push(link.id);
    }
    return out;
  }

  async function shortlist(): Promise<{ pairs: Pair[]; shown: number; techniqueJoins: number }> {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const NON_DIRECTIONAL: ReadonlySet<Link["relation"]> = new Set(["extends", "contrasts"]);
    const pairs: Pair[] = [];
    const seen = new Set<string>();
    let shown = 0;

    const consider = (
      kind: Pair["kind"],
      drill: string,
      target: string,
      score: number,
      through: string[],
    ) => {
      const key = `${drill}|${target}`;
      if (seen.has(key)) return;
      seen.add(key);
      if (edgeBetween(byId, drill, target, DIRECTIONAL)) return;
      pairs.push({
        kind,
        drill,
        target,
        score,
        through,
        otherEdge: edgeBetween(byId, drill, target, NON_DIRECTIONAL),
      });
    };

    // Drill → format: what the two rendered surfaces show.
    for (const atom of atoms) {
      const fm = atom.frontmatter;
      if (fm.type === "format") {
        for (const d of drillsPreparingFor(fm.id, atoms).drills) {
          shown += 1;
          consider(
            "drill → format",
            d.id,
            fm.id,
            d.score,
            d.shared.map((s) => s.id),
          );
        }
      }
      if (fm.type === "exercise") {
        for (const f of formatsFedBy(fm.id, atoms).formats) {
          shown += 1;
          consider(
            "drill → format",
            fm.id,
            f.id,
            f.score,
            f.shared.map((s) => s.id),
          );
        }
      }
    }

    // Drill → technique: the same rule, with no surface to read it from.
    const { trains } = buildTrainsIndex(atoms);
    const techniques = atoms.map((a) => a.frontmatter).filter((fm) => fm.type === "technique");
    const techniqueTargets = new Map(techniques.map((t) => [t.id, pairingTargets(t, byId)]));
    let techniqueJoins = 0;
    for (const atom of atoms) {
      const fm = atom.frontmatter;
      if (fm.type !== "exercise") continue;
      const own = new Set(pairingTargets(fm, byId));
      const ownTrains = new Set(trains.get(fm.id) ?? []);
      const candidates: { id: string; title: string; score: number; through: string[] }[] = [];
      for (const t of techniques) {
        const targets = techniqueTargets.get(t.id) ?? [];
        const viaTrains = targets.filter((id) => ownTrains.has(id));
        const viaEdge = targets.filter((id) => own.has(id) && !viaTrains.includes(id));
        const direct = edgeBetween(
          byId,
          fm.id,
          t.id,
          new Set([...DIRECTIONAL, ...NON_DIRECTIONAL]),
        );
        if (viaTrains.length + viaEdge.length === 0 && !direct) continue;
        candidates.push({
          id: t.id,
          title: t.title,
          score: viaTrains.length * 2 + viaEdge.length + (direct ? 2 : 0),
          through: [...viaTrains, ...viaEdge],
        });
      }
      candidates.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
      for (const c of candidates.slice(0, FORMAT_DRILLS_CAP)) {
        techniqueJoins += 1;
        consider("drill → technique", fm.id, c.id, c.score, c.through);
      }
    }

    pairs.sort(
      (a, b) =>
        b.score - a.score || a.drill.localeCompare(b.drill) || a.target.localeCompare(b.target),
    );
    return { pairs, shown, techniqueJoins };
  }

  it("prints the author's shortlist: derived joins with no directional edge behind them", async () => {
    const { pairs, shown, techniqueJoins } = await shortlist();
    // Guard the guard: the surfaces are showing pairs, and the technique
    // join found some. 200 rendered drill → format slots and 108 capped
    // drill → technique joins on 2026-09-22.
    expect(shown).toBeGreaterThanOrEqual(150);
    expect(techniqueJoins).toBeGreaterThanOrEqual(80);

    const byKind = {
      format: pairs.filter((p) => p.kind === "drill → format").length,
      technique: pairs.filter((p) => p.kind === "drill → technique").length,
    };
    const top = pairs
      .slice(0, 10)
      .map(
        (p, i) =>
          `${i + 1}. ${p.kind}: ${p.drill} → ${p.target} (score ${p.score}, through ${p.through.join(
            ", ",
          )}${p.otherEdge ? `; joined by \`${p.otherEdge}\` today` : ""})`,
      )
      .join("\n");
    const reading =
      `Shortlist for a forward edge, ${pairs.length} pairs ` +
      `(${byKind.format} drill → format, ${byKind.technique} drill → technique). Top ten:\n${top}`;

    // Reported on every run, as guide-concepts.test.ts reports its dangling
    // ids: the list is the point, and a number would hide it.
    console.warn(reading);

    // The reading, 2026-09-22: 210 pairs, 151 drill → format and 59 drill →
    // technique. A wide band, not a bound: an author writing edges from the
    // list lowers it, a new drill or format raises it, and either is a
    // change to read here with the date, not a failure. The message carries
    // the list too, so a failing run prints the shortlist with the number.
    expect(pairs.length, reading).toBeGreaterThanOrEqual(150);
    expect(pairs.length, reading).toBeLessThanOrEqual(270);
    expect(byKind.format, reading).toBeGreaterThanOrEqual(100);
    expect(byKind.technique, reading).toBeGreaterThanOrEqual(40);

    // Every pair on the list is what it says: no directional edge either
    // way, and each end the type its kind names.
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    for (const p of pairs) {
      expect(byId.get(p.drill)?.type, `${p.drill} → ${p.target}`).toBe("exercise");
      expect(byId.get(p.target)?.type, `${p.drill} → ${p.target}`).toBe(
        p.kind === "drill → format" ? "format" : "technique",
      );
      expect(edgeBetween(byId, p.drill, p.target, DIRECTIONAL), `${p.drill} → ${p.target}`).toBe(
        null,
      );
    }
    // The top of the list on 2026-09-22, so a change in what the author is
    // asked to look at first is seen here.
    expect(pairs[0]).toMatchObject({ drill: "emotional-honesty-scene", target: "do-feel-say" });
    expect(pairs.slice(0, 10).map((p) => `${p.drill} → ${p.target}`)).toContain(
      "mirroring → organic-longform",
    );
  });
});
