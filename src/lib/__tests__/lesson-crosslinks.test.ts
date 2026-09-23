import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { homePath, lessonsNotNamingNeighbour, readProgression } from "../../../scripts/seeds.mjs";
import { getParentPath, loadAtoms, loadPaths, loadThreads } from "../content";
import { requireSets, requiresGraph } from "../direct-requires";
import {
  crosslinkFor,
  LESSON_CROSSLINK_CONCEPT_LIMIT,
  lessonCrosslinks,
  sharedConceptLessons,
} from "../lesson-crosslinks";

/**
 * The lessons' one sentence about each other.
 *
 * Measured over rendered bodies with the chrome and the derived blocks out,
 * concepts link concepts 1,014 times and guides link guides 280, while
 * lesson → lesson is 0 and path → path is 0: no lesson's prose names another
 * lesson's title anywhere in the 25 files, 0 of the 600 ordered pairs, and 1
 * lesson uses a sequence phrase at all (tracker entry 339, 2026-09-22). The
 * paths do the joining and do it completely — 17 mentions, 17 linked — so
 * every statement that the lessons form an order is furniture: the prev/next
 * nav, the program map, the progress bar. That is why entries 98 and 269
 * could find the declared order wrong without anything reading wrong.
 *
 * Two derived answers, guarded here: the line under the byline naming the
 * lesson before this one on its home path, and the mark on a composed-from
 * item whose concept another lesson also teaches.
 *
 * Presence, not markup, throughout: the failure this is written against is a
 * reader that silently stops returning lines — which a markup assertion
 * passes happily on nothing — so every population is asserted alongside the
 * result.
 */
