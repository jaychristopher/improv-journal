import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getAtomUrl, loadAtoms, loadBridges, loadPaths, loadThreads } from "../content";

/**
 * Which links the author chose, and which the code did.
 *
 * An author-written link is about a quarter of a guide's page-specific links
 * and 2–5% of a concept's, lesson's or path's; the rest is the linker's title
 * matching and the derived blocks — the sidebar's groups, the concept and
 * drill blocks, the hand-off, the related rail, the lineage line, the
 * transcript's links — each reading a field the author wrote once through a
 * rule the code applies. A reader could not tell a chosen link from a
 * computed one; entry 294's "(listed, not discussed)" was the only mark of
 * provenance on any block (tracker entry 310, 2026-09-22).
 *
 * The marker: every derived block carries `data-derived="true"` on its
 * outermost tracked wrapper, and globals.css puts one "computed" caption on
 * it as generated content, so the word reaches a reader and not the search
 * index, the JSON-LD or a test that counts words. A tracked block inside a
 * marked wrapper (the sidebar's sources, the lesson panel's three lists)
 * inherits the marker and carries no second caption. The article, the
 * breadcrumb, the byline, the nav and the footer carry nothing, and so do the
 * page's own words wherever they render outside the article.
 *
 * Presence, not markup: the failure modes are a new derived block shipped
 * without the marker, a marker put on the author's prose, and a doubled
 * caption where a marked block is mounted inside another.
 *
 * Once per region (tracker entry 317, 2026-09-22). The marker did its job
 * and became the page's most repeated word — 5.5 captions on a guide, 4.8 on
 * a concept, 4.1 on a lesson, 7.5 on a path when this was measured — so a
 * wrapper that holds several derived blocks carries `data-derived-region`
 * and draws the one caption for everything inside it; the blocks inside
 * keep `data-derived` (this test's attribute sweep is unchanged) and the
 * stylesheet's second rule takes their word away. A block outside any region
 * keeps its own caption. The captions test below reads the number a page
 * actually says "computed", by layer, with a ceiling per layer.
 */
const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
/** A build directory is not a finished build — name a page the build always produces. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * Tracked blocks that are not derived, by name, with the file that renders
 * each and why it carries no marker. The chrome first; then the page's own
 * words wherever they render outside the article; then the tool a guide
 * mounts; then the two hub sections written by hand in the page.
 */
const EXEMPT: { name: string; file: string; why: string }[] = [
  { name: "nav", file: "src/components/Nav.tsx", why: "chrome" },
  { name: "footer", file: "src/components/Footer.tsx", why: "chrome" },
  { name: "breadcrumb", file: "src/components/Breadcrumb.tsx", why: "chrome" },
  { name: "byline", file: "src/components/UpdatedOn.tsx", why: "chrome" },
  { name: "body", file: "src/components/AtomDetail.tsx", why: "the article" },
  {
    name: "attribution",
    file: "src/components/AtomDetail.tsx",
    why: "the article's own Attribution note, cut from the body and rendered under it",
  },
  {
    name: "guide-problem",
    file: "src/app/[slug]/page.tsx",
    why: "the author's primary_problem sentence, verbatim, no link",
  },
  {
    name: "lesson-overview",
    file: "src/components/LessonFrame.tsx",
    why: "the lesson's own lesson_goal and key_takeaway",
  },
  { name: "listen", file: "src/components/LessonFrame.tsx", why: "the lesson's own episode" },
  {
    name: "lesson-reps",
    file: "src/components/LessonFrame.tsx",
    why: "the lesson's own practice prompts; the drill row inside is derived and unmarked (debt)",
  },
  {
    name: "path-why-order",
    file: "src/app/paths/[slug]/page.tsx",
    why: "the path's authored body — its <article>",
  },
  {
    name: "path-listen",
    file: "src/app/paths/[slug]/page.tsx",
    why: "the path's own essay; the transcript fold inside it is marked on its own",
  },
  {
    name: "prompt-generator",
    file: "src/components/PromptGenerator.tsx",
    why: "an interactive tool, not a link block",
  },
  {
    name: "would-you-rather",
    file: "src/components/WouldYouRather.tsx",
    why: "an interactive tool, not a link block — the same case as the generator above",
  },
  {
    name: "collapse-modes",
    file: "src/app/how-it-works/diagnosis/page.tsx",
    why: "argued by hand in the page, links chosen",
  },
  {
    name: "diagnosis-faq",
    file: "src/app/how-it-works/diagnosis/page.tsx",
    why: "argued by hand in the page, links chosen",
  },
];
const EXEMPT_NAMES = new Set(EXEMPT.map((e) => e.name));

