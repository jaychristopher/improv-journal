import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  getParentPath,
  getPathProgressionRank,
  loadAtoms,
  loadPaths,
  loadThreads,
} from "../content";
import { directRequires, requiresGraph } from "../direct-requires";
import {
  getPathPrerequisites,
  leansAboveLine,
  PATH_PREREQUISITE_LIMIT,
  progressionOrder,
  READER_LEVEL,
  readerLevel,
  taughtAboveCount,
} from "../path-prerequisites";

const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
/** A build directory is not a finished build — name a page the build always produces. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * Every path declares one free-text prerequisite sentence and nothing checks
 * it against the graph, while the atoms' `requires` edges — the site's real
 * prerequisite relation — say no path is closed: each one's lessons rest on
 * eight to twenty-four atoms it never teaches (novel-insights 122, 195).
 * This module derives that list, and these tests keep it honest: real atoms,
 * none the path teaches, attributed to the earliest path that does.
 *
 * Since 2026-09-22 the list is read from the atoms' *direct* prerequisites
 * (direct-requires.ts, tracker entry 277) rather than the declared closure,
 * which named the 19-atom knot once per member on every path. The gaps are
 * smaller and one is closed: Beginner Foundations' five atoms need next only
 * the core, and it teaches three members of it. Where a floor or a fixture
 * moved for that reason, the comment says so.
 *
 * The knot is read as one need (`requireSets`, the same day): a `viaCore`
 * prerequisite is satisfied by any member the path teaches, and where none
 * is, the block names one member for it. Entry 315 had moved the member
 * that names a collapsed cycle to the most-required, and taken as the
 * prerequisite that would have had a path that teaches `commitment` lean
 * on `active-listening` for the same knot.
 */
