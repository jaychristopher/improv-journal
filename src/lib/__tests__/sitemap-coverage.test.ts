import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import sitemap from "../../app/sitemap";

/**
 * Every content type that renders a page must appear in the sitemap.
 *
 * content/sources drives a live route. It has generateStaticParams, a self
 * canonical, no noindex, and an entry in the build output — and the sitemap
 * generator had never heard of it. Nothing on the site linked to it either, so
 * the one page under it was reachable only by typing the URL: 4,900 words that
 * share 5% of their eight-word runs with the atoms extracted from them, so
 * almost all of it existed nowhere else on the site.
 *
 * The sitemap is assembled by hand, one loop per content type, which is why a
 * type could be added and simply never listed. Nothing failed. The page was
 * indexable and undiscoverable at the same time, which is the worst of the two
 * states to be in, and it stayed that way for four months.
 *
 * So the check is derived from the filesystem rather than from a list of types
 * someone remembered to write down. Anything new under content/ must either
 * show up in the sitemap or be named below as something that does not render.
 */

/** Directories under content/ that are authoring input, not pages. */
const NOT_RENDERED = new Set([
  "outlines", // video outlines, an authoring step before a script
  "personas", // voice definitions used to generate audio
  "scripts", // TTS scripts, the input to the audio pipeline
]);

function documentIds(dir: string): string[] {
  const full = path.join(process.cwd(), "content", dir);
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

describe("sitemap coverage", () => {
  it("lists every document of every rendered content type", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => String(e.url));
    expect(urls.length).toBeGreaterThan(300);

    // A document is covered when its id is a path segment of some sitemap URL.
    // Pattern-agnostic on purpose: atoms alone route to six different prefixes
    // by type, and hardcoding those here would just duplicate getAtomUrl.
    const segments = new Set(urls.flatMap((u) => new URL(u).pathname.split("/").filter(Boolean)));

    const dirs = fs
      .readdirSync(path.join(process.cwd(), "content"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    const missing: string[] = [];
    let checkedTypes = 0;

    for (const dir of dirs) {
      if (NOT_RENDERED.has(dir)) continue;
      const ids = documentIds(dir);
      if (ids.length === 0) continue;
      checkedTypes++;
      for (const id of ids) {
        if (!segments.has(id)) missing.push(`${dir}/${id}`);
      }
    }

    // A renamed content dir, or every type landing in NOT_RENDERED, would make
    // this pass on nothing.
    expect(checkedTypes).toBeGreaterThanOrEqual(6);
    expect(missing).toEqual([]);
  });
});
