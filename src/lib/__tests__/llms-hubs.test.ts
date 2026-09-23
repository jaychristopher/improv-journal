import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ROUTE_KEYWORDS } from "../route-keywords";
import { listRoutePages } from "../route-pages.mjs";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/** Resolving loads every route page through jiti; once is enough for the file. */
let resolved: ReturnType<typeof listRoutePages> | null = null;
const routePages = () => (resolved ??= listRoutePages());
const RESOLVE_TIMEOUT = 60_000;

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
 * The route pages are named the way the pages name themselves.
 *
 * llms.txt is generated as `prebuild`, so it cannot read titles out of .next —
 * that directory holds the previous build while it runs. Its hub labels were
 * therefore written by hand, and by the time this was first checked eight of
 * the thirteen entries named a page something the page no longer called
 * itself: "Listen" had become "Improv Podcasts", "Reading List" had become
 * "Improv Reading List". Five substantial hubs were missing altogether,
 * including the two the site declares keywords for.
 *
 * Nothing surfaced any of it. llms.txt is not rendered, not linked from the
 * page, and not covered by the sitemap tests — it is read by crawlers and by
 * nobody else, so a name going stale there produces no symptom at all.
 *
 * The labels now live in route-pages.mjs beside a resolver that loads each
 * page's own metadata from source and throws where a label is not how the
 * title starts, and the search index reads the same list (novel-insights
 * 226). What that resolver cannot know is whether the title it read from
 * source is the one the build shipped — a metadata export the page has and
 * Next ignores, or a title the layout template rewrites, would pass it and
 * still be wrong on the page. So this compares the resolution with .next.
 *
 * The label rule is prefix rather than equality, deliberately. A shorter
 * label is often the better entry: "Improv Glossary" for a page called
 * "Improv Glossary: Vocabulary and Terms Explained" says the same thing
 * without the tail. What it may not do is name the page something it does
 * not call itself.
 */
describe("route pages", () => {
  it.runIf(built)(
    "resolves each route page to the title the build ships",
    async () => {
      const pages = await routePages();
      // The sitemap publishes 45; a resolver that quietly skipped a section
      // would otherwise pass on whatever was left.
      expect(pages.length).toBeGreaterThanOrEqual(40);

      const wrong: string[] = [];
      for (const { url, title, label } of pages) {
        const shipped = pageTitle(url);
        if (shipped === null) {
          wrong.push(`${url} is listed but the build produces no such page`);
          continue;
        }
        if (shipped !== title) {
          wrong.push(`${url} resolves to "${title}", the build says "${shipped}"`);
        }
        if (!shipped.toLowerCase().startsWith(label.toLowerCase())) {
          wrong.push(`${url} listed as "${label}", page says "${shipped}"`);
        }
      }
      expect(wrong).toEqual([]);
    },
    RESOLVE_TIMEOUT,
  );

  it(
    "covers the hubs that declare keywords",
    async () => {
      const listed = new Set((await routePages()).map((p) => p.url));
      // route-keywords.ts names these as owning search terms; a file that tells
      // a crawler what the site holds, and an index a reader searches, should
      // not omit them.
      expect(Object.keys(ROUTE_KEYWORDS).length).toBeGreaterThanOrEqual(4);
      for (const url of Object.keys(ROUTE_KEYWORDS)) {
        expect(listed.has(url), `${url} missing from the route page list`).toBe(true);
      }
    },
    RESOLVE_TIMEOUT,
  );
});
