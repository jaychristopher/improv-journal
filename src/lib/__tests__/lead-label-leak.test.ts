import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * No structured-data description begins with the page's own bold label.
 *
 * Concept atoms open with a bold label — "**Alias:**" on the nine principles,
 * "**Trains:**" on 24 exercises — that belongs on the page and not in a
 * description. The markdown extractor had dropped it since stripLeadLabel, but
 * the two HTML extractors had not, so every principle page told a crawler its
 * definition was "Alias: Act before you're ready" and 24 exercises led with
 * "Trains:". The meta tag on the same pages was already clean, which is what
 * made it easy to miss.
 *
 * The two labels need opposite handling and that is the part worth guarding.
 * "Alias:" glosses the same concept, so the sentence after it is kept.
 * "Trains: Be Changeable" and "Technique for: Be Simple" name a *different*
 * concept, so keeping the sentence would define the wrong thing — Emotion
 * Switch was described as Be Changeable. Those paragraphs are skipped instead.
 */
describe("lead labels", () => {
  it.runIf(built)("never open a structured-data description", () => {
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
        const html = fs.readFileSync(full, "utf8");
        for (const match of html.matchAll(/"description":"([^"]{0,40})/g)) {
          checked += 1;
          if (/^(Alias|Trains|[A-Za-z ]+ for):/.test(match[1])) {
            offenders.push(`${full.replace(APP, "")}: "${match[1]}…"`);
          }
        }
      }
    };
    walk(APP);

    // A changed extractor would otherwise make this pass on nothing.
    expect(checked).toBeGreaterThan(300);
    expect([...new Set(offenders)]).toEqual([]);
  });
});
