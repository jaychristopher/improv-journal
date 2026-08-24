import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * One work carries one year, everywhere on the site.
 *
 * Google's Project Aristotle was cited as (2012) on psychological-safety,
 * (2015) on collaboration-skills and team-dynamics, and (2016) on
 * team-building-activities. Every one of those years is attached to something
 * real — the study began in 2012, Rozovsky published the findings on re:Work
 * in 2015, and Duhigg's New York Times piece ran in 2016 — which is exactly
 * why it drifted: each writer reached for a different true date and the site
 * ended up dating one study three ways.
 *
 * A reader checking the claim finds a citation that does not agree with itself,
 * on the study the psychological-safety argument rests on.
 */

const CONTENT = path.join(process.cwd(), "content");

/**
 * Authors with more than one cited work, where two years is correct.
 * An entry here is a claim that the works are genuinely different, not a way
 * to silence a disagreement.
 */
const MULTI_WORK = new Set([
  "Kahneman", // Attention and Effort (1973); Thinking, Fast and Slow (2011)
  "Tversky & Kahneman", // Judgment under Uncertainty (1974); The Framing of Decisions (1981)
  "Duhigg", // the NYT Project Aristotle piece (2016); Supercommunicators (2024)
]);

const CITATION =
  /\b((?:Google's\s+)?(?:Project\s+)?[A-Z][A-Za-z'-]+(?:\s+(?:&|and|et)\s+[A-Za-z'-]+\.?)?)\s*\((1[6-9]\d\d|20\d\d)\)/g;

function markdownFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) markdownFiles(full, acc);
    else if (entry.name.endsWith(".md")) acc.push(full);
  }
  return acc;
}

describe("citation years", () => {
  it("agree with themselves across the site", () => {
    const years = new Map<string, Map<string, Set<string>>>();

    for (const file of markdownFiles(CONTENT)) {
      const raw = fs.readFileSync(file, "utf-8");
      const body = raw.split("\n---\n").slice(1).join("\n---\n");
      const slug = path.basename(file, ".md");
      for (const match of body.matchAll(CITATION)) {
        const name = match[1].replace(/^(Google's|Project)\s+/, "").trim();
        if (MULTI_WORK.has(name)) continue;
        if (!years.has(name)) years.set(name, new Map());
        const byYear = years.get(name)!;
        if (!byYear.has(match[2])) byYear.set(match[2], new Set());
        byYear.get(match[2])!.add(slug);
      }
    }

    // An changed frontmatter delimiter would make this pass on nothing.
    expect(years.size).toBeGreaterThan(15);

    const conflicts = [...years.entries()]
      .filter(([, byYear]) => byYear.size > 1)
      .map(
        ([name, byYear]) =>
          `${name}: ${[...byYear.entries()]
            .map(([year, slugs]) => `${year} (${[...slugs].sort().join(", ")})`)
            .join(" vs ")}`,
      );

    expect(conflicts).toEqual([]);
  });
});
