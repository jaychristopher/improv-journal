import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadThreads } from "../content";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * The essays hub must list every essay, and each must appear once.
 *
 * The hub groups by tag rather than by a curated id list, precisely so a new
 * thread lists itself. But the "first matching group wins" filter is the kind
 * of expression that can silently drop or duplicate an entry, and the page
 * renders fine either way — so this checks the built output rather than the
 * intent.
 */
describe("essays hub", () => {
  it.runIf(built)("links every thread exactly once", async () => {
    const threads = await loadThreads();
    expect(threads.length).toBeGreaterThan(10);

    const html = fs.readFileSync(path.join(APP, "threads.html"), "utf-8");

    const missing: string[] = [];
    const duplicated: string[] = [];
    for (const thread of threads) {
      const href = `href="/threads/${thread.frontmatter.id}"`;
      const count = html.split(href).length - 1;
      if (count === 0) missing.push(thread.frontmatter.id);
      if (count > 1) duplicated.push(`${thread.frontmatter.id} x${count}`);
    }

    expect(missing).toEqual([]);
    expect(duplicated).toEqual([]);
  });
});
