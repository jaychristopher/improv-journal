import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";
import {
  countFounderMentions,
  guideCountsByTradition,
  guidesDrawingOn,
  TRADITION_IDS,
  traditionsOf,
} from "../tradition-guides";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * The join from the tradition pages to the guides.
 *
 * Until 2026-09-22 the tradition pages read atoms and library entries and
 * never the bridges, so each linked zero guides beyond the footer while 40 of
 * 78 guides named a founder in the body (tracker entry 271). Measured when
 * the join shipped: Johnstone 29 guides, Spolin 17 (18 naming her, less her
 * own page), Close 11 (12 less /del-close), UCB 4, Annoyance 3. The floors
 * sit just under those; none of the five measured zero.
 */
describe("guides drawing on a tradition", () => {
  it("finds guides for every tradition, ordered by reach", async () => {
    expect(TRADITION_IDS).toHaveLength(5);
    const counts = await guideCountsByTradition();
    for (const tradition of TRADITION_IDS) {
      expect(counts[tradition], tradition).toBeGreaterThanOrEqual(1);
    }
    // 29 and 17 on 2026-09-22.
    expect(counts.johnstone).toBeGreaterThanOrEqual(26);
    expect(counts.spolin).toBeGreaterThanOrEqual(15);
    // 11 on 2026-09-22.
    expect(counts.close).toBeGreaterThanOrEqual(9);

    // Winnable guides lead, gated ones trail, as on the topic hubs.
    const johnstone = await guidesDrawingOn("johnstone");
    const verdicts = johnstone.map((g) => g.frontmatter.serp_verdict);
    const firstGated = verdicts.indexOf("authority");
    const lastWinnable = verdicts.lastIndexOf("winnable");
    expect(firstGated).toBeGreaterThan(0);
    expect(lastWinnable).toBeLessThan(firstGated);
  });

  it("counts the surname as a mention and refuses Close alone", () => {
    expect(countFounderMentions("Keith Johnstone said it; Johnstone meant it.", "johnstone")).toBe(
      2,
    );
    expect(countFounderMentions("Close the scene. Del Close would.", "close")).toBe(1);
    expect(
      countFounderMentions("an annoyance, not the Annoyance; Napier's book", "annoyance"),
    ).toBe(2);
  });

  it("does not list a tradition's own person page among its guides", async () => {
    const spolin = await guidesDrawingOn("spolin");
    expect(spolin.map((g) => g.slug)).not.toContain("viola-spolin");
    const close = await guidesDrawingOn("close");
    expect(close.map((g) => g.slug)).not.toContain("del-close");
    // But the person pages do draw on the other schools.
    expect(close.length).toBeGreaterThan(0);
    expect((await guidesDrawingOn("johnstone")).map((g) => g.slug)).toContain("del-close");
  });

  it("names a guide's lineage only where a founder is cited twice or more", async () => {
    const bridges = await loadBridges();
    expect(bridges.length).toBeGreaterThanOrEqual(70);

    // rules-of-improv: Johnstone 7, Napier/Annoyance 5, UCB 3 on 2026-09-22.
    const rules = await traditionsOf("rules-of-improv");
    expect(rules[0]?.tradition).toBe("johnstone");
    expect(rules.map((l) => l.tradition)).toContain("annoyance");
    for (const l of rules) expect(l.mentions).toBeGreaterThanOrEqual(2);

    // A single mention is a citation, not a lineage.
    const single = bridges.filter((b) => countFounderMentions(b.content, "johnstone") === 1);
    expect(single.length).toBeGreaterThanOrEqual(5);
    for (const b of single) {
      const lineage = await traditionsOf(b.slug);
      expect(lineage.map((l) => l.tradition)).not.toContain("johnstone");
    }

    // The page about Spolin is her source, not a guide that draws on her.
    expect((await traditionsOf("viola-spolin")).map((l) => l.tradition)).not.toContain("spolin");

    // 23 guides carried a lineage on 2026-09-22.
    let withLineage = 0;
    for (const b of bridges) if ((await traditionsOf(b.slug)).length > 0) withLineage++;
    expect(withLineage).toBeGreaterThanOrEqual(20);

    expect(await traditionsOf("no-such-guide")).toEqual([]);
  });

  it.runIf(built)("renders the block on the built Johnstone page with the guide links", () => {
    // React separates adjacent text nodes with empty comments, so "+17 more"
    // is served as "+<!-- -->17<!-- --> more"; the comments are stripped
    // before matching.
    const html = fs
      .readFileSync(path.join(APP, "traditions", "johnstone.html"), "utf-8")
      .replace(/<script[\s\S]*?<\/script>/g, "")
      .replace(/<!--.*?-->/g, "");
    const start = html.indexOf('data-track="tradition-guides"');
    expect(start).toBeGreaterThan(-1);
    const end = html.indexOf('data-track="tradition-concepts"', start);
    expect(end).toBeGreaterThan(start);
    const block = html.slice(start, end);

    const hrefs = [...block.matchAll(/href="\/([a-z0-9-]+)"/g)].map((m) => m[1]);
    // 29 on 2026-09-22, 12 shown and the rest folded; every one is a guide.
    expect(hrefs.length).toBeGreaterThanOrEqual(26);
    expect(block).toContain("<details");
    expect(block).toMatch(/\+\d+ more/);
    expect(hrefs).toContain("rules-of-improv");

    const hub = fs
      .readFileSync(path.join(APP, "traditions.html"), "utf-8")
      .replace(/<!--.*?-->/g, "");
    expect(hub).toMatch(/\d+ concepts · \d+ guides/);
  });
});
