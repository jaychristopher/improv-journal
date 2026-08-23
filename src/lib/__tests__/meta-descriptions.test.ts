import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";
import { atomDescription, DESCRIPTION_MAX, extractDescription, metaDescription } from "../seo";

const CITATION_ENTRY = [
  "---",
  "id: ref-impro-johnstone",
  "---",
  "",
  "**Keith Johnstone. *Impro: Improvisation and the Theatre.* Faber & Faber, 1979.**",
  "",
  "The foundational text of modern improv pedagogy.",
].join("\n");

describe("extractDescription", () => {
  it("strips emphasis that nests, leaving no orphan marker", () => {
    // The bug this guards: `\*\*([^*]+)\*\*` cannot cross the inner asterisks,
    // so the bold pass missed and the italic pass matched the wrong pair.
    expect(extractDescription("**Author. *Title.* Publisher, 1979.**")).toBe(
      "Author. Title. Publisher, 1979.",
    );
  });

  it("skips a citation paragraph that only restates the page title", () => {
    expect(extractDescription(CITATION_ENTRY)).toBe(
      "The foundational text of modern improv pedagogy.",
    );
  });

  it("keeps the bold paragraph when it is all the entry has", () => {
    expect(extractDescription("---\nid: x\n---\n\n**The whole entry.**")).toBe("The whole entry.");
  });

  it("does not carry table pipes or raw newlines into a snippet", () => {
    const md = "---\nid: x\n---\n\nA lead sentence.\n\n| Level | Focus |\n| --- | --- |";
    const desc = extractDescription(md);
    expect(desc).not.toContain("|");
    expect(desc).not.toContain("\n");
  });
});

describe("metaDescription", () => {
  it("leaves a description that already fits untouched", () => {
    const fits = "Listening, conversation, conflict, and connection.";
    expect(metaDescription(fits)).toBe(fits);
  });

  it("packs whole sentences from the front", () => {
    const text = `${"A".repeat(80)}. ${"B".repeat(60)}. ${"C".repeat(60)}.`;
    const out = metaDescription(text);
    expect(out).toBe(`${"A".repeat(80)}. ${"B".repeat(60)}.`);
  });

  it("does not split inside a closing quotation", () => {
    const text = [
      "Beyond 'find the game' and 'make a character choice.'",
      "Advanced game mechanics — how games evolve, invert, and break.",
      "Advanced character — built from body, status, and game rather than biography.",
    ].join(" ");
    const out = metaDescription(text);
    expect(out.startsWith("Beyond 'find the game'")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it("trims to a word boundary rather than returning a short stub", () => {
    const text = `Now what? ${"word ".repeat(60)}`;
    const out = metaDescription(text);
    expect(out.length).toBeGreaterThan(DESCRIPTION_MAX * 0.6);
    expect(out.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(out.endsWith("…")).toBe(true);
  });

  it("never exceeds the limit, whatever it is handed", () => {
    const inputs = ["", "x", "x".repeat(400), `${"long sentence here. ".repeat(30)}`];
    for (const input of inputs) {
      expect(metaDescription(input).length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    }
  });
});

describe("reference entries", () => {
  // These are the best-ranking pages on the site. Every one of them shipped a
  // description that opened with a stray asterisk and then restated the title.
  it("describe the work rather than repeating the citation", async () => {
    const atoms = await loadAtoms();
    const refs = atoms.filter((a) => a.frontmatter.type === "reference");
    expect(refs.length).toBeGreaterThan(0);

    for (const atom of refs) {
      // Built the way the page builds it, including an authored snippet where
      // one exists. Without that argument this checked a description no page
      // ships, which is how ref-madson passed for a while: its lead paragraph
      // is a bold citation with the title in nested italics, dropBoldLead-
      // Paragraph does not strip that shape, and the derived snippet therefore
      // repeated the citation down to the publisher. The written one replaced
      // it; the derived path is still wrong for that shape and this now says so
      // if anyone removes the authored description.
      const desc = atomDescription(
        atom.frontmatter.title,
        atom.frontmatter.type,
        extractDescription(atom.content),
        undefined,
        undefined,
        atom.frontmatter.description,
      );
      expect(desc, atom.frontmatter.id).not.toMatch(/^[*_#>-]/);
      expect(desc, atom.frontmatter.id).not.toContain("*");
      expect(desc.length, atom.frontmatter.id).toBeLessThanOrEqual(DESCRIPTION_MAX);
      // The citation names the publisher; the description should not have to.
      const publisher = atom.frontmatter.work?.publisher;
      if (publisher) expect(desc, atom.frontmatter.id).not.toContain(publisher);
    }
  });
});
