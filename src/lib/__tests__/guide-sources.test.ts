import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadAtoms, loadBridges } from "@/lib/content";
import {
  CITING_GUIDES_CAP,
  GUIDE_SOURCES_CAP,
  sourcesOf,
  worksCitedByGuides,
} from "@/lib/guide-sources";

/**
 * Every guide shows the library works its declared concepts cite.
 *
 * Tracker entry 334 (2026-09-22): 48 of 78 guides linked no work in their
 * body, and all 48 declare concepts citing 5 or more — the walk the lesson
 * page has made since entry 219, never made on the layer built for search.
 * The block is computed, not written, so what has to be guarded is that the
 * walk still finds the edges: an atom loader that dropped `links`, a
 * reference atom renamed off the `ref-` prefix, or `entry_atoms` emptied,
 * would return nothing on every guide and each page would quietly omit the
 * block rather than fail.
 *
 * Measured 2026-09-22: 78 of 78 guides yield at least 1 work, 683 guide →
 * work links reaching 31 of the 32 entries, from 5 (min) through 9 (median)
 * to 12 (max); 71 of the 78 exceed the cap of 6. Floors sit just under each,
 * so a content edit moves a number without turning the build red.
 */

const APP = path.join(process.cwd(), ".next", "server", "app");
const COMPONENT = path.join(process.cwd(), "src", "components", "GuideSources.tsx");
/** A build directory is not a finished build — name a page every build produces. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));
/**
 * And a build made before the block existed cannot contain it. The two
 * build-reading tests below are the first guards this repo has added for a
 * block on the same day it was written, and the tree carries a build from
 * earlier in the day; asserting against it would report the change as broken
 * rather than as unbuilt. They run as soon as the next `npm run build`
 * rewrites the pages, and a build that then omits the block still fails.
 */
const fresh =
  built && fs.statSync(path.join(APP, "index.html")).mtimeMs > fs.statSync(COMPONENT).mtimeMs;

/**
 * The guides entry 334 measured with no `/library/` link in the rendered
 * body: 48 of 78, the pages the block was built for.
 */
