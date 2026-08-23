import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { SITE_URL } from "../seo";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build. Name a page the build always produces. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * Article markup must name the picture the page already has.
 *
 * Google lists image among the recommended properties for Article and
 * describes it as what lets Search, News and Assistant show visual content for
 * a page. Nothing in Article is strictly required, so all 252 entities here
 * were valid markup — valid markup with the picture left out, while every one
 * of those pages was already generating a 1200x630 card at /og and declaring it
 * as og:image. The asset existed; the markup simply never pointed at it.
 *
 * The eyebrow is threaded from each route rather than derived, because the two
 * vocabularies differ: AtomDetail's TYPE_LABELS renders "why it's hard" where
 * the route writes "How It Works", so deriving it would have produced a second,
 * different card for the same page.
 *
 * Two of the 252 name a different card from their own og:image, and it is not a
 * bug worth chasing: getAtomDisplayTitle qualifies a title when two atoms share
 * one, which happens exactly once here — the technique and the exercise both
 * called "Organic Opening". Metadata uses the qualified title and the component
 * has only the raw one. Both URLs render a valid card for the right page, so
 * this asserts the image is present and well-formed rather than demanding
 * string equality it would have to carve an exception into.
 */

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

function articleEntities(html: string): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block[1]);
    } catch {
      continue;
    }
    const visit = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!node || typeof node !== "object") return;
      const obj = node as Record<string, unknown>;
      // @type is a string on most entities and an array on threads.
      const types = Array.isArray(obj["@type"]) ? obj["@type"] : [obj["@type"]];
      if (types.some((t) => String(t) === "Article")) found.push(obj);
      if (obj["@graph"]) visit(obj["@graph"]);
      for (const value of Object.values(obj)) if (value && typeof value === "object") visit(value);
    };
    visit(parsed);
  }
  return found;
}

describe("article image", () => {
  it.runIf(built)("is present and absolute on every Article entity", () => {
    const missing: string[] = [];
    const malformed: string[] = [];
    let checked = 0;

    for (const file of walk(APP)) {
      const html = fs.readFileSync(file, "utf-8");
      const posix = file.split(path.sep).join("/");
      const name = (posix.split("server/app")[1] ?? posix).replace(/\.html$/, "") || "/";

      for (const entity of articleEntities(html)) {
        checked++;
        const image = entity.image;
        if (typeof image !== "string" || image.length === 0) {
          missing.push(name);
          continue;
        }
        // Relative URLs are legal schema but Google resolves them
        // inconsistently, and the og:image next to it is absolute.
        if (!image.startsWith(`${SITE_URL}/`)) malformed.push(`${name}: ${image}`);
      }
    }

    // An unbuilt tree, or a changed @type check, would make this pass on nothing.
    expect(checked).toBeGreaterThan(240);
    expect(missing).toEqual([]);
    expect(malformed).toEqual([]);
  });

  it.runIf(built)("names the same card the page declares as og:image", () => {
    let checked = 0;
    let agreeing = 0;

    for (const file of walk(APP)) {
      const html = fs.readFileSync(file, "utf-8");
      const og = /<meta property="og:image" content="([^"]*)"/.exec(html)?.[1];
      if (!og) continue;
      const decoded = og.replace(/&amp;/g, "&");

      for (const entity of articleEntities(html)) {
        checked++;
        if (entity.image === decoded) agreeing++;
      }
    }

    expect(checked).toBeGreaterThan(240);
    // Only the one shared-title pair may diverge; anything more is a regression
    // in how the eyebrow reaches the component.
    expect(checked - agreeing).toBeLessThanOrEqual(2);
  });
});