const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
/** A build directory is not a finished build — name a page the build always produces. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

describe("lesson crosslinks", () => {
  /**
   * 11 of the 25 lessons carried a line on 2026-09-22, out of the 13 that
   * have a lesson before them on their home path at all (21 lessons have a
   * home path; 8 of those open one). The floor is just under the 11 and the
   * debt is the 2 that go without: a candidate the prerequisite map ranks
   * only for the declared closure is passed over, because the sentence says
   * the lesson builds on the concept and the honest form of that claim is a
   * direct need. Writing the 13 authored sentences (docs/seeds.md) is what
   * makes this block deletable, not a higher number here.
   */
  it("gives a line to the lessons whose home path puts a teacher before them", async () => {
    const threads = await loadThreads();
    expect(threads.length).toBeGreaterThanOrEqual(25);

    let homed = 0;
    let withPredecessor = 0;
    for (const thread of threads) {
      const home = await getParentPath(thread.frontmatter.id);
      if (!home) continue;
      homed++;
      if ((home.frontmatter.threads ?? []).indexOf(thread.frontmatter.id) > 0) withPredecessor++;
    }
    // Guard the guard: the population the rule can even apply to.
    expect(homed).toBeGreaterThanOrEqual(21);
    expect(withPredecessor).toBeGreaterThanOrEqual(13);

    const lines = await lessonCrosslinks();
    expect(lines.size).toBeGreaterThanOrEqual(10);
    expect(lines.size).toBeLessThanOrEqual(withPredecessor);
  });

  it("names a lesson the home path places before this one, never this one", async () => {
    const lines = await lessonCrosslinks();
    const wrongWay: string[] = [];
    const itself: string[] = [];
    for (const [lessonId, line] of lines) {
      if (line.lessonId === lessonId) itself.push(lessonId);
      const home = await getParentPath(lessonId);
      const order = home?.frontmatter.threads ?? [];
      const at = order.indexOf(lessonId);
      const before = order.indexOf(line.lessonId);
      if (before === -1 || at === -1 || before >= at) {
        wrongWay.push(`${lessonId} -> ${line.lessonId}`);
      }
      expect(line.lessonHref).toBe(`/threads/${line.lessonId}`);
    }
    expect(itself, "a lesson naming itself").toEqual([]);
    expect(wrongWay, "a lesson named that the home path does not put first").toEqual([]);
  });

  /**
   * The concept in the sentence is one the named lesson composes and this
   * one's atoms require *next* — the direct prerequisites with the core read
   * as the rest of the cycle, the same `requireSets` call journey-
   * prerequisites makes. A lesson that shares an atom with this one but
   * teaches none of its needs is not a candidate, which is the shape of
   * entry 98's finding from the reader's side: sharing is not owing.
   */
  it("names only a concept the other lesson teaches and this one needs next", async () => {
    const [atoms, threads] = await Promise.all([loadAtoms(), loadThreads()]);
    const atomById = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const graph = requiresGraph(atoms.map((a) => a.frontmatter));
    const atomsOf = new Map(
      threads.map((t) => [t.frontmatter.id, new Set(t.frontmatter.atoms ?? [])]),
    );

    const lines = await lessonCrosslinks();
    expect(lines.size).toBeGreaterThan(0);
    const notTaught: string[] = [];
    const notNeeded: string[] = [];
    const ownAlready: string[] = [];
    let named = 0;
    for (const [lessonId, line] of lines) {
      expect(line.concepts.length, lessonId).toBeGreaterThan(0);
      expect(line.concepts.length, lessonId).toBeLessThanOrEqual(LESSON_CROSSLINK_CONCEPT_LIMIT);
      const own = atomsOf.get(lessonId)!;
      const taught = atomsOf.get(line.lessonId)!;
      const needs = requireSets(
        graph,
        [...own].filter((id) => atomById.has(id)),
        { core: "rest" },
      );
      for (const concept of line.concepts) {
        named++;
        expect(atomById.has(concept.id), concept.id).toBe(true);
        expect(concept.title).toBe(atomById.get(concept.id)!.title);
        if (!taught.has(concept.id)) notTaught.push(`${lessonId}: ${concept.id}`);
        if (own.has(concept.id)) ownAlready.push(`${lessonId}: ${concept.id}`);
        if (!needs.some((need) => need.ids.includes(concept.id))) {
          notNeeded.push(`${lessonId}: ${concept.id}`);
        }
      }
    }
    // 14 concepts named across the 11 lines on 2026-09-22; floor just under.
    expect(named).toBeGreaterThanOrEqual(13);
    expect(notTaught, "a concept the named lesson does not compose").toEqual([]);
    expect(notNeeded, "a concept this lesson's atoms do not require next").toEqual([]);
    expect(ownAlready, "a concept this lesson composes itself").toEqual([]);
  });

  it("gives no line to a lesson with no home path or none before it", async () => {
    const threads = await loadThreads();
    const wrong: string[] = [];
    let opening = 0;
    let unhomed = 0;
    for (const thread of threads) {
      const id = thread.frontmatter.id;
      const home = await getParentPath(id);
      const at = (home?.frontmatter.threads ?? []).indexOf(id);
      if (!home) unhomed++;
      else if (at === 0) opening++;
      else continue;
      if (await crosslinkFor(id)) wrong.push(id);
    }
    // 4 lessons no path sequences and 8 that open one, on 2026-09-22.
    expect(unhomed).toBeGreaterThanOrEqual(4);
    expect(opening).toBeGreaterThanOrEqual(8);
    expect(wrong, "a line where there is nothing before the lesson").toEqual([]);
  });

  /**
   * 28 concepts sit in 2 or more lessons and 14 in 3 or more (entry 339's
   * supporting count, and the reason entry 326's concept card breaks the
   * chain of every lesson but the primary one). The marks on 2026-09-22: 74
   * across 20 lessons, 18 of them naming a lesson on the reader's own path
   * and 56 falling back to the alphabetical rule. Floors just under, as a
   * dated reading — the number moves when a lesson's `atoms` list changes,
   * and that is a content edit, not a regression.
   */
  it("marks a concept another lesson also teaches, once, by a stated rule", async () => {
    const threads = await loadThreads();
    const composedBy = new Map<string, string[]>();
    for (const thread of threads) {
      for (const atomId of thread.frontmatter.atoms ?? []) {
        composedBy.set(atomId, [...(composedBy.get(atomId) ?? []), thread.frontmatter.id]);
      }
    }
    const shared = [...composedBy.values()].filter((ids) => ids.length >= 2);
    expect(shared.length, "concepts in 2 or more lessons").toBeGreaterThanOrEqual(27);

    const marks = await sharedConceptLessons();
    let total = 0;
    let onPath = 0;
    const wrong: string[] = [];
    const missing: string[] = [];
    for (const thread of threads) {
      const lessonId = thread.frontmatter.id;
      const home = await getParentPath(lessonId);
      const order = home?.frontmatter.threads ?? [];
      const own = marks.get(lessonId) ?? new Map();
      for (const atomId of thread.frontmatter.atoms ?? []) {
        const others = (composedBy.get(atomId) ?? []).filter((id) => id !== lessonId);
        const mark = own.get(atomId);
        // Every shared concept is marked, and only shared ones are.
        if (others.length > 0 && !mark) missing.push(`${lessonId}: ${atomId}`);
        if (!mark) continue;
        total++;
        if (others.length === 0 || mark.id === lessonId) wrong.push(`${lessonId}: ${atomId}`);
        if (!others.includes(mark.id)) wrong.push(`${lessonId}: ${atomId} -> ${mark.id}`);
        expect(mark.href).toBe(`/threads/${mark.id}`);
        const onHome = others.filter((id) => order.includes(id));
        if (onHome.length > 0) {
          onPath++;
          // Rule 1: the earliest of them on the reader's own path.
          const earliest = [...onHome].sort((a, b) => order.indexOf(a) - order.indexOf(b))[0];
          if (mark.id !== earliest) wrong.push(`${lessonId}: ${atomId} not earliest`);
        } else {
          // Rule 2: alphabetically first by title, so the choice is stable.
          const titleOf = new Map(threads.map((t) => [t.frontmatter.id, t.frontmatter.title]));
          const first = [...others].sort((a, b) =>
            (titleOf.get(a) ?? a).localeCompare(titleOf.get(b) ?? b),
          )[0];
          if (mark.id !== first) wrong.push(`${lessonId}: ${atomId} not alphabetical`);
        }
      }
    }
    expect(missing, "a shared concept with no mark").toEqual([]);
    expect(wrong, "a mark that breaks the stated rule").toEqual([]);
    expect(marks.size, "lessons carrying a mark").toBeGreaterThanOrEqual(19);
    expect(total, "marks").toBeGreaterThanOrEqual(70);
    expect(onPath, "marks naming a lesson on the reader's own path").toBeGreaterThanOrEqual(17);
  });

  /**
   * docs/seeds.md's list is built by a .mjs script that cannot import
   * content.ts, so it spells `getParentPath`'s rule again. 9 of the 25
   * lessons sit on 2 or more paths and 1 on 4, so a second rule that drifted
   * would name a neighbour the lesson's own breadcrumb never mentions
   * (tracker entry 262). This is the only thing holding the two together.
   */
  it("agrees with the seeds script about which path a lesson is in", async () => {
    const progression = readProgression(
      fs.readFileSync(path.join(ROOT, "src", "lib", "path-progression.ts"), "utf8"),
    );
    const [threads, paths] = await Promise.all([loadThreads(), loadPaths()]);
    const asScript = paths.map((p) => ({ id: p.frontmatter.id, fm: p.frontmatter }));
    let multiPath = 0;
    const disagreed: string[] = [];
    for (const thread of threads) {
      const id = thread.frontmatter.id;
      if (paths.filter((p) => p.frontmatter.threads?.includes(id)).length > 1) multiPath++;
      const mine = await getParentPath(id);
      const theirs = homePath(id, asScript, progression);
      if ((mine?.frontmatter.id ?? null) !== (theirs?.id ?? null)) {
        disagreed.push(`${id}: ${mine?.frontmatter.id ?? "-"} vs ${theirs?.id ?? "-"}`);
      }
    }
    expect(multiPath, "lessons on 2 or more paths").toBeGreaterThanOrEqual(9);
    expect(disagreed, "seeds.mjs and getParentPath disagree about a home path").toEqual([]);
  });

  /**
   * The authoring list: 13 lessons have a lesson before them on their home
   * path and none of the 13 names it — entry 339's 0 of 600 pairs, read per
   * lesson. A row leaves the list when the author writes the sentence, so
   * this is a ceiling that may only fall, and 0 is the finished state.
   */
  it("lists every lesson that still does not name its neighbour", async () => {
    const progression = readProgression(
      fs.readFileSync(path.join(ROOT, "src", "lib", "path-progression.ts"), "utf8"),
    );
    const [threads, paths] = await Promise.all([loadThreads(), loadPaths()]);
    const rows = lessonsNotNamingNeighbour(
      threads.map((t) => ({ id: t.frontmatter.id, fm: t.frontmatter, body: t.content })),
      paths.map((p) => ({ id: p.frontmatter.id, fm: p.frontmatter })),
      progression,
    );
    expect(rows.length, "lessons not naming their predecessor").toBeLessThanOrEqual(13);
    for (const row of rows) {
      expect(row.beforeId).not.toBe(row.id);
      expect(row.names).toBe(false);
    }
    // And the page says the same number, or it is stale.
    const page = fs.readFileSync(path.join(ROOT, "docs", "seeds.md"), "utf8");
    const heading = /## Lessons that never name their neighbour \((\d+)\)/.exec(page);
    expect(heading, "the seeds page has the section").not.toBeNull();
    expect(
      Number(heading![1]),
      `docs/seeds.md lists ${heading?.[1]} and the content has ${rows.length}; run \`node scripts/seeds.mjs\``,
    ).toBe(rows.length);
  });

  /**
   * The built pages. This reads `data-lesson-crosslink`, which ships for the
   * first time with this change, so it passes only after the next build; on
   * the build standing when it was written there is no such attribute and
   * the assertion is the point of the guard, not a stale reading.
   */
  it.runIf(built)("ships the line on the built lesson pages", async () => {
    const dir = path.join(APP, "threads");
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".html"));
    expect(files.length, "built lesson pages").toBeGreaterThanOrEqual(20);

    const lines = await lessonCrosslinks();
    const missing: string[] = [];
    const unexpected: string[] = [];
    let marked = 0;
    for (const file of files) {
      const slug = file.replace(/\.html$/, "");
      const html = fs.readFileSync(path.join(dir, file), "utf-8");
      const has = html.includes("data-lesson-crosslink");
      const line = lines.get(slug);
      if (line && !has) missing.push(slug);
      if (!line && has) unexpected.push(slug);
      if (!line) continue;
      // The lesson it names and the concept it names are both reachable from
      // the page: the block exists to make a link, not a sentence.
      expect(html, slug).toContain(`href="${line.lessonHref}"`);
      for (const concept of line.concepts) expect(html, slug).toContain(`href="${concept.href}"`);
      if (html.includes('data-also-taught-in="true"')) marked++;
    }
    expect(missing, "lessons with a line and no block in the HTML").toEqual([]);
    expect(unexpected, "a block on a lesson the reader gives no line").toEqual([]);
    // The composed-from marks ship too: 20 of the 25 lessons carry at least 1.
    expect(marked).toBeGreaterThanOrEqual(8);
  });
});
