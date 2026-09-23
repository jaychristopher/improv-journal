import { describe, expect, it } from "vitest";

import { buildLessonsIndex } from "../../app/threads/lessons-index";
import {
  getParentPath,
  getPathProgressionRank,
  getThreadOrderKey,
  getThreadsForAtom,
  loadAtoms,
  loadPaths,
  threadNamesAtom,
} from "../content";
import { lessonAtomOrder } from "../lesson-order";
import { getAtomWhatsNext } from "../whats-next";

/**
 * The lesson an atom page calls its own is the one a reader meets first.
 *
 * `getThreadsForAtom` used to return the composing threads in filesystem
 * order, and `AtomDetail` took the first as the concept's primary lesson —
 * for the context line, the "what's next" card, and the fallback
 * "continue this lesson" link. On the production build the filesystem
 * yields reverse-alphabetical, so for all 28 atoms that two or more lessons
 * compose the primary was the alphabetically *last* one, and `yes-and`,
 * `offers`, `commitment` and `be-present` all said they belonged to
 * *Traditions in Tension* — a seed lesson on the advanced reference shelf —
 * ahead of the validated beginner lesson that also teaches them (tracker
 * entry 110, 2026-09-20). Ordered by the path progression, the primary is
 * the lesson on the earliest path.
 *
 * Path order alone was not enough. Sixty of the 183 lesson-atom
 * compositions are declared in `atoms:` and named nowhere in the lesson's
 * prose, so the earliest lesson could be one whose body says nothing about
 * the concept — `cognitive-bandwidth`'s was *The Empty Stage Problem*,
 * which never mentions it, while *The System Underneath* does (entry 198,
 * 2026-09-21). Among the composing lessons, the ones that name the atom
 * (title, title prefix or alias, inflected as prose inflects them) come
 * first; the progression orders within each group.
 */
