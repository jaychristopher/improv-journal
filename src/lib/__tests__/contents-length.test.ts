import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { TOC_VISIBLE } from "../../components/TableOfContents";

const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/** Atom type → the route segment its page is published under. */
const DIR: Record<string, string> = {
  definition: "practice/vocabulary",
  technique: "practice/techniques",
  pedagogy: "practice/techniques",
  exercise: "practice/exercises",
  format: "practice/formats",
  law: "how-it-works",
  insight: "how-it-works",
  principle: "how-it-works/principles",
  antipattern: "how-it-works/diagnosis",
  pattern: "how-it-works/diagnosis",
  framework: "how-it-works/diagnosis",
  reference: "library",
};

function outlines(): { slug: string; dom: number; visible: number; misleading: boolean }[] {
  const out: { slug: string; dom: number; visible: number; misleading: boolean }[] = [];
  const dir = path.join(ROOT, "content", "atoms");

  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const slug = file.replace(/\.md$/, "");
    const type = /^type:\s*(\w+)/m.exec(fs.readFileSync(path.join(dir, file), "utf-8"))?.[1];
    if (!type || !DIR[type]) continue;

    const page = path.join(APP, ...DIR[type].split("/"), `${slug}.html`);
    if (!fs.existsSync(page)) continue;

    const html = fs.readFileSync(page, "utf-8").replace(/<script[\s\S]*?<\/script>/g, "");
    const start = html.indexOf("On this page");
    if (start < 0) continue;

    const nav = html.slice(start, html.indexOf("</nav>", start));
    const dom = (nav.match(/<a /g) ?? []).length;
    const folded = [...nav.matchAll(/<details[\s\S]*?<\/details>/g)].reduce(
      (sum, m) => sum + (m[0].match(/<a /g) ?? []).length,
      0,
    );
    // Does the visible part show a subsection while a top-level one is folded?
    // `ml-4` is how the component marks a level-3 entry.
    const cut = nav.indexOf("<details");
    const head = cut < 0 ? nav : nav.slice(0, cut);
    const shownSub = [...head.matchAll(/<li([^>]*)>/g)].filter((m) => /ml-4/.test(m[1])).length;
    const hiddenTop =
      cut < 0
        ? 0
        : [...nav.slice(cut).matchAll(/<li([^>]*)>/g)].filter((m) => !/ml-4/.test(m[1])).length;

    out.push({ slug, dom, visible: dom - folded, misleading: shownSub > 0 && hiddenTop > 0 });
  }
  return out;
}

/**
 * A page's outline orients the reader instead of becoming the thing they scroll.
 *
 * The table of contents renders above the body on purpose — so it survives on a
 * phone, where most of these pages are read, and so a crawler meets the outline
 * before the prose. That placement is also what makes a long one expensive: a
 * reference page with sixteen sections put sixteen links between the title and
 * the first sentence, on the device the placement was chosen for.
 *
 * Both directions are asserted together, because the cheap way to satisfy either
 * one alone is wrong. Cutting entries would shorten the visible outline and
 * quietly remove the anchors a crawler reads; leaving it uncollapsed keeps the
 * anchors and hands a phone reader the wall back.
 */
describe("page outline", () => {
  it.runIf(built)("folds the long ones without dropping an entry", () => {
    const pages = outlines();
    // The population, so a moved selector fails here rather than passing on nothing.
    expect(pages.length).toBeGreaterThanOrEqual(180);

    // 1,363 entries across 197 outlines as of 2026-08-30; the floor guards the
    // anchors, not the exact number.
    const totalDom = pages.reduce((s, p) => s + p.dom, 0);
    expect(totalDom).toBeGreaterThanOrEqual(1300);

    // Nothing shows more than the cap. It was 16 at worst before the fold.
    const overlong = pages
      .filter((p) => p.visible > TOC_VISIBLE)
      .map((p) => `${p.slug}: ${p.visible} visible`);
    expect(overlong).toEqual([]);

    // And the outline is not merely short but accurate. Folding by raw count
    // spent the budget on whichever section happened to have subsections, so
    // 121 of 127 folded outlines hid a top-level section while showing a
    // subsection of another — an outline that cannot say what the page covers.
    const misleading = pages.filter((p) => p.misleading).map((p) => p.slug);
    expect(misleading).toEqual([]);
  });
});