describe("path prerequisites", () => {
  it("derives a capped list for every path, of atoms the path does not teach", async () => {
    const [paths, atoms, threads] = await Promise.all([loadPaths(), loadAtoms(), loadThreads()]);
    expect(paths.length).toBe(11);

    const atomIds = new Set(atoms.map((a) => a.frontmatter.id));
    const threadAtoms = new Map(
      threads.map((t) => [t.frontmatter.id, new Set(t.frontmatter.atoms ?? [])]),
    );

    const closed: string[] = [];
    for (const p of paths) {
      const id = p.frontmatter.id;
      const list = await getPathPrerequisites(id);
      expect(list.length, id).toBeLessThanOrEqual(PATH_PREREQUISITE_LIMIT);
      if (list.length === 0) closed.push(id);

      const taught = new Set<string>();
      for (const threadId of p.frontmatter.threads ?? []) {
        for (const a of threadAtoms.get(threadId) ?? []) taught.add(a);
      }

      for (const item of list) {
        expect(atomIds.has(item.id), `${id}: ${item.id} is not an atom`).toBe(true);
        expect(taught.has(item.id), `${id} teaches ${item.id} itself`).toBe(false);
        expect(item.requiredBy, `${id}: ${item.id}`).toBeGreaterThan(0);
        expect(item.url.startsWith("/"), `${id}: ${item.id} url`).toBe(true);
        expect(item.title.length).toBeGreaterThan(0);
        // A path cannot be the earliest teacher of something it does not teach.
        expect(item.taughtIn?.pathId, `${id}: ${item.id} attributed to itself`).not.toBe(id);
      }

      // Most-required first, so what the cap cuts is what fewest lessons lean on.
      for (let i = 1; i < list.length; i++) {
        expect(list[i - 1].requiredBy, `${id} order`).toBeGreaterThanOrEqual(list[i].requiredBy);
      }
    }
    // Entry 122 found the smallest gap on the site was eight, so nothing was
    // empty; under the reduction (entry 277) one path closes — see the next
    // test — and the rest still lean on six to fifteen atoms uncapped. The
    // list of closed paths is pinned, so a second one closing is noticed.
    expect(closed).toEqual(["beginner-foundations"]);
  });

  /**
   * Entry 122 (2026-09-21) counted the beginner programme leaning on eight
   * atoms its two lessons never teach, and entry 166 named `specificity` as
   * the one `offers` requires that no path teaches. Read as a closure that
   * was so; read as direct prerequisites it is not. The eight were the knot
   * (entry 141) named once each: `yes-and` declares five prerequisites, all
   * in the knot or reachable from it, `offers` declares `active-listening`
   * and `specificity`, `commitment` declares four knot members. Everything
   * the five atoms need *next* is the core, and the path teaches
   * `active-listening`, `offers` and `commitment` — it is the door into
   * the core, which is what a beginner programme should be. The atom pages
   * fold the rest of the core under whichever member stands for it there
   * (`commitment` on `yes-and` since entry 315; `active-listening` before),
   * and the path does not care which: any member it teaches is the core
   * taught.
   */
  it("the beginner programme is closed under the reduction: its atoms need next only what it teaches", async () => {
    const list = await getPathPrerequisites("beginner-foundations");
    expect(list).toEqual([]);
    // The reason, from the graph: each taught atom's direct prerequisites
    // are taught on the path.
    const [atoms, threads, paths] = await Promise.all([loadAtoms(), loadThreads(), loadPaths()]);
    const graph = requiresGraph(atoms.map((a) => a.frontmatter));
    const path = paths.find((p) => p.frontmatter.id === "beginner-foundations")!;
    const taught = new Set(
      path.frontmatter.threads!.flatMap(
        (t) => threads.find((x) => x.frontmatter.id === t)?.frontmatter.atoms ?? [],
      ),
    );
    expect(taught.size).toBe(5);
    let declaredOutside = 0;
    let viaCore = 0;
    for (const atomId of taught) {
      const { declared, direct } = directRequires(graph, atomId);
      declaredOutside += declared.filter((id) => !taught.has(id)).length;
      for (const d of direct) {
        // A core need is met by any member the path teaches, whichever
        // member names it; an ordinary need by itself.
        const met = d.viaCore ? d.core.some((id) => taught.has(id)) : taught.has(d.id);
        expect(met, `${atomId} needs ${d.id}${d.viaCore ? " and the core" : ""} next`).toBe(true);
        if (d.viaCore) viaCore += 1;
      }
    }
    // Guard the guard: the closure is what makes this a set question.
    expect(viaCore).toBeGreaterThanOrEqual(3);
    // The closure still names atoms the path does not teach: those are the
    // eight entry 122 counted, and they are what the reduction folds.
    expect(declaredOutside).toBeGreaterThanOrEqual(8);
  });

  it("attributes each prerequisite to a path whose lessons actually compose it", async () => {
    const [paths, threads] = await Promise.all([loadPaths(), loadThreads()]);
    const threadAtoms = new Map(
      threads.map((t) => [t.frontmatter.id, new Set(t.frontmatter.atoms ?? [])]),
    );
    const pathAtoms = new Map(
      paths.map((p) => {
        const set = new Set<string>();
        for (const threadId of p.frontmatter.threads ?? []) {
          for (const a of threadAtoms.get(threadId) ?? []) set.add(a);
        }
        return [p.frontmatter.id, set];
      }),
    );
    const order = progressionOrder(paths.map((p) => p.frontmatter.id));
    expect(order.length).toBe(paths.length);
    expect(new Set(order).size).toBe(paths.length);
    expect(order[0]).toBe("beginner-foundations");
    expect(order[order.length - 1]).toBe("reference-guide");

    let untaughtAnywhere = 0;
    let attributed = 0;
    for (const p of paths) {
      for (const item of await getPathPrerequisites(p.frontmatter.id)) {
        if (!item.taughtIn) {
          untaughtAnywhere += 1;
          // Null means no path at all, not just this one.
          for (const [pathId, set] of pathAtoms) {
            expect(set.has(item.id), `${item.id} is taught on ${pathId}`).toBe(false);
          }
          continue;
        }
        attributed += 1;
        const { pathId, pathTitle } = item.taughtIn;
        expect(pathAtoms.get(pathId)?.has(item.id), `${pathId} does not teach ${item.id}`).toBe(
          true,
        );
        expect(pathTitle, pathId).toBe(
          paths.find((q) => q.frontmatter.id === pathId)!.frontmatter.title,
        );
        // Earliest in the progression: no path at a strictly lower rank
        // teaches the atom. Until 2026-09-21 this walked `progressionOrder`
        // instead, which is not rank order where the chain forks — it lists
        // The Art of Ensemble (rank 6) before the teacher's branch (rank 5)
        // — and so let `trust` be attributed to the ensemble path while The
        // Teacher's Toolkit taught it a step earlier (tracker entry 262).
        const labelRank = getPathProgressionRank(pathId);
        for (const [earlier, set] of pathAtoms) {
          if (getPathProgressionRank(earlier) >= labelRank) continue;
          expect(set.has(item.id), `${earlier} teaches ${item.id} earlier`).toBe(false);
        }
        // And it is a lesson's home, so the label sends the reader to a
        // lesson whose breadcrumb says the same path (entry 262).
        const homes = await Promise.all(
          paths
            .find((q) => q.frontmatter.id === pathId)!
            .frontmatter.threads!.filter((t) => threadAtoms.get(t)?.has(item.id))
            .map(async (t) => (await getParentPath(t))?.frontmatter.id),
        );
        expect(homes, `${item.id}: taught in ${pathId} by a lesson at home elsewhere`).toContain(
          pathId,
        );
      }
    }

    // Guard the corpus: entry 166's `specificity` and `tilt` are taught on no
    // path, so at least one item somewhere has nowhere to send the reader.
    expect(untaughtAnywhere).toBeGreaterThan(0);
    expect(attributed).toBeGreaterThan(untaughtAnywhere);
  });

  it("returns nothing for a path that does not exist", async () => {
    expect(await getPathPrerequisites("no-such-path")).toEqual([]);
  });
});

