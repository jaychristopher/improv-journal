import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
const THREADS = path.join(APP, "threads");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/** Everything from the start of main down to the title — the first thing a reader meets. */
function headers(): { slug: string; header: string }[] {
  if (!fs.existsSync(THREADS)) return [];
  return fs
    .readdirSync(THREADS)
    .filter((f) => f.endsWith(".html"))
    .map((f) => {
      const html = fs
        .readFileSync(path.join(THREADS, f), "utf-8")
        .replace(/<script[\s\S]*?<\/script>/g, "");
      return {
        slug: f.replace(/\.html$/, ""),
        header: html.slice(html.indexOf("<main"), html.indexOf("</h1>")),
      };
    });
}

/**
 * A lesson says where it sits in its course once, not twice.
 *
 * Landing on a course lesson directly — which is how search delivers most of
 * them — the first thing above the title was a progress bar reading
 * "Foundations: Your First Steps in Improv · 2 of 2", and immediately under it
 * an eyebrow reading "thread · 2 of 2". The same fact a hundred pixels apart.
 *
 * It was duplication by construction rather than a fallback: `positionInPath` is
 * only assigned inside `if (parentPath)`, which is also the progress bar's
 * render condition, so the eyebrow could never have been the only place the
 * position appeared.
 *
 * The count is asserted against the progress bar rather than against zero,
 * because losing the position entirely is the other way to make a duplication
 * test pass.
 */
describe("thread header", () => {
  it.runIf(built)("states the position once", () => {
    const pages = headers();
    expect(pages.length).toBeGreaterThanOrEqual(20);

    const twice = pages
      .filter((p) => (p.header.match(/of <!-- -->\d+/g) ?? []).length > 1)
      .map((p) => p.slug);
    expect(twice).toEqual([]);

    // 21 of 25 threads belong to a path and still show the bar that carries it.
    const withBar = pages.filter((p) => p.header.includes("rounded-full"));
    expect(withBar.length).toBeGreaterThanOrEqual(18);
  });
});
