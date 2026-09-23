import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

const WHATS_NEXT = path.join(process.cwd(), "src", "components", "WhatsNext.tsx");
/** The anchor of every single-card WhatsNext variant, as the build renders it. */
const CTA_ANCHOR_CLASS = "text-lg font-semibold after:absolute after:inset-0";
const ANCHOR_WORD_LIMIT = 12;

/**
 * A link's text is the name of what it links to, not the card around it.
 *
 * The guide's primary CTA was one <a> whose text was the whole card — label,
 * title, description and arrow — so the anchor a crawler read for a drill
 * was "Do this drill Last Word Response If your main issue is you have one
 * person to practise with…": 104 anchors over twelve words, one on nearly
 * every guide, with the target's name buried in the middle (tracker entry
 * 266, 2026-09-22). The rendered audit tolerated it at two per page. The card
 * is now a div with the anchor on the title alone and a stretched
 * pseudo-element keeping the whole card clickable, so this holds the line at
 * the markup and at the build.
 *
 * Asserts presence, not markup: the population of guides and of CTA cards is
 * guarded, so a guide layer that stopped rendering the card would fail
 * rather than pass on nothing.
 */

const strip = (fragment: string) =>
  fragment
    .replace(/<!--.*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const wordCount = (text: string) => (text ? text.split(" ").length : 0);

function guideSlugs(): string[] {
  return fs
    .readdirSync(path.join(process.cwd(), "content", "bridges"))
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""));
}

describe("CTA anchor text", () => {
  it("wraps only the title in the single-card link", () => {
    const src = fs.readFileSync(WHATS_NEXT, "utf-8");
    // The single-card render follows the `block` guard; related-concepts has
    // its own list above it and is not the card entry 266 measured.
    const card = src.split("const block =")[1] ?? "";
    expect(card).toContain("<Link");
    // From the tag to its close; the opening tag holds an arrow function, so
    // the element is cut by its closing tag rather than by the first ">".
    const link = card.slice(card.indexOf("<Link"), card.indexOf("</Link>"));
    expect(link.length).toBeGreaterThan(0);
    // Title only: the last thing before </Link> is the title expression,
    // and no label, description or arrow sits inside the anchor.
    expect(link).toMatch(/>\s*\{title\}\s*$/);
    expect(link).not.toContain("{label}");
    expect(link).not.toContain("{description}");
    expect(link).not.toContain("&rarr;");
    expect(link).toContain('trackEvent("bridge_cta_clicked"');
    expect(link).toContain("data-track={block}");
    expect(link).toContain(CTA_ANCHOR_CLASS);
    // The rest of the card sits beside the anchor, in a positioned wrapper
    // the stretched link can fill.
    expect(card).toContain("{label}</span>");
    expect(card).toContain("{description}</p>");
    expect(card).toContain("relative");
  });

  it.runIf(built)("keeps every cross-page anchor on a guide under twelve words", () => {
    const slugs = guideSlugs();
    let guides = 0;
    let anchors = 0;
    let cards = 0;
    const crossPage: string[] = [];
    const samePage: string[] = [];

    for (const slug of slugs) {
      const file = path.join(APP, `${slug}.html`);
      if (!fs.existsSync(file)) continue;
      guides += 1;
      const html = fs.readFileSync(file, "utf-8");
      const main = html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? "";
      for (const m of main.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
        anchors += 1;
        const attrs = m[1];
        const text = strip(m[2]);
        if (attrs.includes(`class="${CTA_ANCHOR_CLASS}"`)) {
          cards += 1;
          // The card's anchor is the target's title and nothing else.
          expect(wordCount(text), `${slug}: ${text}`).toBeLessThanOrEqual(ANCHOR_WORD_LIMIT);
          expect(text).not.toMatch(/^(Do this drill|Start|Read this guide|Continue reading)\b/);
        }
        if (wordCount(text) <= ANCHOR_WORD_LIMIT) continue;
        const href = attrs.match(/href="([^"]*)"/)?.[1] ?? "";
        (href.startsWith("#") ? samePage : crossPage).push(`${slug} (${wordCount(text)}): ${text}`);
      }
    }

    // 78 guides on 2026-09-22, and the card on 77 of them; the floors are
    // the guard against a build that skipped the layer.
    expect(guides).toBeGreaterThanOrEqual(70);
    expect(anchors).toBeGreaterThan(2000);
    expect(cards).toBeGreaterThanOrEqual(60);

    // 0 on 2026-09-22, down from 104 before the card was restructured.
    expect(crossPage).toEqual([]);
    // The residual is the contents list linking to a guide's own question
    // headings — "What if half the team is in a room and half are remote" —
    // 20 of them at 13 to 15 words on 2026-09-22. Those anchors are the
    // heading, which is the right text for a same-page link; the ceiling
    // only stops a new block from hiding behind them.
    expect(samePage.length).toBeLessThanOrEqual(24);
  });
});
