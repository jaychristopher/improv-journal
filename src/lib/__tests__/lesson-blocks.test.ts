// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";

import { cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LESSON_PANEL_ID } from "../../components/LessonPanel";
import {
  LESSON_PANEL_STORAGE_KEY,
  LessonPanelToggle,
  panelStorage,
  readPanelClosed,
  rememberPanelOpen,
} from "../../components/LessonPanelToggle";

/**
 * Blocks per page, per layer.
 *
 * A lesson page carried a median twelve tracked blocks (max 13) around a
 * median 481 words of essay — one block per forty words — while a guide
 * carried eight around 2,486 (one per 311), so the furniture was heaviest
 * where the prose was lightest and the reader most committed (tracker entry
 * 306, 2026-09-22). Three of the twelve — composed-from, sources, hand-offs —
 * are lists derived from the same `atoms` declaration, and they now fold
 * into one "About this lesson" panel (LessonPanel.tsx), open on the server
 * and remembered closed per viewer.
 *
 * Two counts per page, both over `<main>` with scripts stripped:
 * - distinct `data-track` names, the entry's own measure (`grep -o | sort -u`);
 * - page-level blocks, those whose nearest tracked ancestor is none. A
 *   nested block is part of the surface around it — `series` sits inside
 *   `listen`, and the three lists sit inside the panel — so this is the
 *   number of boxes a reader meets. The ceiling is on this one.
 *
 * Readings are recorded in the assertion message with their date; the
 * ceiling on the lessons is the 13 the entry set, the pre-panel maximum,
 * so a lesson that grows back to where it was fails here. On 2026-09-22
 * the page-level reading is 10 max (9 median); the slack is written down
 * rather than spent.
 */
const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
/** A build directory is not a finished build — see lesson-markup for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

const LESSON_CEILING = 13;

type Layer = "guides" | "concepts" | "lessons" | "paths" | "library" | "hubs";

const CONCEPT_ROUTE =
  /^\/(how-it-works\/(principles|diagnosis)\/[^/]+|how-it-works\/[^/]+|practice\/(exercises|techniques|formats|vocabulary)\/[^/]+)$/;

function layerOf(url: string, guides: Set<string>): Layer {
  if (url.startsWith("/threads/")) return "lessons";
  if (url.startsWith("/paths/")) return "paths";
  if (url.startsWith("/library/")) return "library";
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

interface Block {
  name: string;
  /** The nearest tracked ancestor, or null at page level. */
  parent: string | null;
  /** The element's own attributes, so a test can read `open`. */
  attrs: string;
  /** Whether the block holds an internal link, in itself or a nested block. */
  links: boolean;
}

/**
 * Every `data-track` element inside `<main>`, with the block it sits in —
 * the same stack walk link-tracking.test.ts runs for links, asked of the
 * wrappers instead. Script and style bodies are skipped: the RSC payload
 * holds the markup again as escaped strings.
 */
function blocksInMain(html: string): Block[] {
  const out: Block[] = [];
  const stack: { tag: string; chain: Block[] }[] = [];
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
    // The tracked ancestors in force where this element opens, outermost first.
    let chain = stack.length ? stack[stack.length - 1].chain : [];
    const own = attrs.match(/\sdata-track="([^"]*)"/);
    if (own && own[1] && inMain) {
      const block: Block = {
        name: own[1],
        parent: chain.length ? chain[chain.length - 1].name : null,
        attrs,
        links: false,
      };
      out.push(block);
      chain = [...chain, block];
    }
    if (tag === "a" && inMain) {
      const href = attrs.match(/\shref="([^"]*)"/);
      if (href && href[1].startsWith("/")) for (const b of chain) b.links = true;
    }
    if (VOID.has(tag) || attrs.endsWith("/")) continue;
    stack.push({ tag, chain });
  }
  return out;
}

interface Page {
  url: string;
  layer: Layer;
  blocks: Block[];
  /** Distinct `data-track` names — the entry's measure. */
  distinct: number;
  /** Blocks with no tracked ancestor — the surfaces the reader meets. */
  pageLevel: number;
}

