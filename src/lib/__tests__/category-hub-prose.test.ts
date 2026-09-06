import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * The index pages, and the marker that separates their prose from their list.
 *
 * `/practice/exercises` is deliberately absent. It is one sentence over a list
 * on purpose, because it hands the guide treatment to /improv-games in that
 * sentence, and /improv-games carries several thousand words and seven
 * questions. A page that defers explicitly is not the failure this is looking
 * for; a page that defers to nothing is.
 */
const HUBS: { url: string; sections: number; words: number }[] = [
  { url: "/practice/techniques", sections: 3, words: 1500 },
  { url: "/practice/formats", sections: 3, words: 2000 },
  // Three grouping labels — Frameworks, Antipatterns, Patterns — meant the
  // section count alone said this page was fine while it carried one sentence
  // of its own. Its floor is the word count, and the section floor is set above
  // the labels so the argument has to survive too.
  { url: "/how-it-works/diagnosis", sections: 5, words: 900 },
  // 278 words under two headings, for three shows and 139 episodes — the
  // thinnest hub here and the primary page for its term. Floors sit under the
  // 876 words and 4 h2 it carries now. The section floor matters more than the
  // word one: two of those headings are "Featured" and "Three Shows", which
  // label lists rather than saying anything, so a page that lost the argument
  // and kept the lists would still clear a word count.
  { url: "/listen", sections: 4, words: 800 },
];

function visibleWords(html: string): number {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
}

/**
 * A category index says something before it lists.
 *
 * /practice/techniques carried one sentence — nineteen words — above an index
 * of every technique on the site, while the sibling categories ran to thousands.
 * It is the largest concept category here, and the page for its term had no
 * argument on it at all, only names.
 *
 * The check counts sections rather than words, because words alone said the
 * page was healthy: it was already 1,273 of them and almost every one was an
 * entry in the list. One h2 and a long index is the shape being caught here.
 *
 * Order-independent on purpose. /practice/formats puts its list first and its
 * argument after, which a check for prose above the list would have failed for
 * no reason — the first version of this did exactly that.
 */
describe("category hubs", () => {
  it.runIf(built)("argues something as well as listing", () => {
    const thin: string[] = [];

    for (const hub of HUBS) {
      const file = path.join(APP, ...hub.url.split("/").filter(Boolean)) + ".html";
      expect(fs.existsSync(file), `${hub.url} is not built`).toBe(true);

      const body = fs.readFileSync(file, "utf-8").split("</header>").pop()!.split("<footer")[0];
      const headings = [...body.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].length;
      const words = visibleWords(body);

      if (headings < hub.sections) thin.push(`${hub.url}: only ${headings} h2 sections`);
      if (words < hub.words) thin.push(`${hub.url}: only ${words} words`);
    }

    expect(thin).toEqual([]);
  });
});
