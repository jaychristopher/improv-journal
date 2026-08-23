import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { AUTHOR_NAME } from "../seo";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build. Name a page the build always produces. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * A page that claims an author and a modified date must show a reader both.
 *
 * Every Article entity on this site named an author, gave it an @id of
 * /about#author and a url of /about, and carried a dateModified. No content
 * page showed a reader any of it. The author's name appeared in visible text
 * on exactly one page in 328 — /about — and /about had no inbound link from
 * any page body at all, only from the footer.
 *
 * Structured data is meant to describe what is on the page, so this described
 * what was not. It also wasted the claim: who is responsible for a page is
 * only worth asserting if the responsibility can be followed somewhere.
 *
 * The rule is stated against the schema rather than against a list of page
 * types, which is the correction to how I first fixed this. I put the byline
 * on guides, threads and paths and deliberately left atoms out, reasoning that
 * atoms carry no date line and the design meant to treat them differently. But
 * ArticleJsonLd is unconditional on atoms too — the design gives them author
 * and dateModified like everything else, so it was not drawing that
 * distinction and I had picked the wrong half of it. 155 pages kept the
 * mismatch for one more release. Deriving the check from the schema makes that
 * particular mistake impossible to repeat: emit Article, show the byline.
 */

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

/**
 * Page body with JSON-LD removed — the schema names the author too, and
 * counting it would make these pass on the exact state they exist to reject.
 */
function visibleMain(html: string): string {
  const open = html.indexOf("<main");
  if (open === -1) return "";
  return html.slice(open, html.indexOf("</main>", open)).replace(/<script[\s\S]*?<\/script>/g, "");
}

function relativeName(file: string): string {
  const posix = file.split(path.sep).join("/");
  return posix.split("server/app")[1] ?? posix;
}

describe("visible byline", () => {
  it.runIf(built)("appears on every page that emits Article schema", () => {
    const noAuthor: string[] = [];
    const noDate: string[] = [];
    const noLink: string[] = [];
    let checked = 0;

    for (const file of walk(APP)) {
      const html = fs.readFileSync(file, "utf-8");
      if (!html.includes('"@type":"Article"')) continue;
      checked++;
      const rel = relativeName(file);
      const main = visibleMain(html);

      if (!main.includes(AUTHOR_NAME)) noAuthor.push(rel);
      if (!/<time\b/.test(main)) noDate.push(rel);
      if (!main.includes('href="/about"')) noLink.push(rel);
    }

    // An unbuilt tree, or a changed @type string, would make this pass on nothing.
    expect(checked).toBeGreaterThan(200);
    expect(noAuthor).toEqual([]);
    expect(noDate).toEqual([]);
    expect(noLink).toEqual([]);
  });

  it.runIf(built)("shows the same author the schema names", () => {
    const disagreeing: string[] = [];
    let checked = 0;

    for (const file of walk(APP)) {
      const html = fs.readFileSync(file, "utf-8");
      if (!html.includes('"@type":"Article"')) continue;
      const rel = relativeName(file);

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
          if (String(obj["@type"] ?? "").includes("Article")) {
            checked++;
            const author = obj.author as { name?: string } | undefined;
            if (author?.name !== AUTHOR_NAME) {
              disagreeing.push(`${rel}: schema says ${author?.name ?? "nothing"}`);
            }
          }
          if (obj["@graph"]) walkNode(obj["@graph"]);
        };
        walkNode(parsed);
      }
    }

    expect(checked).toBeGreaterThan(200);
    expect(disagreeing).toEqual([]);
  });
});
