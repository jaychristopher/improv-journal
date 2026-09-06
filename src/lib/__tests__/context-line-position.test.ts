import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

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

function conceptPages(): { slug: string; html: string }[] {
  const out: { slug: string; html: string }[] = [];
  const dir = path.join(ROOT, "content", "atoms");
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const slug = file.replace(/\.md$/, "");
    const type = /^type:\s*(\w+)/m.exec(fs.readFileSync(path.join(dir, file), "utf-8"))?.[1];
    if (!type || !DIR[type]) continue;
    const page = path.join(APP, ...DIR[type].split("/"), `${slug}.html`);
    if (!fs.existsSync(page)) continue;
    out.push({
      slug,
      html: fs.readFileSync(page, "utf-8").replace(/<script[\s\S]*?<\/script>/g, ""),
    });
  }
  return out;
}

/**
 * The context line sits under the breadcrumb, and names one thing.
 *
 * It used to render above it on all 102 pages that have one, so the first thing
 * in `main` was as much as 190 characters of internal titles — a thread and up
 * to three paths — before anything told the reader where they were. Every one of
 * those paths is repeated in the sidebar's "Part of" block, which carries a
 * superset: on be-present the line named three paths and the sidebar named the
 * same three.
 *
 * A visitor arriving from a search result has never seen any of those names, so
 * the highest-attention position on the page was spent on navigation that meant
 * nothing to them and appeared again lower down.
 *
 * Two assertions, because either alone can be satisfied the wrong way. Position
 * without length lets the "Also in" list come back below the breadcrumb; length
 * without position lets a short line move back above it.
 */
describe("concept context line", () => {
  it.runIf(built)("renders under the breadcrumb and names one relationship", () => {
    const pages = conceptPages();
    // The population, so a moved selector fails here rather than passing on nothing.
    expect(pages.length).toBeGreaterThanOrEqual(190);

    const withLine = pages.filter((p) => p.html.includes("Part of "));
    // 102 of 205 carry one; the rest belong to no thread or path.
    expect(withLine.length).toBeGreaterThanOrEqual(90);

    const misordered = withLine
      .filter((p) => p.html.indexOf("Part of ") < p.html.indexOf("Home"))
      .map((p) => p.slug);
    expect(misordered).toEqual([]);

    const listing = withLine.filter((p) => p.html.includes("Also in")).map((p) => p.slug);
    expect(listing).toEqual([]);

    // 114 characters at worst once the extra paths went, against 190 before.
    const longest = Math.max(
      ...withLine.map((p) => {
        const start = p.html.indexOf("Part of ");
        return p.html
          .slice(start, p.html.indexOf("</div>", start))
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim().length;
      }),
    );
    expect(longest).toBeLessThanOrEqual(130);
  });
});
