import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";
import {
  definitionFromHtml,
  groupGlossaryTerms,
  isGlossaryType,
  loadGlossaryTerms,
} from "../glossary";

describe("definitionFromHtml", () => {
  it("takes the first real paragraph", () => {
    const html = "<p>Attention is limited, and action consumes capacity.</p><p>Second.</p>";
    expect(definitionFromHtml(html)).toBe("Attention is limited, and action consumes capacity.");
  });

  it("does not mistake a pre block for a paragraph", () => {
    // The boundary this guards: `<p[^>]*>` alone matches `<pre …>`, and the
    // first version of it shipped a literal backspace where the boundary
    // should have been, so nothing matched at all and every description
    // rendered empty.
    const html =
      "<pre>not prose at all, just some sample output here</pre><p>The actual definition sentence.</p>";
    expect(definitionFromHtml(html)).toBe("The actual definition sentence.");
  });

  it("skips the label some entries open with", () => {
    const html =
      "<p><strong>Technique for: Be Simple</strong></p><p>The obvious choice is acting on your first impulse.</p>";
    expect(definitionFromHtml(html)).toBe("The obvious choice is acting on your first impulse.");
  });

  it("strips inline markup and decodes entities", () => {
    const html = "<p>Heat &amp; weight, the <em>felt</em> charge of a moment on stage.</p>";
    expect(definitionFromHtml(html)).toBe("Heat & weight, the felt charge of a moment on stage.");
  });

  it("trims a long paragraph at a word boundary", () => {
    const html = `<p>${"word ".repeat(200)}</p>`;
    const out = definitionFromHtml(html, 120);
    expect(out.length).toBeLessThanOrEqual(120);
    expect(out.endsWith("…")).toBe(true);
  });

  it("returns empty rather than guessing when there is no prose", () => {
    expect(definitionFromHtml("<h2 id='a'>Only a heading</h2>")).toBe("");
  });
});

describe("the glossary", () => {
  it("covers every named concept, not just the typed definitions", async () => {
    const atoms = await loadAtoms();
    const terms = await loadGlossaryTerms();
    const definitions = atoms.filter((a) => a.frontmatter.type === "definition");

    // It used to be the 28 `definition` atoms alone, which left "pattern
    // break", "space work" and "heightening" out of the site's own glossary.
    expect(terms.length).toBeGreaterThan(definitions.length * 3);
    expect(terms.length).toBeGreaterThan(120);
  });

  it("never lists a reference — a book is a cited work, not a term", async () => {
    const terms = await loadGlossaryTerms();
    expect(terms.some((t) => t.id.startsWith("ref-"))).toBe(false);
    expect(isGlossaryType("reference")).toBe(false);
  });

  it("gives every entry a definition worth showing", async () => {
    const terms = await loadGlossaryTerms();
    for (const term of terms) {
      expect(term.definition.length, term.id).toBeGreaterThan(20);
      expect(term.definition, term.id).not.toMatch(/^\*|\*$/);
    }
  });

  it("groups without losing or duplicating an entry", async () => {
    const terms = await loadGlossaryTerms();
    const grouped = groupGlossaryTerms(terms);
    const ids = grouped.flatMap((g) => g.terms.map((t) => t.id));
    expect(ids.length).toBe(terms.length);
    expect(new Set(ids).size).toBe(terms.length);
  });
});
