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
 * The sets were disjoint by construction until 2026-09-22, when the cites block
 * started listing every citing concept (tracker entry 268): 13 works, eleven of
 * them the August science, had rendered no cites block because each of their
 * citing concepts was also one the work names, so the two blocks now overlap on
 * every entry and "cites" is honest about a different thing — who declared the
 * edge is no longer what separates them; the direction of the sentence is. The
 * disjointness assertion is therefore gone; the wording guard and the
 * both-rendered floor remain, and every entry now renders both.
 */
describe("library relation blocks", () => {
  it.runIf(built)("do not repeat each other, in words or in links", () => {
    const files = fs.readdirSync(LIBRARY).filter((f) => f.endsWith(".html"));
    expect(files.length).toBeGreaterThanOrEqual(25);

    const synonym: string[] = [];
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

      // Both blocks must still carry links, or a heading would be sitting over
      // an empty list.
      const links = (marker: string) => {
        const start = html.indexOf(marker);
        const end = html.indexOf("<h2", start + marker.length);
        const block = html.slice(start, end < 0 ? html.length : end);
        return new Set([...block.matchAll(/href="(\/[^"?#]*)"/g)].map((m) => m[1]));
      };
      expect(links("Concepts this work informs").size, slug).toBeGreaterThan(0);
      expect(links("Pages that cite it").size, slug).toBeGreaterThan(0);
    }

    // 19 of 32 entries rendered both when the wording was fixed; 32 of 32 since
    // the cites block lists every citing concept (2026-09-22).
    expect(withBoth).toBeGreaterThanOrEqual(30);
    expect(synonym).toEqual([]);
  });
});
