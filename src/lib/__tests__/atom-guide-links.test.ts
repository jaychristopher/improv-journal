import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/** Atom type → the route segment its page is published under. */
const DIR: Record<string, string> = {
  definition: "practice/vocabulary",
  technique: "practice/techniques",
  pedagogy: "practice/techniques",
  exercise: "practice/exercises",
  format: "practice/formats",
  law: "how-it-works",
  insight: "how-it-works",
  principle: "how-it-works/principles",
  antipattern: "how-it-works/diagnosis",
  pattern: "how-it-works/diagnosis",
  framework: "how-it-works/diagnosis",
  reference: "library",
};

function bridgeSlugs(): Set<string> {
  return new Set(
    fs
      .readdirSync(path.join(ROOT, "content", "bridges"))
      .filter((f) => f.endsWith(".md"))
      .map((f) => `/${f.replace(/\.md$/, "")}`),
  );
}

/**
 * Atom pages carry links to the guides that mention them.
 *
 * The atom layer is the bulk of the site — 205 pages against 78 guides — and it
 * was overwhelmingly inward-facing: 78% of the links atoms and threads emit
 * went to other atoms and 12% to guides, so the pages that actually target
 * search demand sat at the thin end of the internal graph.
 *
 * The module to fix that already existed. What was missing was its input:
 * getBridgesForAtom read `entry_atoms`, which undercounts because most guide →
 * atom links come from the prose autolinker rather than the markdown. Deriving
 * the reverse index from rendered html took 119 atoms with no guide link down
 * to 68.
 *
 * Asserts presence rather than markup. If the index silently returns nothing —
 * the way the person linker once did — every atom page still renders, still
 * validates, and simply stops linking out. A floor is the only thing that
 * notices, and a changed selector would otherwise make this pass on nothing.
 */
describe("atom pages link the guides that mention them", () => {
  it.runIf(built)("links a documented number of guides from the atom layer", () => {
    const bridges = bridgeSlugs();
    let atoms = 0;
    let withGuide = 0;
    let links = 0;

    for (const file of fs.readdirSync(path.join(ROOT, "content", "atoms"))) {
      if (!file.endsWith(".md")) continue;
      const slug = file.replace(/\.md$/, "");
      const type = /^type:\s*(\w+)/m.exec(
        fs.readFileSync(path.join(ROOT, "content", "atoms", file), "utf-8"),
      )?.[1];
      if (!type || !DIR[type]) continue;

      const page = path.join(APP, ...DIR[type].split("/"), `${slug}.html`);
      if (!fs.existsSync(page)) continue;
      const body = fs.readFileSync(page, "utf-8").split("</header>").pop()!.split("<footer")[0];

      const out = new Set<string>();
      for (const match of body.matchAll(/href="(\/[^"?#]*)"/g)) {
        const url = match[1].length > 1 ? match[1].replace(/\/$/, "") : match[1];
        if (bridges.has(url)) out.add(url);
      }

      atoms += 1;
      links += out.size;
      if (out.size > 0) withGuide += 1;
    }

    // The layer itself, so a collapsed loader fails here rather than passing on nothing.
    expect(atoms).toBeGreaterThanOrEqual(200);
    // 137 of 205 atoms carried a guide link as of 2026-08-27; 68 still carry none.
    expect(withGuide).toBeGreaterThanOrEqual(130);
    // Total atom → guide links, capped per page by ATOM_GUIDE_LIMIT.
    expect(links).toBeGreaterThanOrEqual(700);
  });
});
