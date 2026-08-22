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
});
