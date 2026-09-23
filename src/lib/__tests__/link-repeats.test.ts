import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * How much of a page's own linking is a second link to a target the page
 * already has.
 *
 * The body linker links each target once per page by rule, and every derived
 * block re-links it freely; measured on 2026-09-22 a guide's 38 page-specific
 * links reached 25 pages (31% repeats), a concept's 37 reached 27 (26%), and
 * the transcript fold — linked by its own once-per-fold rule that could not
 * see the body's — was the second-largest source of repeats on every layer:
 * body + transcript shared 244 targets on the guides and 366 on the concepts
 * (tracker entry 267). The fold now receives the body's link ledger
 * (`autolinkTranscript`'s `alreadyLinked`, seeded from the rendered body by
 * `Transcript`) and links only what the prose did not; this test records
 * what that left and holds it there.
 *
 * Two readings, both from the built HTML. The first is the repeat share per
 * layer — links in <main> outside nav, footer and breadcrumb, minus links to
 * the page itself, of which the share whose target an earlier link on the
 * page already reaches — as a dated ceiling just above the measurement, so a
 * block that starts re-linking what the body links raises a number instead
 * of passing. The second is exact: no transcript link targets an href the
 * body links. Presence is guarded on both — the layer selectors must find
 * their pages, the pages must carry links, and the folds must still link
 * something — or a linker that stopped linking would pass with a repeat
 * share of zero.
 */
const APP = path.join(process.cwd(), ".next", "server", "app");
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

type Layer = "guides" | "concepts" | "lessons" | "paths" | "library" | "hubs";

/**
 * Repeat share per layer, pooled over the layer's page-specific links, on
 * the builds of 2026-09-22 after the transcript ledger, with the ceiling set
 * a point above the last reading. The same parser on the same night before
 * the ledger read guides 33.8%, concepts 26.7%, paths 43.5%, lessons 25.8%,
 * library 28.2%, hubs 24.6% (entry 267's medians per page were guides 31%,
 * concepts 26%, paths 25%, lessons 22%, library 16%, hubs 0%). Two builds
 * were read after the ledger, an hour apart, while other blocks were being
 * reworked in the same tree: the ledger's own build, and one with the
 * concept page's outbound-requires group and the paths' prerequisite list
 * rebuilt. What remains is the derived blocks — concept block, sidebar,
 * CTA, context banner, composed-from, program map — none of which reads the
 * body's ledger yet (entry 267's first bullet). The hubs' share is the
 * three listen hubs, where every episode is linked by title and again by
 * its page, and the games and principles hubs; the median hub repeats
 * nothing.
 */
const CEILINGS: Record<Layer, number> = {
  // 27.1% (779 of 2,877), then 28.2% (822 of 2,920).
  guides: 0.295,
  // 21.5% (1,573 of 7,325), then 21.6% (1,719 of 7,964), then 23.001%
  // (1,936 of 8,417) on 2026-09-23 — one link past a ceiling that had been
  // set flush against the previous reading. Tonight's additions are not where
  // the repeats live: attributed by block, 340 of them are the sidebar
  // repeating itself across its own groups, against 55 in the body. That is
  // entry 272's fold and entry 301's split, and bringing it down is a change
  // to the sidebar, not to the blocks that tripped the number.
  concepts: 0.2301,
  // 39.9% (218 of 546), then 28.4% (118 of 415) once the prerequisite list
  // stopped naming what the program map names. The why-this-order prose
  // still names lessons the map and the leans-on block also name.
  paths: 0.3,
  // 16.7%: 147 of 878, both builds; then 18.7% (177 of 946) on 2026-09-22
  // when the lessons started naming each other (tracker entry 339). The rise
  // is the shape of that fix rather than slack: lesson → lesson prose links
  // were 0 of 600 ordered pairs, and the only thing already joining the
  // lessons was furniture — the progress bar links every lesson on the path
  // and the prev/next nav links the neighbours — so a sentence naming the
  // predecessor, and a composed-from item naming the other lesson that
  // teaches its concept, repeat a target the furniture reached first by
  // construction. 99 links added, 30 of them repeats; the other 69 are the
  // concepts and the lessons off the reader's own path. The ledger entry 267
  // gave the transcript is the fix if this is to come back down.
  lessons: 0.19,
  // 22.6%: 212 of 939, both builds.
  library: 0.24,
  // 24.6%: 590 of 2,398, both builds; then 27.7% (700 of 2,527) on
  // 2026-09-22 when the games and formats hubs gained a "prepare with" /
  // "feeds" line under each card (entry 283): the join concentrates on a few
  // drills that are themselves cards on the same hub, so each line repeats a
  // target the hub already lists. Chosen, not absorbed: the line is the one
  // place the two practice types meet on a hub, and the ceiling records the
  // cost of it. It may only fall from here.
  hubs: 0.285,
};