/**
 * Hubs whose sections were outside this change, as of 2026-09-22: 274
 * tracked blocks on 58 hub pages, mixing lists the code assembles
 * (guide-category, episode-list, exercise-list) with sections argued by
 * hand (which-layer, games-faq, techniques-faq), and each owner decides
 * which is which. By route family, asserted exactly, so marking one without
 * striking it here fails and so does a new hub shipping unmarked. The four
 * hubs this change did classify — the traditions, the topic clusters, the
 * diagnosis hub and the principles hub — are held to the rule below.
 */
const HUB_DEBT = [
  "/",
  "/about",
  "/guides",
  "/how-it-works",
  "/how-it-works/the-core",
  "/improv-games",
  "/learn/[audience]",
  "/library",
  "/listen",
  "/listen/[show]",
  "/paths",
  "/practice",
  "/practice/exercises",
  "/practice/formats",
  "/practice/techniques",
  "/practice/vocabulary",
  "/resources",
  "/sources/[slug]",
  "/threads",
  "/tools/exercise-picker",
  "/traditions",
];

/** A hub route's family, so the debt is a list of routes and not of pages. */
function family(url: string): string {
  if (url.startsWith("/learn/")) return "/learn/[audience]";
  if (url.startsWith("/listen/")) return "/listen/[show]";
  if (url.startsWith("/sources/")) return "/sources/[slug]";
  if (url.startsWith("/tools/exercise-picker")) return "/tools/exercise-picker";
  return url;
}

const OWNED_HUB = /^\/(traditions\/[^/]+|topics\/[^/]+|how-it-works\/(diagnosis|principles))$/;

type Layer = "guides" | "concepts" | "lessons" | "paths" | "hubs";

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : e.name.endsWith(".html") ? [full] : [];
  });
}

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

interface Block {
  name: string;
  /** The wrapper itself carries `data-derived="true"`. */
  own: boolean;
  /** An ancestor carries it: the block inherits the marker and the caption. */
  inherited: boolean;
  inMain: boolean;
}

/**
 * Every `data-track` wrapper in a page with its own and inherited marker,
 * by nesting rather than proximity — a stack of open elements, as
 * link-tracking.test.ts reads the same html. Script and style bodies are
 * skipped: the RSC payload holds the markup again as escaped strings.
 */
function trackedBlocks(html: string): Block[] {
  const out: Block[] = [];
  const stack: { tag: string; derived: boolean }[] = [];
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
    const name = attrs.match(/\sdata-track="([^"]*)"/)?.[1];
    const own = /\sdata-derived="true"/.test(attrs);
    if (name) {
      out.push({
        name,
        own,
        inherited: stack.some((s) => s.derived),
        inMain: stack.some((s) => s.tag === "main"),
      });
    }
    if (VOID.has(tag) || attrs.endsWith("/")) continue;
    stack.push({ tag, derived: own });
  }
  return out;
}

/** A built page's layer, from the content that produced it. */
async function layerClassifier(): Promise<(url: string) => Layer> {
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
  return (url) =>
    concepts.has(url)
      ? "concepts"
      : guides.has(url)
        ? "guides"
        : lessons.has(url)
          ? "lessons"
          : journeys.has(url)
            ? "paths"
            : "hubs";
}

/** Every built page as its URL and html, `/_*` internals skipped. */
function builtPages(): { url: string; html: string }[] {
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

interface Captions {
  /** Elements the stylesheet draws "computed" on: a region, or a marked block outside one. */
  count: number;
  /** Each captioned element by its `data-track` name, or `region:` and the region's name. */
  names: string[];
  /** Regions inside regions: both would draw, so the count would double. */
  nestedRegions: string[];
  /** Regions holding no marked block and carrying no marker: a caption over nothing. */
  emptyRegions: string[];
}

/**
 * What the stylesheet renders, read from the markup by the same nesting walk
 * as trackedBlocks: `[data-derived-region]::before` draws on every region and
 * `[data-derived]::before` on every marked block, less the marked blocks the
 * second rule finds inside a region. The RSC payload is skipped as above.
 */
function captionsOn(html: string): Captions {
  const out: Captions = { count: 0, names: [], nestedRegions: [], emptyRegions: [] };
  const stack: { tag: string; region: string | null; marked: number }[] = [];
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html))) {
    const [whole, rawTag, attrs] = m;
    const tag = rawTag.toLowerCase();
    if (whole.startsWith("</")) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag === tag) {
          const closed = stack[i];
          if (closed.region !== null && closed.marked === 0) out.emptyRegions.push(closed.region);
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
    const region = attrs.match(/\sdata-derived-region(?:="([^"]*)")?/);
    const regionName = region ? (region[1] ?? "region") : null;
    const own = /\sdata-derived="true"/.test(attrs);
    const name = attrs.match(/\sdata-track="([^"]*)"/)?.[1] ?? tag;
    const enclosing = [...stack].reverse().find((s) => s.region !== null);
    if (regionName !== null) {
      out.count++;
      out.names.push(`region:${regionName}`);
      if (enclosing) out.nestedRegions.push(`${enclosing.region} > ${regionName}`);
    } else if (own && !enclosing) {
      out.count++;
      out.names.push(name);
    }
    // A region's own marker counts as its content: the sidebar and the lesson
    // panel are both a marked block and the region around their lists.
    if (own) for (const s of stack) if (s.region !== null) s.marked++;
    if (VOID.has(tag) || attrs.endsWith("/")) continue;
    stack.push({ tag, region: regionName, marked: own ? 1 : 0 });
  }
  return out;
}

