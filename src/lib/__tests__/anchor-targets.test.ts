import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * Every same-page anchor lands on an id that page actually has.
 *
 * headings.test already checks this for the contents list. It could not see
 * the case that was broken, because that link was not in a contents list:
 * remark-gfm prefixes footnote ids and remark-html's sanitiser prefixed them
 * again, so markers pointed at `#user-content-fn-1` while the list item was
 * `user-content-user-content-fn-1`. Every footnote on every thread carrying
 * them led nowhere — 34 links across seven pages, invisible to a guard scoped
 * to headings.
 *
 * This is deliberately scoped to the whole build and to any href starting with
 * a hash, so a contents list, a footnote marker, a backref, or a hand-written
 * jump link are all covered by one rule.
 */
describe("same-page anchors", () => {
  it.runIf(built)("land on an id the page has", () => {
    const broken: string[] = [];
    let checked = 0;

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith(".html")) continue;
        const html = fs.readFileSync(full, "utf8");
        const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
        for (const m of html.matchAll(/href="#([^"]+)"/g)) {
          checked += 1;
          if (!ids.has(m[1])) broken.push(`${full.replace(APP, "")} -> #${m[1]}`);
        }
      }
    };
    walk(APP);

    // A changed selector would otherwise make this pass on nothing.
    expect(checked).toBeGreaterThan(1000);
    expect([...new Set(broken)]).toEqual([]);
  });
});
