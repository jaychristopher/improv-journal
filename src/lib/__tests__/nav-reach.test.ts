import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Every reader-facing hub is reachable from more than one place.
 *
 * Tracker entry 222 (2026-09-21) found the lessons hub, the level ladder,
 * the drill picker and the topic hubs reachable from the footer or the
 * homepage body only, and this guard was written to stop that. But it
 * asserted the wrong thing: it read hrefs out of `Nav.tsx` with a regex,
 * which made the navigation the *mechanism* rather than the outcome, and
 * froze the nav's shape. Every new hub became a permanent nav item, which
 * is how the Resources section reached ten children.
 *
 * The footer rebuild on 2026-09-24 proved why that matters. It cut the
 * footer from 46 links to 11 before anything replaced them, and `/resources`
 * went to zero inbound links across 387 pages while still sitting in the
 * sitemap — a page the chrome had been propping up, orphaned the moment the
 * prop was removed, with nothing failing.
 *
 * So this counts what the *build* actually links, from how many distinct
 * tracked blocks. The nav may shrink whenever the pages it drops are carried
 * by something else; it may not shrink before that. `Nav.tsx` is not
 * mentioned here on purpose.
 */
const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — name a page the build always produces. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/** The hubs entry 222 found stranded. Losing one of these is the regression. */
const REQUIRED = [
  "/guides",
  "/topics/communication",
  "/paths",
  "/threads",
  "/learn/beginner",
  "/tools/exercise-picker/beginner",
  "/tools/improv-prompt-generator",
  "/listen",
  "/library",
  "/practice/vocabulary",
  "/improv-games",
];

function builtPages(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".html")) out.push(full);
    }
  };
  walk(APP);
  return out;
}

/**
 * The tracked blocks that link `href` on this page.
 *
 * Every link block on the site carries `data-track`; the delegated listener
 * in providers.tsx reads the nearest one off a clicked anchor. Walking back
 * from each match to the closest preceding `data-track="…"` gives the block
 * that owns the link, which is what "reachable from somewhere else" means.
 */
function blocksLinking(html: string, href: string): Set<string> {
  const blocks = new Set<string>();
  for (const match of html.matchAll(new RegExp(`href="${href}"`, "g"))) {
    const before = html.slice(0, match.index);
    const at = before.lastIndexOf('data-track="');
    if (at === -1) continue;
    const name = before.slice(at + 12, before.indexOf('"', at + 12));
    if (name) blocks.add(name);
  }
  return blocks;
}

describe("hub reachability", () => {
  it.runIf(built)("links every stranded hub from more than the navigation", () => {
    const pages = builtPages();
    // Guard the guard: a walk that found nothing would pass on an empty set.
    expect(pages.length).toBeGreaterThanOrEqual(370);

    const home = fs.readFileSync(path.join(APP, "index.html"), "utf8");
    const thin: string[] = [];

    for (const href of REQUIRED) {
      const sources = new Set<string>();
      let linkingPages = 0;
      for (const file of pages) {
        const html = fs.readFileSync(file, "utf8");
        const blocks = blocksLinking(html, href);
        if (blocks.size === 0) continue;
        linkingPages += 1;
        // The homepage is not a second route: entry 222's finding was that
        // these hubs were reachable from the homepage body and nowhere else.
        if (file === path.join(APP, "index.html")) continue;
        for (const block of blocks) sources.add(block);
      }

      // The nav carries all of them today, so the test is about the others.
      const beyondNav = [...sources].filter((block) => block !== "nav");
      if (beyondNav.length === 0) thin.push(`${href} (only the nav, on ${linkingPages} pages)`);
    }

    // The homepage links several of these in its own body; that is the case
    // entry 222 called insufficient, so it is excluded above.
    expect(home.length).toBeGreaterThan(10_000);
    expect(thin, "hubs the nav alone is holding up").toEqual([]);
  });
});
