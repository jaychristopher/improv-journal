import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";

/**
 * How much of the graph the ear gets.
 *
 * A concept page shows its `requires` edges in a sidebar; its episode has
 * no sidebar, so the only edge a listener hears is one the hosts say by
 * name. On 2026-09-21 the 205 concept scripts named another concept by
 * title 213 times in 165,000 words, 78 named none, and of the 358
 * `requires` targets whose title is more than one word (the ones an ear
 * could catch — *Status*, *Trust*, *Signal* are excluded, so this is a
 * floor) the scripts said 39, 11% (tracker entry 263).
 *
 * This records that number as a dated floor so the next re-cut of the
 * scripts (entry 256), whose SOP now asks each episode to name its
 * prerequisites in the hosts' own words, moves a figure rather than a
 * feeling. The feed carries the edges as show notes meanwhile
 * (`episode-notes.ts`); this test is about the audio itself.
 *
 * Debt, 2026-09-22: 39 of 358 named (0.1089). The floor sits just under
 * it. Raise the floor when a re-cut lifts the share; do not lower it to
 * pass.
 */

const SCRIPTS = path.join(process.cwd(), "content", "scripts", "atoms");

/** Case-insensitive, whole-phrase: the title as a run of words, not a substring. */
function namesPhrase(script: string, title: string): boolean {
  const escaped = title.toLowerCase().replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`).test(script);
}

describe("concept scripts name their prerequisites", () => {
  it("says at least a tenth of the multi-word requires targets by name", async () => {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));

    let scripts = 0;
    let targets = 0;
    let named = 0;
    const perScript: { id: string; targets: number; named: number }[] = [];

    for (const atom of atoms) {
      const file = path.join(SCRIPTS, `${atom.frontmatter.id}-tts.txt`);
      if (!fs.existsSync(file)) continue;
      scripts += 1;
      const script = fs.readFileSync(file, "utf-8").toLowerCase();
      let mine = 0;
      let hit = 0;
      for (const link of atom.frontmatter.links ?? []) {
        if (link.relation !== "requires") continue;
        const target = byId.get(link.id);
        // Reference atoms are the library, not concepts, and a one-word
        // title is uncatchable by phrase match (see above).
        if (!target || target.type === "reference" || !/\s/.test(target.title)) continue;
        mine += 1;
        if (namesPhrase(script, target.title)) hit += 1;
      }
      targets += mine;
      named += hit;
      perScript.push({ id: atom.frontmatter.id, targets: mine, named: hit });
    }

    // Guard the guard: 205 scripts and 358 catchable targets on 2026-09-22.
    // A moved scripts directory or a changed filename suffix must fail here
    // rather than pass on an empty population.
    expect(scripts).toBeGreaterThanOrEqual(200);
    expect(targets).toBeGreaterThanOrEqual(300);

    const share = named / targets;
    // 39 / 358 = 0.1089 on 2026-09-22. Floor just under; see the header.
    expect(
      share,
      `${named} of ${targets} requires targets named in scripts (${(share * 100).toFixed(1)}%)`,
    ).toBeGreaterThanOrEqual(0.1);

    // The matcher matches: at least one script names at least one target,
    // and no script names more targets than it has.
    expect(perScript.some((s) => s.named > 0)).toBe(true);
    expect(perScript.filter((s) => s.named > s.targets)).toEqual([]);
  });

  it("matches whole phrases, case-insensitively", () => {
    expect(namesPhrase("we practise active listening here", "Active Listening")).toBe(true);
    expect(namesPhrase("the base reality.", "Base Reality")).toBe(true);
    expect(namesPhrase("no rebase reality here", "Base Reality")).toBe(false);
    expect(namesPhrase("active listeners", "Active Listening")).toBe(false);
    expect(
      namesPhrase("yes, and: the first rule of improv", "Yes, And: The First Rule of Improv"),
    ).toBe(true);
  });
});
