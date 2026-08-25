import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * No page ships a description that stops mid-thought.
 *
 * The derived snippet packs whole sentences and falls back to cutting at a
 * word boundary when the opening sentence will not fit inside the limit. That
 * fallback is correct as a last resort and reads badly in a result: five pages
 * were showing an ellipsis mid-clause, including a library entry that ends
 * "at the Neighborhood Playhouse School of…".
 *
 * The remedy is the one atomDescription already documents — a written snippet
 * in frontmatter wins outright — and threads gained the same field so the two
 * of them could use it. This asserts the outcome rather than the mechanism, so
 * either fixing the lead or authoring a snippet satisfies it.
 */
describe("shipped descriptions", () => {
  it.runIf(built)("never stop mid-thought", () => {
    const offenders: string[] = [];
    let checked = 0;

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith(".html")) continue;
        const match = fs
          .readFileSync(full, "utf8")
          .match(/<meta name="description" content="([^"]*)"/);
        if (!match) continue;
        checked += 1;
        const text = match[1].replace(/&#x2026;/g, "…");
        if (/…\s*$/.test(text)) offenders.push(`${full.replace(APP, "")}: …${text.slice(-48)}`);
      }
    };
    walk(APP);

    // A changed selector would otherwise make this pass on nothing.
    expect(checked).toBeGreaterThan(300);
    expect(offenders).toEqual([]);
  });
});
