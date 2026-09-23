import { describe, expect, it } from "vitest";

import { loadAtoms, loadBridges, loadPaths, loadThreads } from "../content";
import { getGuideLessons, guidesHandingOffTo } from "../guide-concepts";
import { lessonsCitingWork, lessonSources } from "../lesson-sources";
import { getPathPrerequisites, pathsLeaningOn } from "../path-prerequisites";

/**
 * Every derived cross-layer block has a reverse computed from the same data.
 *
 * Tracker entries 219 and 220 (2026-09-21) measured four blocks added in one
 * day, each a link from one layer to another, and whether the page at the far
 * end linked back: "Sources behind this lesson" 180 links, 1 reverse; "Taught
 * in depth" 133, 8; "Ideas this path leans on" 88, 0. Only "Practise it" was
 * reciprocated (102 of 109), and only because the drill id sits in the guide's
 * HTML where the bridge-atom index happens to read. Reciprocity on this site
 * was a property of where a link was computed, not of what it connected.
 *
 * The three reverses are inversions of the forward function — one walk, read
 * from both ends — so this is not a test that two implementations agree; it is
 * a test that the inversion is complete and the cache is not stale, with the
 * populations guarded so a loader returning nothing fails here rather than
 * passing on an empty graph. Build-independent by design: the forward blocks
 * are what the pages render, and the built HTML is checked elsewhere.
 */
describe("block reciprocity", () => {
  it("every lesson → work link has a work → lesson link, and vice versa", async () => {
    const [threads, atoms] = await Promise.all([loadThreads(), loadAtoms()]);
    expect(threads.length).toBeGreaterThanOrEqual(20);

    let pairs = 0;
    const forward = new Set<string>();
    for (const t of threads) {
      for (const source of lessonSources(t.frontmatter.atoms ?? [], atoms)) {
        pairs += 1;
        forward.add(`${t.frontmatter.id}→${source.id}`);
        const back = await lessonsCitingWork(source.id);
        const hit = back.find((l) => l.id === t.frontmatter.id);
        expect(hit, `${source.id} does not list ${t.frontmatter.id}`).toBeDefined();
        expect(hit!.href).toBe(`/threads/${t.frontmatter.id}`);
        expect(hit!.title).toBe(t.frontmatter.title);
        // The count is the same number seen from either end.
        expect(hit!.citedBy).toBe(source.citedBy);
      }
    }
    // Entry 219 counted 180 rendered links to 27 works on the day the block
    // landed; the walk itself yields 221 pairs across all 32 works, the
    // difference being what the lesson page folds into "and N more".
    expect(pairs).toBeGreaterThanOrEqual(150);

    // And nothing in the reverse that the forward did not put there.
    let reverse = 0;
    for (const work of atoms.filter((a) => a.frontmatter.type === "reference")) {
      for (const lesson of await lessonsCitingWork(work.frontmatter.id)) {
        reverse += 1;
        expect(
          forward.has(`${lesson.id}→${work.frontmatter.id}`),
          `${work.frontmatter.id} lists ${lesson.id}`,
        ).toBe(true);
      }
    }
    expect(reverse).toBe(pairs);
  });

  it("every guide → lesson hand-off is answered by the lesson, and vice versa", async () => {
    const [bridges, threads] = await Promise.all([loadBridges(), loadThreads()]);
    expect(bridges.length).toBeGreaterThanOrEqual(70);
    expect(threads.length).toBeGreaterThanOrEqual(20);

    let pairs = 0;
    const forward = new Set<string>();
    for (const b of bridges) {
      for (const lesson of await getGuideLessons(b.slug)) {
        pairs += 1;
        forward.add(`${b.slug}→${lesson.id}`);
        const back = await guidesHandingOffTo(lesson.id);
        const hit = back.find((g) => g.slug === b.slug);
        expect(hit, `${lesson.id} does not list ${b.slug}`).toBeDefined();
        expect(hit!.href).toBe(`/${b.slug}`);
        expect(hit!.title).toBe(b.frontmatter.title);
        expect(hit!.shared).toBe(lesson.shared);
      }
    }
    // Entry 220 counted 133 on the day; 76 of 78 guides carry the line.
    expect(pairs).toBeGreaterThanOrEqual(120);

    let reverse = 0;
    for (const t of threads) {
      const back = await guidesHandingOffTo(t.frontmatter.id);
      for (let i = 1; i < back.length; i += 1) {
        expect(back[i - 1].shared, t.frontmatter.id).toBeGreaterThanOrEqual(back[i].shared);
      }
      for (const guide of back) {
        reverse += 1;
        expect(
          forward.has(`${guide.slug}→${t.frontmatter.id}`),
          `${t.frontmatter.id} lists ${guide.slug}`,
        ).toBe(true);
      }
    }
    expect(reverse).toBe(pairs);
  });

  it("every path → atom lean is answered by the atom, and vice versa", async () => {
    const [paths, atoms] = await Promise.all([loadPaths(), loadAtoms()]);
    expect(paths.length).toBe(11);
    expect(atoms.length).toBeGreaterThanOrEqual(200);

    let pairs = 0;
    const forward = new Set<string>();
    for (const p of paths) {
      for (const item of await getPathPrerequisites(p.frontmatter.id)) {
        pairs += 1;
        forward.add(`${p.frontmatter.id}→${item.id}`);
        const back = await pathsLeaningOn(item.id);
        const hit = back.find((x) => x.id === p.frontmatter.id);
        expect(hit, `${item.id} does not list ${p.frontmatter.id}`).toBeDefined();
        expect(hit!.href).toBe(`/paths/${p.frontmatter.id}`);
        expect(hit!.title).toBe(p.frontmatter.title);
        expect(hit!.requiredBy).toBe(item.requiredBy);
      }
    }
    // Entry 220 counted 88 (eleven paths, eight each) landing on 32 atoms.
    // The leans-on list reads direct prerequisites since 2026-09-22 (entry
    // 277: the closure is folded away), which shortened it to 76 pairs across
    // ten paths; Beginner Foundations owes nothing outside itself now. Then
    // 67 on 29 atoms the same day, once a collapsed cycle was read as one
    // need satisfied by any member the path teaches (`requireSets`, after
    // entry 315 moved the member that names it): a path that teaches
    // `commitment` no longer leans on `active-listening` for the same knot
    // (The Art of Ensemble had it from six atoms; one names it alone now),
    // and Improv for Teams and Teaching Improv each lost three items.
    expect(pairs).toBeGreaterThanOrEqual(67);

    let reverse = 0;
    let leanedOn = 0;
    for (const a of atoms) {
      const back = await pathsLeaningOn(a.frontmatter.id);
      if (back.length > 0) leanedOn += 1;
      for (const path of back) {
        reverse += 1;
        expect(
          forward.has(`${path.id}→${a.frontmatter.id}`),
          `${a.frontmatter.id} lists ${path.id}`,
        ).toBe(true);
      }
    }
    expect(reverse).toBe(pairs);
    // Entry 220: 32 atoms leaned on, none of them shown on a path from their
    // own page before this.
    expect(leanedOn).toBeGreaterThanOrEqual(25);
  });

  it("returns nothing for ids that are not in the graph", async () => {
    expect(await lessonsCitingWork("ref-not-a-work")).toEqual([]);
    expect(await guidesHandingOffTo("not-a-lesson")).toEqual([]);
    expect(await pathsLeaningOn("not-an-atom")).toEqual([]);
  });
});
