import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/** The hub list the llms.txt generator holds, read from the script itself. */
function hubs(): { url: string; label: string }[] {
  const src = fs.readFileSync(path.join(process.cwd(), "scripts", "build-llms-txt.mjs"), "utf-8");
  const block = /const HUBS = \[[\s\S]*?\n\];/.exec(src);
  if (!block) throw new Error("HUBS not found in build-llms-txt.mjs");
  // Entries are written across one or several lines, so match the pair rather
  // than the line: a quoted path followed by the next quoted string.
  return [...block[0].matchAll(/"(\/[^"]*)",\s*"([^"]+)"/g)].map((m) => ({
    url: m[1],
    label: m[2],
  }));
}

function pageTitle(url: string): string | null {
  const file = path.join(APP, (url === "/" ? "/index" : url) + ".html");
  if (!fs.existsSync(file)) return null;
  const html = fs.readFileSync(file, "utf8");
  return ((html.match(/<title>([^<]*)/) || [])[1] || "")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .split("|")[0]
    .trim();
}

/**
 * llms.txt describes the site as it currently is.
 *
 * The generator runs as `prebuild`, so it cannot read titles out of .next —
 * that directory holds the previous build while it runs. The hub labels are
 * therefore written by hand, and by the time this was checked eight of the
 * thirteen entries named a page something the page no longer called itself:
 * "Listen" had become "Improv Podcasts", "Reading List" had become "Improv
 * Reading List", "Guides" had become "Improv Guides". Five substantial hubs
 * were missing altogether, including the two the site declares keywords for.
 *
 * Nothing surfaced any of it. llms.txt is not rendered, not linked from the
 * page, and not covered by the sitemap tests — it is read by crawlers and by
 * nobody else, so a name going stale there produces no symptom at all.
 *
 * The rule is prefix rather than equality, deliberately. A shorter label is
 * often the better entry: "Improv Glossary" for a page called "Improv
 * Glossary: Vocabulary and Terms Explained" says the same thing without the
 * tail. What it may not do is name the page something it does not call itself.
 */
describe("llms.txt hub list", () => {
  it.runIf(built)("names each hub the way the page does", () => {
    const list = hubs();
    expect(list.length).toBeGreaterThan(15);

    const wrong: string[] = [];
    for (const { url, label } of list) {
      const title = pageTitle(url);
      if (title === null) {
        wrong.push(`${url} is listed but the build produces no such page`);
        continue;
      }
      if (!title.toLowerCase().startsWith(label.toLowerCase())) {
        wrong.push(`${url} listed as "${label}", page says "${title}"`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it.runIf(built)("covers the hubs that declare keywords", () => {
    const listed = new Set(hubs().map((h) => h.url));
    // route-keywords.ts names these as owning search terms; a file that tells
    // a crawler what the site holds should not omit them.
    for (const url of ["/improv-games", "/practice/exercises", "/library"]) {
      expect(listed.has(url), `${url} missing from the llms.txt hub list`).toBe(true);
    }
  });
});
