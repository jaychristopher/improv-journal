import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
const LIBRARY = path.join(APP, "library");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * A library entry's two relation blocks say different things.
 *
 * They hold disjoint sets — one is what the entry names in its own frontmatter,
 * the other is every concept that names the entry — but they were headed
 * "Concepts this work informs" and "Ideas shaped by this work", which are the
 * same sentence in opposite voice. On the 19 entries that render both, a reader
 * met two identical-sounding headings over different lists.
 *
 * What actually separates them is which side declared the link, and no reader
 * can infer that. "Cites" is a relation people already have, so the second says
 * that instead.
 *
 * Asserts the sets stay disjoint as well as the wording, because the wording is
 * only honest while they are: if a concept could appear under both, "cites"
 * would be describing a subset of the section above it.
 */
describe("library relation blocks", () => {
  it.runIf(built)("do not repeat each other, in words or in links", () => {
    const files = fs.readdirSync(LIBRARY).filter((f) => f.endsWith(".html"));
    expect(files.length).toBeGreaterThanOrEqual(25);

    const synonym: string[] = [];
    const overlapping: string[] = [];
    let withBoth = 0;

    for (const file of files) {
      const html = fs
        .readFileSync(path.join(LIBRARY, file), "utf-8")
        .replace(/<script[\s\S]*?<\/script>/g, "");
      const slug = file.replace(/\.html$/, "");

      if (html.includes("Ideas shaped by this work")) synonym.push(slug);
      if (!html.includes("Concepts this work informs") || !html.includes("Pages that cite it")) {
        continue;
      }
      withBoth += 1;

      const links = (marker: string) => {
        const start = html.indexOf(marker);
        const end = html.indexOf("<h2", start + marker.length);
        const block = html.slice(start, end < 0 ? html.length : end);
        return new Set([...block.matchAll(/href="(\/[^"?#]*)"/g)].map((m) => m[1]));
      };

      const informs = links("Concepts this work informs");
      const cites = links("Pages that cite it");
      if ([...cites].some((href) => informs.has(href))) overlapping.push(slug);
    }

    // 19 of 32 entries render both, which is where the confusion lived.
    expect(withBoth).toBeGreaterThanOrEqual(15);
    expect(synonym).toEqual([]);
    expect(overlapping).toEqual([]);
  });
});
