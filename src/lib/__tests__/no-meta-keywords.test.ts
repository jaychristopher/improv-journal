import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * No page ships a meta keywords tag.
 *
 * Google stopped reading it in 2009 and Bing has said it treats the tag as one
 * signal among several for detecting spam, so the range of outcomes runs from
 * nothing to mildly negative. It also published this site's target keyword list
 * on 72 guides, which is strategy handed to anyone reading source.
 *
 * It caused a concrete problem too: a coverage check for whether a page uses
 * the terms it targets found "questions to ask in an interview" present on
 * /questions-to-ask-in-an-interview, when the only occurrence was inside this
 * tag and the phrase appeared nowhere a reader would see it.
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

describe("meta keywords", () => {
  it.runIf(built)("is not emitted on any page", () => {
    const pages = builtPages();
    expect(pages.length).toBeGreaterThan(100);

    const offenders = pages
      .filter((f) => /<meta name="keywords"/i.test(fs.readFileSync(f, "utf-8")))
      .map((f) => path.relative(APP, f));

    expect(offenders).toEqual([]);
  });
});
