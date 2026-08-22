import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";
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
  it("covers every definition atom", async () => {
    const atoms = await loadAtoms();
    const definitions = atoms.filter((a) => a.frontmatter.type === "definition");
    const terms = await loadGlossaryTerms();

    expect(terms).toHaveLength(definitions.length);
    expect(new Set(terms.map((t) => t.id))).toEqual(
      new Set(definitions.map((a) => a.frontmatter.id)),
    );
  });

  it("gives every term a real definition", async () => {
    const thin = (await loadGlossaryTerms())
      .filter((t) => t.definition.length < 40)
      .map((t) => `${t.id} (${t.definition.length})`);

    expect(thin).toEqual([]);
  });

  it("points every term at its canonical vocabulary URL", async () => {
    for (const term of await loadGlossaryTerms()) {
      expect(term.url).toBe(`/practice/vocabulary/${term.id}`);
    }
  });

  it("is sorted alphabetically by term", async () => {
    const terms = (await loadGlossaryTerms()).map((t) => t.term);
    expect(terms).toEqual([...terms].sort((a, b) => a.localeCompare(b)));
  });
});
