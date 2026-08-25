import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/** URLs the build actually produces. */
function builtPages(): Set<string> {
  const pages = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".html")) continue;
      const rel = path
        .relative(APP, full)
        .split(path.sep)
        .join("/")
        .replace(/\.html$/, "");
      pages.add(rel === "index" ? "/" : `/${rel}`);
    }
  };
  walk(APP);
  return pages;
}

/** Sources next.config redirects, which are legitimate link targets. */
function declaredRedirects(): Set<string> {
  const src = fs.readFileSync(path.join(process.cwd(), "src", "lib", "redirects.ts"), "utf-8");
  return new Set([...src.matchAll(/source:\s*[`"']([^`"']+)[`"']/g)].map((m) => m[1]));
}

/**
 * Every internal link lands on a page that exists.
 *
 * Two did not, and they were on ref-tj-dave-speed-of-life — the page Search
 * Console has at position 12, which is the closest this site gets to page one.
 * Both were hand-written markdown links that guessed an atom's directory from
 * its type, and the type-to-directory map is not guessable: `heightening` is a
 * pattern, so it lives under /how-it-works/diagnosis rather than
 * /practice/techniques, and `group-scene` is a definition, so it is under
 * /practice/vocabulary rather than /practice/formats.
 *
 * Nothing pointed either of them out. Both read as ordinary links in the
 * markdown, both rendered as ordinary links in the page, and the only way to
 * see the problem was to compare every href against the set of pages the build
 * produces — which is what this does, across all 39,000 of them.
 *
 * It also covers the case that would bring them back: an atom whose `type`
 * changes moves directory, and any hand-written link to its old path breaks
 * silently.
 *
 * Redirect sources count as valid targets. They resolve for a reader and for a
 * crawler, and the redirect table exists precisely so old paths keep working.
 */
describe("internal links", () => {
  it.runIf(built)("resolve to a built page or a declared redirect", () => {
    const pages = builtPages();
    const redirects = declaredRedirects();
    const broken = new Map<string, Set<string>>();
    let checked = 0;

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith(".html")) continue;
        const rel = path
          .relative(APP, full)
          .split(path.sep)
          .join("/")
          .replace(/\.html$/, "");
        const from = rel === "index" ? "/" : `/${rel}`;
        const html = fs.readFileSync(full, "utf8");

        for (const m of html.matchAll(/href="(\/[^"#]*)"/g)) {
          let url = m[1].split("?")[0];
          if (url.length > 1 && url.endsWith("/")) url = url.slice(0, -1);
          if (!url || url === "/") continue;
          // Assets and API routes are not pages.
          if (url.startsWith("/_next/") || url.startsWith("/api/")) continue;
          if (/\.(xml|txt|json|svg|png|jpg|jpeg|webp|ico|mp3|m4a)$/.test(url)) continue;

          checked += 1;
          if (pages.has(url) || redirects.has(url)) continue;
          if (!broken.has(url)) broken.set(url, new Set());
          broken.get(url)?.add(from);
        }
      }
    };
    walk(APP);

    // A changed selector would otherwise make this pass on nothing.
    expect(checked).toBeGreaterThan(20_000);
    expect(pages.size).toBeGreaterThan(300);

    const report = [...broken].map(
      ([url, froms]) => `${url} ← ${[...froms].slice(0, 3).join(", ")}`,
    );
    expect(report).toEqual([]);
  });
});
