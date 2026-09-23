import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadPaths } from "../content";

/**
 * Every content layer with a markdown body renders it on its own page. The
 * paths did not between 2026-04-13 and 2026-09-21: 2,665 words of authored
 * prose were loaded, indexed and rewritten while no page showed them
 * (tracker entry 232).
 */
const APP = path.join(process.cwd(), ".next", "server", "app");
const built = fs.existsSync(path.join(APP, "index.html"));

describe("path body", () => {
  it("is non-trivial on every path", async () => {
    const paths = await loadPaths();
    expect(paths.length).toBeGreaterThanOrEqual(10);
    for (const p of paths) {
      expect(p.content.split(/\s+/).length, p.frontmatter.id).toBeGreaterThan(80);
    }
  });

  it.runIf(built)("appears on the built page", async () => {
    const paths = await loadPaths();
    for (const p of paths) {
      const html = fs.readFileSync(path.join(APP, "paths", `${p.frontmatter.id}.html`), "utf-8");
      // Autolinks wrap words in anchors, so compare text with tags stripped.
      const section = html.split('id="why-this-order"')[1]?.split("</section>")[0] ?? "";
      const text = section.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
      const firstWords = p.content
        .trim()
        .split("\n")[0]
        .replace(/[*_`]/g, "")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .split(/\s+/)
        .slice(0, 5)
        .join(" ");
      expect(text, `${p.frontmatter.id}: "${firstWords}"`).toContain(firstWords);
      expect(html).toContain('id="why-this-order"');
    }
  });
});
