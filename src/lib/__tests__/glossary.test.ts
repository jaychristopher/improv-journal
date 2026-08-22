import { describe, expect, it } from "vitest";

import { getAtomUrl, loadAtoms } from "../content";
import { loadGlossaryTerms } from "../glossary";
import { leadParagraph } from "../seo";

describe("leadParagraph", () => {
  it("returns the first prose paragraph, not the whole document", () => {
    const md = ["---", "id: x", "---", "", "# Heading", "", "First one.", "", "Second one."].join(
      "\n",
    );
    expect(leadParagraph(md)).toBe("First one.");
  });

  it("rejoins a paragraph that wraps across lines", () => {
    expect(leadParagraph("---\nid: x\n---\n\nA definition\nthat wraps.\n\nNext.")).toBe(
      "A definition that wraps.",
    );
  });

  it("strips markdown emphasis, code, and link syntax", () => {
    const md = "---\nid: x\n---\n\n**Bold** and *italic* and `code` and [text](/url).";
    expect(leadParagraph(md)).toBe("Bold and italic and code and text.");
  });

  it("truncates at a sentence boundary when over the limit", () => {
    const md = `---\nid: x\n---\n\n${"Sentence one is here. ".repeat(30)}`;
    const lead = leadParagraph(md, 100);
    expect(lead.length).toBeLessThanOrEqual(100);
    expect(lead.endsWith(".")).toBe(true);
  });

  it("returns an empty string when there is no body", () => {
    expect(leadParagraph("---\nid: x\n---\n")).toBe("");
  });
});

describe("glossary terms", () => {
  it("still covers every definition atom, and more besides", async () => {
    const atoms = await loadAtoms();
    const definitions = atoms.filter((a) => a.frontmatter.type === "definition");
    const ids = new Set((await loadGlossaryTerms()).map((t) => t.id));

    // The glossary used to be exactly these. It is now every named concept,
    // so this asserts containment rather than equality.
    for (const atom of definitions) expect(ids.has(atom.frontmatter.id)).toBe(true);
    expect(ids.size).toBeGreaterThan(definitions.length);
  });

  it("gives every term a real definition", async () => {
    const thin = (await loadGlossaryTerms())
      .filter((t) => t.definition.length < 40)
      .map((t) => `${t.id} (${t.definition.length})`);

    expect(thin).toEqual([]);
  });

  it("points every term at the page it actually lives on", async () => {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a]));

    for (const term of await loadGlossaryTerms()) {
      const atom = byId.get(term.id);
      expect(atom, term.id).toBeDefined();
      expect(term.url, term.id).toBe(
        getAtomUrl({ id: atom!.frontmatter.id, type: atom!.frontmatter.type }),
      );
    }
  });

  it("is sorted alphabetically by term", async () => {
    const terms = (await loadGlossaryTerms()).map((t) => t.term);
    expect(terms).toEqual([...terms].sort((a, b) => a.localeCompare(b)));
  });
});
