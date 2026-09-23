import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getAtomUrl, loadAtoms } from "../content";
import { type Relation, RELATION_LABELS } from "../relation-labels";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build. Name a page the build always produces. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * The About page's checkable claims, held against the build.
 *
 * The page makes four claims about the graph and on 2026-09-22 two were
 * true, one true in the letter, and one described a label 319 pages carried
 * and one page showed (tracker entry 318). "The reading list holds the 32
 * works … each with the ideas it supports linked back" became true at entry
 * 268, when 13 works still had no cited-by block; "every page can show you
 * what it depends on" became true in the direct sense at entry 277; "what
 * follows from it" was rendered as "Unlocks", which entry 314 found points
 * at another abstraction nine times in ten, so the sentence now names the
 * three labels the page renders; and "content carries a status of seed,
 * draft, or validated" was honest about a field no content page printed.
 *
 * None of that was measured, because the claims are prose on a hub (entry
 * 278) and no count of the graph reads prose. These do: each sentence the
 * page can be held to is held to the built html, so the page cannot promise
 * a feature the site has stopped having. Presence, not markup.
 */

const page = (route: string) =>
  fs
    .readFileSync(path.join(APP, `${route.replace(/^\//, "")}.html`), "utf-8")
    .replace(/<script[\s\S]*?<\/script>/g, "");

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

/** The About page's own sentence for a claim, by the attribute the page marks it with. */
function aboutSentence(attr: string): string {
  const m = new RegExp(`<p ${attr}[^>]*>([\\s\\S]*?)</p>`).exec(page("/about"));
  expect(m, `the About page marks a paragraph ${attr}`).not.toBeNull();
  return text(m![1]);
}

describe("about claims", () => {
  it.runIf(built)("the reading list: every work carries 'Pages that cite it'", async () => {
    const atoms = await loadAtoms();
    const works = atoms.filter((a) => a.frontmatter.type === "reference");
    const without: string[] = [];
    let checked = 0;
    for (const work of works) {
      const url = getAtomUrl({ id: work.frontmatter.id, type: work.frontmatter.type });
      const file = path.join(APP, `${url.replace(/^\//, "")}.html`);
      if (!fs.existsSync(file)) continue;
      checked++;
      if (!page(url).includes("Pages that cite it")) without.push(url);
    }
    // 32 works on 2026-09-22, 32 of 32 with the block (19 of 32 before entry 268).
    expect(checked).toBeGreaterThanOrEqual(30);
    expect(without).toEqual([]);
    // And the page says the number it holds.
    expect(text(page("/about"))).toContain(`holds the ${works.length} works`);
  });

  it.runIf(built)(
    "what it builds on: every concept with a requirement renders Builds on",
    async () => {
      const atoms = await loadAtoms();
      const concepts = atoms.filter(
        (a) =>
          a.frontmatter.type !== "reference" &&
          a.frontmatter.links.some((l) => l.relation === "requires"),
      );
      const without: string[] = [];
      let checked = 0;
      for (const atom of concepts) {
        const url = getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type });
        const file = path.join(APP, `${url.replace(/^\//, "")}.html`);
        if (!fs.existsSync(file)) continue;
        checked++;
        const aside =
          page(url).split('data-track="concept-sidebar"')[1]?.split("</aside>")[0] ?? "";
        if (!aside.includes(`>${RELATION_LABELS.requires.outbound}<`)) without.push(url);
      }
      // 160-odd concepts declare `requires` on 2026-09-22; a filter that reads
      // the links as empty would pass on nothing.
      expect(checked).toBeGreaterThanOrEqual(100);
      expect(without).toEqual([]);
    },
  );

  it.runIf(built)("the graph sentence names the labels the concept page renders", () => {
    const sentence = aboutSentence("data-about-graph");
    // "Builds on", "Unlocks" and "Drills that train this" are the groups the
    // sidebar renders (relation-labels.ts); the sentence says them in its
    // own voice. A label renamed there without the sentence following fails.
    expect(sentence.toLowerCase()).toContain(RELATION_LABELS.requires.outbound.toLowerCase());
    expect(sentence.toLowerCase()).toContain(RELATION_LABELS.enables.outbound.toLowerCase());
    expect(sentence).toContain("trains it");
  });

  it.runIf(built)("the relation sentence names all five relations", () => {
    const about = text(page("/about"));
    const li = /(\d+ atoms[^.]*\.)\s*Each links to ([^.]*)\./.exec(about);
    expect(li, "the atoms item says what each links to").not.toBeNull();
    const named = li![2];
    // The relation's own word, or the page's plain English for it:
    // `contrasts` reads "contradicts" on the About page, as it has since the
    // first commit; the other four are named as the schema names them. (Not
    // a map — relation-labels.test.ts forbids a second relation vocabulary
    // anywhere under src/, this file included.)
    const relations = Object.keys(RELATION_LABELS) as Relation[];
    expect(relations).toHaveLength(5);
    for (const relation of relations) {
      const word = relation === "contrasts" ? "contradicts" : relation;
      expect(named, `the atoms item names ${relation}`).toContain(word);
    }
  });

  it.runIf(built)("the status sentence names the byline and the three states", () => {
    const sentence = aboutSentence("data-about-status");
    expect(sentence).toContain("byline");
    for (const status of ["seed", "draft", "validated"]) expect(sentence).toContain(status);
    // The promise the sentence has made since the first commit stays in it.
    expect(sentence).toContain("a draft is a draft");
  });
});
