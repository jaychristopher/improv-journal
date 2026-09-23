import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import MiniSearch from "minisearch";
import { describe, expect, it } from "vitest";

import {
  BODY_MAX,
  pathSectionsOf,
  sectionsOf,
  stripMarkdown,
  // The builder's own extractor, not a copy: a test that measured the index
  // with a second implementation would agree with itself and not with the
  // file the browser downloads.
} from "../../../scripts/build-search-index.mjs";
import { loadBridges, slugifyHeading } from "../content";
import { contentsFor } from "../headings";
import { PATH_SECTIONS, pathSectionText } from "../path-sections";
import type { PathFrontmatter } from "../schema";
import { MINISEARCH_OPTIONS } from "../search-index";

const ROOT = process.cwd();
const INDEX = path.join(ROOT, "public", "search-index.json");
const CONTENT = path.join(ROOT, "content");

/** The house form of a question heading, as guide-questions.test.ts reads it. */
const QUESTION_HEADING = /^#{2,3} (.*\?)\s*$/m;

interface Doc {
  slug: string;
  content: string;
  /** The path layer indexes 3 sections built from frontmatter fields. */
  frontmatter: Record<string, unknown>;
}

function loadLayer(subdir: string): Doc[] {
  const dir = path.join(CONTENT, subdir);
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      // CRLF-tolerant, for the reason guide-questions.test.ts gives: `\n---\n`
      // cannot match a Windows-saved file and the body comes back empty, which
      // reads here as a document with no prose and no sections at all.
      const body = raw
        .split(/\r?\n---\r?\n/)
        .slice(1)
        .join("\n---\n");
      return {
        slug: file.replace(/\.md$/, ""),
        content: body,
        frontmatter: matter(raw).data as Record<string, unknown>,
      };
    });
}

/** The share of a layer's markdown that any query can reach. */
function indexedShare(subdir: string): { docs: number; source: number; indexed: number } {
  let source = 0;
  let indexed = 0;
  let docs = 0;
  for (const doc of loadLayer(subdir)) {
    docs += 1;
    source += doc.content.length;
    const body = stripMarkdown(doc.content).substring(0, BODY_MAX);
    // The builder adds the path page's own outline to the path layer, because
    // a path body has no headings to read (tracker entry 341); measured with
    // the builder's function so this cannot agree with itself and not with the
    // index.
    const sections = [
      ...sectionsOf(doc.content, slugifyHeading),
      ...(subdir === "paths"
        ? pathSectionsOf(PATH_SECTIONS, (section) =>
            // The loader above reads every layer's frontmatter as a plain
            // record; only this branch runs, and only over content/paths.
            pathSectionText(doc.frontmatter as unknown as PathFrontmatter, section),
          )
        : []),
    ];
    indexed +=
      body.length +
      sections
        .map((section: { heading: string; lede: string }) => `${section.heading} ${section.lede}`)
        .join(" ").length;
  }
  return { docs, source, indexed };
}

interface SerializedIndex {
  storedFields: Record<string, { url: string; layer: string; sections?: { id: string }[] }>;
}

/**
 * How much of the corpus site search can reach.
 *
 * Until 2026-09-22 each document's `body` was `stripMarkdown(content)
 * .substring(0, 500)` and there was no other prose field, so the index held
 * one paragraph per page: 3.1% of a guide, 11.1% of a concept, 14.8% of a
 * lesson, 31.7% of a path, 159,500 of the corpus's 2,284,795 characters — 7.0%
 * (novel-insights 337). The consequence was measured on the layer that cares
 * most: the guides ask 342 questions in the reader's own words and answer them
 * in 42,497 words, and not one guide's first question heading fell inside the
 * window on any of the 78.
 *
 * `sections` indexes every h2 and h3 with the first sentence under it. These
 * are the floors it reached, recorded as the debt they still are: four fifths
 * of the corpus is still outside the index, and the reason is bytes —
 * public/search-index.json ships to every reader who opens the search box, so
 * the ceiling below is the other half of this bargain.
 *
 * Floors, not equalities: content is added daily and a document with more
 * prose per heading lowers its layer's share without anything being wrong.
 * A floor that falls means the field stopped being written.
 */
