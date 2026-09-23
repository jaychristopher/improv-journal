import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getAtomUrl, loadAtoms, loadBridges, loadPaths, loadThreads } from "../content";

/**
 * How much furniture a page carries for each word the author wrote.
 *
 * derived-provenance.test.ts holds the captions per page, by layer, with a
 * ceiling each. That number alone cannot see the thing entry 341 found: the
 * path page draws 7.45 captions over 242 words of body — the heaviest derived
 * furniture on the site sitting on the thinnest prose on the site — while a
 * guide draws 5.47 over 2,728. Per page the path looks like the guide plus 2;
 * per word it is 15 times the guide. A ceiling on the ratio is what fails when
 * a new block ships on a thin page, which is where a block hurts.
 *
 * Captions, not marked blocks: what a reader counts is what the stylesheet
 * draws — one caption per region, and one per marked block outside a region
 * (tracker entry 317). The walk below reads that from the built markup, the
 * same rule derived-provenance.test.ts reads, deliberately as a second small
 * implementation rather than an import: importing a test module would register
 * its suite here as well and run every reading in it twice. Its own fixture
 * below keeps it honest.
 *
 * Body words are the document's markdown, from `loadX()` — the words the
 * author wrote in `content/`, not the rendered page, because the rendered page
 * is mostly the furniture being measured.
 *
 * Ceilings, dated, that may only fall: a ceiling raised to admit a new block
 * is the finding being deleted.
 */
const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
/** A build directory is not a finished build — name a page the build always produces. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

type Layer = "guides" | "concepts" | "lessons" | "paths";

const VOID = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/**
 * The number of "computed" captions a page draws.
 *
 * `[data-derived]::before` and `[data-derived-region]::before` both draw the
 * word, and `[data-derived-region] [data-derived]::before` takes it back off a
 * marked block inside a region. So: every region, plus every marked block with
 * no region above it. Nesting is read from a stack of open elements rather
 * than from proximity, and script and style bodies are skipped because the RSC
 * payload repeats the markup inside them as escaped strings.
 */
function captionCount(html: string): number {
  let count = 0;
  const stack: { tag: string; inRegion: boolean }[] = [];
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html))) {
    const [whole, rawTag, attrs] = m;
    const tag = rawTag.toLowerCase();
    if (whole.startsWith("</")) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    if (tag === "script" || tag === "style") {
      const end = html.indexOf(`</${tag}>`, tagRe.lastIndex);
      if (end >= 0) tagRe.lastIndex = end;
      continue;
    }
    const isRegion = /\sdata-derived-region(?:=|[\s/>])/.test(attrs);
    const marked = /\sdata-derived="true"/.test(attrs);
    const enclosed = stack.some((s) => s.inRegion);
    if (isRegion) count += 1;
    else if (marked && !enclosed) count += 1;
    if (VOID.has(tag) || attrs.endsWith("/")) continue;
    stack.push({ tag, inRegion: enclosed || isRegion });
  }
  return count;
}

/** Every built page as its URL and html, `/_*` internals skipped. */
function builtPages(): { url: string; html: string }[] {
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : entry.name.endsWith(".html") ? [full] : [];
    });
  return walk(APP).flatMap((file) => {
    let url =
      "/" +
      path
        .relative(APP, file)
        .split(path.sep)
        .join("/")
        .replace(/\.html$/, "");
    if (url === "/index") url = "/";
    if (url.startsWith("/_")) return [];
    return [{ url, html: fs.readFileSync(file, "utf-8") }];
  });
}

