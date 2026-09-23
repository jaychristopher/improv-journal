import { describe, expect, it } from "vitest";

import {
  getParentPath,
  getPathProgressionRank,
  loadAtoms,
  loadPaths,
  loadThreads,
} from "../content";
import { getPathPrerequisites } from "../path-prerequisites";

/**
 * A lesson on several paths has one home, and every surface names it.
 *
 * Until 2026-09-21 the site had two rules for which path a lesson belongs
 * to. `getParentPath` — the breadcrumb, the JSON-LD trail, the lessons index
 * grouping, prev/next and "N of M", the concept page's context line — took
 * the path where the lesson came earliest in sequence (position first). The
 * "taught in <path>" labels on the path pages, the guide hand-off ranking
 * and the audience hubs took the path earliest in the progression (rank
 * first). They disagreed on 5 of the 11 shared lessons, so 23 concepts were
 * labelled "taught in Improv for Life" on one page and opened a lesson whose
 * breadcrumb, siblings and counter said The Art of Ensemble (tracker entry
 * 262). The rule is now rank first everywhere, position the tie-break, and
 * `path-prerequisites` reads its label off the lesson's home rather than
 * scanning the paths, so the two cannot drift apart again. These guards
 * hold that.
 */
describe("a lesson's home path", () => {
  const rankFirst = (
    paths: Awaited<ReturnType<typeof loadPaths>>,
    threadId: string,
  ): string | null => {
    const on = paths.filter((p) => p.frontmatter.threads?.includes(threadId));
    if (on.length === 0) return null;
    const index = (p: (typeof on)[number]) => p.frontmatter.threads!.indexOf(threadId);
    return [...on].sort(
      (a, b) =>
        getPathProgressionRank(a.frontmatter.id) - getPathProgressionRank(b.frontmatter.id) ||
        index(a) - index(b) ||
        a.frontmatter.title.localeCompare(b.frontmatter.title),
    )[0].frontmatter.id;
  };

  it("is the earliest path in the progression, for every lesson on two or more paths", async () => {
    const [paths, threads] = await Promise.all([loadPaths(), loadThreads()]);
    expect(threads.length).toBeGreaterThanOrEqual(20);

    let shared = 0;
    for (const thread of threads) {
      const id = thread.frontmatter.id;
      const on = paths.filter((p) => p.frontmatter.threads?.includes(id));
      if (on.length < 2) continue;
      shared += 1;
      const home = await getParentPath(id);
      expect(home, id).not.toBeNull();
      expect(home!.frontmatter.id, id).toBe(rankFirst(paths, id));
      // The home path ranks no later than any other path that sequences it.
      const homeRank = getPathProgressionRank(home!.frontmatter.id);
      for (const p of on) {
        expect(homeRank, `${id}: ${home!.frontmatter.id} ranks after ${p.frontmatter.id}`).toBe(
          Math.min(homeRank, getPathProgressionRank(p.frontmatter.id)),
        );
      }
    }
    // 11 of 25 lessons sit on two or more paths on 2026-09-21. The guard
    // fails if the filter stops finding them rather than passing on nothing.
    expect(shared).toBeGreaterThanOrEqual(10);
  });

  /**
   * The five entry 262 named, each now at home on the path the "taught in"
   * label was already sending readers to. If a path is re-sequenced these
   * move with it; the assertion above is the rule, this is the record.
   */
  it("moved the five lessons entry 262 named to their progression-earliest path", async () => {
    const expected: Record<string, string> = {
      "the-inner-game-expanded": "improv-for-life",
      "clear-signal-simple-signal": "physics-of-connection",
      "hardest-thing-youll-never-plan": "physics-of-connection",
      "first-rule-you-already-know": "physics-of-connection",
      "physics-of-every-room": "physics-of-connection",
    };
    for (const [lesson, pathId] of Object.entries(expected)) {
      expect((await getParentPath(lesson))?.frontmatter.id, lesson).toBe(pathId);
    }
  });

  it("is the path every 'taught in' label names, for every atom a path leans on", async () => {
    const [paths, threads, atoms] = await Promise.all([loadPaths(), loadThreads(), loadAtoms()]);
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    const composing = (atomId: string) =>
      threads.filter((t) => t.frontmatter.atoms?.includes(atomId)).map((t) => t.frontmatter.id);

    let labelled = 0;
    const seen = new Set<string>();
    for (const path of paths) {
      for (const item of await getPathPrerequisites(path.frontmatter.id)) {
        if (!item.taughtIn) continue;
        labelled += 1;
        seen.add(item.id);
        const { pathId } = item.taughtIn;
        // Some lesson on the labelled path composes the atom and calls that
        // path home, so the click lands where the label said.
        const homes = await Promise.all(
          composing(item.id).map(async (threadId) => ({
            threadId,
            home: (await getParentPath(threadId))?.frontmatter.id ?? null,
          })),
        );
        const onPath = homes.filter(({ threadId }) =>
          paths.find((p) => p.frontmatter.id === pathId)?.frontmatter.threads?.includes(threadId),
        );
        expect(onPath.length, `${item.id}: nothing on ${pathId} teaches it`).toBeGreaterThan(0);
        expect(
          onPath.map((h) => h.home),
          `${item.id}: taught in ${pathId} via ${onPath.map((h) => `${h.threadId} (home ${h.home})`).join(", ")}`,
        ).toContain(pathId);
        // And it is the earliest such: no composing lesson has a home that
        // ranks lower.
        const labelRank = getPathProgressionRank(pathId);
        for (const { threadId, home } of homes) {
          if (!home) continue;
          expect(
            getPathProgressionRank(home),
            `${item.id}: ${threadId} is at home on ${home}, earlier than ${pathId}`,
          ).toBeGreaterThanOrEqual(labelRank);
        }
      }
    }
    // 83 labels over 11 paths naming 9 distinct atoms on 2026-09-21; the
    // caps keep the count small, so the floor is the shape not the number.
    expect(labelled).toBeGreaterThanOrEqual(50);
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });
});
