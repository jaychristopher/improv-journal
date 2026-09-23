import { describe, expect, it } from "vitest";

import { loadAtoms, loadBridges } from "../content";

/**
 * Concepts no guide reaches (tracker entry 289, 2026-09-22).
 *
 * A concept is reached by a guide when the guide declares it in
 * `entry_atoms` or backticks its id in the body — the two ways a guide names
 * a concept, and between them the whole of the search layer's routing into
 * the graph. Measured on 2026-09-22: 173 concepts (every atom that is not a
 * `reference`), 100 reached, 73 reached by none. The unreached are mostly
 * the periphery — 21 of the 24 formats, 23 of the 45 techniques — which is
 * expected; six of them are not: `relationship` (required or cited by 41
 * atoms), `editing` (33), `meaning-is-relational` (25), `callback` (23),
 * `character` (23) and `coherence` (19) are among the graph's best-connected
 * atoms and no guide says any of their names.
 *
 * Both numbers are recorded as debt that may only fall. The fix is
 * authoring — a guide that names a stall problem declaring `callback`, the
 * Harold guide declaring `editing` — so this test is what makes the next
 * declaration a number that moves. It reads declarations and bodies from the
 * markdown, not the rendered links, because the linker declines four of the
 * six on purpose (one-word titles, entry 282) and a test on rendered links
 * would count them unreached even after a guide wrote them in.
 */

/** Concepts reached by no guide on 2026-09-22. May only fall. */
const UNREACHED_CEILING = 73;

/**
 * The six rich-club concepts (in-degree 15 or more) no guide reaches. An id
 * leaves this list when a guide declares or backticks it; none may join it,
 * and a name that is no longer unreached must be removed here or the guard
 * fails, so the list stays a reading of the corpus and not a habit.
 */
const RICH_CLUB_UNREACHED = [
  "relationship",
  "editing",
  "meaning-is-relational",
  "callback",
  "character",
  "coherence",
];
const RICH_CLUB_IN_DEGREE = 15;

async function unreachedConcepts() {
  const [atoms, bridges] = await Promise.all([loadAtoms(), loadBridges()]);
  const concepts = atoms.filter((a) => a.frontmatter.type !== "reference");
  const reached = new Set<string>();
  for (const bridge of bridges) {
    for (const id of bridge.frontmatter.entry_atoms ?? []) reached.add(id);
    for (const m of bridge.content.matchAll(/`([a-z0-9-]+)`/g)) reached.add(m[1]);
  }
  const inDegree = new Map<string, number>();
  for (const atom of atoms) {
    for (const link of atom.frontmatter.links ?? []) {
      inDegree.set(link.id, (inDegree.get(link.id) ?? 0) + 1);
    }
  }
  const unreached = concepts.filter((a) => !reached.has(a.frontmatter.id));
  return { concepts, bridges, reached, unreached, inDegree };
}

describe("concepts no guide reaches", () => {
  it("has the population it measures", async () => {
    const { concepts, bridges, reached } = await unreachedConcepts();
    expect(concepts.length).toBeGreaterThanOrEqual(170);
    expect(bridges.length).toBeGreaterThanOrEqual(70);
    // The reach scan has to find something, or every concept is "unreached"
    // and the ceiling below is met by a broken regex.
    const conceptIds = new Set(concepts.map((a) => a.frontmatter.id));
    const reachedConcepts = [...reached].filter((id) => conceptIds.has(id));
    expect(reachedConcepts.length).toBeGreaterThanOrEqual(90); // 100 on 2026-09-22
    // And both routes contribute: a guide declares an atom it never
    // backticks, and backticks one it never declares.
    let declaredOnly = 0;
    let backtickedOnly = 0;
    for (const bridge of bridges) {
      const declared = new Set(bridge.frontmatter.entry_atoms ?? []);
      const ticked = new Set([...bridge.content.matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]));
      for (const id of declared) if (!ticked.has(id) && conceptIds.has(id)) declaredOnly += 1;
      for (const id of ticked) if (!declared.has(id) && conceptIds.has(id)) backtickedOnly += 1;
    }
    expect(declaredOnly).toBeGreaterThan(0);
    expect(backtickedOnly).toBeGreaterThan(0);
  });

  it("keeps the unreached count at or under the dated ceiling", async () => {
    const { unreached, concepts } = await unreachedConcepts();
    const ids = unreached.map((a) => a.frontmatter.id).sort();
    // 73 of 173 on 2026-09-22 (42%). A new concept no guide names raises
    // this and should fail; the fix is a declaration, not a higher ceiling.
    expect(ids.length, ids.join(", ")).toBeLessThanOrEqual(UNREACHED_CEILING);
    // Guard the guard: the number is not at zero because the scan broke.
    expect(ids.length).toBeGreaterThanOrEqual(1);
    expect(ids.length).toBeLessThan(concepts.length);
  });

  it("names the rich-club concepts no guide reaches, as a list that only shrinks", async () => {
    const { unreached, inDegree } = await unreachedConcepts();
    const unreachedIds = new Set(unreached.map((a) => a.frontmatter.id));
    // Guard the guard: the six are the graph's best-connected atoms, so
    // the in-degree index has to see them as such.
    for (const id of RICH_CLUB_UNREACHED) {
      expect(inDegree.get(id) ?? 0, id).toBeGreaterThanOrEqual(RICH_CLUB_IN_DEGREE);
    }
    expect(inDegree.get("relationship")).toBeGreaterThanOrEqual(35); // 41
    expect(inDegree.get("editing")).toBeGreaterThanOrEqual(28); // 33

    // Still unreached: every name on the list is still no guide's. A name
    // that a guide now reaches must be struck from the list, so the list is
    // the current reading.
    const reachedSinceRecorded = RICH_CLUB_UNREACHED.filter((id) => !unreachedIds.has(id));
    expect(reachedSinceRecorded, "strike these from RICH_CLUB_UNREACHED").toEqual([]);

    // Shrink-only: no rich-club concept outside the list may be unreached.
    // A new one is a regression in whichever guide stopped naming it, or a
    // new well-connected concept no guide has been written for.
    const richClubUnreached = unreached
      .map((a) => a.frontmatter.id)
      .filter((id) => (inDegree.get(id) ?? 0) >= RICH_CLUB_IN_DEGREE)
      .sort();
    expect(richClubUnreached).toEqual([...RICH_CLUB_UNREACHED].sort());
  });

  it("finds the periphery where the entry found it", async () => {
    const { unreached, concepts } = await unreachedConcepts();
    const byType = (type: string) => ({
      unreached: unreached.filter((a) => a.frontmatter.type === type).length,
      total: concepts.filter((a) => a.frontmatter.type === type).length,
    });
    // Formats are 21 of 24 unreached, techniques 23 of 45 (2026-09-22).
    // Ceilings, like the total; the shares here are what authoring lowers.
    const formats = byType("format");
    expect(formats.total).toBeGreaterThanOrEqual(20);
    expect(formats.unreached).toBeLessThanOrEqual(21);
    const techniques = byType("technique");
    expect(techniques.total).toBeGreaterThanOrEqual(40);
    expect(techniques.unreached).toBeLessThanOrEqual(23);
  });
});