/** Words of authored markdown, as entry 341 counted them. */
function words(markdown: string): number {
  const trimmed = markdown.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

interface Reading {
  pages: number;
  captions: number;
  documents: number;
  bodyWords: number;
}

describe("derived density", () => {
  it("counts one caption per region and one per marked block outside one", () => {
    // A region holding 2 marked blocks: 1 caption. A marked block outside
    // every region: 1. A region that is itself marked: still 1. Plain markup
    // and a marked block quoted inside a script: 0.
    const html =
      '<main><aside data-derived-region="connections" data-derived="true">' +
      '<div data-derived="true"></div><div data-derived="true"></div></aside>' +
      '<p data-derived="true">a</p><article><p>b</p></article>' +
      '<script>"<b data-derived=\\"true\\">"</script></main>';
    expect(captionCount(html)).toBe(2);
    expect(captionCount("<main><p>nothing derived here</p></main>")).toBe(0);
  });

  /**
   * Captions per body word, by layer. Read 2026-09-22 from the built site and
   * from `content/`:
   *
   *   layer      pages  captions/page  body words/doc  captions per word
   *   guides        78           5.47           2,728            0.00201
   *   concepts     205           4.00             718            0.00557
   *   lessons       25           4.08             534            0.00764
   *   paths         11           7.45             242            0.03077
   *
   * The body words are entry 341's own totals to the word: 212,791, 147,259,
   * 13,345 and 2,665.
   *
   * The lessons' ceiling is set for 4.52 a page (0.00846) rather than for the
   * 4.08 read here. The build this ran against predates the lesson crosslink
   * line, which draws its own caption on 11 of the 25 and which
   * derived-provenance.test.ts already admits at 4.6 a page; a ceiling at
   * today's build would fail on the next one for a block that shipped before
   * this test existed.
   *
   * The paths' reading is the finding: 1 caption for every 32 words the author
   * wrote, 15 times the guides' rate. The remedy entry 341 names is prose —
   * the path bodies are 242 words a page — not a lower ceiling.
   */
  it.runIf(built)("holds each layer's captions per authored word under its ceiling", async () => {
    const [atoms, bridges, threads, paths] = await Promise.all([
      loadAtoms(),
      loadBridges(),
      loadThreads(),
      loadPaths(),
    ]);
    const concepts = new Set(
      atoms.map((a) => getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })),
    );
    const guides = new Set(bridges.map((b) => `/${b.slug}`));
    const lessons = new Set(threads.map((t) => `/threads/${t.frontmatter.id}`));
    const journeys = new Set(paths.map((p) => `/paths/${p.frontmatter.id}`));
    const layerOf = (url: string): Layer | null =>
      concepts.has(url)
        ? "concepts"
        : guides.has(url)
          ? "guides"
          : lessons.has(url)
            ? "lessons"
            : journeys.has(url)
              ? "paths"
              : null;

    const per: Record<Layer, Reading> = {
      guides: { pages: 0, captions: 0, documents: 0, bodyWords: 0 },
      concepts: { pages: 0, captions: 0, documents: 0, bodyWords: 0 },
      lessons: { pages: 0, captions: 0, documents: 0, bodyWords: 0 },
      paths: { pages: 0, captions: 0, documents: 0, bodyWords: 0 },
    };
    for (const [layer, docs] of [
      ["guides", bridges],
      ["concepts", atoms],
      ["lessons", threads],
      ["paths", paths],
    ] as const) {
      per[layer].documents = docs.length;
      for (const doc of docs) per[layer].bodyWords += words(doc.content);
    }
    for (const { url, html } of builtPages()) {
      const layer = layerOf(url);
      if (!layer) continue;
      per[layer].pages += 1;
      per[layer].captions += captionCount(html);
    }

    // Guard the guard, twice over: the build must still be found (78 guides,
    // 205 concepts, 25 lessons, 11 paths on 2026-09-22), and the documents
    // must still have prose, or a ratio divides by nothing and passes.
    expect(per.guides.pages).toBeGreaterThanOrEqual(70);
    expect(per.concepts.pages).toBeGreaterThanOrEqual(200);
    expect(per.lessons.pages).toBeGreaterThanOrEqual(20);
    expect(per.paths.pages).toBeGreaterThanOrEqual(10);
    expect(per.guides.bodyWords).toBeGreaterThanOrEqual(150_000);
    expect(per.concepts.bodyWords).toBeGreaterThanOrEqual(100_000);
    expect(per.lessons.bodyWords).toBeGreaterThanOrEqual(10_000);
    expect(per.paths.bodyWords).toBeGreaterThanOrEqual(2_000);
    // And the captions must be there to count: 4 layers drawing none would
    // pass every ceiling below.
    for (const layer of ["guides", "concepts", "lessons", "paths"] as const) {
      expect(per[layer].captions, `${layer}: captions`).toBeGreaterThan(per[layer].pages);
    }

    // Measured 2026-09-22; the ceiling is the reading rounded up — the
    // lessons' for the 4.52 a page the crosslink line makes, as the table
    // above records — and may only fall. A layer whose authors add prose
    // lowers its own ratio; a layer that gains a derived block on its thinnest
    // pages raises it and fails here.
    const CEILINGS: [layer: Layer, ceiling: number][] = [
      ["guides", 0.0021],
      // 0.00568 since 2026-09-23: the lineage line (entry 331) costs one
      // caption on the 17 concept pages that carry a lineage and no lesson
      // banner, which is 4.00 captions a page becoming 4.08. Deliberate — see
      // derived-provenance.test.ts, where the same addition is accounted for.
      ["concepts", 0.0057],
      ["lessons", 0.0085],
      // 0.03265 since 2026-09-23: the persona note (entry 347) is derived and
      // now says so, in its own region on the 5 paths a persona named. The
      // agent that built it left the line unmarked to stay under this ceiling;
      // that is the ceiling deciding what the page admits to, so the marker
      // went on and the number moved instead. Paths are the thinnest layer on
      // the site (242 body words a page), which is why 5 captions move it this
      // far — the point entry 341 made.
      ["paths", 0.0327],
    ];
    for (const [layer, ceiling] of CEILINGS) {
      const reading = per[layer];
      const captionsPerPage = reading.captions / reading.pages;
      const wordsPerDoc = reading.bodyWords / reading.documents;
      const density = captionsPerPage / wordsPerDoc;
      expect(
        density,
        `${layer}: ${captionsPerPage.toFixed(2)} captions a page over ${wordsPerDoc.toFixed(0)} body words is ${density.toFixed(5)} a word`,
      ).toBeLessThanOrEqual(ceiling);
    }
  });
});
