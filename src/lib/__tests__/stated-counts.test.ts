import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";

/** Content that is actually published. Outlines and personas are working notes. */
const PUBLISHED = ["atoms", "bridges", "threads", "paths", "shows"];

const WORDS: Record<string, number> = {
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function contentFiles() {
  const out: string[] = [];
  for (const dir of PUBLISHED) {
    const full = path.join(process.cwd(), "content", dir);
    if (!fs.existsSync(full)) continue;
    for (const f of fs.readdirSync(full)) {
      if (f.endsWith(".md")) out.push(path.join(full, f));
    }
  }
  return out;
}

describe("counts the content states out loud", () => {
  /**
   * The homepage once advertised "six laws, eight principles" while the site
   * had seven and nine — including directly above a visible list of nine. The
   * tagline is generated now, but prose kept its own hardcoded copies, and
   * three of them drifted again when a ninth principle was added.
   */
  it("never names a total that disagrees with the corpus", async () => {
    const atoms = await loadAtoms();
    const actual: Record<string, number> = {
      laws: atoms.filter((a) => a.frontmatter.type === "law").length,
      principles: atoms.filter((a) => a.frontmatter.type === "principle").length,
    };
    expect(actual.laws).toBeGreaterThan(0);
    expect(actual.principles).toBeGreaterThan(0);

    const wrong: string[] = [];
    for (const file of contentFiles()) {
      const text = fs.readFileSync(file, "utf-8");
      const pattern = /(\w+)\s+(laws|principles)\b/gi;
      for (const m of text.matchAll(pattern)) {
        const raw = m[1].toLowerCase();
        const noun = m[2].toLowerCase();
        const stated = WORDS[raw] ?? (/^\d+$/.test(raw) ? Number(raw) : null);
        if (stated === null) continue;
        // "the first seven principles are individual commands" is a position
        // in an ordering, not a claim about how many exist.
        const before = text.slice(Math.max(0, m.index! - 12), m.index!).toLowerCase();
        if (/\bfirst\s+$/.test(before) || /\bother\s+$/.test(before)) continue;
        if (stated !== actual[noun]) {
          wrong.push(`${path.basename(file)}: "${m[0]}" but there are ${actual[noun]}`);
        }
      }
    }

    expect(wrong).toEqual([]);
  });
});
