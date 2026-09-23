import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadAtoms, loadThreads } from "../content";
import {
  getAtomWhatsNext,
  getRelatedConcepts,
  isConcreteType,
  RELATED_CONCEPTS_LIMIT,
} from "../whats-next";

/**
 * Every atom page ends with a proposal.
 *
 * The what's-next card had six variants and each was computed from a thread,
 * a path or a guide. An atom in none of those got no card: 68 of 205 pages,
 * all 32 references and 36 concepts — the short forms and warm-ups the games
 * hub routes readers to, and the two diagnostic frameworks the diagnosis hub
 * omits — ended with a sidebar and nothing that said "next". The router had
 * no default, and the silence was typed: references are excluded from
 * lessons by design, the other 36 by accident of cohort. `related-concepts`
 * is the default. This asserts the router now answers for every atom, and
 * says which atoms it would fall silent on if it ever stops.
 */
describe("what's next on atom pages", () => {
  /**
   * Every variant the component can render is one some page constructs. The
   * union had seven members from April; two of them, `next-thread` and
   * `bridge-funnel`, lost their producers in the August router changes and
   * kept their render code and labels for a month (tracker entry 250). Five
   * remain: three from the atom router in whats-next.ts, `path-complete` from
   * the path page, `bridge-primary-cta` from the guide page. A sixth member
   * here means a new producer in src/app — or another orphan.
   */
  it("renders exactly the five variants a page constructs", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src", "components", "WhatsNext.tsx"),
      "utf-8",
    );
    const union = source.split("type WhatsNextVariant =")[1]?.split(";\n\n")[0] ?? "";
    expect(union).not.toBe("");
    const members = [...union.matchAll(/variant: "([a-z-]+)"/g)].map((m) => m[1]);
    expect(members.sort()).toEqual([
      "back-to-thread",
      "bridge-primary-cta",
      "next-atom",
      "path-complete",
      "related-concepts",
    ]);
    for (const dead of ["next-thread", "bridge-funnel"]) {
      expect(source, dead).not.toContain(`"${dead}"`);
    }
  });

  it("yields a card for every atom", async () => {
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);

    const silent: string[] = [];
    let fallbacks = 0;
    for (const atom of atoms) {
      const next = await getAtomWhatsNext(atom.frontmatter.id);
      if (!next) silent.push(atom.frontmatter.id);
      else if (next.variant === "related-concepts") fallbacks += 1;
    }

    expect(silent).toEqual([]);
    // The fallback exists because 68 atoms needed it. If that number reaches
    // zero the variant is dead code and this floor should come out with it.
    expect(fallbacks).toBeGreaterThan(0);
  });

  it("uses the fallback only where no lesson composes the atom", async () => {
    const [atoms, threads] = await Promise.all([loadAtoms(), loadThreads()]);
    const inLesson = new Set(threads.flatMap((t) => t.frontmatter.atoms ?? []));

    for (const atom of atoms) {
      const next = await getAtomWhatsNext(atom.frontmatter.id);
      const expected = inLesson.has(atom.frontmatter.id) ? "lesson" : "related-concepts";
      const actual = next?.variant === "related-concepts" ? "related-concepts" : "lesson";
      expect(`${atom.frontmatter.id}: ${actual}`).toBe(`${atom.frontmatter.id}: ${expected}`);
    }
  });

  it("offers up to three neighbours, never the atom itself, each with a hint", async () => {
    const atoms = await loadAtoms();
    const untaught = (await Promise.all(atoms.map((a) => getAtomWhatsNext(a.frontmatter.id))))
      .map((next, i) => ({ id: atoms[i].frontmatter.id, next }))
      .filter((x) => x.next?.variant === "related-concepts");
    expect(untaught.length).toBeGreaterThan(0);

    for (const { id, next } of untaught) {
      if (next?.variant !== "related-concepts") continue;
      expect(next.items.length).toBeGreaterThan(0);
      expect(next.items.length).toBeLessThanOrEqual(RELATED_CONCEPTS_LIMIT);
      expect(next.items.map((i) => i.id)).not.toContain(id);
      expect(new Set(next.items.map((i) => i.id)).size).toBe(next.items.length);
      for (const item of next.items) {
        expect(item.href.startsWith("/")).toBe(true);
        expect(item.hint.length).toBeGreaterThan(0);
      }
    }
  });

  /**
   * The point of the fallback is to let a reader rejoin a path, so a neighbour
   * that sits in a lesson outranks one that does not. Checked as an ordering
   * property over every untaught atom rather than on one hand-picked example.
   * For a reference the first cut is "cites this work", and since 2026-09-22
   * the relation's direction ranks above lesson membership on every page
   * (tracker entry 292; whats-next-direction.test.ts), so the property holds
   * within each (citation, tier) group rather than across the whole list.
   * Within the forward tier a concrete target — a technique, drill, format
   * or pedagogy — ranks before an abstract one since the same day (entry
   * 314; enables-direction.test.ts), so there the group splits once more:
   * specificity's forward tier puts bus-stop, a format in no lesson, above
   * offers, a definition in one, and that is the rule, not a misordering.
   */
  it("ranks neighbours that sit in a lesson ahead of those that do not", async () => {
    const [atoms, threads] = await Promise.all([loadAtoms(), loadThreads()]);
    const inLesson = new Set(threads.flatMap((t) => t.frontmatter.atoms ?? []));
    const typeOf = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter.type]));
    const untaught = atoms.filter((a) => !inLesson.has(a.frontmatter.id));
    expect(untaught.length).toBeGreaterThan(30);

    const misordered: string[] = [];
    let rejoinable = 0;
    for (const atom of untaught) {
      const items = await getRelatedConcepts(atom.frontmatter.id, 50);
      const tiers = new Map<string, boolean[]>();
      for (const item of items) {
        const cites = atom.frontmatter.type === "reference" && item.hint === "Cites this work";
        const concrete = item.tier === "forward" && isConcreteType(typeOf.get(item.id) ?? "");
        const tier = `${cites}/${item.tier}/${concrete}`;
        tiers.set(tier, [...(tiers.get(tier) ?? []), item.inLesson]);
      }
      for (const [tier, flags] of tiers) {
        const firstOut = flags.indexOf(false);
        const lastIn = flags.lastIndexOf(true);
        if (firstOut !== -1 && lastIn > firstOut) {
          misordered.push(`${atom.frontmatter.id} (${tier})`);
        }
      }
      if (items.slice(0, RELATED_CONCEPTS_LIMIT).some((i) => i.inLesson)) rejoinable += 1;
    }
    expect(misordered).toEqual([]);
    // Most untaught atoms can hand the reader straight back to a lesson.
    expect(rejoinable / untaught.length).toBeGreaterThan(0.9);
  });

  it("sends a reference to the concepts that cite it", async () => {
    const atoms = await loadAtoms();
    const references = atoms.filter((a) => a.frontmatter.type === "reference");
    expect(references.length).toBeGreaterThanOrEqual(30);

    const cited = new Set<string>();
    for (const a of atoms) {
      if (a.frontmatter.type === "reference") continue;
      for (const link of a.frontmatter.links ?? []) cited.add(link.id);
    }

    for (const ref of references) {
      if (!cited.has(ref.frontmatter.id)) continue;
      const next = await getAtomWhatsNext(ref.frontmatter.id);
      expect(next?.variant).toBe("related-concepts");
      if (next?.variant !== "related-concepts") continue;
      expect(`${ref.frontmatter.id}: ${next.items[0].hint}`).toBe(
        `${ref.frontmatter.id}: Cites this work`,
      );
    }
  });
});
