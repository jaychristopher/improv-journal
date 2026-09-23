import { describe, expect, it } from "vitest";

import { getAtomsForTradition, getTraditionNames, loadAtoms } from "../content";
import {
  sortDisagreements,
  splitTraditionMembers,
  TRADITION_REF_IDS,
  traditionsNamedBy,
} from "../tradition-disagreements";

/**
 * The tradition pages' "Where this tradition pushes back" section used to
 * take every counter-position on every member atom, never reading the label
 * that names the objector, so the UCB page showed fourteen objections by
 * Napier, Johnstone and TJ & Dave as its own and none of them as objections
 * to it (tracker entry 191, 2026-09-21).
 */
describe("tradition disagreements", () => {
  it("reads the objector out of the label", () => {
    expect(traditionsNamedBy("Napier")).toEqual(["annoyance"]);
    expect(traditionsNamedBy("Johnstone/Annoyance")).toEqual(["johnstone", "annoyance"]);
    expect(traditionsNamedBy("game tradition")).toEqual(["ucb"]);
    expect(traditionsNamedBy("Meisner tradition")).toEqual([]);
    expect(traditionsNamedBy(undefined)).toEqual([]);
  });

  it("never files another tradition's labelled objection as this one's pushback", async () => {
    const all = await loadAtoms();
    expect(all.length).toBeGreaterThanOrEqual(200);
    let labelled = 0;
    for (const tradition of getTraditionNames()) {
      const members = await getAtomsForTradition(tradition);
      const { pushback, objections } = sortDisagreements(tradition, all, members);
      for (const d of pushback) {
        const named = traditionsNamedBy(d.label);
        if (named.length > 0) {
          labelled += 1;
          expect(named, `${tradition}: ${d.label}`).toContain(tradition);
        }
      }
      for (const d of objections) {
        expect(traditionsNamedBy(d.label), `${tradition}: ${d.label}`).not.toContain(tradition);
      }
    }
    // The corpus carries labelled counter-positions; the guard fails if the
    // label parser stops finding them.
    expect(labelled).toBeGreaterThanOrEqual(15);
  });

  it("gives the Annoyance page Napier's objections and the UCB page objections to its concepts", async () => {
    const all = await loadAtoms();
    const annoyance = sortDisagreements("annoyance", all, await getAtomsForTradition("annoyance"));
    expect(
      annoyance.pushback.filter((d) => /napier/i.test(d.label ?? "")).length,
    ).toBeGreaterThanOrEqual(8);
    // The page hands sortDisagreements the informed members only, so an
    // objection on an atom that merely contrasts UCB is not "on its concepts".
    const { informed } = splitTraditionMembers("ucb", await getAtomsForTradition("ucb"));
    const ucb = sortDisagreements("ucb", all, informed);
    expect(ucb.objections.length).toBeGreaterThanOrEqual(5);
  });
});

/**
 * The tradition pages listed every atom with any link to a tradition's
 * references as a concept "citing" it. On the Annoyance page ten of 36 were
 * linked only by `contrasts` — discovery, heightening, premise and the rest
 * of the UCB game apparatus, shown as Annoyance's concepts on the page that
 * quotes Napier objecting to them (tracker entry 58, 2026-09-21). The split
 * keeps them on the page, as the concepts the tradition argues with.
 */
describe("tradition membership by relation", () => {
  it("separates contrast-only atoms from the concepts a tradition informs", async () => {
    for (const tradition of getTraditionNames()) {
      const members = await getAtomsForTradition(tradition);
      expect(members.length, tradition).toBeGreaterThanOrEqual(30);
      const { informed, contested } = splitTraditionMembers(tradition, members);
      expect(informed.length + contested.length).toBe(members.length);
      // Nothing in the informed group is there on opposition alone, and
      // nothing in the contested group has an edge to this tradition that
      // is not opposition.
      const refs = TRADITION_REF_IDS[tradition];
      const edgesTo = (a: (typeof members)[number]) =>
        (a.frontmatter.links ?? []).filter((l) => refs.includes(l.id));
      for (const a of informed) {
        expect(
          edgesTo(a).some((l) => l.relation !== "contrasts"),
          `${tradition}: ${a.frontmatter.id}`,
        ).toBe(true);
      }
      for (const a of contested) {
        const edges = edgesTo(a);
        expect(edges.length, `${tradition}: ${a.frontmatter.id}`).toBeGreaterThan(0);
        expect(
          edges.every((l) => l.relation === "contrasts"),
          `${tradition}: ${a.frontmatter.id}`,
        ).toBe(true);
      }
    }
  });

  it("moves the UCB game apparatus off Annoyance's concept list", async () => {
    const members = await getAtomsForTradition("annoyance");
    const { informed, contested } = splitTraditionMembers("annoyance", members);
    const contestedIds = contested.map((a) => a.frontmatter.id);
    // Guard the guard: the corpus records this dispute on these atoms.
    for (const id of ["discovery", "heightening", "premise", "game-of-the-scene"]) {
      expect(contestedIds).toContain(id);
      expect(informed.map((a) => a.frontmatter.id)).not.toContain(id);
    }
    expect(contested.length).toBeGreaterThanOrEqual(8);
    expect(informed.length).toBeGreaterThanOrEqual(20);
  });
});
