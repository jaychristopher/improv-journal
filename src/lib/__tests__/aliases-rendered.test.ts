import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getAtomUrl, loadAtoms } from "../content";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * An alias is shown on the hub that lists the concept, not only on its page.
 *
 * alternateName in the concept's JSON-LD serves a crawler. A reader scanning a
 * hub for a word the hub never prints is served by nothing, which is the whole
 * reason the alias exists — somebody who says "object work" needs to find the
 * page called Space Work.
 *
 * This is guarded because the listings do not share markup and I missed one
 * three times running. The glossary renders a description list, TagFilter
 * renders cards, and the diagnosis hub renders three blocks of its own; aliases
 * were wired into the first two on separate occasions and diagnosis was skipped
 * both times. AlsoCalled now holds the markup, and this holds the coverage.
 */
describe("aliases on hubs", () => {
  it.runIf(built)("appear on the hub listing each concept", async () => {
    const atoms = await loadAtoms();
    const withAliases = atoms.filter((a) => a.frontmatter.aliases?.length);
    expect(withAliases.length).toBeGreaterThan(0);

    const missing: string[] = [];
    for (const atom of withAliases) {
      const url = getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type });
      // The hub is the concept's own path with the last segment removed.
      const hub = url.slice(0, url.lastIndexOf("/"));
      const file = path.join(APP, `${hub.slice(1)}.html`);
      if (!fs.existsSync(file)) {
        missing.push(`${atom.frontmatter.id}: no hub built at ${hub}`);
        continue;
      }

      const html = fs.readFileSync(file, "utf-8");
      for (const alias of atom.frontmatter.aliases ?? []) {
        // React splits interpolated text with comment nodes, so match loosely.
        const shown = html.replace(/<!-- -->/g, "").includes(alias);
        if (!shown) missing.push(`${atom.frontmatter.id}: "${alias}" not shown on ${hub}`);
      }
    }

    expect(missing).toEqual([]);
  });
});
