import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Ten server-rendered link blocks were added on 2026-09-21 and none fired an
 * event; autocapture is off, so their clicks were invisible (tracker entry
 * 252). The provider now captures `link_clicked` for any internal link inside
 * a `[data-track]` wrapper. These guards keep the wrapper on every block and
 * the listener in the provider.
 *
 * The first five wrappers covered 45% of the site's 49,005 internal links and
 * 72% of that was the nav; the footer, the prose, the breadcrumb and every
 * router were outside (tracker entry 259, the same day). The wrappers below
 * were added under 259, and the build-gated test at the end measures the
 * share rather than counting attributes, so a block shipped without one
 * lowers a number instead of passing.
 */
const TRACKED: Record<string, string[]> = {
  "src/components/GuideConcepts.tsx": ["guide-concepts"],
  "src/components/WouldYouRather.tsx": ["would-you-rather"],
  "src/components/LessonCrosslink.tsx": ["lesson-crosslink"],
  "src/components/SyllabusProgress.tsx": ["syllabus-concepts-read"],
  "src/components/LineageLine.tsx": ["atom-lineage"],
  "src/components/RelatedGuides.tsx": ["related-guides"],
  "src/components/LessonSources.tsx": ["lesson-sources"],
  "src/components/GuideSources.tsx": ["guide-sources"],
  "src/components/AtomDetail.tsx": [
    "concept-sidebar",
    "body",
    "series",
    "attribution",
    "drill-pairs",
    "sources",
  ],
  "src/components/Nav.tsx": ["nav"],
  "src/components/Footer.tsx": ["footer"],
  "src/components/Breadcrumb.tsx": ["breadcrumb"],
  "src/components/Transcript.tsx": ["transcript"],
  "src/components/WhatsNext.tsx": ["related-concepts", "next-in-lesson"],
  "src/components/LevelRedirect.tsx": ["level-redirect"],
  "src/components/ContextBanner.tsx": ["context-banner"],
  "src/components/UpdatedOn.tsx": ["byline"],
  "src/app/how-it-works/principles/[slug]/page.tsx": ["next-principle"],
  "src/components/LessonFrame.tsx": ["lesson-overview", "listen", "lesson-reps"],
  // The fold that holds composed-from, the sources block and the hand-offs
  // since 2026-09-22 (entry 306); each inner block keeps its own name, and
  // the innermost wrapper is the one a click reports.
  "src/components/LessonPanel.tsx": ["lesson-panel", "composed-from", "handing-off"],
  "src/app/[slug]/page.tsx": ["body", "series", "guide-next-step"],
  "src/app/threads/[slug]/page.tsx": ["body", "series", "lesson-prev-next"],
  "src/app/library/[slug]/page.tsx": ["body", "series", "library-informs", "library-cited-by"],
  "src/app/paths/[slug]/page.tsx": [
    "path-start",
    "path-leans-on",
    "path-why-order",
    "path-program-map",
    "path-listen",
    "path-forward-needs",
    "path-overlap",
  ],
};

/**
 * Tracked share of internal links per layer, as a floor, set just under the
 * share measured on 2026-09-21 after the entry 259 wrappers landed (before
 * them: guides 43%, concepts 50%, lessons 39%, paths 34%, hubs 32%; sitewide
 * 44.9% of 48,911). The residual on each line is what is still outside a
 * wrapper on that layer and why.
 */
const FLOORS: Record<Layer, number> = {
  // 99.2%: 10,040 of 10,118. The residual is the primary CTA, one a page,
  // which reports as bridge_cta_clicked instead (see the WhatsNext guard).
  guides: 0.98,
  // 100%: 26,862 of 26,862.
  concepts: 0.99,
  // 100%: 3,184 of 3,184.
  lessons: 0.99,
  // 100%: 1,358 of 1,358.
  paths: 0.99,
  // 98.6%: 7,329 of 7,434. The residual was the principles hub (51 links)
  // and the homepage (37), both being wrapped by their own owners the same
  // night, and a source page's prose (17), wrapped as `body` since.
  hubs: 0.97,
};

const APP = path.join(process.cwd(), ".next", "server", "app");
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

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
 * Every internal link in a page with the `data-track` name of its nearest
 * wrapping ancestor, or null. A stack of open elements, each carrying the
 * block in force where it opened; `closest("[data-track]")` is what the
 * listener runs, so this is the same question asked of the static HTML.
 * Script and style bodies are skipped: the RSC payload holds the page's
 * markup again as escaped strings.
 */
function internalLinks(html: string): { href: string; block: string | null }[] {
  const out: { href: string; block: string | null }[] = [];
  const stack: { tag: string; block: string | null }[] = [];
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
    const own = attrs.match(/\sdata-track="([^"]*)"/);
    const block = own ? own[1] || null : stack.length ? stack[stack.length - 1].block : null;
    if (tag === "a") {
      const href = attrs.match(/\shref="([^"]*)"/);
      if (href && href[1].startsWith("/")) out.push({ href: href[1], block });
    }
    if (VOID.has(tag) || attrs.endsWith("/")) continue;
    stack.push({ tag, block });
  }
  return out;
}

type Layer = "guides" | "concepts" | "lessons" | "paths" | "hubs";

const CONCEPT_ROUTE =
  /^\/(how-it-works\/(principles|diagnosis)\/[^/]+|how-it-works\/[^/]+|practice\/(exercises|techniques|formats|vocabulary)\/[^/]+|library\/[^/]+)$/;

