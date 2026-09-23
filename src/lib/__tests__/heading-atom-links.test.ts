import { describe, expect, it } from "vitest";

import {
  getAtomUrl,
  headingAtomLink,
  linkHeadingAtoms,
  loadAtoms,
  loadBridges,
  loadThreads,
} from "../content";

/**
 * Headings are the one place the body autolinker never looks, and rightly:
 * an H2 that is a link is wrong. The cost landed on the exercise template.
 * Twenty-four exercises carry a `## Side-coaching` section and four of them
 * linked the `side-coaching` atom, so the places the corpus most often names
 * the technique were the places a reader could not reach it (tracker entry
 * 158, 2026-09-21). The renderer now inserts a small "About <title>" line
 * under a heading whose text is exactly an atom's title, with the body
 * linker's refusals carried over: not on the atom's own page, not when the
 * body already links the atom, not for a generic one-word title.
 *
 * These guard presence. The failure mode is the step silently matching
 * nothing — a changed heading regex, an entity the decoder stops handling —
 * and a page that renders correctly without the line.
 */

const ABOUT_LINE =
  /<p class="text-foreground\/60 text-sm"><a href="([^"]+)"[^>]*>About [^<]+ →<\/a><\/p>/g;
// A heading and its inner markup, bounded so it cannot run on to a later one.
const HEADING = /<h([23])\b[^>]*>((?:(?!<\/h\d)[\s\S])*?)<\/h\1>/g;

function aboutLinkUrls(html: string): string[] {
  return [...html.matchAll(ABOUT_LINE)].map((m) => m[1]);
}

async function loadCorpus() {
  const [atoms, bridges, threads] = await Promise.all([loadAtoms(), loadBridges(), loadThreads()]);
  const docs = [...atoms, ...bridges, ...threads];
  expect(docs.length).toBeGreaterThanOrEqual(280);
  return docs;
}