describe("derived provenance", () => {
  it("parses nesting rather than proximity, and inheritance rather than repetition", () => {
    const html =
      '<main><p data-track="series" data-derived="true"><a href="/a">a</a></p>' +
      '<aside data-track="concept-sidebar" data-derived="true"><div data-track="sources"></div></aside>' +
      '<article data-track="body"></article></main>' +
      '<div data-track="next-principle" data-derived="true"><script>"<b data-track=\\"x\\">"</script></div>';
    expect(trackedBlocks(html)).toEqual([
      { name: "series", own: true, inherited: false, inMain: true },
      { name: "concept-sidebar", own: true, inherited: false, inMain: true },
      { name: "sources", own: false, inherited: true, inMain: true },
      { name: "body", own: false, inherited: false, inMain: true },
      { name: "next-principle", own: true, inherited: false, inMain: false },
    ]);
  });

  it("keeps the marker off the exempt blocks at the source", () => {
    for (const { name, file } of EXEMPT) {
      const src = fs.readFileSync(path.join(ROOT, file), "utf-8");
      const tags = [...src.matchAll(/<[a-zA-Z]+[^>]*\sdata-track="([^"]*)"[^>]*>/g)].filter(
        (t) => t[1] === name,
      );
      expect(tags.length, `${file}: ${name}`).toBeGreaterThan(0);
      for (const t of tags) expect(t[0], `${file}: ${name}`).not.toContain("data-derived");
    }
  });

  it("draws one caption from the stylesheet, on a block or on its region, never both", () => {
    const css = fs.readFileSync(path.join(ROOT, "src", "app", "globals.css"), "utf-8");
    // Two rules and one word: the caption, drawn on a marked block and on a
    // region wrapper alike, and the suppression that takes it off a marked
    // block inside a region. A third rule generating content, or a caption
    // with different copy, would show up here as another match.
    const rules = css.match(/\[data-derived[^{]*\{[^}]*content:[^}]*\}/g) ?? [];
    expect(rules).toHaveLength(2);
    const [caption = "", inner = ""] = rules;
    const selectors = caption
      .slice(0, caption.indexOf("{"))
      .split(",")
      .map((sel) => sel.trim());
    expect(selectors).toEqual(["[data-derived]::before", "[data-derived-region]::before"]);
    expect(caption).toContain('content: "computed"');
    // A block of its own, full width, so a flex row keeps it on its own row.
    expect(caption).toContain("display: block");
    expect(caption).toContain("width: 100%");
    // A descendant selector, so the region itself keeps its caption and a
    // region's own `data-derived` (the sidebar, the lesson panel) draws the
    // same pseudo-element once rather than twice.
    expect(inner).toMatch(/^\[data-derived-region\] \[data-derived\]::before\s*\{/);
    expect(inner).toMatch(/content:\s*none/);
  });

  it.runIf(built)(
    "marks every derived block on the built pages, once, and nothing the author wrote",
    async () => {
      const layerOf = await layerClassifier();

      const per: Record<Layer, { pages: number; marked: number; unmarked: number }> = {
        guides: { pages: 0, marked: 0, unmarked: 0 },
        concepts: { pages: 0, marked: 0, unmarked: 0 },
        lessons: { pages: 0, marked: 0, unmarked: 0 },
        paths: { pages: 0, marked: 0, unmarked: 0 },
        hubs: { pages: 0, marked: 0, unmarked: 0 },
      };
      const marked = new Map<string, number>();
      const exemptMarked: string[] = [];
      const doubled: string[] = [];
      const unmarked: string[] = [];
      const hubDebt = new Set<string>();
      let pages = 0;

      for (const { url, html } of builtPages()) {
        pages++;
        const layer = layerOf(url);
        per[layer].pages++;
        for (const b of trackedBlocks(html)) {
          // The exempt set never carries the marker, in or out of main.
          if (EXEMPT_NAMES.has(b.name)) {
            if (b.own) exemptMarked.push(`${url} ${b.name}`);
            continue;
          }
          // One caption per block: a marked wrapper inside a marked wrapper
          // would draw two, and the inner one is what the lesson panel's
          // lists and the sidebar's blocks were told to inherit instead.
          if (b.own && b.inherited) doubled.push(`${url} ${b.name}`);
          // The principles' next-card sits after main; every other tracked
          // block outside main is chrome, and the chrome is exempt above.
          if (!b.inMain && b.name !== "next-principle") continue;
          if (b.own || b.inherited) {
            per[layer].marked++;
            marked.set(b.name, (marked.get(b.name) ?? 0) + 1);
          } else {
            per[layer].unmarked++;
            if (layer === "hubs" && !OWNED_HUB.test(url)) hubDebt.add(family(url));
            else unmarked.push(`${url} ${b.name}`);
          }
        }
      }

      // Guard the guard: the walk must still find the site, and the layer
      // selectors their pages (377 pages on 2026-09-22: 78 guides, 205
      // concepts, 25 lessons, 11 paths, 58 hubs).
      expect(pages).toBeGreaterThanOrEqual(370);
      expect(per.guides.pages).toBeGreaterThanOrEqual(70);
      expect(per.concepts.pages).toBeGreaterThanOrEqual(200);
      expect(per.lessons.pages).toBeGreaterThanOrEqual(20);
      expect(per.paths.pages).toBeGreaterThanOrEqual(10);
      expect(per.hubs.pages).toBeGreaterThanOrEqual(30);

      // And the blocks the rule is for must still be there to mark: on
      // 2026-09-22 the sidebar 173, the transcript 319, the series line 308,
      // the guide's concept block 78, the lesson panel 25 (its three lists
      // inherit), the next-atom router 119.
      for (const [name, floor] of [
        ["concept-sidebar", 165],
        ["transcript", 300],
        ["series", 300],
        ["guide-concepts", 70],
        ["lesson-panel", 20],
        ["composed-from", 20],
        ["next-atom", 100],
      ] as const) {
        expect(marked.get(name) ?? 0, name).toBeGreaterThanOrEqual(floor);
      }
      // Marked blocks per layer on the day: guides 388, concepts 1,083,
      // lessons 168, paths 82; floors just under, may only rise.
      expect(per.guides.marked).toBeGreaterThanOrEqual(380);
      expect(per.concepts.marked).toBeGreaterThanOrEqual(1050);
      expect(per.lessons.marked).toBeGreaterThanOrEqual(160);
      expect(per.paths.marked).toBeGreaterThanOrEqual(80);

      expect(exemptMarked, "exempt blocks carrying the marker").toEqual([]);
      expect(doubled, "marked wrappers inside marked wrappers").toEqual([]);
      expect(unmarked, "derived blocks without the marker").toEqual([]);
      expect([...hubDebt].sort()).toEqual([...HUB_DEBT].sort());
    },
  );

  /**
   * Captions rendered per page, by layer: what a reader counts, as distinct
   * from the marked blocks the sweep above counts. Read on 2026-09-22 before
   * and after the regions (tracker entry 317):
   *
   *   layer     pages   before   after   ceiling
   *   guides       78     5.47    5.47     5.5   residue, see below
   *   concepts    205     4.84    4.00     4.1   the lineage line of entry 331
   *                                              took it to 4.08 on 2026-09-23
   *   lessons      25     4.08    4.08     4.6   residue, see below, and the
   *                                              crosslink line of entry 339
   *                                              took it to 4.52 the same day
   *   paths        11     7.45    7.45     7.95  residue, see below; the
   *                                              persona note of entry 347
   *                                              took it to 7.91 on 2026-09-23
   *   hubs         58     0.93    0.93     —     no ceiling; the marked hubs are few
   *
   * The regions this change could reach are the concept page's connections
   * column, its after-article strip (transcript + router) and the lesson
   * panel, all in components. The ceiling is 4 where a layer reaches it and
   * just over the measure where it cannot, because the blocks that would fold
   * into a region are mounted in a page file this change did not own; each
   * such layer's residue, by route, so the next change knows where the
   * captions are:
   *
   * - guides, src/app/[slug]/page.tsx: the after-article strip (the CTA
   *   card, "one more useful step", the concept block and the related rail)
   *   shares a wrapper in the page and would fold four captions into one;
   *   the series line and the lineage line stand above the article.
   * - lessons, src/app/threads/[slug]/page.tsx: the transcript and the
   *   panel are siblings in the page; the series line (in the listen frame),
   *   the prev/next nav and the crosslink line under the byline stand alone.
   * - paths, src/app/paths/[slug]/page.tsx: every block but the transcript
   *   is in the page — the audience pills, the overlap line, the start
   *   buttons, the leans-on list, the forward-needs list, the program map
   *   and the start card.
   * - concepts: the exercise-picker link under the grid (27 exercise pages
   *   at 5) and the principles' next card after main (9 pages at 5) hold the
   *   mean at exactly 4.00; the library pages (32) render four blocks in the
   *   page and no region.
   *
   * Ceilings, not floors: a new derived block that ships inside a region
   * draws nothing extra, and one shipped outside a region on the concept
   * layer breaks 4 — mount it in a region or account for it here.
   */
  it.runIf(built)(
    'says "computed" once per region, and no more than the layer\'s ceiling',
    async () => {
      const layerOf = await layerClassifier();
      const per: Record<Layer, { pages: number; captions: number }> = {
        guides: { pages: 0, captions: 0 },
        concepts: { pages: 0, captions: 0 },
        lessons: { pages: 0, captions: 0 },
        paths: { pages: 0, captions: 0 },
        hubs: { pages: 0, captions: 0 },
      };
      const regions = new Map<string, number>();
      const nested: string[] = [];
      const empty: string[] = [];

      for (const { url, html } of builtPages()) {
        const layer = layerOf(url);
        const c = captionsOn(html);
        per[layer].pages++;
        per[layer].captions += c.count;
        for (const n of c.names) {
          if (n.startsWith("region:")) regions.set(n, (regions.get(n) ?? 0) + 1);
        }
        for (const n of c.nestedRegions) nested.push(`${url} ${n}`);
        for (const n of c.emptyRegions) empty.push(`${url} ${n}`);
      }

      // Guard the guard: the regions must be there to count. On 2026-09-22
      // the connections column on 169 concept pages, the after-article strip
      // on 173 (the 205 less the 32 library pages, which render in their own
      // route and not through AtomDetail), the lesson panel on 25.
      expect(regions.get("region:connections") ?? 0).toBeGreaterThanOrEqual(160);
      expect(regions.get("region:after-article") ?? 0).toBeGreaterThanOrEqual(165);
      expect(regions.get("region:lesson-panel") ?? 0).toBeGreaterThanOrEqual(20);
      expect(per.guides.pages).toBeGreaterThanOrEqual(70);
      expect(per.concepts.pages).toBeGreaterThanOrEqual(200);
      expect(per.lessons.pages).toBeGreaterThanOrEqual(20);
      expect(per.paths.pages).toBeGreaterThanOrEqual(10);

      // A region inside a region draws twice; a region around nothing marked
      // draws a caption over the author's words.
      expect(nested, "regions inside regions").toEqual([]);
      expect(empty, "regions holding no marked block").toEqual([]);

      const perPage = (l: Layer) => per[l].captions / per[l].pages;
      // 4.08 since 2026-09-23. The lineage line (entry 331) shares the
      // concept page's context region with the lesson banner, so on the 116
      // pages that have both it costs nothing — but on the 17 that carry a
      // lineage and no banner the region is new, and one caption with it.
      // Marking it was deliberate: the line is derived, and leaving it
      // unmarked to stay under a ceiling would have been the ceiling deciding
      // what the page admits to.
      expect(perPage("concepts"), "concepts: captions per page").toBeLessThanOrEqual(4.1);
      expect(perPage("guides"), "guides: captions per page").toBeLessThanOrEqual(5.5);
      // 4.52 since 2026-09-22: the crosslink line (LessonCrosslink.tsx) is
      // derived, stands under the byline above the article, and is outside
      // every region on the page — the transcript and the panel are siblings
      // in the route file, as the residue note above records — so it draws
      // its own caption on the 11 lessons that get one. 102 captions over 25
      // pages became 113. Folding the line, the transcript and the panel into
      // one region is the route file's change, not this block's.
      expect(perPage("lessons"), "lessons: captions per page").toBeLessThanOrEqual(4.6);
      expect(perPage("paths"), "paths: captions per page").toBeLessThanOrEqual(7.95);
    },
  );
});
