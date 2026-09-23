import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { SITE_NAME } from "../seo";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build. Name a page the build always produces. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * A share card must carry the site's name.
 *
 * The root layout sets openGraph.siteName and openGraph.locale, and Next
 * replaces that object rather than merging it, so every page defining its own
 * openGraph in generateMetadata silently dropped both. That was 300 of 328
 * pages — every guide, atom, thread, path and library entry — posting to
 * Facebook, LinkedIn, Slack or Discord as a card with a headline, a picture and
 * no publisher.
 *
 * Twenty route files each rebuilt the block by hand, which is exactly the kind
 * of thing nobody notices is missing: the card still renders, it just renders
 * anonymous. For a site whose problem is that nobody has heard of it, the name
 * on the card is not a detail.
 *
 * og:url is deliberately not asserted here. Sixteen hub pages inherit their
 * whole openGraph object from the layout, which cannot know a per-page URL, and
 * adding a partial block to reach og:url would wipe the type, siteName and
 * locale they currently inherit correctly — a worse card in exchange for a tag
 * that duplicates a self-referential canonical those pages already have.
 */

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

function relativeName(file: string): string {
  const posix = file.split(path.sep).join("/");
  return (posix.split("server/app")[1] ?? posix).replace(/\.html$/, "") || "/";
}

const REQUIRED = [
  ["og:title", /<meta property="og:title"/],
  ["og:description", /<meta property="og:description"/],
  ["og:image", /<meta property="og:image"/],
  ["og:type", /<meta property="og:type"/],
  ["og:site_name", /<meta property="og:site_name"/],
  ["og:locale", /<meta property="og:locale"/],
  ["twitter:card", /<meta name="twitter:card" content="summary_large_image"/],
] as const;

describe("open graph", () => {
  it.runIf(built)("gives every shareable page a complete card", () => {
    const missing: string[] = [];
    let checked = 0;

    for (const file of walk(APP)) {
      const html = fs.readFileSync(file, "utf-8");
      // Only pages that produce a card at all; /_not-found and friends do not.
      if (!/<meta property="og:title"/.test(html)) continue;
      checked++;
      const name = relativeName(file);
      for (const [tag, re] of REQUIRED) {
        if (!re.test(html)) missing.push(`${name}: ${tag}`);
      }
    }

    // An unbuilt tree would make this pass on nothing.
    expect(checked).toBeGreaterThan(300);
    expect(missing).toEqual([]);
  });

  it.runIf(built)("names this site, not a placeholder", () => {
    const wrong: string[] = [];
    let checked = 0;

    for (const file of walk(APP)) {
      const html = fs.readFileSync(file, "utf-8");
      const m = /<meta property="og:site_name" content="([^"]*)"/.exec(html);
      if (!m) continue;
      checked++;
      // The HTML is entity-encoded; compare on a decoded copy.
      const value = m[1].replace(/&amp;/g, "&").replace(/&#x27;/g, "'");
      if (value !== SITE_NAME) wrong.push(`${relativeName(file)}: "${value}"`);
    }

    expect(checked).toBeGreaterThan(300);
    expect(wrong).toEqual([]);
  });
});

/** The first <title> only: a page with an inline SVG carries the diagram's accessible title too. */
function titleTag(html: string): string | undefined {
  return /<title>([^<]*)<\/title>/.exec(html)?.[1];
}

function ogTitle(html: string): string | undefined {
  return /<meta property="og:title" content="([^"]*)"/.exec(html)?.[1];
}

/** Entity-decoded, with the layout's " | The Physics of Connection" removed. */
function unbranded(value: string): string {
  const decoded = value
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
  const suffix = ` | ${SITE_NAME}`;
  return decoded.endsWith(suffix) ? decoded.slice(0, -suffix.length).trim() : decoded;
}

/**
 * The share card says what kind of thing an atom is, the way the search
 * result does.
 *
 * An atom's title tag is qualified by type — "Commitment — Improv Technique" —
 * because the bare word is indistinguishable from every other Commitment on
 * the web. The seven atom routes then wrote the bare H1 into `openGraph.title`,
 * so 170 of 205 atom pages sent search the qualified title and sent Facebook,
 * LinkedIn, Slack and Discord "Commitment" (tracker entry 235, 2026-09-21): the
 * one context where a reader has no URL bar to tell them it is improv, and the
 * qualifier was dropped there. The routes now feed one string to both.
 */
describe("atom share titles", () => {
  it.runIf(built)("match the title tag, brand suffix aside", async () => {
    const { loadAtoms, getAtomUrl } = await import("../content");
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);

    const differ: string[] = [];
    let checked = 0;
    for (const atom of atoms) {
      const url = getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type });
      const file = path.join(APP, ...url.split("/").filter(Boolean)) + ".html";
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, "utf-8");
      const title = titleTag(html);
      const og = ogTitle(html);
      if (!title || !og) continue;
      checked++;
      if (unbranded(title) !== unbranded(og)) {
        differ.push(`${url}: title "${unbranded(title)}" vs og:title "${unbranded(og)}"`);
      }
    }

    expect(checked).toBeGreaterThanOrEqual(200);
    expect(differ).toEqual([]);
  });
});