async function sourcelessGuides() {
  const bridges = await loadBridges();
  return bridges.filter((b) => !/href="\/library\//.test(b.html));
}

describe("guide sources", () => {
  it("finds library works for every guide", async () => {
    const [bridges, atoms] = await Promise.all([loadBridges(), loadAtoms()]);
    // Guard the guard: the loaders must still return the corpus, or every
    // assertion below passes over an empty list.
    expect(bridges.length).toBeGreaterThanOrEqual(70);
    expect(atoms.filter((a) => a.frontmatter.type === "reference").length).toBeGreaterThanOrEqual(
      25,
    );

    const counts = bridges.map((b) => sourcesOf(b.frontmatter.entry_atoms ?? [], atoms).length);
    // 78 of 78 on 2026-09-22. Every guide declares concepts and every set of
    // concepts reaches a work, so the floor is the population itself.
    expect(counts.filter((n) => n >= 1).length).toBe(bridges.length);
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(4);
  });

  it("gives the guides that cite nothing themselves a full block", async () => {
    const [sourceless, atoms] = await Promise.all([sourcelessGuides(), loadAtoms()]);
    // 48 of 78 on 2026-09-22 (entry 196 counted the same 48 a day earlier).
    expect(sourceless.length).toBeGreaterThanOrEqual(40);
    for (const bridge of sourceless) {
      const sources = sourcesOf(bridge.frontmatter.entry_atoms ?? [], atoms);
      // Min 5 on the day; the entry's claim is that not one of these pages is
      // short of a reading list, so this is the finding as an assertion.
      expect(sources.length, bridge.slug).toBeGreaterThanOrEqual(5);
    }
  });

  it("records the links the block creates and points every one at the library", async () => {
    const [bridges, atoms] = await Promise.all([loadBridges(), loadAtoms()]);
    const referenceIds = new Set(
      atoms.filter((a) => a.frontmatter.type === "reference").map((a) => a.frontmatter.id),
    );
    const conceptIds = new Set(bridges.flatMap((b) => b.frontmatter.entry_atoms ?? []));
    let links = 0;
    const reached = new Set<string>();

    for (const bridge of bridges) {
      const sources = sourcesOf(bridge.frontmatter.entry_atoms ?? [], atoms);
      const ids = sources.map((s) => s.id);
      expect(new Set(ids).size, bridge.slug).toBe(ids.length);
      for (let i = 1; i < sources.length; i += 1) {
        expect(sources[i - 1].citedBy.length, bridge.slug).toBeGreaterThanOrEqual(
          sources[i].citedBy.length,
        );
      }
      for (const source of sources) {
        links += 1;
        reached.add(source.id);
        expect(referenceIds.has(source.id), source.id).toBe(true);
        expect(source.url).toBe(`/library/${source.id}`);
        expect(source.title.length).toBeGreaterThan(0);
        // The reason beside the work: at least one of the guide's own
        // declared concepts, never a reference and never an atom the guide
        // does not declare.
        expect(source.citedBy.length, source.id).toBeGreaterThanOrEqual(1);
        for (const citer of source.citedBy) {
          expect(conceptIds.has(citer.id), citer.id).toBe(true);
          expect(referenceIds.has(citer.id), citer.id).toBe(false);
          expect(citer.url.startsWith("/"), citer.url).toBe(true);
        }
      }
    }

    // A dated reading, not a threshold to satisfy: 683 links to 31 works on
    // 2026-09-22, against the lesson block's 180 links to 27 (entry 219).
    expect(links).toBeGreaterThanOrEqual(600);
    expect(reached.size).toBeGreaterThanOrEqual(25);
  });

  it("has guides deep enough to need the cap", async () => {
    const [bridges, atoms] = await Promise.all([loadBridges(), loadAtoms()]);
    const counts = bridges.map((b) => sourcesOf(b.frontmatter.entry_atoms ?? [], atoms).length);
    // 71 of 78 exceed the cap of 6, so "and N more" is the usual case rather
    // than a branch that never runs; max 12, so the largest fold is 6.
    expect(GUIDE_SOURCES_CAP).toBe(6);
    expect(counts.filter((n) => n > GUIDE_SOURCES_CAP).length).toBeGreaterThanOrEqual(60);
    // The number the component puts in "and N more" is what is left after the
    // cap, and it is never negative on a guide inside it.
    const more = counts.map((n) => n - Math.min(n, GUIDE_SOURCES_CAP));
    expect(Math.min(...more)).toBe(0);
    expect(Math.max(...more)).toBe(Math.max(...counts) - GUIDE_SOURCES_CAP);
  });

  it("inverts to the guides standing on each work", async () => {
    const [atoms, index] = await Promise.all([loadAtoms(), worksCitedByGuides()]);
    const works = atoms.filter((a) => a.frontmatter.type === "reference");
    // 31 of 32 works are reached by a guide on 2026-09-22; only
    // ref-salinsky-improv-handbook is reached by none, because no guide
    // declares a concept that cites it.
    expect(index.size).toBeGreaterThanOrEqual(25);
    expect(index.size).toBeLessThanOrEqual(works.length);
    for (const [workId, guides] of index) {
      expect(
        works.some((w) => w.frontmatter.id === workId),
        workId,
      ).toBe(true);
      expect(guides.length, workId).toBeGreaterThanOrEqual(1);
      expect(new Set(guides.map((g) => g.slug)).size, workId).toBe(guides.length);
      for (let i = 1; i < guides.length; i += 1) {
        expect(guides[i - 1].citedBy, workId).toBeGreaterThanOrEqual(guides[i].citedBy);
      }
      for (const guide of guides) expect(guide.href).toBe(`/${guide.slug}`);
    }
    // 17 works are named by more than the 12 the library page shows open, so
    // that page's "and N more" line is exercised too (Impro 72, Truth in
    // Comedy 70, Spolin 69).
    expect(
      [...index.values()].filter((g) => g.length > CITING_GUIDES_CAP).length,
    ).toBeGreaterThanOrEqual(12);
  });

  /**
   * The built pages. `fresh` above, not `built`: a build older than the
   * component cannot hold the block, so these skip on a stale tree and run
   * from the next `npm run build` onward.
   */
  it.runIf(fresh)("renders the block on every built guide page", async () => {
    const bridges = await loadBridges();
    let rendered = 0;
    for (const bridge of bridges) {
      const file = path.join(APP, `${bridge.slug}.html`);
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, "utf-8");
      expect(html, bridge.slug).toContain('data-track="guide-sources"');
      rendered += 1;
    }
    // Guard the guard: a changed route shape would find no pages and pass.
    expect(rendered).toBeGreaterThanOrEqual(70);
  });

  it.runIf(fresh)("lists the inheriting guides on the built library pages", async () => {
    const index = await worksCitedByGuides();
    let listed = 0;
    for (const [workId, guides] of index) {
      const file = path.join(APP, "library", `${workId}.html`);
      if (!fs.existsSync(file)) continue;
      // React leaves a text-node separator between the label and the count.
      const html = fs.readFileSync(file, "utf-8").replace(/<!-- -->/g, "");
      expect(html, workId).toContain(`Guides standing on it (${guides.length})`);
      listed += 1;
    }
    expect(listed).toBeGreaterThanOrEqual(25);
  });
});