function pages(): Page[] {
  const guides = new Set(
    fs
      .readdirSync(path.join(ROOT, "content", "bridges"))
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, "")),
  );
  const out: Page[] = [];
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
    const blocks = blocksInMain(fs.readFileSync(file, "utf-8"));
    out.push({
      url,
      layer: layerOf(url, guides),
      blocks,
      distinct: new Set(blocks.map((b) => b.name)).size,
      pageLevel: new Set(blocks.filter((b) => !b.parent).map((b) => b.name)).size,
    });
  }
  return out;
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

describe("lesson blocks", () => {
  it.runIf(built)(
    "records blocks per page per layer and holds the lessons under the ceiling",
    () => {
      const all = pages();
      const per = new Map<Layer, Page[]>();
      for (const p of all) per.set(p.layer, [...(per.get(p.layer) ?? []), p]);

      // Guard the guard: the layer selectors still find their pages, and the
      // pages still carry blocks (the chrome alone is the breadcrumb and byline).
      expect(per.get("guides")?.length ?? 0).toBeGreaterThanOrEqual(70);
      expect(per.get("concepts")?.length ?? 0).toBeGreaterThanOrEqual(150);
      expect(per.get("lessons")?.length ?? 0).toBeGreaterThanOrEqual(20);
      expect(per.get("paths")?.length ?? 0).toBeGreaterThanOrEqual(10);
      expect(per.get("library")?.length ?? 0).toBeGreaterThanOrEqual(25);
      for (const [layer, ps] of per) {
        expect(median(ps.map((p) => p.distinct)), layer).toBeGreaterThanOrEqual(3);
      }

      // 2026-09-22, before the panel (distinct median/max): lessons 12/13,
      // paths 12/12, concepts 8/11, guides 9/10, library 7/7, hubs 5/14. After
      // it: lessons 13/14 distinct — the panel is one more name — and 9/10 at
      // page level, where it was 11/12 before (series sits inside listen).
      const reading =
        `${new Date().toISOString().slice(0, 10)} reading (median/max): ` +
        [...per]
          .map(
            ([layer, ps]) =>
              `${layer} ${median(ps.map((p) => p.distinct))}/${Math.max(...ps.map((p) => p.distinct))} distinct, ` +
              `${median(ps.map((p) => p.pageLevel))}/${Math.max(...ps.map((p) => p.pageLevel))} page-level`,
          )
          .join("; ");
      const lessons = per.get("lessons")!;
      const worst = lessons.reduce((a, b) => (b.pageLevel > a.pageLevel ? b : a));
      expect(worst.pageLevel, `${worst.url} — ${reading}`).toBeLessThanOrEqual(LESSON_CEILING);
    },
  );

  it.runIf(built)("folds the three derived lists into an open panel on every lesson page", () => {
    const lessons = pages().filter((p) => p.layer === "lessons");
    expect(lessons.length).toBeGreaterThanOrEqual(20);

    const missing: string[] = [];
    const closed: string[] = [];
    const outside: string[] = [];
    let withAllThree = 0;
    let visibleClosed = 0;
    let visibleOpen = 0;
    for (const p of lessons) {
      const panel = p.blocks.find((b) => b.name === "lesson-panel");
      if (!panel) {
        missing.push(p.url);
        continue;
      }
      if (!/\sopen(?:=""|\s|$)/.test(panel.attrs)) closed.push(p.url);
      // composed-from is on every lesson; sources and hand-offs render only
      // when there is something to list, and must sit in the panel when they do.
      const inner = ["composed-from", "lesson-sources", "handing-off"];
      const present = inner.filter((name) => p.blocks.some((b) => b.name === name));
      if (!present.includes("composed-from")) outside.push(`${p.url}: no composed-from`);
      for (const name of present) {
        const b = p.blocks.find((x) => x.name === name)!;
        if (b.parent !== "lesson-panel") outside.push(`${p.url}: ${name} is outside the panel`);
      }
      if (present.length === 3) withAllThree += 1;
      // Link blocks a reader sees without a click, panel open and closed;
      // the panel itself is a wrapper, not a block of its own.
      const linkBlocks = p.blocks.filter((b) => b.links && b.name !== "lesson-panel");
      visibleOpen += linkBlocks.length;
      visibleClosed += linkBlocks.filter((b) => b.parent !== "lesson-panel").length;
    }
    expect(missing, "lessons without the panel").toEqual([]);
    expect(closed, "lessons whose panel is not open in the served HTML").toEqual([]);
    expect(outside, "derived lists outside the panel").toEqual([]);
    // 17 of 25 lessons had a guide handing off to them on 2026-09-22.
    expect(withAllThree).toBeGreaterThanOrEqual(12);
    // Closing the panel hides at least the composed-from and sources lists on
    // every lesson, and nothing else stops being visible. 2026-09-22: 286
    // link blocks open, 220 closed, across 25 lessons — 11.4 a page before
    // the panel (every block was visible), 8.8 with it closed.
    expect(
      visibleClosed,
      `link blocks visible: ${visibleOpen} open, ${visibleClosed} closed, across ${lessons.length} lessons`,
    ).toBeLessThanOrEqual(visibleOpen - 2 * lessons.length);
  });

  it("keeps the panel's id where the toggle looks for it", () => {
    const src = fs.readFileSync(path.join(ROOT, "src/components/LessonPanel.tsx"), "utf-8");
    expect(src).toContain('data-track="lesson-panel"');
    expect(src).toMatch(/<details\s+open\s+id=\{LESSON_PANEL_ID\}/);
    expect(src).toContain("<LessonPanelToggle target={LESSON_PANEL_ID} />");
    // The lists moved in, not out: the page renders the panel and no longer
    // its own composed-from or hand-off nav.
    const page = fs.readFileSync(path.join(ROOT, "src/app/threads/[slug]/page.tsx"), "utf-8");
    expect(page).toContain("<LessonPanel");
    expect(page).not.toContain('data-track="composed-from"');
    expect(page).not.toContain('data-track="handing-off"');
  });
});