function layerOf(url: string, guides: Set<string>): Layer {
  if (url.startsWith("/threads/")) return "lessons";
  if (url.startsWith("/paths/")) return "paths";
  if (CONCEPT_ROUTE.test(url) && !/^\/how-it-works\/(principles|diagnosis)$/.test(url)) {
    return "concepts";
  }
  if (/^\/[^/]+$/.test(url) && guides.has(url.slice(1))) return "guides";
  return "hubs";
}

describe("link tracking", () => {
  it("tags every derived link block with its name", () => {
    for (const [file, names] of Object.entries(TRACKED)) {
      const src = fs.readFileSync(path.join(process.cwd(), file), "utf-8");
      for (const name of names) expect(src, file).toContain(`data-track="${name}"`);
    }
  });

  it("names the single-card routers by variant and leaves the guide CTA to its own event", () => {
    // `next-atom`, `back-to-thread` and `path-complete` report as
    // link_clicked blocks. The bridge CTA fires bridge_cta_clicked with the
    // target and label (docs/growth-strategy.md reads it weekly), so it
    // carries no data-track: one click, one event.
    const src = fs.readFileSync(path.join(process.cwd(), "src/components/WhatsNext.tsx"), "utf-8");
    expect(src).toContain('props.variant === "bridge-primary-cta" ? undefined : props.variant');
    expect(src).toContain("data-track={block}");
    expect(src).toContain('trackEvent("bridge_cta_clicked"');
  });

  it("captures link_clicked from a delegated listener through both transports", () => {
    // trackEvent reaches Vercel Analytics and PostHog; a direct
    // posthog.capture reached one dashboard while the CTA's event reached
    // both (entry 259).
    const src = fs.readFileSync(path.join(process.cwd(), "src", "app", "providers.tsx"), "utf-8");
    expect(src).toContain('document.addEventListener("click"');
    expect(src).toContain('trackEvent("link_clicked"');
    expect(src).not.toContain('posthog.capture("link_clicked"');
    expect(src).toContain("[data-track]");
    const analytics = fs.readFileSync(path.join(process.cwd(), "src/lib/analytics.ts"), "utf-8");
    expect(analytics).toMatch(
      /export function trackEvent[\s\S]*?track\(name, properties\);[\s\S]*?posthog\.capture\(name, properties\)/,
    );
  });

  it("parses nesting rather than proximity", () => {
    const html =
      '<main><nav data-track="nav"><a href="/a">a</a></nav>' +
      '<article data-track="body"><p><a href="/b">b</a></p>' +
      '<section data-track="inner"><a href="/c">c</a></section>' +
      '<a href="/d">d</a></article><a href="/e">e</a>' +
      '<a href="https://x.test/">x</a><script>"<a href=\\"/f\\">"</script></main>';
    expect(internalLinks(html)).toEqual([
      { href: "/a", block: "nav" },
      { href: "/b", block: "body" },
      { href: "/c", block: "inner" },
      { href: "/d", block: "body" },
      { href: "/e", block: null },
    ]);
  });

  it.runIf(built)(
    "keeps the tracked share of internal links above the floor on every layer",
    () => {
      const guides = new Set(
        fs
          .readdirSync(path.join(process.cwd(), "content", "bridges"))
          .filter((f) => f.endsWith(".md"))
          .map((f) => f.replace(/\.md$/, "")),
      );
      const per: Record<Layer, { pages: number; links: number; tracked: number }> = {
        guides: { pages: 0, links: 0, tracked: 0 },
        concepts: { pages: 0, links: 0, tracked: 0 },
        lessons: { pages: 0, links: 0, tracked: 0 },
        paths: { pages: 0, links: 0, tracked: 0 },
        hubs: { pages: 0, links: 0, tracked: 0 },
      };
      const blocks = new Map<string, number>();
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
        const layer = layerOf(url, guides);
        const links = internalLinks(fs.readFileSync(file, "utf-8"));
        per[layer].pages++;
        for (const { block } of links) {
          per[layer].links++;
          if (block) {
            per[layer].tracked++;
            blocks.set(block, (blocks.get(block) ?? 0) + 1);
          }
        }
      }

      // Guard the guard: the layer selectors must still find their pages, and
      // the pages must still carry links (the chrome alone is 88 a page).
      expect(per.guides.pages).toBeGreaterThanOrEqual(70);
      expect(per.concepts.pages).toBeGreaterThanOrEqual(200);
      expect(per.lessons.pages).toBeGreaterThanOrEqual(20);
      expect(per.paths.pages).toBeGreaterThanOrEqual(10);
      expect(per.hubs.pages).toBeGreaterThanOrEqual(30);
      for (const layer of Object.keys(per) as Layer[]) {
        expect(per[layer].links, layer).toBeGreaterThan(per[layer].pages * 50);
      }

      // The chrome is on every page and the prose on every content page, so
      // these blocks must be the large ones (2026-09-21: nav 15,792, footer
      // 17,296, breadcrumb 985, body 2,846); a wrapper that stopped rendering
      // shows up here before it shows in a share.
      for (const [name, floor] of [
        ["nav", 10_000],
        ["footer", 10_000],
        ["breadcrumb", 800],
        ["body", 2_000],
      ] as const) {
        expect(blocks.get(name) ?? 0, name).toBeGreaterThan(floor);
      }

      for (const [layer, floor] of Object.entries(FLOORS) as [Layer, number][]) {
        const share = per[layer].tracked / per[layer].links;
        expect(share, `${layer}: ${per[layer].tracked}/${per[layer].links}`).toBeGreaterThanOrEqual(
          floor,
        );
      }
    },
  );
});