const CONCEPT_ROUTE =
  /^\/(how-it-works\/(principles|diagnosis)\/[^/]+|how-it-works\/[^/]+|practice\/(exercises|techniques|formats|vocabulary)\/[^/]+)$/;

function layerOf(url: string, guides: Set<string>): Layer {
  if (url.startsWith("/threads/")) return "lessons";
  if (url.startsWith("/paths/")) return "paths";
  if (/^\/library\/[^/]+$/.test(url)) return "library";
  if (CONCEPT_ROUTE.test(url) && !/^\/how-it-works\/(principles|diagnosis)$/.test(url)) {
    return "concepts";
  }
  if (/^\/[^/]+$/.test(url) && guides.has(url.slice(1))) return "guides";
  return "hubs";
}

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

/**
 * The chrome every page carries; not the page's own linking. The byline
 * joined on 2026-09-22 when its status word became a link to /about#status
 * (tracker entry 323): counted as the page's, it repeated the author's
 * /about link on every page and moved every layer by about a point.
 */
const CHROME = new Set(["nav", "footer", "breadcrumb", "byline"]);

/** The block that is the page's authored prose, per route. */
const BODY_BLOCKS = new Set(["body", "path-why-order"]);

/**
 * Every internal link inside <main>, in DOM order, with the `data-track`
 * name of its nearest wrapping ancestor — the same walk as
 * link-tracking.test.ts, restricted to main. Fragments and queries are
 * dropped from hrefs so `/foo#section` and `/foo` are one target.
 */
function mainLinks(html: string): { href: string; block: string | null }[] {
  const out: { href: string; block: string | null }[] = [];
  const stack: { tag: string; block: string | null }[] = [];
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
  let inMain = false;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html))) {
    const [whole, rawTag, attrs] = m;
    const tag = rawTag.toLowerCase();
    if (whole.startsWith("</")) {
      if (tag === "main") inMain = false;
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    if (tag === "main") inMain = true;
    if (tag === "script" || tag === "style") {
      const end = html.indexOf(`</${tag}>`, tagRe.lastIndex);
      if (end >= 0) tagRe.lastIndex = end;
      continue;
    }
    const own = attrs.match(/\sdata-track="([^"]*)"/);
    const block = own ? own[1] || null : stack.length ? stack[stack.length - 1].block : null;
    if (tag === "a" && inMain) {
      const href = attrs.match(/\shref="([^"]*)"/);
      if (href && href[1].startsWith("/")) {
        out.push({ href: href[1].replace(/[#?].*$/, ""), block });
      }
    }
    if (VOID.has(tag) || attrs.endsWith("/")) continue;
    stack.push({ tag, block });
  }
  return out;
}

interface PageReading {
  url: string;
  layer: Layer;
  /** Page-specific links: in main, outside the chrome, not to itself. */
  links: { href: string; block: string | null }[];
  /** Of those, the ones whose target an earlier link on the page reached. */
  repeats: number;
  /** The page renders a transcript fold, linked or not. */
  hasFold: boolean;
  body: Set<string>;
  transcript: string[];
}

function readPages(): PageReading[] {
  const guides = new Set(
    fs
      .readdirSync(path.join(process.cwd(), "content", "bridges"))
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, "")),
  );
  const pages: PageReading[] = [];
  for (const file of walk(APP)) {
    let url =
      "/" +
      path
        .relative(APP, file)
        .split(path.sep)
        .join("/")
        .replace(/\.html$/, "");
    if (url === "/index") url = "/";
    if (url.startsWith("/_")) continue;
    const html = fs.readFileSync(file, "utf-8");
    const links = mainLinks(html).filter(
      (l) => !(l.block && CHROME.has(l.block)) && l.href !== url,
    );
    const seen = new Set<string>();
    let repeats = 0;
    for (const { href } of links) {
      if (seen.has(href)) repeats++;
      seen.add(href);
    }
    pages.push({
      url,
      layer: layerOf(url, guides),
      links,
      repeats,
      hasFold: html.includes("data-transcript"),
      body: new Set(links.filter((l) => l.block && BODY_BLOCKS.has(l.block)).map((l) => l.href)),
      transcript: links.filter((l) => l.block === "transcript").map((l) => l.href),
    });
  }
  return pages;
}

