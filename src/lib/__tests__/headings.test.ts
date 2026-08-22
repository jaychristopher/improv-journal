import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";
import { contentsFor, extractHeadings, MIN_HEADINGS_FOR_CONTENTS } from "../headings";

describe("extractHeadings", () => {
  it("reads the id and the visible text", () => {
    const html = '<h2 id="the-discipline">The discipline</h2><p>Body.</p>';
    expect(extractHeadings(html)).toEqual([{ id: "the-discipline", text: "The discipline" }]);
  });

  it("strips inline markup and decodes entities", () => {
    const html = '<h2 id="a"><em>Heat</em> &amp; weight</h2>';
    expect(extractHeadings(html)).toEqual([{ id: "a", text: "Heat & weight" }]);
  });

  it("ignores a heading with no id, since it cannot be linked to", () => {
    expect(extractHeadings("<h2>Unanchored</h2>")).toEqual([]);
  });

  it("keeps the first of a duplicated id", () => {
    const html = '<h2 id="x">First</h2><h2 id="x">Second</h2>';
    expect(extractHeadings(html)).toHaveLength(1);
  });
});

describe("contentsFor", () => {
  it("stays quiet on a page the reader can already see whole", () => {
    const html = '<h2 id="a">A</h2><h2 id="b">B</h2>';
    expect(contentsFor(html)).toEqual([]);
  });

  it("lists the sections once there are enough of them", () => {
    const html = ["a", "b", "c"].map((id) => `<h2 id="${id}">${id}</h2>`).join("");
    expect(contentsFor(html)).toHaveLength(MIN_HEADINGS_FOR_CONTENTS);
  });
});

describe("the concept corpus", () => {
  it("offers contents on most pages, and every anchor lands on a heading", async () => {
    const atoms = await loadAtoms();
    const concepts = atoms.filter((a) => a.frontmatter.type !== "reference");
    const withContents = concepts.filter((a) => contentsFor(a.html).length > 0);
    expect(withContents.length).toBeGreaterThan(100);

    for (const atom of withContents) {
      const ids = new Set([...atom.html.matchAll(/<h2[^>]*\sid="([^"]+)"/g)].map((m) => m[1]));
      for (const heading of contentsFor(atom.html)) {
        expect(ids.has(heading.id), `${atom.frontmatter.id} -> #${heading.id}`).toBe(true);
        expect(heading.text.length, atom.frontmatter.id).toBeGreaterThan(0);
      }
    }
  });
});
