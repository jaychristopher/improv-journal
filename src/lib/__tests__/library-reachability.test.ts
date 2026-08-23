import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * Every library entry must be linked from somewhere outside /library.
 *
 * These pages are the only type this site reliably ranks — they are exact-entity
 * pages for a named work — so an entry reachable only from the library hub is
 * wasting the one thing that works. Sixteen of them were in that state until the
 * auto-link maps in content.ts were extended, and nothing reported it, because a
 * page that renders correctly and is in the sitemap looks perfectly healthy.
 *
 * A new entry passes this by being citable: put its title in SOURCE_TITLE_MAP,
 * or its author-year form in CITATION_MAP, and write the prose that cites it.
 */
function builtPages(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".html") && !entry.name.startsWith("_")) out.push(full);
    }
  };
  walk(APP);
  return out;
}

describe("library reachability", () => {
  it.runIf(built)("links every reference from at least one page outside /library", () => {
    const refs = fs
      .readdirSync(path.join(process.cwd(), "content", "atoms"))
      .filter((f) => f.startsWith("ref-") && f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, ""));

    expect(refs.length).toBeGreaterThan(20);

    // The hub links its own tiers, so it cannot vouch for an entry's reach.
    const pages = builtPages().filter((f) => !f.includes(`${path.sep}library${path.sep}`));
    const html = pages.map((f) => fs.readFileSync(f, "utf-8"));

    const orphaned = refs.filter((ref) => !html.some((h) => h.includes(`href="/library/${ref}"`)));

    expect(orphaned).toEqual([]);
  });
});
