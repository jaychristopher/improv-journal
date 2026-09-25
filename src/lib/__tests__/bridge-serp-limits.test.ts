import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";
import { DESCRIPTION_MAX, TITLE_MAX } from "../seo";

/** Compare on words: search engines treat hyphens and punctuation as separators. */
function words(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

describe("bridge SERP limits", () => {
  it("keeps every guide title within the truncation limit", async () => {
    const over = (await loadBridges())
      .filter((b) => b.frontmatter.title.length > TITLE_MAX)
      .map((b) => `${b.slug} (${b.frontmatter.title.length})`);

    expect(over).toEqual([]);
  });

  it("keeps every guide description within the truncation limit", async () => {
    const over = (await loadBridges())
      .filter((b) => b.frontmatter.description.length > DESCRIPTION_MAX)
      .map((b) => `${b.slug} (${b.frontmatter.description.length})`);

    expect(over).toEqual([]);
  });

  it("keeps each guide's primary keyword in its own title", async () => {
    const missing: string[] = [];

    for (const bridge of await loadBridges()) {
      // The first declared keyword is the primary one, matching what
      // scripts/seo-audit.mjs checks — not whichever has the most volume.
      const primary = (bridge.frontmatter.target_keywords ?? [])[0]?.keyword;
      if (!primary) continue;
      if (!words(bridge.frontmatter.title).includes(words(primary).trim())) {
        missing.push(`${bridge.slug}: "${primary}"`);
      }
    }

    expect(missing).toEqual([]);
  });

  it("still gives every guide a non-trivial description", async () => {
    for (const bridge of await loadBridges()) {
      expect(bridge.frontmatter.description.length, bridge.slug).toBeGreaterThan(80);
    }
  });

  /**
   * A guide that declares a keyword has had its results page read.
   *
   * Seven guides reached production with target_keywords and no serp_verdict
   * - the improv pages, the site's own subject, five of them at difficulty
   * 0-3 - and nothing noticed, because CLAUDE.md rightly calls an absent
   * verdict the honest state for "nobody has looked" (SA-3.1, 2026-09-25).
   * Honest, and invisible: the audit and the promotion block skip an
   * unjudged guide, so the pages closest to the theme were the ones no
   * instrument could see. Reading the seven took one session. This makes the
   * eighth fail instead, at the moment the keyword is declared.
   */
  it("records a verdict on every guide that declares a keyword", async () => {
    const bridges = await loadBridges();
    expect(bridges.length).toBeGreaterThanOrEqual(70);
    const unjudged = bridges
      .filter((b) => (b.frontmatter.target_keywords ?? []).length > 0)
      .filter(
        (b) =>
          !b.frontmatter.serp_verdict ||
          !b.frontmatter.serp_checked ||
          b.frontmatter.serp_min_dr === undefined,
      )
      .map((b) => b.slug);
    expect(
      unjudged,
      "read the results page (serp-overview) and record serp_checked, serp_min_dr and serp_verdict",
    ).toEqual([]);
  });
});
