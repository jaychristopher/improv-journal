import { describe, expect, it } from "vitest";

import { loadAtoms, loadThreads } from "../content";
import {
  CONCRETE_TYPES,
  getAtomWhatsNext,
  getRelatedConcepts,
  isConcreteType,
} from "../whats-next";

/**
 * The forward relation, read against the abstraction ladder.
 *
 * `enables` is the graph's one forward relation — 256 edges, rendered
 * "Unlocks" — and on 2026-09-22 it climbed: 143 of the 256 ran from an
 * abstraction (law, principle, definition, insight, framework, pattern,
 * antipattern) to another abstraction, 61 from something concrete to an
 * abstraction (20 of them an *exercise enabling a definition*), and 27 (11%)
 * from an abstraction to something a reader could do — a technique, a drill,
 * a format, a pedagogy — with technique → format at 2 in the whole graph
 * (tracker entry 314). So "what this unlocks" unlocked another idea nine
 * times in ten, and the "What's next" card's forward tier (entry 292) led
 * with a second definition where the graph also offered a technique.
 *
 * Two things are held here. On the corpus: the abstract → concrete share is a
 * floor that may only rise, and the exercise → definition count a ceiling
 * that may only fall, so the SOP change the entry proposes — an `enables`
 * from an abstraction points at practice where one exists, and a drill
 * `illustrates` a definition rather than enabling it — is read here as it
 * lands rather than absorbed. On the card: within the forward tier a
 * concrete target ranks before an abstract one, on every page that has one.
 *
 * Readings, 2026-09-22: `enables` 256; abstract → abstract 143, concrete →
 * abstract 61, abstract → concrete 27, concrete → concrete 25; exercise →
 * definition 20; technique → format 2. Card: 17 forward-led pages, 7 with a
 * concrete forward candidate, 7 leading with one (5 before the preference:
 * specificity led with offers, zip-zap-zop with ensemble).
 */
