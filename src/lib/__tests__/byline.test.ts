import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  getAtomUrl,
  loadAtoms,
  loadBridges,
  loadPaths,
  loadSources,
  loadThreads,
} from "../content";
import { AUTHOR_NAME } from "../seo";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build. Name a page the build always produces. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * Every authored page must show its author and the date it last changed.
 *
 * Each Article entity on this site named an author, gave it an @id of
 * /about#author and a url of /about, and carried a dateModified, while no
 * content page showed a reader any of it. The name appeared in visible text on
 * exactly one page in 328 — /about — and /about had no inbound link from any
 * page body at all, only from the footer. Structured data is meant to describe
 * what is on the page, so this described what was not.
 *
 * This check is now derived from the content documents, and that is the second
 * correction to it. The first version iterated over guides, so when I added the
 * byline to guides, threads and paths and left atoms out, the 155 pages I had
 * missed were invisible to it. I rewrote it to key off Article schema instead
 * — which then quietly skipped all 25 threads, because threads emit
 * ["Article","LearningResource"] and the check substring-matched
 * "@type":"Article". It still reported over 200 pages examined, so it looked
 * thorough while covering less than it claimed, and it could never have seen
 * the 16 library pages at all: those emit Book, not Article, and they are the
 * best-performing pages on the site.
 *
 * Keying off the documents removes the whole class of miss. If a content file
 * renders a page, that page is checked, whatever schema it happens to emit.
 */

function builtFileFor(url: string): string {
  return path.join(APP, `${url === "/" ? "/index" : url}.html`);
}

/**
 * Page body with JSON-LD removed — the schema names the author too, and
 * counting it would make this pass on the exact state it exists to reject.
 */
function visibleMain(html: string): string {
  const open = html.indexOf("<main");
  if (open === -1) return "";
  return html.slice(open, html.indexOf("</main>", open)).replace(/<script[\s\S]*?<\/script>/g, "");
}

async function authoredUrls(): Promise<string[]> {
  const [bridges, atoms, threads, paths, sources] = await Promise.all([
    loadBridges(),
    loadAtoms(),
    loadThreads(),
    loadPaths(),
    loadSources(),
  ]);
  return [
    ...bridges.map((b) => `/${b.slug}`),
    ...atoms.map((a) => getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })),
    ...threads.map((t) => `/threads/${t.frontmatter.id}`),
    ...paths.map((p) => `/paths/${p.frontmatter.id}`),
    ...sources.map((s) => `/sources/${s.frontmatter.id}`),
  ];
}

describe("visible byline", () => {
  it.runIf(built)("appears on every authored page, with a link to /about", async () => {
    const noAuthor: string[] = [];
    const noDate: string[] = [];
    const noLink: string[] = [];
    let checked = 0;

    for (const url of await authoredUrls()) {
      const file = builtFileFor(url);
      if (!fs.existsSync(file)) continue;
      checked++;
      const main = visibleMain(fs.readFileSync(file, "utf-8"));

      if (!main.includes(AUTHOR_NAME)) noAuthor.push(url);
      if (!/<time\b/.test(main)) noDate.push(url);
      if (!main.includes('href="/about"')) noLink.push(url);
    }

    // An unbuilt tree, or loaders returning nothing, would make this pass on
    // nothing. 171 atoms + 72 guides + 25 threads + 11 paths alone clear this.
    expect(checked).toBeGreaterThan(275);
    expect(noAuthor).toEqual([]);
    expect(noDate).toEqual([]);
    expect(noLink).toEqual([]);
  });

  it.runIf(built)("shows the same author every Article entity names", async () => {
    const disagreeing: string[] = [];
    let checked = 0;

    for (const url of await authoredUrls()) {
      const file = builtFileFor(url);
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, "utf-8");

      for (const block of html.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      )) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(block[1]);
        } catch {
          continue;
        }
        const walkNode = (node: unknown): void => {
          if (Array.isArray(node)) return node.forEach(walkNode);
          if (!node || typeof node !== "object") return;
          const obj = node as Record<string, unknown>;
          // @type is a string on most entities and an array on threads. Reading
          // it as raw text is what let 25 pages slip past the previous version.
          const types = Array.isArray(obj["@type"]) ? obj["@type"] : [obj["@type"]];
          if (types.some((t) => String(t) === "Article")) {
            checked++;
            const author = obj.author as { name?: string } | undefined;
            if (author?.name !== AUTHOR_NAME) {
              disagreeing.push(`${url}: schema says ${author?.name ?? "nothing"}`);
            }
          }
          if (obj["@graph"]) walkNode(obj["@graph"]);
        };
        walkNode(parsed);
      }
    }

    // 227 plain Article pages plus the 25 threads the old matcher could not see.
    expect(checked).toBeGreaterThan(240);
    expect(disagreeing).toEqual([]);
  });
});
