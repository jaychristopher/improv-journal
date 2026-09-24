import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ageNormalisedRank, byRank, newestCohort } from "../atom-rank";
import { getInboundLinks, loadAtoms } from "../content";
import { CITED_BY_OPEN, citingConcepts, indexAtoms, workCitedBy } from "../jsonld-edges";
import { librarySlug } from "../library-slug";
import { SITE_URL } from "../seo";

const APP = path.join(process.cwd(), ".next", "server", "app");
const LIBRARY = path.join(APP, "library");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/** Citing concepts shown before the fold; the page's CITED_BY_OPEN. */
const OPEN = 12;

/** A built page without its scripts, or the text-node separators React leaves between "(" and a count. */
function pageText(file: string): string {
  return fs
    .readFileSync(file, "utf-8")
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<!-- -->/g, "");
}

/**
 * The science works added 2026-08-23 that entry 268 found at the bottom of
 * the core-number distribution — each cited by one to three concepts, and
 * on 2026-09-22 every one of those concepts was also named by the work, so
 * the "Pages that cite it" block, which dropped concepts already listed
 * under "informs", rendered on none of them. The block now lists every
 * citing concept, and these eleven are the pages the change was for.
 */
const AUGUST_SCIENCE = [
  "ref-brown-daring-greatly",
  "ref-csikszentmihalyi-flow",
  "ref-goffman-frame-analysis",
  "ref-sawyer-improvised-dialogues",
  "ref-cowan-magical-number-four",
  "ref-edmondson-psychological-safety",
  "ref-overlie-standing-in-space",
  "ref-sweller-cognitive-load",
  "ref-wickens-multiple-resources",
  "ref-cherry-cocktail-party",
  "ref-limb-braun-jazz-improvisation",
];

/** The citing concepts as the graph has them: non-reference atoms with an edge to the work. */
async function citingFromGraph() {
  const atoms = await loadAtoms();
  const works = atoms.filter((a) => a.frontmatter.type === "reference");
  const counts = new Map<string, number>();
  for (const work of works) {
    counts.set(
      work.frontmatter.id,
      atoms.filter(
        (a) =>
          a.frontmatter.type !== "reference" &&
          (a.frontmatter.links ?? []).some((l) => l.id === work.frontmatter.id),
      ).length,
    );
  }
  return { atoms, works, counts };
}

