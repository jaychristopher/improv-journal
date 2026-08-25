import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { AUTHOR_SAMEAS } from "../author-entities";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * A person's name in link text is spelled the way their name is spelled.
 *
 * Twice now. Anchor text for a guide is built from its target keyword, which is
 * written lower case because that is how somebody types it into Google, and the
 * label was produced by raising the first letter. That is correct for the
 * phrases almost every guide targets and wrong for the few that name a person:
 * "del close" became "Del close" in the footer of all 376 pages, and once that
 * was fixed "anne bogart viewpoints" was still rendering as "Anne bogart
 * viewpoints" in the related-guides block of eleven more.
 *
 * Both were fixed at the source rather than per-page, and this stops the third
 * one. It reads the same verified spellings anchor-text.ts uses, so a name
 * added there is covered here without anybody remembering to.
 *
 * Scoped to link text because that is where the generated labels appear. Body
 * prose is written by hand and is not at risk of this.
 */
describe("proper nouns in link text", () => {
  it.runIf(built)("keep their capitalisation", () => {
    const names = Object.keys(AUTHOR_SAMEAS);
    const wrong: string[] = [];
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
        const url = path.relative(APP, full).split(path.sep).join("/");
        for (const m of html.matchAll(/<a [^>]*>([\s\S]{2,90}?)<\/a>/g)) {
          const text = m[1]
            .replace(/<[^>]*>/g, "")
            .replace(/\s+/g, " ")
            .trim();
          if (!text) continue;
          checked += 1;
          for (const name of names) {
            const loose = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
            const found = text.match(loose);
            if (found && found[0] !== name) {
              wrong.push(`${url}: "${text}" — has "${found[0]}", should be "${name}"`);
            }
          }
        }
      }
    };
    walk(APP);

    // A changed selector would otherwise make this pass on nothing.
    expect(checked).toBeGreaterThan(2000);
    expect(names.length).toBeGreaterThan(20);
    expect([...new Set(wrong)]).toEqual([]);
  });
});
