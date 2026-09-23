import { describe, expect, it } from "vitest";

import { leadLineFor, splitFooter } from "../../components/AtomDetail";
import { getAtomBySlug, loadAtoms } from "../content";

/**
 * `how_to_play` is the one sentence of rules a game carries. The type hubs,
 * the games hub and the meta description all read it; the game's own page
 * was the one surface that did not (entry 187: visible on its own page for
 * 1 of 51). The page's lead line is derived by leadLineFor, so the guard is
 * on that: every atom with the field gets a lead line equal to it.
 */
describe("how_to_play lead line", () => {
  it("is rendered for every game that carries one", async () => {
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);

    const withRules = atoms.filter((a) => a.frontmatter.how_to_play);
    // 51 on 2026-09-21: 27 exercises, 24 formats.
    expect(withRules.length).toBeGreaterThanOrEqual(45);

    for (const atom of withRules) {
      expect(leadLineFor(atom.frontmatter), atom.frontmatter.id).toBe(
        atom.frontmatter.how_to_play!.trim(),
      );
    }
  });

  it("is a game's line, not a concept's", async () => {
    const atoms = await loadAtoms();
    const concepts = atoms.filter(
      (a) => a.frontmatter.type !== "exercise" && a.frontmatter.type !== "format",
    );
    expect(concepts.length).toBeGreaterThanOrEqual(100);
    for (const atom of concepts) {
      expect(leadLineFor(atom.frontmatter), atom.frontmatter.id).toBeNull();
    }
    // A game with no sentence gets no empty line either.
    expect(leadLineFor({ type: "exercise", how_to_play: "  " })).toBeNull();
    expect(leadLineFor({ type: "exercise" })).toBeNull();
  });

  it("reaches the longform ten, whose rules live nowhere else on their pages", async () => {
    for (const id of ["harold", "armando", "monoscene", "la-ronde", "montage"]) {
      const atom = await getAtomBySlug(id);
      expect(atom, id).toBeDefined();
      expect(leadLineFor(atom!.frontmatter), id).toBeTruthy();
    }
  });
});

/**
 * The footer splitter matched `<p><strong>Label:</strong>` across fourteen
 * labels, and the 2026-08-22 heading conversion turned every one of those
 * labels into a heading, so it matched nothing on 207 of 207 built pages and
 * no test noticed (entry 96). It now cuts at the `## Attribution note`
 * heading, and the inline `**Counter-position:**` that the conversion left
 * mid-paragraph is given its own paragraph at render time.
 */
describe("attribution footer", () => {
  it("cuts the attribution note off the body on every atom that has one", async () => {
    const atoms = await loadAtoms();
    const withNote = atoms.filter((a) => /^## Attribution note\s*$/m.test(a.content));
    // 11 on 2026-09-21, and the heading is last on all of them.
    expect(withNote.length).toBeGreaterThanOrEqual(8);

    for (const atom of withNote) {
      const { mainHtml, footerHtml } = splitFooter(atom.html);
      expect(footerHtml, atom.frontmatter.id).not.toBeNull();
      expect(footerHtml!.startsWith("<h2"), atom.frontmatter.id).toBe(true);
      expect(footerHtml).toContain('id="attribution-note"');
      expect(mainHtml).not.toContain("attribution-note");
      // Nothing is lost in the cut.
      expect(mainHtml + footerHtml).toBe(atom.html);
    }
  });

  it("leaves every other atom whole", async () => {
    const atoms = await loadAtoms();
    const without = atoms.filter((a) => !/^## Attribution note\s*$/m.test(a.content));
    expect(without.length).toBeGreaterThanOrEqual(150);
    for (const atom of without) {
      expect(splitFooter(atom.html).footerHtml, atom.frontmatter.id).toBeNull();
    }
  });

  it("refuses to cut when the note is followed by a real section", () => {
    const html =
      '<h2 id="a">A</h2>\n<p>x</p>\n<h2 id="attribution-note">Attribution note</h2>\n<p>y</p>\n<h2 id="b">B</h2>\n<p>z</p>';
    expect(splitFooter(html).footerHtml).toBeNull();
  });

  it("gives an inline counter-position its own paragraph", async () => {
    const atoms = await loadAtoms();
    const inline = atoms.filter((a) => /\S[^\n]*\*\*Counter-position[^*]*:\*\*/.test(a.content));
    // 104 atoms carry the label mid-paragraph on 2026-09-21.
    expect(inline.length).toBeGreaterThanOrEqual(70);

    for (const atom of inline) {
      // The label's tradition may be auto-linked ("Johnstone/<a …>Annoyance</a>"),
      // so only the opening is matched.
      const opens = atom.html.match(/<p><strong>Counter-position/g) ?? [];
      const declared = atom.content.match(/\*\*Counter-position[^*]*:\*\*/g) ?? [];
      expect(opens.length, atom.frontmatter.id).toBe(declared.length);
      // And the paragraph it was split from still closes before it.
      expect(atom.html, atom.frontmatter.id).not.toMatch(/\S\s+<strong>Counter-position/);
    }

    // The concrete case from entry 96.
    const commitment = await getAtomBySlug("commitment");
    expect(commitment!.html).toContain("</p>\n<p><strong>Counter-position:</strong>");
  });
});