describe("library cited-by", () => {
  it("every work is cited by at least one concept, and the page's list is the graph's", async () => {
    const { atoms, works, counts } = await citingFromGraph();
    // Population: 32 works on 2026-09-22.
    expect(works.length).toBeGreaterThanOrEqual(30);
    const index = indexAtoms(atoms);

    for (const work of works) {
      const id = work.frontmatter.id;
      // 32 of 32 on 2026-09-22; the least-cited (Cherry, Csikszentmihalyi,
      // Edmondson, Fey, Madson, Sweller) by one concept each.
      expect(counts.get(id), id).toBeGreaterThanOrEqual(1);

      // What the page renders: the inbound index, references and repeated
      // relations dropped, in `citingConcepts`' order — the page re-sorts
      // by it since 2026-09-22 (entry 307), as this does. Same size as the
      // graph and the same order as the Book's subjectOf, so the visible
      // list and the markup cannot disagree.
      const seen = new Set<string>();
      const order = new Map(citingConcepts(id, index).map((c, i) => [c.id, i]));
      const visible = (await getInboundLinks(id))
        .filter((l) => {
          if (l.type === "reference" || seen.has(l.id)) return false;
          seen.add(l.id);
          return true;
        })
        .sort((a, b) => order.get(a.id)! - order.get(b.id)!);
      expect(visible.length, id).toBe(counts.get(id));
      expect(order.size, id).toBe(counts.get(id));
      const markup = workCitedBy(id, index);
      expect(
        visible.map((l) => `${SITE_URL}${l.url}`),
        id,
      ).toEqual(markup.map((a) => a.url));
    }
    // Eight works have more than the twelve shown open (max 48).
    expect([...counts.values()].filter((n) => n > OPEN).length).toBeGreaterThanOrEqual(6);
    expect(OPEN).toBe(CITED_BY_OPEN);
  });

  /**
   * The order is by how much the graph leans on the citing concept for its
   * age, then title, with the twelfth open slot reserved for the newest
   * cohort where the first eleven hold none (entry 307). Raw in-degree until
   * 2026-09-22, which put the March concepts first on every entry.
   */
  it("orders the citing concepts by age-normalised rank, with one open slot for the newest cohort", async () => {
    const { atoms, works } = await citingFromGraph();
    const index = indexAtoms(atoms);
    const rank = ageNormalisedRank(atoms);
    const newest = newestCohort(atoms);
    const of = (id: string) => rank.get(id) ?? 0;
    const reserved: string[] = [];
    let differsFromRaw = 0;
    const inDegree = new Map<string, number>();
    for (const a of atoms) {
      for (const l of a.frontmatter.links ?? []) inDegree.set(l.id, (inDegree.get(l.id) ?? 0) + 1);
    }
    for (const work of works) {
      const id = work.frontmatter.id;
      const list = citingConcepts(id, index);
      const plain = [...list].sort(byRank(rank));
      // The list is the plain sort, except that one newest-cohort concept
      // may have moved into the last open slot.
      const open = list.slice(0, OPEN).map((c) => c.id);
      const plainOpen = plain.slice(0, OPEN).map((c) => c.id);
      if (open.join() !== plainOpen.join()) {
        reserved.push(id);
        expect(
          plainOpen.some((c) => newest.has(c)),
          id,
        ).toBe(false);
        expect(newest.has(open[OPEN - 1]), id).toBe(true);
        expect(open.slice(0, OPEN - 1), id).toEqual(plainOpen.slice(0, OPEN - 1));
      } else {
        for (let i = 1; i < list.length; i += 1) {
          expect(
            of(list[i - 1].id),
            `${id}: ${list[i - 1].id} before ${list[i].id}`,
          ).toBeGreaterThanOrEqual(of(list[i].id));
        }
      }
      const raw = [...list]
        .sort(
          (a, b) =>
            (inDegree.get(b.id) ?? 0) - (inDegree.get(a.id) ?? 0) || a.title.localeCompare(b.title),
        )
        .slice(0, OPEN)
        .map((c) => c.id);
      if (raw.join() !== open.join()) differsFromRaw += 1;
    }
    // On 2026-09-22 the reservation moves a concept on 3 of the 8 works
    // with more than a dozen citers (Napier's Improvise: +premise; Spolin:
    // +pass-the-clap; Truth in Comedy: +specificity), and the rank alone
    // changes the open dozen on 11 of the 32 entries. Later the same day
    // the 3-month age floor (tracker entry 322) took back part of the
    // rank's lift: it changes the dozen on 8 entries and the reservation
    // moves 4 (Johnstone's Impro: +spontaneity), the seat the newest cohort
    // keeps on a short list being the slot's now, not the rank's. Floors
    // one under.
    expect(reserved.length).toBeGreaterThanOrEqual(3);
    expect(reserved.length).toBeLessThanOrEqual(
      [...index.values()].filter((a) => a.type === "reference").length,
    );
    expect(differsFromRaw).toBeGreaterThanOrEqual(7);
  });

  it.runIf(built)("renders the block on every built entry with the graph's count", async () => {
    const { works, counts } = await citingFromGraph();
    let rendered = 0;
    let folded = 0;
    for (const work of works) {
      const id = work.frontmatter.id;
      const file = path.join(LIBRARY, `${librarySlug(id)}.html`);
      if (!fs.existsSync(file)) continue;
      const html = pageText(file);
      const start = html.indexOf('data-track="library-cited-by"');
      expect(start, id).toBeGreaterThan(-1);
      rendered += 1;

      const count = counts.get(id)!;
      // The concept sub-list ends where the next sub-list or the nav does.
      // The guides sub-list joined the lessons one on 2026-09-22 (tracker
      // entry 334) and a work can have guides and no lessons, so the bound
      // is whichever heading comes first inside the nav.
      const navEnd = html.indexOf("</nav>", start);
      const nextList = ["Lessons (", "Guides standing on it ("]
        .map((heading) => html.indexOf(heading, start))
        .filter((at) => at > -1 && at < navEnd);
      const block = html.slice(start, nextList.length ? Math.min(...nextList) : navEnd);
      expect(block, id).toContain(`Concepts (${count})`);
      const hrefs = [...block.matchAll(/href="(\/[^"?#]*)"/g)].map((m) => m[1]);
      expect(hrefs.length, id).toBe(count);
      for (const href of hrefs) expect(href, id).not.toMatch(/^\/(library|threads)\//);

      // Twelve open; the rest present in the html behind a native fold.
      const fold = block.indexOf("<details");
      const open = fold > -1 ? block.slice(0, fold) : block;
      expect([...open.matchAll(/href="(\/[^"?#]*)"/g)].length, id).toBe(Math.min(count, OPEN));
      if (count > OPEN) {
        folded += 1;
        expect(block, id).toContain(`+${count - OPEN} more`);
      } else {
        expect(fold, id).toBe(-1);
      }
    }
    expect(rendered).toBeGreaterThanOrEqual(30);
    expect(folded).toBeGreaterThanOrEqual(6);
  });

  it.runIf(built)("reaches the August science, which had no block before", async () => {
    const { counts } = await citingFromGraph();
    for (const id of AUGUST_SCIENCE) {
      const file = path.join(LIBRARY, `${librarySlug(id)}.html`);
      expect(fs.existsSync(file), id).toBe(true);
      const html = pageText(file);
      expect(html, id).toContain('data-track="library-cited-by"');
      expect(html, id).toContain(`Concepts (${counts.get(id)})`);
    }
  });
});
