import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/** The titles SOURCE_TITLE_MAP can link, read from the source so the two stay in step. */
function mappedTitles(): { pattern: RegExp; slug: string }[] {
  const src = fs.readFileSync(path.join(process.cwd(), "src", "lib", "content.ts"), "utf-8");
  const block = /const SOURCE_TITLE_MAP[\s\S]*?\n\];/.exec(src);
  if (!block) throw new Error("SOURCE_TITLE_MAP not found in content.ts");
  return [...block[0].matchAll(/\[\/(.+?)\/g,\s*"\/library\/(ref-[a-z0-9-]+)"\]/g)].map((m) => ({
    // The same shape linkSources builds: the title, an optional colon subtitle,
    // an optional full stop.
    pattern: new RegExp(`^(?:${m[1]})(?::[^<]*)?\\.?$`),
    slug: m[2],
  }));
}

/**
 * A citation of a work the library holds is a link to it.
 *
 * linkSources used to require the <em> to hold the mapped title and nothing
 * else, so a citation written in full bibliographic form — with the book's
 * subtitle, or a closing full stop — matched nothing and rendered as plain
 * text. It reads identically either way, which is why it survived: there is no
 * symptom on the page, and the only way to see it is to compare what the map
 * holds against what the build emits.
 *
 * That matters more here than it would elsewhere. Library entries are the
 * pages this site actually surfaces on, so a citation that does not link is a
 * link withheld from its best-performing page type.
 *
 * An <em> counts as linked when the tag immediately before it is an <a>, which
 * is exactly what linkSources emits. Scanning backwards for "<a " instead
 * reports false misses, because the title attribute carrying the tooltip is
 * long enough to push the opening tag outside any fixed window.
 *
 * The transcript fold is the one exception. Since 2026-09-22 it links only
 * what the page's body did not (tracker entry 267; `autolinkTranscript`'s
 * ledger), so an italicised title in the fold is left plain when the prose
 * above already links the entry — the page still cites the work with a
 * link, once. A plain title in the fold on a page that links the entry
 * nowhere else is still a miss.
 */
describe("citations of works the library holds", () => {
  it.runIf(built)("render as links to the library entry", () => {
    const titles = mappedTitles();
    const missing: string[] = [];
    let checked = 0;

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith(".html")) continue;

        const url = full.replace(APP, "").split(path.sep).join("/").replace(".html", "");
        const html = fs.readFileSync(full, "utf8");
        const body = html.split("</header>").pop()?.split("<footer").shift() ?? "";
        const foldMark = body.indexOf("data-transcript");
        const foldStart = foldMark >= 0 ? body.lastIndexOf("<section", foldMark) : -1;
        const foldEnd = foldMark >= 0 ? body.indexOf("</section>", foldMark) : -1;
        const inFold = (at: number) => foldStart >= 0 && at > foldStart && at < foldEnd;
        const outsideFold = foldStart >= 0 ? body.slice(0, foldStart) + body.slice(foldEnd) : body;

        for (const m of body.matchAll(/(<a [^>]*>)?<em>([^<]{3,120})<\/em>/g)) {
          const title = m[2].trim();
          const hit = titles.find((t) => t.pattern.test(title));
          if (!hit) continue;
          // A reference page cites its own work; linking there would be a self-link.
          if (`/library/${hit.slug}` === url) continue;
          // The fold defers to the prose's link (see above).
          if (inFold(m.index) && outsideFold.includes(`href="/library/${hit.slug}"`)) continue;
          checked += 1;
          if (!m[1]) missing.push(`${url} -> ${hit.slug} ("${title}")`);
        }
      }
    };
    walk(APP);

    // A changed selector would otherwise make this pass on nothing.
    expect(checked).toBeGreaterThan(300);
    expect([...new Set(missing)]).toEqual([]);
  });

  it.runIf(built)("never link a reference page to itself", () => {
    const selfLinks: string[] = [];
    const dir = path.join(APP, "library");
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.name.endsWith(".html") || !entry.name.startsWith("ref-")) continue;
      const slug = entry.name.replace(".html", "");
      const html = fs.readFileSync(path.join(dir, entry.name), "utf8");
      const body = html.split("</header>").pop()?.split("<footer").shift() ?? "";
      if (body.includes(`<a href="/library/${slug}"`)) selfLinks.push(slug);
    }
    expect(selfLinks).toEqual([]);
  });
});