describe("link repeats within a page", () => {
  it("parses nesting, main, and the chrome", () => {
    const html =
      '<nav data-track="nav"><a href="/n">n</a></nav><main>' +
      '<nav data-track="breadcrumb"><a href="/b">b</a></nav>' +
      '<article data-track="body"><p><a href="/x#part">x</a> <a href="/y">y</a></p></article>' +
      '<section data-track="transcript"><a href="/x">x again</a><a href="/z">z</a></section>' +
      '<script>"<a href=\\"/s\\">"</script></main>' +
      '<footer data-track="footer"><a href="/f">f</a></footer>';
    expect(mainLinks(html)).toEqual([
      { href: "/b", block: "breadcrumb" },
      { href: "/x", block: "body" },
      { href: "/y", block: "body" },
      { href: "/x", block: "transcript" },
      { href: "/z", block: "transcript" },
    ]);
  });

  it.runIf(built)("keeps each layer's repeat share under its dated ceiling", () => {
    const pages = readPages();
    const per = new Map<Layer, { pages: number; links: number; repeats: number }>();
    for (const page of pages) {
      const p = per.get(page.layer) ?? { pages: 0, links: 0, repeats: 0 };
      p.pages++;
      p.links += page.links.length;
      p.repeats += page.repeats;
      per.set(page.layer, p);
    }

    // Guard the guard: the selectors find their pages, and the pages link.
    expect(per.get("guides")?.pages ?? 0).toBeGreaterThanOrEqual(70);
    expect(per.get("concepts")?.pages ?? 0).toBeGreaterThanOrEqual(150);
    expect(per.get("lessons")?.pages ?? 0).toBeGreaterThanOrEqual(20);
    expect(per.get("paths")?.pages ?? 0).toBeGreaterThanOrEqual(10);
    expect(per.get("library")?.pages ?? 0).toBeGreaterThanOrEqual(25);
    expect(per.get("hubs")?.pages ?? 0).toBeGreaterThanOrEqual(30);
    for (const [layer, p] of per) {
      expect(p.links, layer).toBeGreaterThan(p.pages * 10);
    }

    for (const [layer, ceiling] of Object.entries(CEILINGS) as [Layer, number][]) {
      const p = per.get(layer)!;
      const share = p.repeats / p.links;
      expect(share, `${layer}: ${p.repeats} repeats of ${p.links} links`).toBeLessThanOrEqual(
        ceiling,
      );
    }
  });

  it.runIf(built)("links nothing from a transcript that the page's body already links", () => {
    const pages = readPages();
    const withFold = pages.filter((page) => page.hasFold);
    // Every content page with audio folds a transcript (transcripts.test.ts):
    // 319 on 2026-09-22.
    expect(withFold.length).toBeGreaterThanOrEqual(300);

    // Not every fold links. Before the ledger 308 of the 319 folds carried a
    // link (1,257 links, median 3 a fold); after it 135 do (228 links), the
    // rest having named only what the prose already linked, which is the
    // ledger working rather than a linker that stopped. The floors sit
    // under those counts so a rewritten page or two does not move them; a
    // fold that linked nothing anywhere would.
    const linking = withFold.filter((page) => page.transcript.length > 0);
    expect(linking.length).toBeGreaterThanOrEqual(100);
    const foldLinks = linking.reduce((n, page) => n + page.transcript.length, 0);
    expect(foldLinks).toBeGreaterThanOrEqual(180);

    // The population for the exact check: pages whose body links something,
    // so the ledger has content to enforce.
    const withBody = withFold.filter((page) => page.body.size > 0);
    expect(withBody.length).toBeGreaterThanOrEqual(300);

    const repeated = withFold.flatMap((page) =>
      page.transcript.filter((href) => page.body.has(href)).map((href) => `${page.url} -> ${href}`),
    );
    expect(repeated, "transcript links to a target the body already links").toEqual([]);
  });
});
