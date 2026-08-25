import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/** The targets PERSON_MAP points at, read from the source so the two stay in step. */
function personTargets(): string[] {
  const src = fs.readFileSync(path.join(process.cwd(), "src", "lib", "content.ts"), "utf-8");
  const block = /const PERSON_MAP[\s\S]*?\n\];/.exec(src);
  if (!block) throw new Error("PERSON_MAP not found in content.ts");
  return [...block[0].matchAll(/"(\/[^"]+)"/g)].map((m) => m[1]);
}

/**
 * The person linker fires, and fires once.
 *
 * It shipped as a no-op the first time. The pattern is assembled with
 * `new RegExp(\`\\b${source}\\b\`)`, and written into a template literal with
 * one backslash `\b` is the backspace character rather than a word boundary —
 * so every pattern compiled cleanly, matched nothing, and the build succeeded
 * with no links added and no error anywhere. Nothing in the suite noticed,
 * because the only symptom was an absence.
 *
 * So this asserts presence rather than correctness of markup: each person's
 * page must be linked from a substantial number of others. Before the linker,
 * Keith Johnstone was named on 80 pages and linked from 5.
 *
 * The second assertion is the runaway check. linkPeople stops after the first
 * match on a page and skips pages that already link the target, so it can
 * contribute at most one. A page can still reach two honestly — ref-spolin
 * links Viola Spolin from its opening pointer and again from the paragraph on
 * Hull House, both written by hand — so two is allowed and three means the
 * per-page flag has stopped working.
 */
describe("person auto-linking", () => {
  it.runIf(built)("links each person from many pages, at most once each", () => {
    const targets = personTargets();
    expect(targets.length).toBeGreaterThan(2);

    const counts = new Map<string, number>(targets.map((t) => [t, 0]));
    const repeated: string[] = [];

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith(".html")) continue;
        const html = fs.readFileSync(full, "utf8");
        const url = path
          .relative(APP, full)
          .split(path.sep)
          .join("/")
          .replace(/\.html$/, "");

        for (const target of targets) {
          // The bare anchor shape. A markdown link renders identically, so
          // this counts authorial links too — which is why the threshold
          // below allows two rather than one.
          const bare = new RegExp(`<a href="${target}">`, "g");
          const n = [...html.matchAll(bare)].length;
          if (n > 0) counts.set(target, (counts.get(target) ?? 0) + 1);
          if (n > 2) repeated.push(`${url} links ${target} ${n} times`);
        }
      }
    };
    walk(APP);

    expect(repeated).toEqual([]);
    // Johnstone alone was named on 80 pages; a floor well under that catches a
    // linker that has stopped firing without pinning the exact content.
    const best = Math.max(...counts.values());
    expect(best).toBeGreaterThan(20);
  });
});
