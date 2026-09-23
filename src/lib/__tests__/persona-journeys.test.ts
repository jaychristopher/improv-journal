import { describe, expect, it } from "vitest";

import { loadAtoms, loadPaths } from "../content";
import {
  getPersonaCoverage,
  getPersonaJourneys,
  getPersonaPairings,
  getRecurringMisses,
  personaNoteForPath,
} from "../persona-journeys";

/**
 * The 5 personas as a checkable input.
 *
 * Each ends its `## Journey Map` with a `**Recommended:**` line naming a path
 * to build, and all 5 of those paths exist with the audience asked for — so
 * the structural half of the specification shipped. The curricular half was
 * never checked against the paths that exist: the recommended paths' lessons
 * teach 80 of the 126 concepts the Journey Maps prescribe (tracker entry 347,
 * 2026-09-22), and before this module nothing in `src` opened
 * `content/personas/` at all.
 *
 * The same shape as `outline-plan.test.ts`, and for the same reason: an April
 * document whose structural half shipped and whose curricular half rotted
 * unobserved is only knowable because somebody parsed it by hand once. These
 * parse it on every run.
 *
 * The readings below are dated. Raising a floor to make a failure go away
 * would defeat the point — re-date the reading instead.
 */
describe("the personas, against the paths they asked for", () => {
  /**
   * The guard on the guard. Every reading below is a count over this parse,
   * so a renamed heading or a reworded Recommended line would otherwise let
   * the whole file pass on an empty one.
   *
   * 5 personas, 24 phase headings between them, 141 distinct backticked
   * tokens and 126 of those resolving to an atom, on 2026-09-22.
   */
  it("parses the journeys it is measuring", async () => {
    const journeys = await getPersonaJourneys();
    expect(journeys.length).toBe(5);
    expect(journeys.map((j) => j.id)).toEqual([
      "analytical-beginner",
      "cross-domain-connector",
      "improv-researcher",
      "new-teacher",
      "reflective-practitioner",
    ]);

    // Every journey has the 2 halves this module joins: a curriculum and a
    // recommendation. A persona that loses either stops being measurable.
    for (const journey of journeys) {
      expect(journey.recommendation, journey.id).not.toBeNull();
      expect(journey.phases.length, `${journey.id} phases`).toBeGreaterThanOrEqual(4);
      expect(journey.name.startsWith("The "), `${journey.id} name`).toBe(true);
    }

    const tokens = journeys.flatMap((j) => j.tokens);
    expect(tokens.length).toBeGreaterThanOrEqual(141);
    const prescribed = journeys.flatMap((j) => j.prescribed);
    expect(prescribed.length).toBeGreaterThanOrEqual(126);
  });

  /**
   * How the Recommended line names its path, asserted rather than assumed.
   *
   * It is prose — "Create a new path `systems-of-improv` targeting `beginner`
   * audience" — so the parse takes the backticked tokens on the line and
   * keeps the ones that are ids of paths which exist. That rule is only safe
   * while it resolves to exactly 1 path per journey, which is the thing worth
   * guarding: the cross-domain connector's line offers 2 candidates ("Refine
   * `physics-of-connection` … OR create a new path `improv-physics-for-life`")
   * and only the first has ever been built. If `improv-physics-for-life` is
   * built one day this fails, and the author picks which path that persona
   * owns rather than the parse picking silently.
   */
  it("resolves each Recommended line to exactly 1 path that exists", async () => {
    const journeys = await getPersonaJourneys();
    for (const journey of journeys) {
      expect(journey.recommendedPathIds, `${journey.id} names 1 built path`).toHaveLength(1);
    }
  });

  /**
   * The pairings and the audience match, as hard assertions: both hold in
   * full on 2026-09-22 and there is no debt to write down. A path renamed, or
   * one whose `audience` list stops carrying what its persona asked for,
   * fails here.
   */
  it("pairs all 5 personas with a path that carries their audience", async () => {
    const pairings = await getPersonaPairings();
    expect(pairings.length).toBe(5);

    expect(pairings.map((p) => [p.personaId, p.pathId])).toEqual([
      ["analytical-beginner", "systems-of-improv"],
      ["cross-domain-connector", "physics-of-connection"],
      ["improv-researcher", "reference-guide"],
      ["new-teacher", "teaching-improv"],
      ["reflective-practitioner", "self-coaching-toolkit"],
    ]);

    expect(pairings.map((p) => [p.personaId, p.audience])).toEqual([
      ["analytical-beginner", "beginner"],
      ["cross-domain-connector", "beginner"],
      ["improv-researcher", "advanced"],
      ["new-teacher", "teacher"],
      ["reflective-practitioner", "intermediate"],
    ]);

    expect(pairings.filter((p) => p.audienceMatches).map((p) => p.personaId)).toEqual(
      pairings.map((p) => p.personaId),
    );
  });

  /**
   * Every token the Journey Maps put in backticks is accounted for.
   *
   * The personas backtick 3 different kinds of thing — concepts, paths and
   * audiences — and the coverage number depends on telling them apart, so the
   * parse classifies each and this asserts nothing falls through. On
   * 2026-09-22: 126 atoms, 9 path ids, 5 audience names and 1 unresolved,
   * `improv-physics-for-life`, which is a path the cross-domain connector
   * proposed as an alternative and nobody built.
   *
   * The 126 is a floor that may rise and must not fall silently: a concept
   * renamed in the graph without the persona following it would land in
   * `unresolved` and fail the ceiling below.
   */
  it("resolves every backticked id to an atom, a path, or an audience", async () => {
    const [journeys, atoms, paths] = await Promise.all([
      getPersonaJourneys(),
      loadAtoms(),
      loadPaths(),
    ]);
    // The populations, so a broken loader cannot resolve nothing and pass.
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    expect(paths.length).toBeGreaterThanOrEqual(11);

    const atomIds = new Set(atoms.map((atom) => atom.frontmatter.id));
    const tokens = journeys.flatMap((j) => j.tokens);

    const byKind = (kind: string) => tokens.filter((t) => t.kind === kind);
    expect(byKind("atom").length).toBeGreaterThanOrEqual(126);
    expect(byKind("path").length).toBeGreaterThanOrEqual(9);
    expect(byKind("audience").length).toBeGreaterThanOrEqual(5);

    // 1 on 2026-09-22, and the list is named so a second one is visible
    // rather than folded into a count.
    expect(byKind("unresolved").map((t) => t.id)).toEqual(["improv-physics-for-life"]);

    // And the concepts really are concepts: the prescribed list is what every
    // coverage figure below is drawn from.
    const prescribed = journeys.flatMap((j) => j.prescribed);
    expect(prescribed.filter((id) => !atomIds.has(id))).toEqual([]);
    expect(prescribed.length).toBeGreaterThanOrEqual(126);
  });

  /**
   * The coverage, as a dated floor.
   *
   * 80 of 126 concept slots on 2026-09-22 — 18/28, 15/27, 14/20, 17/26 and
   * 16/25 — so the floor sits just under at 78. Debt: 46 slots a persona
   * asked for that the path built from that persona does not teach.
   *
   * Entry 347 reads this as 80 of 141 (57%) because it counted every
   * backticked token, 15 of which name a path or an audience rather than a
   * concept. Same numerator, honest denominator: 63%.
   */
  it("records how much of each journey its path teaches", async () => {
    const pairings = await getPersonaPairings();
    const coverage = await getPersonaCoverage();

    // The population on both sides of the join.
    expect(coverage.prescribed).toBeGreaterThanOrEqual(126);
    expect(pairings.every((p) => p.prescribed.length >= 20)).toBe(true);

    // 80 taught; the floor sits just under. Debt: 46 untaught slots.
    expect(coverage.taught).toBeGreaterThanOrEqual(78);

    // No path teaches its persona's whole journey, and none teaches under
    // half: 14 of 20 is the best and 15 of 27 the worst on 2026-09-22. A
    // floor per persona, so a single path that stops teaching what it was
    // built for cannot hide inside the total.
    for (const pairing of pairings) {
      expect(pairing.taught.length, `${pairing.personaId} on ${pairing.pathId}`).toBeGreaterThan(
        pairing.prescribed.length / 2 - 1,
      );
    }
  });

  /**
   * The recurring misses, as a dated reading.
   *
   * Concepts more than 1 journey prescribes that at least 2 of the paths
   * meant to teach them do not. 8 on 2026-09-22, and the list is asserted
   * whole rather than counted, because it is the curriculum finding entry 347
   * asks the author to act on and a changed membership is the news.
   *
   * `docs/seeds.md` carries the same list for a person to read, with the
   * journeys and the paths beside each, because the fix is a lesson on a
   * path — the same remedy entry 342's section already names.
   */
  it("names the concepts more than 1 journey asks for and 2 paths miss", async () => {
    const misses = await getRecurringMisses();

    expect(misses.map((m) => m.id)).toEqual([
      "be-changeable",
      "editing",
      "game-of-the-scene",
      "group-scene",
      "heightening",
      "safety-in-the-room",
      "systemic-collapse-modes",
      "systemic-health-indicators",
    ]);

    // Guard the guard: each row carries the journeys and the paths, so a
    // reading that lost one side would still be a list of ids.
    for (const miss of misses) {
      expect(miss.journeys.length, miss.id).toBeGreaterThanOrEqual(2);
      expect(miss.missedOn.length, miss.id).toBeGreaterThanOrEqual(2);
      expect(miss.title.length, miss.id).toBeGreaterThan(0);
    }

    // The strict reading: 2 concepts that no path their journeys named
    // teaches at all. `group-scene` is the harder one — no path on the site
    // composes it, so there is no lesson to borrow.
    const nowhere = misses.filter((m) => m.taughtOn.length === 0);
    expect(nowhere.map((m) => m.id)).toEqual(["group-scene", "heightening"]);
    expect(misses.find((m) => m.id === "group-scene")?.elsewhere).toEqual([]);

    // 3 of the 5 journeys ask for `be-changeable` and 2 of their paths skip
    // it; entry 347 reads it as taught on none, which
    // `self-coaching-toolkit` disproves. The principles are the recurring
    // miss the entry is right about — 4 of the 8 rows are a principle, a
    // pedagogy or a framework rather than a technique.
    const changeable = misses.find((m) => m.id === "be-changeable");
    expect(changeable?.journeys.length).toBe(3);
    expect(changeable?.taughtOn).toEqual(["self-coaching-toolkit"]);
  });

  /**
   * The line the path page says, and the paths that get none.
   *
   * 5 of the 11 paths were specified by a persona, so 6 say nothing — which
   * is the point of returning null rather than a hedge. The line names the
   * persona as the persona's own heading names it and links nothing, because
   * `content/personas/` is not published.
   */
  it("gives 5 of the 11 paths a line about the reader it was written for", async () => {
    const paths = await loadPaths();
    expect(paths.length).toBeGreaterThanOrEqual(11);

    const notes = await Promise.all(
      paths.map(async (p) => [p.frontmatter.id, await personaNoteForPath(p.frontmatter.id)]),
    );
    const withNote = notes.filter(([, note]) => note !== null);
    expect(withNote.map(([id]) => id)).toEqual([
      "physics-of-connection",
      "reference-guide",
      "self-coaching-toolkit",
      "systems-of-improv",
      "teaching-improv",
    ]);

    expect(await personaNoteForPath("systems-of-improv")).toContain("the Analytical Beginner");
    // A path nobody specified says nothing at all.
    expect(await personaNoteForPath("beginner-foundations")).toBeNull();
  });
});
