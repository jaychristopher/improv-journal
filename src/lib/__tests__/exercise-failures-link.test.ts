import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";

/**
 * A drill's "Common failures" section names the failure mode it trains against.
 *
 * The exercises describe their failures in the drill's own vocabulary
 * ("letting the beat drop", "filler stalling") and, where they touch the
 * site's ten-atom failure taxonomy, did it in brackets: "(internal
 * computation)", "(steering)". Nothing linked. Eleven sections matched an
 * antipattern's wording, two were backed by an edge, and no section
 * backticked an antipattern id — so the failure layer pointed at no drill and
 * the drills pointed at no failure (entry 168).
 *
 * Two guards. The first is consistency: a backticked antipattern id inside
 * the failures section autolinks on the page, and the frontmatter is the
 * separate assertion the graph and the related-concepts block are built
 * from, so the two must agree — and agree with the right verb, `contrasts`,
 * because a drill exists to train against the failure, not to illustrate it.
 * The second is a floor on the population, so a future rewrite that drops
 * the edges fails instead of passing on nothing.
 *
 * Asserts presence, not markup.
 */

/** The heading an exercise uses for its failure list; "Where it goes wrong" is yes-lets. */
const FAILURES_HEADING = /^##+\s+(common failures|where it goes wrong)/im;

function failuresSection(content: string): string | null {
  const start = content.search(FAILURES_HEADING);
  if (start === -1) return null;
  const rest = content.slice(start).split("\n").slice(1).join("\n");
  const next = rest.search(/^##+\s/m);
  return next === -1 ? rest : rest.slice(0, next);
}

describe("exercise failures link the antipattern they describe", () => {
  it("declares a contrasts edge for every antipattern named in a failures section", async () => {
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);

    const antipatterns = new Set(
      atoms.filter((a) => a.frontmatter.type === "antipattern").map((a) => a.frontmatter.id),
    );
    expect(antipatterns.size).toBeGreaterThanOrEqual(10);

    const exercises = atoms.filter((a) => a.frontmatter.type === "exercise");
    expect(exercises.length).toBeGreaterThanOrEqual(25);

    const withSection = exercises.filter((a) => failuresSection(a.content) !== null);
    // 16 on 2026-09-21 (15 "Common failures" plus yes-lets' "Where it goes wrong").
    expect(withSection.length).toBeGreaterThanOrEqual(14);

    const missing: string[] = [];
    let named = 0;
    for (const atom of withSection) {
      const section = failuresSection(atom.content) ?? "";
      const contrasts = new Set(
        (atom.frontmatter.links ?? []).filter((l) => l.relation === "contrasts").map((l) => l.id),
      );
      const cited = new Set(
        [...section.matchAll(/`([a-z0-9-]+)`/g)]
          .map((m) => m[1])
          .filter((id) => antipatterns.has(id)),
      );
      for (const id of cited) {
        named += 1;
        if (!contrasts.has(id)) missing.push(`${atom.frontmatter.id} -> ${id}`);
      }
    }

    // 19 section → antipattern citations across 12 exercises on 2026-09-21.
    // Guard the guard: the regex finding nothing must fail, not pass.
    expect(named).toBeGreaterThanOrEqual(18);
    expect(missing).toEqual([]);
  });

  it("keeps the drills wired to the failure taxonomy", async () => {
    const atoms = await loadAtoms();
    const antipatterns = new Set(
      atoms.filter((a) => a.frontmatter.type === "antipattern").map((a) => a.frontmatter.id),
    );
    const exercises = atoms.filter((a) => a.frontmatter.type === "exercise");
    expect(exercises.length).toBeGreaterThanOrEqual(25);

    const wired = exercises.filter((a) =>
      (a.frontmatter.links ?? []).some((l) => antipatterns.has(l.id)),
    );

    // 20 of 27 on 2026-09-21, up from 17 (entry 168). The seven without an
    // edge — directed-scene, emotion-switch, fracture-repair-drill,
    // genre-scene, group-mind-cultivation, organic-opening-exercise,
    // status-transfer — describe no taxonomy failure in their prose, and an
    // edge nothing in the text supports would be an invented match.
    expect(wired.length).toBeGreaterThanOrEqual(20);
  });
});
