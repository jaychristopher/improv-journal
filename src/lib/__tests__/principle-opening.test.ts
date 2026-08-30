import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * A principle opens by stating itself, not by naming a label.
 *
 * All eight "Be X" pages began "**Alias:** Act before you're ready", and the
 * sentence after that label is the most useful one on the page — the principle
 * in plain words. "Alias" is internal vocabulary; to somebody arriving from a
 * search result it reads as leaked metadata attached to the thing they came for.
 *
 * The repo had already noticed the label and fixed it in the wrong direction.
 * definitionFromHtml and stripLeadLabelHtml both strip it, so the meta
 * description and the JSON-LD were clean while the rendered page still showed
 * it — parsers served, reader not. Removing it from the source left both
 * derived values byte-identical, which is the evidence that the label was doing
 * nothing except being read by people.
 *
 * Asserted on the rendered html rather than the markdown, because that is where
 * a reader meets it and the label could return through a component as easily as
 * through content.
 */
describe("principle pages", () => {
  it.runIf(built)("open with the principle, not a label", () => {
    const dir = path.join(ROOT, "content", "atoms");
    const offenders: string[] = [];
    let checked = 0;

    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const src = fs.readFileSync(path.join(dir, file), "utf-8");
      if (!/^type:\s*principle/m.test(src)) continue;

      const page = path.join(
        APP,
        "how-it-works",
        "principles",
        `${file.replace(/\.md$/, "")}.html`,
      );
      if (!fs.existsSync(page)) continue;
      checked += 1;

      const html = fs.readFileSync(page, "utf-8").replace(/<script[\s\S]*?<\/script>/g, "");
      const article = html.slice(html.indexOf("<article"), html.indexOf("</article>"));
      const firstParagraph = article.slice(article.indexOf("<p"), article.indexOf("</p>") + 4);

      // A bold run at the very start of the first paragraph is a lead label.
      if (/^<p[^>]*>\s*<strong>/.test(firstParagraph)) {
        offenders.push(`${file.replace(/\.md$/, "")}: ${firstParagraph.slice(0, 60)}`);
      }
    }

    // The population, so a moved selector fails here rather than passing on nothing.
    expect(checked).toBeGreaterThanOrEqual(8);
    expect(offenders).toEqual([]);
  });
});
