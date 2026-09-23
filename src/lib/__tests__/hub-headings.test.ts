import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getAtomUrl, loadAtoms, loadBridges, loadPaths, loadThreads } from "../content";
import { SITE_NAME } from "../seo";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build. Name a page the build always produces. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

function routeOf(file: string): string {
  const rel = path
    .relative(APP, file)
    .split(path.sep)
    .join("/")
    .replace(/\.html$/, "");
  return rel === "index" ? "/" : `/${rel}`;
}

function decode(value: string): string {
  return value
    .replace(/<!--.*?-->/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const BRAND_SUFFIX = ` | ${SITE_NAME}`;

/** The first <title>, brand suffix removed. Inline SVG diagrams carry a second one. */
function titleOf(html: string): string | undefined {
  const raw = /<title>([^<]*)<\/title>/.exec(html)?.[1];
  if (!raw) return undefined;
  const title = decode(raw);
  return title.endsWith(BRAND_SUFFIX) ? title.slice(0, -BRAND_SUFFIX.length).trim() : title;
}

/**
 * The first <h1>, tags stripped, a trailing count removed — "(27)", or the
 * glossary's "(173 terms, 31 of them definitions)", which says what its
 * number is made of since 2026-09-22 (tracker entry 264) and is as much a
 * derived count as the bare figure was.
 */
function headingOf(html: string): string | undefined {
  const raw = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1];
  return (
    raw &&
    decode(raw.replace(/<[^>]+>/g, ""))
      .replace(/\s*\(\d+[^)]*\)$/, "")
      .trim()
  );
}

/**
 * Hubs the rule does not reach, as of 2026-09-21.
 *
 * All four are "Improv" in the title and not in the heading — "Improv
 * Practice: …" over "Practice", "Improv Learning Paths: …" over "Learning
 * Paths", "Improv Guides: …" over "Guides", "Improv Resources: …" over
 * "Resources" — the titles the 2026-08-23 hub retitling gave them, with the
 * headings left as they were. Entry 235 counted them as agreeing because it
 * tested containment, and containment is exactly what lets the qualifying
 * word go missing. The seven hubs whose headings shared no words with the
 * title were fixed in the change that added this test; these four were out
 * of its scope. Asserted exactly, so resolving one without striking it here
 * fails, and so does adding a fifth.
 */
// The four one-word hub headings were given their title's noun phrase on
// 2026-09-21 after this test named them; the list is kept empty on purpose.
const DEBT: string[] = [];

/**
 * A hub's heading is the opening of its title.
 *
 * Nine hubs sent search a keyword phrase and showed the reader a label:
 * "Improv Podcasts: Three Shows and What Each Is For" was headed "Listen",
 * "Improv Reading List: Books That Shaped the Craft" was headed "The Reading
 * List", "Improv Exercises: What Each One Actually Trains" was headed
 * "Exercises (27)" (tracker entry 235, 2026-09-21). route-keywords.ts reasons
 * that a hub "claims" a term through its title; on those pages the claim was
 * made to Google only, and the page's own heading never said the words.
 *
 * Prefix, not containment: "Practice" is inside "Improv Practice: …" and is
 * exactly the case where the qualifying word is the one the reader does not
 * see. Counts are stripped from the heading first — "(49)" is a derived
 * number the title cannot carry without going stale. The homepage and the
 * framework's error pages are the only pages whose heading is not their
 * title in any form, and they are meant that way.
 */
describe("hub headings", () => {
  it.runIf(built)("open with the title's own words", async () => {
    const [atoms, bridges, threads, paths] = await Promise.all([
      loadAtoms(),
      loadBridges(),
      loadThreads(),
      loadPaths(),
    ]);
    const content = new Set<string>([
      ...atoms.map((a) => getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })),
      ...bridges.map((b) => `/${b.slug}`),
      ...threads.map((t) => `/threads/${t.frontmatter.id}`),
      ...paths.map((p) => `/paths/${p.frontmatter.id}`),
    ]);
    expect(content.size).toBeGreaterThan(300);

    const mismatched: string[] = [];
    let checked = 0;
    for (const file of walk(APP)) {
      const route = routeOf(file);
      if (route === "/" || route.startsWith("/_") || content.has(route)) continue;
      const html = fs.readFileSync(file, "utf-8");
      const title = titleOf(html);
      const heading = headingOf(html);
      if (!title || !heading) continue;
      checked++;
      if (!title.startsWith(heading)) mismatched.push(route);
    }

    // The type hubs, the topic clusters, the traditions, the shows, the
    // picker's level and focus pages: a changed selector cannot find fewer.
    expect(checked).toBeGreaterThanOrEqual(40);
    expect(mismatched.sort()).toEqual(DEBT);
  });
});
