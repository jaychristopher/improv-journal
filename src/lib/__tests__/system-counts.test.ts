import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";
import { getSystemCounts, numberWord } from "../system-counts";

describe("numberWord", () => {
  it("spells out small numbers and falls back to digits", () => {
    expect(numberWord(6)).toBe("six");
    expect(numberWord(9)).toBe("nine");
    expect(numberWord(42)).toBe("42");
  });
});

describe("system counts", () => {
  it("matches the atoms actually written", async () => {
    const atoms = await loadAtoms();
    const counts = await getSystemCounts();

    expect(counts.laws).toBe(atoms.filter((a) => a.frontmatter.type === "law").length);
    expect(counts.principles).toBe(atoms.filter((a) => a.frontmatter.type === "principle").length);
  });

  it("builds a tagline that reads as prose", async () => {
    const { tagline } = await getSystemCounts();
    expect(tagline).toMatch(/^[A-Z][a-z]+ laws, [a-z0-9]+ principles$/);
  });

  /**
   * The counts used to be hardcoded as "six laws, eight principles" in the
   * site description, the Organization markup, the share card and a page
   * title — and then a seventh law and ninth principle were written. Nothing
   * caught it. This does.
   */
  it("leaves no hardcoded count behind in src", () => {
    const srcDir = path.join(process.cwd(), "src");
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "__tests__") walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name)) continue;
        // The module that derives the counts documents the phrasing it replaced.
        if (entry.name === "system-counts.ts") continue;
        const text = fs.readFileSync(full, "utf-8");
        if (/(six|seven|eight|nine)\s+(laws|principles)/i.test(text)) {
          offenders.push(path.relative(srcDir, full));
        }
        if (/The \d+ Principles/.test(text)) offenders.push(path.relative(srcDir, full));
      }
    };
    walk(srcDir);

    expect([...new Set(offenders)]).toEqual([]);
  });
});
