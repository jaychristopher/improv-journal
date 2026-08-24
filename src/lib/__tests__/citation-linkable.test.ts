import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadAtoms, loadBridges, loadThreads } from "../content";

/**
 * A citation of a work the site holds is written so the linker can match it.
 *
 * content.ts keeps CITATION_MAP, which turns an author-year citation into a
 * link to that work's library entry. It matches on adjacency — "Cowan (2001)"
 * — and six citations had something sitting in between: possessives such as
 * "Limb & Braun's fMRI research (2008)", and full bibliographic entries where
 * the title separates the author from the year.
 *
 * Those read perfectly well and link to nothing, which is the whole difficulty:
 * there is no symptom to notice. The fix is never to shorten a citation to
 * author-year, since that trades a title and a journal for a link. It is to put
 * the author-year first and keep everything else.
 */
const CITED = [
  { author: /Cowan/, linkable: /Cowan\s*\(2001\)/, id: "ref-cowan-magical-number-four" },
  { author: /Sweller/, linkable: /Sweller\s*\(1988\)/, id: "ref-sweller-cognitive-load" },
  { author: /Cherry/, linkable: /Cherry\s*\(1953\)/, id: "ref-cherry-cocktail-party" },
  { author: /Wickens/, linkable: /Wickens\s*\(2002\)/, id: "ref-wickens-multiple-resources" },
  {
    author: /Edmondson/,
    linkable: /Edmondson\s*\(1999\)/,
    id: "ref-edmondson-psychological-safety",
  },
  {
    author: /Limb/,
    linkable: /Limb\s*(?:&(?:amp|#x26);|&)\s*Braun\s*\(2008\)/,
    id: "ref-limb-braun-jazz-improvisation",
  },
];

/** Ids CITATION_MAP actually declares, read from the source. */
function mappedIds(): string[] {
  const src = fs.readFileSync(path.join(process.cwd(), "src", "lib", "content.ts"), "utf-8");
  const block = /const CITATION_MAP[\s\S]*?\n\];/.exec(src);
  if (!block) throw new Error("CITATION_MAP not found in content.ts");
  return [...block[0].matchAll(/"\/library\/(ref-[a-z0-9-]+)"/g)].map((m) => m[1]).sort();
}

describe("citations of works in the library", () => {
  it("covers every work CITATION_MAP can link", () => {
    // Held by hand above, so this keeps the two in step.
    expect(CITED.map((c) => c.id).sort()).toEqual(mappedIds());
  });

  it("are written in a form CITATION_MAP can match", async () => {
    const [atoms, bridges, threads] = await Promise.all([
      loadAtoms(),
      loadBridges(),
      loadThreads(),
    ]);

    const offenders: string[] = [];
    for (const doc of [...atoms, ...bridges, ...threads]) {
      // A reference entry naming its own author is not citing anything.
      if (doc.slug.startsWith("ref-")) continue;

      for (const { author, linkable, id } of CITED) {
        if (!author.test(doc.content)) continue;
        // No year anywhere means a mention rather than a citation.
        if (!/\(\s*(19|20)\d{2}\s*\)/.test(doc.content)) continue;
        if (linkable.test(doc.content)) continue;
        offenders.push(`${doc.slug} cites ${id} unlinkably`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