describe("an atom's primary lesson", () => {
  const FLAGSHIPS = ["yes-and", "offers", "commitment", "be-present"];

  it("is a beginner lesson, not the disputes lesson, on the flagship atoms", async () => {
    const paths = await loadPaths();
    for (const id of FLAGSHIPS) {
      const threads = await getThreadsForAtom(id);
      expect(threads.length, id).toBeGreaterThanOrEqual(2);
      const primary = threads[0].frontmatter.id;
      expect(primary, id).not.toBe("traditions-in-tension");
      const parent = await getParentPath(primary);
      expect(parent, `${id}: ${primary} is on no path`).not.toBeNull();
      expect(
        parent?.frontmatter.audience,
        `${id}: ${primary} on ${parent?.frontmatter.id}`,
      ).toContain("beginner");
      // The path is a real one, not a stale id.
      expect(paths.some((p) => p.frontmatter.id === parent?.frontmatter.id)).toBe(true);
    }
  });

  it("names the atom whenever any composing lesson does", async () => {
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);

    let multi = 0;
    let decided = 0;
    for (const atom of atoms) {
      const threads = await getThreadsForAtom(atom.frontmatter.id);
      if (threads.length < 2) continue;
      multi += 1;
      const naming = threads.filter((t) => threadNamesAtom(t, atom)).map((t) => t.frontmatter.id);
      if (naming.length === 0) continue;
      decided += 1;
      expect(
        naming,
        `${atom.frontmatter.id}: primary ${threads[0].frontmatter.id} never names it; ${naming.join(", ")} do`,
      ).toContain(threads[0].frontmatter.id);
    }
    expect(multi).toBeGreaterThanOrEqual(25);
    // 25 of the 28 multi-thread atoms are named by at least one of their
    // lessons on 2026-09-21; the other three (irreversibility,
    // one-word-scene, systemic-collapse-modes) fall back to path order.
    expect(decided).toBeGreaterThanOrEqual(20);
  });

  it("ranks no later on the progression than any other lesson that names the atom", async () => {
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);

    let multi = 0;
    for (const atom of atoms) {
      const threads = await getThreadsForAtom(atom.frontmatter.id);
      if (threads.length < 2) continue;
      multi += 1;
      const keys = await Promise.all(threads.map(getThreadOrderKey));
      const named = threads.map((t) => threadNamesAtom(t, atom));
      const primary = keys[0];
      // The comparison is within the primary's group: a lesson that names
      // the atom outranks every lesson that does not, wherever it sits on
      // the progression; among lessons that name it (or, when none does,
      // among all of them) the earliest path wins.
      for (const [i, other] of keys.slice(1).entries()) {
        if (named[i + 1] !== named[0]) {
          expect(named[0], `${atom.frontmatter.id}: an unnamed lesson leads a named one`).toBe(
            true,
          );
          continue;
        }
        expect(
          primary.pathRank,
          `${atom.frontmatter.id}: ${primary.title} (${primary.pathId}) ranks after ${other.title} (${other.pathId})`,
        ).toBeLessThanOrEqual(other.pathRank);
      }
    }
    // 28 multi-thread atoms on 2026-09-21. The guard fails if the filter
    // stops finding them rather than passing on nothing.
    expect(multi).toBeGreaterThanOrEqual(25);
  });

  /**
   * The naming test reads prose the way prose is written. *The Game Beneath
   * the Game* says "you can heighten it" and "each type heightens
   * differently", never "heightening"; a verbatim match sent `heightening`
   * to *Traditions in Tension* instead. Inflections of the last word count.
   */
  it("reads an inflected title as naming the atom", async () => {
    const atoms = await loadAtoms();
    const heightening = atoms.find((a) => a.frontmatter.id === "heightening");
    expect(heightening).toBeDefined();
    expect(threadNamesAtom({ content: "you can heighten it" }, heightening!)).toBe(true);
    expect(threadNamesAtom({ content: "each type heightens differently" }, heightening!)).toBe(
      true,
    );
    expect(threadNamesAtom({ content: "the height of it" }, heightening!)).toBe(false);
    // Aliases count, word-bounded and case-insensitive.
    expect(threadNamesAtom({ content: "by raising the stakes" }, heightening!)).toBe(true);
    expect(threadNamesAtom({ content: "an escalation" }, heightening!)).toBe(true);
    expect(threadNamesAtom({ content: "on the escalator" }, heightening!)).toBe(false);

    const offers = atoms.find((a) => a.frontmatter.id === "offers");
    expect(threadNamesAtom({ content: "she offered a line" }, offers!)).toBe(true);
    expect(threadNamesAtom({ content: "the offer" }, offers!)).toBe(true);
    expect(threadNamesAtom({ content: "coffers of gold" }, offers!)).toBe(false);
  });

  it("reads the progression as a ladder from the beginner path to the reference shelf", () => {
    expect(getPathProgressionRank("beginner-foundations")).toBe(0);
    expect(getPathProgressionRank("physics-of-connection")).toBeLessThan(
      getPathProgressionRank("systems-of-improv"),
    );
    expect(getPathProgressionRank("systems-of-improv")).toBeLessThan(
      getPathProgressionRank("self-coaching-toolkit"),
    );
    expect(getPathProgressionRank("self-coaching-toolkit")).toBeLessThan(
      getPathProgressionRank("advanced-game-and-character"),
    );
    // The side entrances rank by where they join, not as first steps.
    expect(getPathProgressionRank("improv-for-life")).toBeGreaterThan(
      getPathProgressionRank("beginner-foundations"),
    );
    expect(getPathProgressionRank("improv-for-life")).toBeLessThan(
      getPathProgressionRank("systems-of-improv"),
    );
    // The chain has two ends since tracker entry 247 re-pointed its down
    // edges: the shelf (the teacher's branch) and The Art of Ensemble (the
    // performer's). Both rank last among paths on the chain and tie; an
    // unknown path ranks after them.
    const shelf = getPathProgressionRank("reference-guide");
    expect(shelf).toBe(getPathProgressionRank("the-art-of-ensemble"));
    expect(shelf).toBeGreaterThan(getPathProgressionRank("mastering-the-form"));
    expect(shelf).toBeGreaterThan(getPathProgressionRank("teaching-improv"));
    expect(getPathProgressionRank("not-a-path")).toBeGreaterThan(shelf);
  });

  it("is the lesson the what's-next card continues", async () => {
    for (const id of FLAGSHIPS) {
      const [threads, next] = await Promise.all([getThreadsForAtom(id), getAtomWhatsNext(id)]);
      const primary = threads[0];
      expect(next?.variant, id).not.toBe("related-concepts");
      if (next?.variant === "next-atom") {
        // The card walks the lesson's dependency order, not the authored
        // list (tracker entry 273, 2026-09-22): prerequisite first, authored
        // order as the tiebreak.
        const atoms = await loadAtoms();
        const atomIds = lessonAtomOrder(
          primary,
          new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter])),
        );
        const after = atomIds[atomIds.indexOf(id) + 1];
        expect(next.href, `${id}: next card walks ${primary.frontmatter.id}`).toContain(after);
      } else if (next?.variant === "back-to-thread") {
        expect(next.threadHref).toBe(`/threads/${primary.frontmatter.id}`);
      }
    }
  });

  /**
   * The lessons index groups a lesson under `getParentPath`, and the atom
   * page's context line names the primary lesson's `getParentPath`. Both
   * read the same function, so a lesson never appears under one path on the
   * index and inside another on the concept pages that belong to it.
   */
  it("agrees with the lessons index about which path the lesson belongs to", async () => {
    const [atoms, index] = await Promise.all([loadAtoms(), buildLessonsIndex()]);
    const groupOf = new Map<string, string>();
    for (const group of index.groups) {
      for (const item of group.items) groupOf.set(item.id, group.id);
    }

    let checked = 0;
    for (const atom of atoms) {
      const threads = await getThreadsForAtom(atom.frontmatter.id);
      if (threads.length === 0) continue;
      checked += 1;
      const primary = threads[0].frontmatter.id;
      const parent = await getParentPath(primary);
      if (parent) expect(groupOf.get(primary), primary).toBe(parent.frontmatter.id);
    }
    expect(checked).toBeGreaterThanOrEqual(100);
  });
});
