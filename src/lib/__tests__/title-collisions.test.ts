import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

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

const slugOf = (file: string) =>
  path
    .relative(APP, file)
    .split(path.sep)
    .join("/")
    .replace(/\.html$/, "")
    .split("/")
    .pop() ?? "";

/**
 * No page may lead with a keyword another page is built to win.
 *
 * /how-it-works/principles was titled "Rules of Improv: 9 Principles That Make
 * Connection Work" on 207 words of listing, while /rules-of-improv is an
 * 1,100-word guide targeting "rules of improv" at 450 a month. Two pages
 * leading with one phrase splits the signal, and the thin one winning is the
 * worse outcome.
 *
 * It survived because the keyword audit only reads bridges, and that page is a
 * route. 39 indexable pages sit outside it, so this checks the built output
 * instead of the content directory and covers all of them.
 *
 * The exception is real rather than a fudge: a page may lead with a shorter
 * keyword when its own primary keyword begins with it, because
 * "how to stop overthinking in a relationship" cannot be titled without
 * containing "how to stop overthinking", and the two hold different parents.
 */
describe("title collisions", () => {
  it.runIf(built)("no page leads with a keyword another page owns", async () => {
    const bridges = await loadBridges();

    const owner = new Map<string, string>();
    const ownPrimary = new Map<string, string>();
    for (const bridge of bridges) {
      const primary = (bridge.frontmatter.target_keywords ?? [])[0]?.keyword;
      if (!primary) continue;
      owner.set(primary.toLowerCase(), bridge.slug);
      ownPrimary.set(bridge.slug, primary.toLowerCase());
    }
    expect(owner.size).toBeGreaterThan(40);

    const collisions: string[] = [];
    for (const file of builtPages()) {
      const slug = slugOf(file);
      const match = /<title>([^<]*)<\/title>/.exec(fs.readFileSync(file, "utf-8"));
      if (!match) continue;
      const title = match[1].toLowerCase().replace(/&amp;/g, "&");

      for (const [keyword, ownedBy] of owner) {
        if (ownedBy === slug) continue;
        // Short keywords collide by coincidence; only guard distinctive ones.
        if (keyword.length <= 12) continue;
        if (!title.startsWith(keyword)) continue;
        // A longer, more specific term necessarily contains the shorter one.
        const mine = ownPrimary.get(slug);
        if (mine && mine.startsWith(keyword)) continue;
        collisions.push(`/${slug} leads with "${keyword}", owned by /${ownedBy}`);
      }
    }

    expect(collisions).toEqual([]);
  });
});