describe("site search reads more than each page's opening", () => {
  it("indexes the recorded share of each layer", () => {
    // Measured 2026-09-22, the figure before the field in brackets:
    //   guides    13.7% (3.1%)
    //   concepts  25.9% (11.1%)
    //   lessons   17.2% (14.8%)
    //   paths     31.7% (31.7%)
    // The paths were unchanged because none of the 11 has an h2 or an h3 —
    // they are short and unsectioned, and at 31.7% they were already the
    // best-read layer.
    //
    // Re-read 2026-09-22 (tracker entry 341): paths 52.8%, 9,174 of 17,367
    // characters against 5,500. The layer's bodies still have 0 headings; what
    // changed is that a third of a path's authored prose was never in the
    // index at all, because it is frontmatter — 1,376 words across 7 fields —
    // and the page renders those fields under 3 headings the builder now
    // indexes from path-sections.ts. So the reading is not deeper prose but
    // prose that was outside the index entirely.
    //
    // The debt that remains: the lede is one sentence per section, so most of
    // those 7 fields is still unread, and the path bodies have nothing to
    // section — 242 words a page under no heading of their own.
    const FLOORS: [subdir: string, docs: number, share: number][] = [
      ["bridges", 78, 13.5],
      ["atoms", 200, 25.5],
      ["threads", 25, 17.0],
      ["paths", 11, 52.0],
    ];

    for (const [subdir, docs, share] of FLOORS) {
      const measured = indexedShare(subdir);
      // Guard the guard: a changed directory or a failed read would otherwise
      // divide nothing by nothing and pass.
      expect(measured.docs, subdir).toBeGreaterThanOrEqual(docs);
      expect(measured.source, subdir).toBeGreaterThan(10_000);
      const percent = (measured.indexed / measured.source) * 100;
      expect(percent, `${subdir} indexes ${percent.toFixed(1)}%`).toBeGreaterThanOrEqual(share);
    }
  });

  /**
   * The corpus total the prebuild prints.
   *
   * The build script ends with `search index: N documents, M of K characters
   * indexed (P%)`, over all 5 layers including the route pages, so the next
   * boost argument starts from what is in the index rather than from what is
   * on the page. 19.5% of 2,303,243 characters on 2026-09-22, against 7.0% of
   * the 4 content layers before the field.
   */
  it("indexes more than a tenth of the four content layers", () => {
    const totals = ["bridges", "atoms", "threads", "paths"]
      .map(indexedShare)
      .reduce((sum, layer) => ({
        docs: sum.docs + layer.docs,
        source: sum.source + layer.source,
        indexed: sum.indexed + layer.indexed,
      }));
    expect(totals.docs).toBeGreaterThanOrEqual(310);
    // 18.7% on 2026-09-22, against 7.0% before the field existed; 19.1% later
    // the same day, once the paths' 3 sections were added (entry 341). The
    // floor stays at 18: the paths are 17,367 characters of 2,284,795, so the
    // layer cannot move this number much whatever happens to it.
    const percent = (totals.indexed / totals.source) * 100;
    expect(percent, `content layers index ${percent.toFixed(1)}%`).toBeGreaterThanOrEqual(18);
  });
});

/**
 * The question corpus is inside the index.
 *
 * This is the claim entry 337 turned on: 342 questions on 78 guides, no two
 * alike, every one of them outside the 500-character window, and 0 guides
 * whose first question heading fell inside it. The assertion is the inverse —
 * every guide's first question is now in the text a query can reach — and it
 * is made against the built file rather than against the extractor, so a
 * builder that stops writing the field fails here.
 */
