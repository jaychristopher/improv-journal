import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";
import { leadParagraph, stripLeadLabel } from "../seo";

const LISTED_TYPES = [
  "exercise",
  "technique",
  "pedagogy",
  "format",
  "principle",
  "antipattern",
  "pattern",
  "framework",
] as const;

describe("stripLeadLabel", () => {
  it("drops a leading bold label but keeps the sentence it introduces", () => {
    const md = "---\nid: x\n---\n\n**Trains:** Deep attention and body awareness.";
    expect(leadParagraph(stripLeadLabel(md))).toBe("Deep attention and body awareness.");
  });

  it("leaves a paragraph without a label untouched", () => {
    const md = "---\nid: x\n---\n\nA plain opening sentence.";
    expect(leadParagraph(stripLeadLabel(md))).toBe("A plain opening sentence.");
  });

  it("does not strip bold that appears mid-sentence", () => {
    const md = "---\nid: x\n---\n\nThe **game** is the pattern.";
    expect(leadParagraph(stripLeadLabel(md))).toBe("The game is the pattern.");
  });
});

describe("hub listing descriptions", () => {
  it("produces a usable description for every atom a hub lists", async () => {
    const atoms = await loadAtoms();
    const listed = atoms.filter((a) =>
      (LISTED_TYPES as readonly string[]).includes(a.frontmatter.type),
    );

    expect(listed.length).toBeGreaterThan(100);

    const thin = listed
      .map((a) => ({ id: a.frontmatter.id, d: leadParagraph(stripLeadLabel(a.content), 180) }))
      .filter((x) => x.d.length < 40)
      .map((x) => `${x.id} (${x.d.length})`);

    expect(thin).toEqual([]);
  });

  it("never leaves a stray label at the head of a description", async () => {
    const atoms = await loadAtoms();
    const stray = atoms
      .filter((a) => (LISTED_TYPES as readonly string[]).includes(a.frontmatter.type))
      .filter((a) => /^(Trains|Setup|Note|Source):/.test(leadParagraph(stripLeadLabel(a.content))))
      .map((a) => a.frontmatter.id);

    expect(stray).toEqual([]);
  });
});
