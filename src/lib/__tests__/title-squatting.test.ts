import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * Pages that open with someone else's head term and are meant to.
 *
 * /practice is the practice hub and "improv practice" is what it is. The term
 * is declared by /how-to-get-better-at-improv at 40 a month, which is small
 * enough that moving it would be churn for its own sake. Recorded rather than
 * quietly excluded from the rule, so the decision is visible if the volume
 * ever changes.
 */
const DELIBERATE = new Set(["/practice"]);

/**
 * No page opens with a term another page is trying to rank for.
 *
 * This is the third time the same thing has been found by hand.
 * /traditions/close was titled "Del Close & Charna Halpern" while /del-close
 * targeted "del close" at 2,000 a month; /traditions/spolin was titled exactly
 * "Viola Spolin" while /viola-spolin targeted it at 800. In both cases Search
 * Console showed the query going to the thin navigation page and the guide
 * written for it getting nothing.
 *
 * keyword-collisions cannot see either one. It compares declared frontmatter,
 * and a route page has none — which is the blind spot route-keywords.ts was
 * created to patch, by hand, one route at a time. This reads the built HTML
 * instead, so a page is judged by what it actually tells Google it is about
 * rather than by what it remembered to declare.
 *
 * Three decisions in the rule are load-bearing:
 *
 * The title, not the h1. Atom pages carry a disambiguator in the title that
 * the h1 does not have — "Reading the Room — improv technique" against a bare
 * "Reading the Room" — and that suffix is exactly the thing that stops a
 * glossary entry competing with the guide. Judging the h1 would flag every
 * atom on the site and teach everyone to ignore this.
 *
 * Starts with, not contains. A long-tail page legitimately contains its head
 * term: "Virtual Team Building Activities" has "team building activities"
 * inside it and is not competing with it, because the qualifier comes first
 * and changes the intent. Twenty-one pages match on `contains` and one matches
 * on `startsWith`, which is the difference between a rule people follow and a
 * rule people suppress.
 *
 * Bridges are exempt. They declare their own targeting and keyword-collisions
 * already compares them against each other; the gap this closes is pages with
 * nothing declared at all. Library entries are exempt for a simpler reason —
 * a page about a book is named after the book, and "Truth in Comedy" opening
 * with "truth in comedy" is the page working correctly.
 */
describe("page titles", () => {
  it.runIf(built)("do not open with a term another page targets", async () => {
    const bridges = await loadBridges();
    const bridgeUrls = new Set(bridges.map((b) => `/${b.slug}`));

    const owned = bridges
      .flatMap((b) =>
        (b.frontmatter.target_keywords ?? []).map((k) => ({
          keyword: k.keyword.toLowerCase().trim(),
          owner: `/${b.slug}`,
        })),
      )
      // One-word terms match far too much to be evidence of anything.
      .filter((o) => o.keyword.split(/\s+/).length >= 2)
      // Longest first, so a report names the most specific term that matched.
      .sort((a, b) => b.keyword.length - a.keyword.length);

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

        const rel = path
          .relative(APP, full)
          .split(path.sep)
          .join("/")
          .replace(/\.html$/, "");
        const url = rel === "index" ? "/" : `/${rel}`;
        if (bridgeUrls.has(url) || url.startsWith("/library/") || DELIBERATE.has(url)) continue;

        const html = fs.readFileSync(full, "utf8");
        const title = (html.match(/<title>([^<]*)/) || [])[1]
          ?.replace(/&#x27;|&apos;/g, "'")
          .replace(/&amp;/g, "&")
          .split("|")[0]
          .trim()
          .toLowerCase();
        if (!title) continue;
        // The site's own glossary disambiguator, and the thing that makes an
        // atom safe to name after the concept it defines.
        if (/—\s*improv\s/.test(title)) continue;

        checked += 1;
        const hit = owned.find((o) => o.owner !== url && title.startsWith(o.keyword));
        if (hit) offenders.push(`${url} ("${title}") opens with "${hit.keyword}" — ${hit.owner}`);
      }
    };
    walk(APP);

    // A changed selector would otherwise make this pass on nothing. The number
    // is low because the exemptions are large: 81 bridges, 32 library entries
    // and every atom carrying the glossary suffix come out before this counts.
    expect(checked).toBeGreaterThan(90);
    expect(owned.length).toBeGreaterThan(50);
    expect(offenders).toEqual([]);
  });
});
