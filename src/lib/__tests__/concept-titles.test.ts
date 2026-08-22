import { describe, expect, it } from "vitest";

import { getAtomDisplayTitle, loadAtoms } from "../content";
import { conceptTitle, pageTitle, SITE_NAME, TITLE_MAX } from "../seo";

const BRAND = ` | ${SITE_NAME}`;

/** Types that live on a concept route and so carry a qualifier. */
const CONCEPT_TYPES = [
  "technique",
  "definition",
  "exercise",
  "format",
  "principle",
  "antipattern",
  "pattern",
  "insight",
  "law",
  "pedagogy",
  "framework",
];

describe("conceptTitle", () => {
  it("names the domain a bare term does not", () => {
    expect(conceptTitle("Blocking", "antipattern")).toBe("Blocking — Improv Failure Mode");
    expect(conceptTitle("Pattern Break", "technique")).toBe("Pattern Break — Improv Technique");
  });

  it("leaves a title that already says improv alone", () => {
    const already = "The Harold: Improv's Most Important Long-Form Format";
    expect(conceptTitle(already, "format")).toBe(already);
  });

  it("leaves a reference title alone — the citation already qualifies it", () => {
    const ref = "Impro — Keith Johnstone (1979)";
    expect(conceptTitle(ref, "reference")).toBe(ref);
  });

  it("keeps the bare term rather than overflowing the title", () => {
    const long = "A".repeat(TITLE_MAX - 5);
    expect(conceptTitle(long, "technique")).toBe(long);
  });
});

describe("concept pages in the corpus", () => {
  it("say what kind of thing they are, within the title limit", async () => {
    const atoms = await loadAtoms();
    const concepts = atoms.filter((a) => CONCEPT_TYPES.includes(a.frontmatter.type));
    expect(concepts.length).toBeGreaterThan(100);

    for (const atom of concepts) {
      const display = await getAtomDisplayTitle(atom);
      const title = conceptTitle(display, atom.frontmatter.type);
      expect(title.toLowerCase(), atom.frontmatter.id).toContain("improv");
      expect(title.length, atom.frontmatter.id).toBeLessThanOrEqual(TITLE_MAX);

      // Whatever pageTitle does with the brand, the result still has to fit.
      const resolved = pageTitle(title);
      const rendered = typeof resolved === "string" ? resolved + BRAND : resolved.absolute;
      expect(rendered.length, atom.frontmatter.id).toBeLessThanOrEqual(TITLE_MAX);
    }
  });

  it("leaves the visible heading as the bare term", async () => {
    const atoms = await loadAtoms();
    const patternBreak = atoms.find((a) => a.frontmatter.id === "pattern-break")!;
    // The H1 renders frontmatter.title directly; only the title tag is qualified.
    expect(patternBreak.frontmatter.title).toBe("Pattern Break");
    expect(conceptTitle(patternBreak.frontmatter.title, patternBreak.frontmatter.type)).not.toBe(
      patternBreak.frontmatter.title,
    );
  });
});