describe("site search reaches the questions the guides answer", () => {
  it("holds every guide's first question heading as a section", () => {
    const raw = JSON.parse(fs.readFileSync(INDEX, "utf-8")) as SerializedIndex;
    const stored = Object.values(raw.storedFields);
    const guides = stored.filter((doc) => doc.layer === "guide");
    // 78 on 2026-09-22; the floor leaves room for a guide to be retired, not
    // for the layer to fall out of the index.
    expect(guides.length).toBeGreaterThanOrEqual(75);

    const missing: string[] = [];
    let asked = 0;
    for (const file of fs.readdirSync(path.join(CONTENT, "bridges"))) {
      if (!file.endsWith(".md")) continue;
      const slug = file.replace(/\.md$/, "");
      const body = fs
        .readFileSync(path.join(CONTENT, "bridges", file), "utf-8")
        .split(/\r?\n---\r?\n/)
        .slice(1)
        .join("\n---\n");
      const question = QUESTION_HEADING.exec(body);
      if (!question) continue;
      asked += 1;

      // Before the field, this index was 500 or more on all 78.
      expect(question.index, `${slug} asks its first question at 0`).toBeGreaterThan(0);

      const doc = stored.find((entry) => entry.url === `/${slug}`);
      const wanted = slugifyHeading(question[1]);
      if (!doc?.sections?.some((section) => section.id === wanted)) missing.push(slug);
    }

    expect(asked).toBeGreaterThanOrEqual(75);
    expect(missing).toEqual([]);
  });

  /**
   * A reader who types the site's own question gets the page that answers it.
   *
   * Measured 2026-09-22 over all 342 question headings, each asked verbatim
   * with the guide that asks it as the target: 117 returned their own guide
   * first and 153 in the top 3 without the field; 189 and 245 with it at the
   * boost the options module settled on. The floors are the debt: 153 of the
   * 342 questions still do not put their own guide in the top 3, and the
   * options module's sweep says the rest of that is bought by handing a named
   * page's title to a page whose heading repeats it.
   */
  it("returns the asking guide for more of its own questions than before", () => {
    const ms = MiniSearch.loadJSON(fs.readFileSync(INDEX, "utf-8"), MINISEARCH_OPTIONS);
    expect(ms.documentCount).toBeGreaterThanOrEqual(360);

    const questions: [question: string, url: string][] = [];
    for (const doc of loadLayer("bridges")) {
      for (const match of doc.content.matchAll(/^#{2,3} (.*\?)\s*$/gm)) {
        questions.push([match[1].trim(), `/${doc.slug}`]);
      }
    }
    // 342 on 2026-09-22 (guide-questions.test.ts counts the same corpus).
    expect(questions.length).toBeGreaterThanOrEqual(330);

    let first = 0;
    let topThree = 0;
    for (const [question, url] of questions) {
      const results = ms
        .search(question, MINISEARCH_OPTIONS.searchOptions)
        .map((result) => result.url as string);
      const rank = results.indexOf(url);
      if (rank === 0) first += 1;
      if (rank >= 0 && rank < 3) topThree += 1;
    }

    // 189 and 245 on 2026-09-22, against 117 and 153 before the field.
    expect(
      first,
      `${first} of ${questions.length} questions return their guide first`,
    ).toBeGreaterThanOrEqual(180);
    expect(topThree).toBeGreaterThanOrEqual(235);
  });
});

/**
 * The stored anchors are the ids the pages actually render.
 *
 * A section hit deep-links `/slug#section-id`, so an id that disagrees with
 * the page is a link to nowhere and fails silently — the browser lands at the
 * top and nothing says why. The builder slugifies with content.ts's own
 * `slugifyHeading`, the function `remarkHeadingIds` uses, and repeats that
 * plugin's duplicate rule; this checks the result against `contentsFor`, which
 * reads the ids back out of the rendered HTML.
 *
 * `contentsFor` returns nothing below MIN_HEADINGS_FOR_CONTENTS, so the
 * comparison is over the guides that have a contents list — which is nearly
 * all of them, and the population is asserted so a renderer that stopped
 * emitting ids cannot make this vacuous.
 */
describe("a section hit can be deep-linked", () => {
  it("stores the rendered id for every heading in a guide's contents list", async () => {
    const raw = JSON.parse(fs.readFileSync(INDEX, "utf-8")) as SerializedIndex;
    const stored = new Map(Object.values(raw.storedFields).map((doc) => [doc.url, doc]));

    const bridges = await loadBridges();
    expect(bridges.length).toBeGreaterThanOrEqual(75);

    const wrong: string[] = [];
    let compared = 0;
    for (const bridge of bridges) {
      const rendered = contentsFor(bridge.html);
      if (!rendered.length) continue;
      compared += 1;

      const ids = new Set(stored.get(`/${bridge.slug}`)?.sections?.map((s) => s.id) ?? []);
      for (const heading of rendered) {
        if (!ids.has(heading.id)) wrong.push(`/${bridge.slug}#${heading.id}`);
      }
    }

    // 78 guides carry a contents list on 2026-09-22; 70 is the floor.
    expect(compared).toBeGreaterThanOrEqual(70);
    expect(wrong).toEqual([]);
  });

  /**
   * What the depth costs, in bytes.
   *
   * public/search-index.json is downloaded whole by every reader who opens the
   * search box, so a field that indexes more of the corpus is paid for there.
   * Measured 2026-09-22: 445,810 bytes before, 944,326 after — 2.12 times, of
   * which 212,649 is the stored anchors (2,665 sections, an id and a heading
   * each) and the rest is postings for the words under those headings. The
   * sentence is capped at SECTION_LEDE_MAX in the builder; uncapped the file
   * is 975,573, so the cap buys 31,247 bytes and cannot on its own bring the
   * growth under twice, because the anchors are the larger half and nothing
   * shrinks them but storing fewer sections.
   *
   * The ceiling is 1,050,000 — room for the corpus to grow, not for another
   * field. Anything that needs more than this needs the argument made again:
   * the next place to look is storing anchors only for the layers a reader
   * searches into, or dropping the heading text and rendering the id.
   */
  it("keeps the shipped index under its recorded ceiling", () => {
    const bytes = fs.statSync(INDEX).size;
    // A truncated or unwritten file would otherwise pass a ceiling.
    expect(bytes).toBeGreaterThan(500_000);
    expect(bytes, `search-index.json is ${bytes} bytes`).toBeLessThanOrEqual(1_050_000);
  });
});
