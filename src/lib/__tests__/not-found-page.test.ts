import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
const PAGE = path.join(APP, "_not-found.html");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * The 404 routes somebody back into the site.
 *
 * It is an entry point — renamed links, stale results, typos — and it was the
 * only one nobody had written. What shipped was the Next.js default, "404: This
 * page could not be found.", and of the 71 visible words on it roughly 65 were
 * the nav menu. A person who wanted something specific got a status code and no
 * way into 363 pages.
 *
 * Measured from `main` rather than after `</header>`, which is the split used
 * elsewhere in this suite. This page has a `header` of its own, so that split
 * silently eats the h1 and the explanation and reports a near-empty page — it
 * did exactly that the first time this was checked.
 *
 * Asserting a floor on routes rather than an exact list: which five hubs are
 * offered is an editorial call and will change, but a 404 with nothing on it is
 * the failure being guarded.
 */
describe("not found page", () => {
  it.runIf(built)("offers a way back rather than a status code", () => {
    expect(fs.existsSync(PAGE)).toBe(true);
    const html = fs.readFileSync(PAGE, "utf-8").replace(/<script[\s\S]*?<\/script>/g, "");

    // The framework default, which is what this replaced.
    expect(html).not.toContain("This page could not be found");

    const main = html.slice(html.indexOf("<main"), html.lastIndexOf("</main>") + 7);
    expect(main.length).toBeGreaterThan(0);

    const words = main
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ").length;
    expect(words).toBeGreaterThanOrEqual(80);

    const routes = new Set([...main.matchAll(/href="(\/[^"?#]*)"/g)].map((m) => m[1]));
    expect(routes.size).toBeGreaterThanOrEqual(5);
    // Every route offered has to be a page that exists, or the 404 sends people
    // to another 404.
    for (const route of routes) {
      const file =
        route === "/"
          ? path.join(APP, "index.html")
          : path.join(APP, ...route.split("/").filter(Boolean)) + ".html";
      expect(fs.existsSync(file), `404 links ${route}, which is not built`).toBe(true);
    }
  });
});
