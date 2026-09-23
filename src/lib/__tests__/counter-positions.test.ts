import { describe, expect, it } from "vitest";

import { extractCounterPositions, getAtomBySlug, loadAtoms } from "../content";

/**
 * The counter-position extractor reads both forms the corpus writes.
 *
 * Disagreement lives in the body as either an inline label
 * (`**Counter-position (Napier):** …`, a hundred-odd atoms) or a heading
 * (`## Counter-position`, `## The counter-argument`, twelve atoms). The
 * extractor read only the label, so the heading-form ones — `yes-and`'s
 * among them, the site's flagship concept — never reached the traditions
 * and disputes pages that are built from it (tracker entry 94, 2026-09-20).
 */
describe("counter-position extraction", () => {
  it("parses the inline label, with and without a tradition", () => {
    const md = [
      "Some sourcing text. **Counter-position (Napier):** Rules paralyse *beginners*.",
      "",
      "**Counter-argument:** The rule is a **lens**, not a mandate.",
      "",
      "## Beyond improv",
    ].join("\n");
    expect(extractCounterPositions(md)).toEqual([
      { tradition: "Napier", text: "Rules paralyse beginners." },
      { tradition: undefined, text: "The rule is a lens, not a mandate." },
    ]);
  });

  it("parses the heading form up to the next heading, with and without a tradition", () => {
    const md = [
      "## Counter-position (Johnstone)",
      "",
      "First paragraph, with *emphasis*.",
      "",
      "Second paragraph.",
      "",
      "## The counter-argument",
      "",
      "Another school says otherwise.",
      "",
      "### Sources",
      "",
      "Not a counter-position.",
    ].join("\n");
    expect(extractCounterPositions(md)).toEqual([
      { tradition: "Johnstone", text: "First paragraph, with emphasis. Second paragraph." },
      { tradition: undefined, text: "Another school says otherwise." },
    ]);
  });

  it("finds the corpus's counter-positions, yes-and's included", async () => {
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);

    let total = 0;
    const headingForm: string[] = [];
    for (const atom of atoms) {
      const found = extractCounterPositions(atom.content);
      total += found.length;
      if (
        /^#{2,6}[ \t]+(?:the[ \t]+)?(?:[\w-]+[ \t]+)?counter-(?:position|argument)/im.test(
          atom.content,
        )
      ) {
        headingForm.push(atom.frontmatter.id);
        expect(
          found.length,
          `${atom.frontmatter.id} has a counter-position heading`,
        ).toBeGreaterThan(0);
      }
    }
    // ~104 inline and 15 heading-form on 2026-09-21.
    expect(total).toBeGreaterThanOrEqual(100);
    expect(headingForm.length).toBeGreaterThanOrEqual(12);

    const yesAnd = await getAtomBySlug("yes-and");
    const found = extractCounterPositions(yesAnd!.content);
    expect(found.length).toBeGreaterThanOrEqual(1);
    expect(found[0].text).toMatch(/Napier/);
  });
});