describe("about-links under headings that name an atom", () => {
  it("send the exercises' Side-coaching sections to the side-coaching atom", async () => {
    const atoms = await loadAtoms();
    const sideCoaching = atoms.find((a) => a.frontmatter.id === "side-coaching");
    expect(sideCoaching).toBeDefined();
    const url = getAtomUrl({ id: "side-coaching", type: sideCoaching!.frontmatter.type });

    const withHeading = atoms.filter(
      (a) => a.frontmatter.type === "exercise" && /<h2[^>]*>Side-coaching<\/h2>/i.test(a.html),
    );
    // Guard the guard: the heading is the exercise template's, not one page's.
    expect(withHeading.length).toBeGreaterThanOrEqual(20);

    // Every exercise with the heading links the atom, whether by the new line
    // or by a link of its own. 2026-09-21: 21 exercises carry the exact
    // heading; 19 gain the line and 2 (directed-scene, last-word-response)
    // already linked the atom in prose and are left alone. Three more write
    // "Side-coaching it" — not the atom's title, so not this step's business.
    const reaching = withHeading.filter((a) => a.html.includes(`href="${url}"`));
    expect(reaching.length).toBe(withHeading.length);

    const byLine = withHeading.filter((a) => aboutLinkUrls(a.html).includes(url));
    expect(byLine.length).toBeGreaterThanOrEqual(18);
  });

  it("reach past the atoms: a guide's sub-heading that names an exercise links it", async () => {
    const bridges = await loadBridges();
    // 2026-09-21: two guides — "Mirroring" on how-to-stop-overthinking and
    // "Emotional range" on theatre-games. Small, and worth knowing it holds
    // outside the exercise template.
    const linked = bridges.filter((b) => aboutLinkUrls(b.html).length > 0);
    expect(linked.length).toBeGreaterThanOrEqual(2);
  });

  it("sit under the heading, never inside it", async () => {
    const docs = await loadCorpus();
    let headings = 0;
    let lines = 0;
    for (const doc of docs) {
      for (const match of doc.html.matchAll(HEADING)) {
        headings += 1;
        // The body's backtick linker does reach into a heading — one, on
        // meisner-technique ("It Is Not `viewpoints`") — so the check is for
        // this step's anchor, not for any anchor.
        expect(match[2], `${doc.slug}: ${match[2]}`).not.toMatch(/About [^<]+ →/);
        expect(match[2], `${doc.slug}: ${match[2]}`).not.toMatch(/text-foreground\/60/);
      }
      for (const match of doc.html.matchAll(ABOUT_LINE)) {
        lines += 1;
        // The line is the heading's next sibling: the rendered HTML has the
        // closing heading tag and a newline right before it.
        const before = doc.html.slice(Math.max(0, match.index - 6), match.index);
        expect(before, `${doc.slug}: ${before}`).toMatch(/<\/h[23]>\n$/);
      }
    }
    expect(headings).toBeGreaterThanOrEqual(900);
    // 2026-09-21: 21 lines across 19 exercises and 2 guides.
    expect(lines).toBeGreaterThanOrEqual(20);
  });

  it("never point a page at itself", async () => {
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    for (const atom of atoms) {
      const own = getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type });
      expect(aboutLinkUrls(atom.html), atom.slug).not.toContain(own);
    }
    // No atom in the corpus currently heads a section with its own title, so
    // the refusal is exercised directly: the same heading gains the line on
    // any other page and not on the atom's own.
    const url = getAtomUrl({ id: "side-coaching", type: "pedagogy" });
    const html = '<h2 id="side-coaching">Side-coaching</h2>\n<p>Call it out.</p>';
    expect(linkHeadingAtoms(html, url)).toBe(html);
    expect(linkHeadingAtoms(html, "/practice/exercises/zip-zap-zop")).toContain(`href="${url}"`);
  });

  it("leave a heading alone when the body already links its atom", () => {
    const url = getAtomUrl({ id: "side-coaching", type: "pedagogy" });
    const html = `<h2 id="side-coaching">Side-coaching</h2>\n<p>See <a href="${url}">it</a>.</p>`;
    expect(linkHeadingAtoms(html, null)).toBe(html);
  });

  it("decline a generic one-word title, as the body linker does", async () => {
    const atoms = await loadAtoms();
    // Titles the linker treats as ambiguous English words. The list lives in
    // content.ts as GENERIC_ONE_WORD_ATOM_TITLES; these are members of it and
    // also atom titles, so a lapse in the guard would produce a link.
    // `endowment` heads sections "Relationship" and "Status" and is the page
    // that would gain two wrong lines.
    for (const title of ["Status", "Signal", "Trust", "Relationship"]) {
      expect(
        atoms.some((a) => a.frontmatter.title.toLowerCase() === title.toLowerCase()),
        title,
      ).toBe(true);
      expect(headingAtomLink(title)).toBeNull();
      expect(linkHeadingAtoms(`<h2 id="x">${title}</h2>`, null)).toBe(`<h2 id="x">${title}</h2>`);
    }
    const endowment = atoms.find((a) => a.frontmatter.id === "endowment");
    expect(endowment?.html).toMatch(/<h2[^>]*>Status<\/h2>/);
    expect(aboutLinkUrls(endowment!.html)).toEqual([]);

    // And the resolver does resolve: the match is by title, case-insensitive
    // and trimmed, and equality means equality.
    expect(headingAtomLink("side-coaching")?.id).toBe("side-coaching");
    expect(headingAtomLink("  Side-Coaching ")?.id).toBe("side-coaching");
    expect(headingAtomLink("Side-coaching it")).toBeNull();
  });

  it("add at most one line per atom per page", async () => {
    const docs = await loadCorpus();
    for (const doc of docs) {
      const urls = aboutLinkUrls(doc.html);
      expect(new Set(urls).size, doc.slug).toBe(urls.length);
    }
  });
});
