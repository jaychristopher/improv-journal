import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import sitemap from "../../app/sitemap";

const APP = path.join(process.cwd(), ".next", "server", "app");

/** Whether every built page for a content type refuses indexing. */
function typeIsNoindex(ids: string[]): boolean {
  const pages: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".html")) pages.push(full);
    }
  };
  if (!fs.existsSync(APP)) return false;
  walk(APP);

  const found = ids
    .map((id) => pages.find((p) => path.basename(p, ".html") === id))
    .filter((p): p is string => Boolean(p));

  if (found.length === 0) return false;
  return found.every((p) =>
    /<meta name="robots" content="[^"]*noindex/.test(fs.readFileSync(p, "utf-8")),
  );
}

/**
 * Every content type that renders a page must appear in the sitemap.
 *
 * content/sources drives a live route with generateStaticParams, a self
 * canonical and an entry in the build output — and the sitemap generator had
 * never heard of it, so a whole content type could be added and simply never
 * listed.
 *
 * The original version of this comment also claimed that route had no noindex.
 * It does: /sources/[slug] sets robots index:false so a raw transcript stays
 * reachable for provenance without competing in search. Acting on the wrong
 * belief put a noindex URL into the sitemap, which asks a crawler to index a
 * page that then refuses. Deliberately unindexed types are exempt below, and
 * no-noindex-in-sitemap holds the other half of the rule.
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
    let exemptTypes = 0;

    for (const dir of dirs) {
      if (NOT_RENDERED.has(dir)) continue;
      const ids = documentIds(dir);
      if (ids.length === 0) continue;
      // A type whose every page sets noindex is deliberately out of the index,
      // and belongs out of the sitemap too.
      if (typeIsNoindex(ids)) {
        exemptTypes++;
        continue;
      }
      checkedTypes++;
      for (const id of ids) {
        if (!segments.has(id)) missing.push(`${dir}/${id}`);
      }
    }

    // A renamed content dir, or every type landing in NOT_RENDERED, would make
    // this pass on nothing. Counting the exempt types too means a type going
    // noindex cannot quietly lower the bar either — the total has to hold even
    // as the split between the two moves.
    expect(checkedTypes + exemptTypes).toBeGreaterThanOrEqual(6);
    expect(checkedTypes).toBeGreaterThanOrEqual(5);
    expect(missing).toEqual([]);
  });
});