describe("enables points down the abstraction ladder", () => {
  interface EnablesEdge {
    from: string;
    fromType: string;
    to: string;
    toType: string;
  }

  /** Every `enables` edge whose target exists, source and target typed. */
  async function enablesEdges(): Promise<EnablesEdge[]> {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const edges: EnablesEdge[] = [];
    for (const atom of atoms) {
      for (const link of atom.frontmatter.links ?? []) {
        if (link.relation !== "enables") continue;
        const target = byId.get(link.id);
        if (!target) continue;
        edges.push({
          from: atom.frontmatter.id,
          fromType: atom.frontmatter.type,
          to: link.id,
          toType: target.type,
        });
      }
    }
    return edges;
  }

  it("names the four types a reader can do", () => {
    expect([...CONCRETE_TYPES].sort()).toEqual(["exercise", "format", "pedagogy", "technique"]);
    for (const type of ["law", "principle", "definition", "insight", "framework", "pattern"]) {
      expect(isConcreteType(type), type).toBe(false);
    }
    expect(isConcreteType("antipattern")).toBe(false);
    expect(isConcreteType("reference")).toBe(false);
  });

  it("holds the abstract → concrete share as a floor and exercise → definition as a ceiling", async () => {
    const edges = await enablesEdges();
    // The population: 256 `enables` edges on 2026-09-22. A band rather than
    // an exact count, so an atom that gains or loses an edge does not fail
    // here; a drift past it is a change in the relation's use, to be read.
    expect(edges.length).toBeGreaterThanOrEqual(246);
    expect(edges.length).toBeLessThanOrEqual(276);

    const split = { aa: 0, ca: 0, ac: 0, cc: 0 };
    for (const e of edges) {
      const from = isConcreteType(e.fromType);
      const to = isConcreteType(e.toType);
      if (!from && !to) split.aa += 1;
      else if (from && !to) split.ca += 1;
      else if (!from && to) split.ac += 1;
      else split.cc += 1;
    }
    expect(split.aa + split.ca + split.ac + split.cc).toBe(edges.length);

    // Abstract → concrete: 27 of 256 (10.5%) on 2026-09-22. The floor sits
    // at the reading: the share may only rise, because the entry's SOP line
    // says an `enables` from an abstraction should point at practice where
    // practice exists. If it falls, an abstraction has gained an edge to
    // another abstraction that could have gone to a technique or a format.
    expect(split.ac / edges.length).toBeGreaterThanOrEqual(27 / 256);

    // Exercise → definition: 20 on 2026-09-22, every one an edge the entry
    // says should be `illustrates` — a drill shows a definition; it does not
    // enable it. A ceiling: the count may only fall. Move it down as edges
    // are re-typed, with the date.
    const exerciseToDefinition = edges.filter(
      (e) => e.fromType === "exercise" && e.toType === "definition",
    );
    expect(exerciseToDefinition.length).toBeLessThanOrEqual(20);
    // And the readings themselves, so a change in either direction is seen
    // here rather than inferred from a ratio.
    expect(split.ac).toBeGreaterThanOrEqual(27);
    expect(split.aa).toBeLessThanOrEqual(143);
  });

  it("records technique → format, the join the forward relation should make", async () => {
    const edges = await enablesEdges();
    expect(edges.length).toBeGreaterThanOrEqual(246);
    // 2 on 2026-09-22 (entry 314): the one pair of practice types a forward
    // pointer is for — "now you can run this format" — is almost unwired.
    // Recorded, not bounded above: an author writing the edges the entry
    // asks for raises this, and the reading here should follow with the date.
    const techniqueToFormat = edges.filter(
      (e) => e.fromType === "technique" && e.toType === "format",
    );
    expect(techniqueToFormat.length).toBeGreaterThanOrEqual(2);
    // The two the corpus holds today, so a re-typing that drops one is
    // named here rather than absorbed by the floor.
    expect(techniqueToFormat.map((e) => `${e.from} → ${e.to}`).sort()).toEqual(
      expect.arrayContaining(["commitment → musical-improv", "story-spine → narrative-longform"]),
    );
  });

  /**
   * The card rule. On every page in no lesson whose forward tier holds a
   * concrete candidate, the first item is concrete. The count is exact —
   * 7 of the 17 forward-led pages on 2026-09-22 — so a corpus change that
   * adds a concrete forward target is read here rather than absorbed.
   */
  it("leads the card with a concrete target wherever the forward tier has one", async () => {
    const [atoms, threads] = await Promise.all([loadAtoms(), loadThreads()]);
    const inLesson = new Set(threads.flatMap((t) => t.frontmatter.atoms ?? []));
    const typeOf = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter.type]));

    let forwardLed = 0;
    const withConcrete: string[] = [];
    const concreteFirst: string[] = [];
    const misled: string[] = [];
    for (const atom of atoms) {
      const id = atom.frontmatter.id;
      if (inLesson.has(id)) continue;
      const next = await getAtomWhatsNext(id);
      if (next?.variant !== "related-concepts") continue;
      const first = next.items[0];
      if (first.tier !== "forward") continue;
      forwardLed += 1;
      const forward = (await getRelatedConcepts(id, 50)).filter((i) => i.tier === "forward");
      const concrete = forward.filter((i) => isConcreteType(typeOf.get(i.id) ?? ""));
      if (concrete.length === 0) continue;
      withConcrete.push(id);
      if (isConcreteType(typeOf.get(first.id) ?? "")) concreteFirst.push(id);
      else {
        misled.push(
          `${id} leads with ${first.id} (${typeOf.get(first.id)}), not one of ${concrete
            .map((i) => `${i.id} (${typeOf.get(i.id)})`)
            .join(", ")}`,
        );
      }
    }
    // The population, exact: 17 forward-led pages on 2026-09-22
    // (whats-next-direction.test.ts holds the same number by its own route).
    expect(forwardLed).toBe(17);
    // 7 of them have a concrete forward candidate — meisner-technique,
    // monoscene, specificity, spontaneity, story-spine, tilt, zip-zap-zop —
    // and every one leads with it. Exact, so a page that gains one is read
    // here.
    expect(withConcrete.length).toBe(7);
    expect(misled).toEqual([]);
    expect(concreteFirst).toEqual(withConcrete);
    // The two the preference moved.
    const lead = async (id: string) => {
      const next = await getAtomWhatsNext(id);
      return next?.variant === "related-concepts" ? next.items[0].id : null;
    };
    expect(await lead("specificity")).toBe("obvious-choice");
    expect(await lead("zip-zap-zop")).toBe("safety-in-the-room");
  });

  /**
   * The preference is scoped to the forward tier. Elsewhere the ranking is
   * what entry 292 left it: a sibling in a lesson before a sibling in none,
   * whatever their types. Checked as an ordering property over the whole
   * forward tier of every untaught page, the way whats-next-coverage.test.ts
   * checks lesson membership.
   */
  it("prefers concrete targets within the forward tier only", async () => {
    const [atoms, threads] = await Promise.all([loadAtoms(), loadThreads()]);
    const inLesson = new Set(threads.flatMap((t) => t.frontmatter.atoms ?? []));
    const typeOf = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter.type]));
    const untaught = atoms.filter((a) => !inLesson.has(a.frontmatter.id));
    expect(untaught.length).toBeGreaterThanOrEqual(60);

    const misordered: string[] = [];
    let forwardTiersWithBoth = 0;
    for (const atom of untaught) {
      const items = await getRelatedConcepts(atom.frontmatter.id, 50);
      const cites = (i: { hint: string }) =>
        atom.frontmatter.type === "reference" && i.hint === "Cites this work";
      const forward = items.filter((i) => i.tier === "forward" && !cites(i));
      const flags = forward.map((i) => isConcreteType(typeOf.get(i.id) ?? ""));
      const firstAbstract = flags.indexOf(false);
      const lastConcrete = flags.lastIndexOf(true);
      if (firstAbstract !== -1 && lastConcrete !== -1) forwardTiersWithBoth += 1;
      if (firstAbstract !== -1 && lastConcrete > firstAbstract) {
        misordered.push(`${atom.frontmatter.id}: ${forward.map((i) => i.id).join(", ")}`);
      }
    }
    expect(misordered).toEqual([]);
    // Guard the guard: the property is exercised on pages whose forward tier
    // holds both kinds — 6 on 2026-09-22.
    expect(forwardTiersWithBoth).toBeGreaterThanOrEqual(5);
  });
});