/**
 * Every path page states its prerequisites twice: the authored sentence
 * ("No stage experience required") and the derived leans-on list, 3 to 8
 * concepts each with the path that teaches it. On 2026-09-22 the two said
 * opposite things on the same page — 13 of the 67 items sitewide were taught
 * only on a path above the reader the sentence describes, 10 of them under
 * the beginner sentences, and nothing told the reader which to believe
 * (tracker entry 329). `taughtAbove` marks those items against a reader
 * ladder that is not the walking order (see READER_LEVEL), and one derived
 * line under the list says how many there are.
 */
describe("path prerequisites taught above the path's level", () => {
  /**
   * The ladder is knowledge assumed, not the order the site walks: the
   * reference shelf is the top, the teacher's path shares the intermediate
   * rung. By the walking order (path-progression's AUDIENCE_LADDER, performer
   * above advanced) the count would be 16, with 3 items on the reference
   * shelf "above" it for being taught on performer paths. Pinned so a change
   * to the rungs is a decision, not drift.
   */
  it("ranks audiences by what the reader is assumed to know", () => {
    expect(READER_LEVEL).toEqual({
      beginner: 0,
      intermediate: 1,
      teacher: 1,
      performer: 2,
      advanced: 3,
    });
    // A path for beginners and intermediates is written for the beginner.
    expect(readerLevel(["beginner", "intermediate"])).toBe(0);
    expect(readerLevel(["intermediate", "beginner"])).toBe(0);
    // No audience: above every rung, so nothing is above it.
    expect(readerLevel([])).toBe(Number.POSITIVE_INFINITY);
    expect(readerLevel(undefined)).toBe(Number.POSITIVE_INFINITY);
  });

  /**
   * The upward items, 2026-09-22: 13 of 67. A ceiling that may only fall —
   * the fix is a lesson lower on the ladder composing the atom, or a
   * beginner path dropping the lesson that needs it — never a raised number.
   * The pairs, as concept <- the path that teaches it:
   *
   * - physics-of-connection (beginner): be-brave <- the-art-of-ensemble,
   *   discovery <- self-coaching-toolkit, group-mind <- the-art-of-ensemble,
   *   trust <- teaching-improv
   * - improv-for-teams (beginner): discovery <- self-coaching-toolkit,
   *   group-mind <- the-art-of-ensemble, safety-in-the-room <- teaching-improv
   * - systems-of-improv (beginner): discovery <- self-coaching-toolkit,
   *   group-mind <- the-art-of-ensemble
   * - improv-for-life (beginner): safety-in-the-room <- teaching-improv
   * - self-coaching-toolkit (intermediate): be-brave <- the-art-of-ensemble,
   *   heightening <- advanced-game-and-character
   * - teaching-improv (teacher): group-mind <- the-art-of-ensemble
   *
   * `group-mind` alone is 4 of the 13: taught nowhere below the performer's
   * last path while 4 paths below it lean on it.
   */
  it("marks each item taught only above the path, 13 sitewide as a ceiling", async () => {
    const paths = await loadPaths();
    const levelOf = new Map(
      paths.map((p) => [p.frontmatter.id, readerLevel(p.frontmatter.audience)]),
    );
    let items = 0;
    let above = 0;
    const perPath = new Map<string, number>();
    for (const p of paths) {
      const id = p.frontmatter.id;
      const list = await getPathPrerequisites(id);
      for (const item of list) {
        items += 1;
        // The flag is exactly the ladder comparison, and nothing is above an
        // item no path teaches.
        const expected =
          item.taughtIn !== null && levelOf.get(item.taughtIn.pathId)! > levelOf.get(id)!;
        expect(item.taughtAbove, `${id}: ${item.id}`).toBe(expected);
        if (item.taughtAbove) above += 1;
      }
      perPath.set(id, taughtAboveCount(list));
    }
    // Guard the guard: the 67 items are the population the 13 sit in.
    expect(items).toBeGreaterThanOrEqual(60);
    expect(above).toBeLessThanOrEqual(13);
    expect(above).toBeGreaterThan(0);
    // The beginner sentences stand over most of them: 10 of the 13, on the 5
    // paths at rung 0 (Improv for Teams lists beginners first).
    const beginner = paths.filter((p) => levelOf.get(p.frontmatter.id) === 0);
    expect(beginner.length).toBe(5);
    const underBeginner = beginner.reduce((n, p) => n + perPath.get(p.frontmatter.id)!, 0);
    expect(underBeginner).toBeLessThanOrEqual(10);
    expect(underBeginner).toBeGreaterThan(above / 2);
    // A performer path can be above nothing on the reader ladder but the
    // reference shelf, and the shelf leans on no shelf-taught atom.
    for (const p of paths) {
      if (levelOf.get(p.frontmatter.id)! >= READER_LEVEL.performer) {
        expect(perPath.get(p.frontmatter.id), p.frontmatter.id).toBe(0);
      }
    }
  });

  /**
   * The Physics of Connection, the worked example: "No stage experience
   * required" over 7 concepts, 4 of them taught on paths for a reader who
   * has some — Be Brave and Group Mind in The Art of Ensemble, Discovery in
   * The Self-Coaching Toolkit, Trust in Teaching Improv. Pinned by name so
   * the fix is visible when it lands; the line's number is the same count.
   */
  it("says 4 of 7 on The Physics of Connection, and names which", async () => {
    const list = await getPathPrerequisites("physics-of-connection");
    expect(list.length).toBe(7);
    const above = list
      .filter((i) => i.taughtAbove)
      .map((i) => `${i.id} <- ${i.taughtIn!.pathId}`)
      .sort();
    expect(above).toEqual([
      "be-brave <- the-art-of-ensemble",
      "discovery <- self-coaching-toolkit",
      "group-mind <- the-art-of-ensemble",
      "trust <- teaching-improv",
    ]);
    expect(taughtAboveCount(list)).toBe(4);
    expect(leansAboveLine(list)).toBe(
      "4 of these are taught on intermediate or performer paths; the lesson explains them where they appear.",
    );
  });

  /**
   * Where the line renders, 2026-09-22: 6 of the 11 paths carry it and 5 do
   * not — Foundations (closed), the 3 performer paths and the reference
   * shelf (nothing is above them). Entry 329 wrote "7 of 11" in its
   * proposal; its own table has 6 paths with a count above 0, and this is
   * the reading. A path leaving the list is the fix landing; a path joining
   * it is a lesson newly leaning upward, which the ceiling above also sees.
   */
  it("renders the line on the paths with an upward item and no others", async () => {
    const paths = await loadPaths();
    const carrying: string[] = [];
    const silent: string[] = [];
    for (const p of paths) {
      const list = await getPathPrerequisites(p.frontmatter.id);
      const line = leansAboveLine(list);
      if (line === null) {
        expect(taughtAboveCount(list), p.frontmatter.id).toBe(0);
        silent.push(p.frontmatter.id);
        continue;
      }
      // The number in the line is the count, and the line is a sentence.
      expect(line.startsWith(`${taughtAboveCount(list)} of these`), p.frontmatter.id).toBe(true);
      expect(line.endsWith(".")).toBe(true);
      carrying.push(p.frontmatter.id);
    }
    expect(carrying.sort()).toEqual([
      "improv-for-life",
      "improv-for-teams",
      "physics-of-connection",
      "self-coaching-toolkit",
      "systems-of-improv",
      "teaching-improv",
    ]);
    expect(silent.length).toBe(5);
    expect(carrying.length + silent.length).toBe(11);
  });

  it("reads as a sentence at 1 as well as at many", () => {
    const item = (taughtAbove: boolean) => ({
      id: "x",
      title: "X",
      url: "/x",
      type: "definition" as const,
      requiredBy: 1,
      taughtIn: null,
      taughtAbove,
    });
    expect(leansAboveLine([item(false), item(false)])).toBeNull();
    expect(leansAboveLine([item(true), item(false)])).toMatch(/^1 of these is taught on an /);
    expect(leansAboveLine([item(true), item(true)])).toMatch(/^2 of these are taught on /);
  });

  /**
   * The line's words live in the lib, not the route file: hub-prose-links
   * holds a ceiling on the prose a route file carries, and a derived sentence
   * belongs beside the function that derives its number. The page renders
   * the helper's string under `data-leans-above` and writes none of it.
   */
  it("keeps the line's string in the lib and out of the route file", () => {
    const lib = fs.readFileSync(path.join(ROOT, "src", "lib", "path-prerequisites.ts"), "utf-8");
    const page = fs.readFileSync(
      path.join(ROOT, "src", "app", "paths", "[slug]", "page.tsx"),
      "utf-8",
    );
    expect(lib).toContain("the lesson explains them where they appear.");
    expect(page).not.toContain("the lesson explains");
    expect(page).toContain("leansAboveLine(");
    expect(page).toContain("data-leans-above");
  });

  /**
   * On the built pages: the line under the leans-on list on exactly the
   * paths that have an upward item, with its number. Reads the build, so it
   * passes from the first build that includes the line (2026-09-22) and
   * fails against a build from before it.
   */
  it.runIf(built)("renders the line on the built path pages that have an upward item", async () => {
    const paths = await loadPaths();
    let rendered = 0;
    for (const p of paths) {
      const id = p.frontmatter.id;
      const html = fs.readFileSync(path.join(APP, "paths", `${id}.html`), "utf-8");
      const line = leansAboveLine(await getPathPrerequisites(id));
      const has = html.includes("data-leans-above");
      expect(has, `${id}: line ${line === null ? "absent" : "present"} in the lib`).toBe(
        line !== null,
      );
      if (line === null) continue;
      rendered += 1;
      // The number and the sentence reach the page as text.
      expect(html, id).toContain(line);
    }
    // Guard the guard: the line is on 6 pages today; a build with none of
    // them is a build from before the line, not a corpus with no upward item.
    expect(rendered).toBeGreaterThanOrEqual(5);
  });
});
