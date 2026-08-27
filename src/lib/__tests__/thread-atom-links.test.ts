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

function atomUrls(): Map<string, string> {
  const dir = path.join(ROOT, "content", "atoms");
  const map = new Map<string, string>();
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const type = /^type:\s*(\w+)/m.exec(fs.readFileSync(path.join(dir, file), "utf-8"))?.[1];
    if (type && DIR[type]) {
      const slug = file.replace(/\.md$/, "");
      map.set(slug, `/${DIR[type]}/${slug}`);
    }
  }
  return map;
}

/**
 * Threads declare the atoms they weave together. That declaration is what the
 * layer is for — but it lived only in frontmatter, and the prose named the
 * atoms in bold without linking them.
 *
 * The gap was invisible because the prose autolinker does link some of them:
 * a page could look wired up while more than half its declared relationships
 * were text-only. Two things keep an atom out of the autolinker's reach —
 * GENERIC_ONE_WORD_ATOM_TITLES deliberately skips ambiguous single words
 * (`status`, `signal`, `trust`), and multi-word titles only match verbatim.
 * Both are correct; the consequence is that those atoms can only be linked by
 * hand, and in the thread layer nobody had.
 *
 * 105 of 183 declared relationships were unlinked. Wrapping the bold mentions
 * that exactly matched an atom's own title fixed 35 of them, leaving 70 that
 * need new sentences rather than a link — recorded here as a dated debt so the
 * floor is a floor and not a target.
 *
 * Asserts presence, not markup: the failure mode is an absence, and a changed
 * selector would otherwise make this pass on nothing.
 */
describe("threads link the atoms they declare", () => {
  it.runIf(built)("links a documented share of declared thread → atom relationships", () => {
    const urls = atomUrls();
    const dir = path.join(ROOT, "content", "threads");
    let declared = 0;
    let linked = 0;

    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const slug = file.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const atoms = /^atoms:\s*\[([^\]]*)\]/m.exec(raw)?.[1];
      if (!atoms) continue;

      const page = path.join(APP, "threads", `${slug}.html`);
      if (!fs.existsSync(page)) continue;
      const article =
        fs.readFileSync(page, "utf-8").split("<article")[1]?.split("</article>")[0] ?? "";

      for (const id of atoms
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)) {
        const url = urls.get(id);
        if (!url) continue;
        declared += 1;
        if (article.includes(`href="${url}"`)) linked += 1;
      }
    }

    // The declarations exist; this only fails if the prose stops honouring them.
    expect(declared).toBeGreaterThanOrEqual(180);
    // 113 of 183 linked as of 2026-08-27. The remaining 70 need new prose.
    expect(linked).toBeGreaterThanOrEqual(110);
  });
});
