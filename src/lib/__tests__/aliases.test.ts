import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";

/**
 * An alias must be earned by the prose, not just asserted in the frontmatter.
 *
 * Aliases become schema.org alternateName, which tells a search engine the page
 * answers to that word. If the word appears nowhere in the body, the claim is
 * empty — the reader who searched it lands on a page that never uses their term
 * and bounces. The point of an alias is that the page explains the synonym.
 */
describe("concept aliases", () => {
  it("uses every alias it claims in the body", async () => {
    const missing: string[] = [];

    for (const atom of await loadAtoms()) {
      for (const alias of atom.frontmatter.aliases ?? []) {
        if (!atom.content.toLowerCase().includes(alias.toLowerCase())) {
          missing.push(`${atom.frontmatter.id} claims "${alias}" but never says it`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it("never lists an alias that merely restates the title", async () => {
    const redundant: string[] = [];

    for (const atom of await loadAtoms()) {
      const title = atom.frontmatter.title.toLowerCase();
      for (const alias of atom.frontmatter.aliases ?? []) {
        if (alias.toLowerCase() === title) {
          redundant.push(`${atom.frontmatter.id}: "${alias}"`);
        }
      }
    }

    expect(redundant).toEqual([]);
  });

  it("is in use, so the rules above guard something", async () => {
    const withAliases = (await loadAtoms()).filter((a) => a.frontmatter.aliases?.length);
    expect(withAliases.length).toBeGreaterThan(0);
  });
});
