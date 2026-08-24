import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import sitemap from "../../app/sitemap";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * Nothing in the sitemap tells crawlers not to index it.
 *
 * A noindex URL in a sitemap is a contradiction — the sitemap asks for the page
 * to be indexed and the page then refuses — and Search Console reports it as
 * "Submitted URL marked 'noindex'".
 *
 * The site gets this right in the place it was thought about: under-populated
 * exercise-picker facets are noindex and excluded by getIndexableCombinations.
 * It went wrong where it was not: the sources loop was added on the stated
 * belief that the route was "canonical, indexable", which it never was.
 */
describe("sitemap", () => {
  it.runIf(built)("lists no page that sets noindex", async () => {
    const entries = await sitemap();
    expect(entries.length).toBeGreaterThan(300);

    const offenders: string[] = [];
    for (const entry of entries) {
      const url = new URL(entry.url).pathname.replace(/\/+$/, "") || "/";
      const file = path.join(APP, url === "/" ? "index.html" : `${url.slice(1)}.html`);
      if (!fs.existsSync(file)) continue;

      const html = fs.readFileSync(file, "utf-8");
      if (/<meta name="robots" content="[^"]*noindex/.test(html)) offenders.push(url);
    }

    expect(offenders).toEqual([]);
  });
});
