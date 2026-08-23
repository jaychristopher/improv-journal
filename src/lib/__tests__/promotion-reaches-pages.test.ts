import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";
import { PROMOTION_FLOOR } from "../top-guides";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/** Every promoted guide gets a link from all 330-odd pages; a starved one gets ~12. */
const STARVED_BELOW = 100;

function inboundCounts(): Map<string, number> {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".html") && !entry.name.startsWith("_")) files.push(full);
    }
  };
  walk(APP);

  const inbound = new Map<string, number>();
  for (const file of files) {
    const from =
      "/" +
      path
        .relative(APP, file)
        .split(path.sep)
        .join("/")
        .replace(/\.html$/, "");
    const html = fs.readFileSync(file, "utf-8");
    const hrefs = [...html.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]);
    for (const href of new Set(hrefs)) {
      if (href === from) continue;
      inbound.set(href, (inbound.get(href) ?? 0) + 1);
    }
  }
  return inbound;
}

/**
 * A guide the site has decided to promote must actually be promoted.
 *
 * Twice now a promotion threshold has been correct when written and gone stale
 * without failing anything. The footer sat at 8 while the site grew to fifteen
 * open guides, so six of them — about 172,000 of traffic potential — received
 * between 10 and 17 inbound links against 327 for the ones inside the cut. The
 * homepage then repeated it with its own hardcoded 8.
 *
 * Neither showed up in any test, because nothing checked that promotion kept
 * pace with publication. Both were found by measuring inbound links by hand,
 * which is not a strategy. This measures them on every run.
 *
 * The gap it looks for is not subtle. A promoted guide is linked from every
 * page on the site; a starved one is linked from about a dozen. Anything under
 * a hundred means it has fallen out of the promoted set without anybody
 * deciding that it should.
 */
describe("promotion reaches the pages it names", () => {
  it.runIf(built)("no guide above the promotion floor is starved of links", async () => {
    const inbound = inboundCounts();

    const starved: string[] = [];
    let checked = 0;
    for (const bridge of await loadBridges()) {
      if (bridge.frontmatter.serp_verdict !== "winnable") continue;
      const primary = (bridge.frontmatter.target_keywords ?? [])[0];
      const reach = primary?.traffic_potential ?? primary?.volume ?? 0;
      if (reach < PROMOTION_FLOOR) continue;

      checked++;
      const links = inbound.get(`/${bridge.slug}`) ?? 0;
      if (links < STARVED_BELOW) starved.push(`/${bridge.slug} (reach ${reach}, ${links} links)`);
    }

    // Guards against the filters returning nothing and this passing on no data.
    expect(checked).toBeGreaterThan(10);
    expect(starved).toEqual([]);
  });
});