/**
 * The toggle tolerates a storage that throws: a private window, cleared
 * site data or a browser set to block it. The page renders open with no
 * stored value, stays open when reading throws, and still toggles when
 * writing throws.
 */
describe("lesson panel toggle", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    try {
      window.localStorage.clear();
    } catch {
      // A test that broke storage on purpose.
    }
  });

  const blocked = () => {
    throw new Error("blocked");
  };
  const throwing: Storage = {
    length: 0,
    clear: blocked,
    getItem: blocked,
    key: blocked,
    removeItem: blocked,
    setItem: blocked,
  };

  function mount(): HTMLDetailsElement {
    render(
      createElement(
        "details",
        { open: true, id: LESSON_PANEL_ID },
        createElement("summary", null, "About this lesson"),
        createElement("nav", { "data-track": "composed-from" }),
        createElement(LessonPanelToggle, { target: LESSON_PANEL_ID }),
      ),
    );
    return document.getElementById(LESSON_PANEL_ID) as HTMLDetailsElement;
  }

  it("reads and writes nothing when the storage throws", () => {
    expect(readPanelClosed(throwing)).toBe(false);
    expect(() => rememberPanelOpen(throwing, false)).not.toThrow();
    expect(() => rememberPanelOpen(throwing, true)).not.toThrow();
    expect(readPanelClosed(null)).toBe(false);
    expect(() => rememberPanelOpen(null, false)).not.toThrow();
  });

  it("returns null where touching localStorage throws", () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get: blocked,
    });
    try {
      expect(panelStorage()).toBeNull();
    } finally {
      if (descriptor) Object.defineProperty(window, "localStorage", descriptor);
      else delete (window as { localStorage?: Storage }).localStorage;
    }
  });

  it("renders open with no stored value and stays open when reading throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(blocked);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(blocked);
    const details = mount();
    expect(details.open).toBe(true);
    // The viewer closes it; the write fails; the fold still closes.
    details.open = false;
    expect(() => details.dispatchEvent(new Event("toggle"))).not.toThrow();
    expect(details.open).toBe(false);
  });

  it("remembers closed across visits and forgets it when reopened", () => {
    window.localStorage.setItem(LESSON_PANEL_STORAGE_KEY, "closed");
    const details = mount();
    expect(details.open).toBe(false);

    details.open = true;
    details.dispatchEvent(new Event("toggle"));
    expect(window.localStorage.getItem(LESSON_PANEL_STORAGE_KEY)).toBeNull();

    details.open = false;
    details.dispatchEvent(new Event("toggle"));
    expect(window.localStorage.getItem(LESSON_PANEL_STORAGE_KEY)).toBe("closed");
  });
});
