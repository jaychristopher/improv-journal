import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { MUTUAL_RELATIONS, mutualPairs } from "../../../scripts/seeds.mjs";
import { loadAtoms } from "../content";
import { RELATION_LABELS } from "../relation-labels";

const SEEDS = path.join(process.cwd(), "docs", "seeds.md");

/**
 * The directional relations the authors declare both ways.
 *
 * `extends` and `illustrates` are directed — "A extends B" has an outbound
 * word and an inbound one — and on 2026-09-22 a fifth of their edges ran in
 * both directions: 71 unordered pairs with `extends` declared each way (142
 * of 795 edges) and 70 with `illustrates` (140 of 509), against 6 for
 * `requires` and 4 for `enables`, and against the 39 mutual pairs of
 * `contrasts`, the one relation that is symmetric by design (tracker entry
 * 327). Mutual `extends` is mostly definition–technique and format–format
 * (`accepting-the-offer` ↔ `yes-and`, `scenes-from-a-hat` ↔ `worlds-worst`);
 * mutual `illustrates` is definition–reference, reference–technique and
 * exercise–principle (`be-brave` ↔ `first-line-drill`).
 *
 * The page pays for the second kind: the sidebar shows a mutual pair once,
 * and until the same day the reciprocal rule kept the outbound edge, which
 * on `illustrates` toward a drill wears the weak label ("Example of") while
 * the drill's own edge wears the strong one ("Drills that train this") —
 * see sidebar-relation-dedupe.test.ts for the fix. The direction each pair
 * should run is the author's call, not the code's, so these are ceilings
 * that may only fall, and `docs/seeds.md` lists the pairs for the author
 * (scripts/seeds.mjs, the same function this test reads).
 */
describe("mutual edges", () => {
  const CEILINGS: Record<string, number> = { extends: 71, illustrates: 70 };

  it("holds the mutual extends and illustrates pairs at their 2026-09-22 counts, which may only fall", async () => {
    const atoms = (await loadAtoms()).map((a) => ({ id: a.frontmatter.id, fm: a.frontmatter }));
    // Guard the guard: the corpus, and enough of each relation to be mutual on.
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    expect(MUTUAL_RELATIONS).toEqual(Object.keys(CEILINGS));
    for (const relation of MUTUAL_RELATIONS) {
      expect(RELATION_LABELS[relation as keyof typeof RELATION_LABELS].symmetric).toBe(false);
      const edges = atoms.reduce(
        (n, a) => n + (a.fm.links ?? []).filter((l) => l.relation === relation).length,
        0,
      );
      // 795 extends and 509 illustrates edges on 2026-09-22.
      expect(edges, relation).toBeGreaterThanOrEqual(450);

      const pairs = mutualPairs(atoms, relation);
      const listed = pairs.map(([a, b]) => `${a} ↔ ${b}`).join("\n  ");
      expect(
        pairs.length,
        `${relation}: ${pairs.length} mutual pairs, over the ceiling of ${CEILINGS[relation]}. ` +
          `Each pair declares ${relation} both ways; pick a direction (docs/seeds.md lists them):\n  ${listed}`,
      ).toBeLessThanOrEqual(CEILINGS[relation]);
      // And a floor a good way under, so a parser that finds no pairs fails
      // here instead of passing as an improvement: the 2 relations were
      // mutual on 71 and 70 pairs, and a morning's authoring moves a handful.
      expect(pairs.length, relation).toBeGreaterThanOrEqual(40);

      // Every pair is real: both edges declared, no pair twice, sorted.
      const edgeSet = new Set(
        atoms.flatMap((a) =>
          (a.fm.links ?? []).filter((l) => l.relation === relation).map((l) => `${a.id}>${l.id}`),
        ),
      );
      const keys = pairs.map(([a, b]) => `${a}|${b}`);
      expect(new Set(keys).size).toBe(keys.length);
      for (const [a, b] of pairs) {
        expect(a.localeCompare(b)).toBeLessThan(0);
        expect(edgeSet.has(`${a}>${b}`), `${a} → ${b}`).toBe(true);
        expect(edgeSet.has(`${b}>${a}`), `${b} → ${a}`).toBe(true);
      }
    }
  });

  it("lists the pairs for the author in docs/seeds.md, and the list is current", async () => {
    const atoms = (await loadAtoms()).map((a) => ({ id: a.frontmatter.id, fm: a.frontmatter }));
    expect(fs.existsSync(SEEDS)).toBe(true);
    const doc = fs.readFileSync(SEEDS, "utf-8");
    expect(doc).toContain("## Mutual edges");
    for (const relation of MUTUAL_RELATIONS) {
      const pairs = mutualPairs(atoms, relation);
      // The heading carries the count, so a stale page fails here with the
      // remedy, the way `node scripts/seeds.mjs --check` does.
      const heading = doc.match(new RegExp(`^### ${relation} \\((\\d+) pairs\\)$`, "m"));
      expect(heading, `docs/seeds.md has a "### ${relation} (N pairs)" heading`).not.toBeNull();
      expect(
        Number(heading![1]),
        `docs/seeds.md lists ${heading![1]} mutual ${relation} pairs and the content has ${pairs.length}; run \`node scripts/seeds.mjs\``,
      ).toBe(pairs.length);
      for (const [a, b] of pairs) {
        expect(doc, `${a} ↔ ${b}`).toContain(`- \`${a}\` ↔ \`${b}\` (`);
      }
    }
  });
});
