import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";

/**
 * Every keyword figure in the corpus describes one market, and the schema now
 * says which.
 *
 * On 2026-09-25 all 317 declared keywords across 78 guides had been read with
 * country=us, as had every SERP reading beside them, and nothing recorded it
 * (SA-15.1). The audience is not US-only — 20 of the site's 36 clicks since
 * April came from elsewhere — and US is about three quarters of global volume
 * on the two core terms measured, so a figure refreshed in another market is a
 * different number, not an updated one. `market` on a keyword is absent when
 * it is `us` and declared otherwise.
 *
 * This holds two things: a declared market is a country code Ahrefs accepts,
 * and no guide mixes markets across its keywords, since the promotion block
 * and the audit compare those figures against each other and against US
 * thresholds.
 */
describe("keyword figures name their market", () => {
  it("declares only well-formed markets, one per guide", async () => {
    const bridges = await loadBridges();
    // Guard the guard: the corpus, not an empty list.
    expect(bridges.length).toBeGreaterThanOrEqual(70);
    const keywords = bridges.flatMap((b) => b.frontmatter.target_keywords ?? []);
    expect(keywords.length).toBeGreaterThanOrEqual(300);

    const malformed = keywords
      .filter((k) => k.market !== undefined && !/^[a-z]{2}$/.test(k.market))
      .map((k) => `${k.keyword}: ${k.market}`);
    expect(malformed).toEqual([]);

    const mixed = bridges
      .filter(
        (b) => new Set((b.frontmatter.target_keywords ?? []).map((k) => k.market ?? "us")).size > 1,
      )
      .map((b) => b.slug);
    expect(mixed, "a guide comparing figures from two markets").toEqual([]);
  });
});
