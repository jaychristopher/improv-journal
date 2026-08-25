import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

const decode = (s: string) =>
  s
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#x2026;/g, "…")
    .replace(/\\"/g, '"')
    .trim();

/**
 * A page describes itself the same way in its meta tag and in its own entity.
 *
 * The same value was being computed twice on every content route — once in
 * generateMetadata and once again inside the component that renders the
 * JSON-LD — and the two drifted. 38 pages shipped two different descriptions:
 * mostly a cosmetic split where tag-stripping left "Be Supportive ." with a
 * space before the stop, and be-changeable substantively, where the entity had
 * picked up a sentence from a section halfway down the page.
 *
 * That was the third instance of one shape of bug in a week — a supported
 * field honoured in one place and re-derived in another — so this asserts the
 * outcome rather than any particular wiring. atomPageDescription now defines
 * the value once and both callers use it; if a future route derives its own
 * again, this says so.
 */
describe("page descriptions", () => {
  it.runIf(built)("agree between the meta tag and the page's own entity", () => {
    const mismatched: string[] = [];
    let compared = 0;

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith(".html")) continue;
        const html = fs.readFileSync(full, "utf8");
        const meta = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1];
        if (!meta) continue;
        // headline marks the entity describing this page rather than a work it
        // cites or a collection it lists.
        const at = html.indexOf('"headline"');
        if (at === -1) continue;
        const entity = html.slice(at, at + 1200).match(/"description":"((?:[^"\\]|\\.)*)"/);
        if (!entity) continue;
        compared += 1;
        if (decode(meta) !== decode(entity[1])) {
          mismatched.push(
            `${full.replace(APP, "")}\n     meta: ${decode(meta).slice(0, 70)}\n     ent : ${decode(entity[1]).slice(0, 70)}`,
          );
        }
      }
    };
    walk(APP);

    // A changed selector would otherwise make this pass on nothing.
    expect(compared).toBeGreaterThan(250);
    expect(mismatched).toEqual([]);
  });
});
