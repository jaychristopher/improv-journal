import { describe, expect, it } from "vitest";

import { loadBridges, loadPaths, loadThreads } from "../content";
import { getGuideLessons } from "../guide-concepts";

/**
 * Guides and lessons compose the same atoms, yet in the built site only 8 of
 * 78 guides linked a lesson, 18 of 25 lessons were linked from no guide, and
 * the guide layer's whole hand-off to the curriculum was a path card pointing
 * at one of two beginner paths (tracker entry 145, 2026-09-21). The concept
 * block now carries a "Taught in depth" line computed from shared atoms.
 *
 * These are guards against the join going quiet: a changed frontmatter key or
 * a loader returning nothing would make every guide lesson-less and the
 * rendered line would simply vanish.
 */
describe("guide lessons", () => {
  it("hands most guides to a lesson that shares at least two of its ideas", async () => {
    const bridges = await loadBridges();
    const threads = await loadThreads();
    const paths = await loadPaths();
    expect(bridges.length).toBeGreaterThanOrEqual(70);
    expect(threads.length).toBeGreaterThanOrEqual(20);
    const threadsById = new Map(threads.map((t) => [t.frontmatter.id, t]));

    let withLesson = 0;
    let beginnerSentToAdvanced = 0;
    const firstSlot = new Map<string, number>();
    const reached = new Set<string>();
    for (const b of bridges) {
      const lessons = await getGuideLessons(b.slug);
      expect(lessons.length, b.slug).toBeLessThanOrEqual(2);
      if (lessons.length > 0) withLesson += 1;

      // The guide's atom set is `entry_atoms` when any lesson shares two of
      // them, otherwise the body's backticks; either way every returned
      // lesson must genuinely compose at least two of the guide's atoms.
      const declared = new Set(b.frontmatter.entry_atoms ?? []);
      const bodied = new Set([...b.content.matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]));
      const overlap = (atoms: string[], set: Set<string>) =>
        new Set(atoms.filter((a) => set.has(a))).size;
      const declaredHits = threads.some((t) => overlap(t.frontmatter.atoms, declared) >= 2);
      const guideAtoms = declaredHits ? declared : bodied;
      for (const lesson of lessons) {
        const thread = threadsById.get(lesson.id);
        expect(thread, `${b.slug}: ${lesson.id} is not a lesson`).toBeDefined();
        expect(lesson.href).toBe(`/threads/${lesson.id}`);
        expect(lesson.title).toBe(thread!.frontmatter.title);
        expect(lesson.shared, `${b.slug}: ${lesson.id}`).toBe(
          overlap(thread!.frontmatter.atoms, guideAtoms),
        );
        expect(lesson.shared, `${b.slug}: ${lesson.id}`).toBeGreaterThanOrEqual(2);
        reached.add(lesson.id);
      }

      // Ranking is by path tier (the guide's own entry path, then its
      // audience, then one step ahead), then the shared concepts both pages
      // name in their bodies (entry 298, held by hand-off-named.test.ts),
      // then overlap normalised by lesson size — not raw overlap, which sent
      // 23 guides to the ten-atom Traditions in Tension (tracker entry 205,
      // 2026-09-21). So a second slot may share more atoms than the first
      // when it sits on a worse path or names fewer of them.
      const entryPath = paths.find((p) => p.frontmatter.id === b.frontmatter.entry_path);
      const entryAudience = new Set(entryPath?.frontmatter.audience ?? []);
      if (entryAudience.has("beginner")) {
        for (const lesson of lessons) {
          const audiences = paths
            .filter((p) => p.frontmatter.threads.includes(lesson.id))
            .flatMap((p) => p.frontmatter.audience ?? []);
          if (audiences.includes("advanced") && !audiences.includes("beginner")) {
            beginnerSentToAdvanced += 1;
          }
        }
      }
      if (lessons[0]) firstSlot.set(lessons[0].id, (firstSlot.get(lessons[0].id) ?? 0) + 1);
    }

    // 20 beginner guides were sent to an advanced-path lesson under the raw
    // overlap rule; 9 remained (their own paths' lessons share fewer than
    // two atoms with them). On 2026-09-22 the rank began preferring, within
    // a path tier, the lesson whose body names the guide's concepts (entry
    // 298), and funny-questions-to-ask's second slot moved from The Game
    // Beneath the Game — four atoms declared in common, none named by both
    // pages — to Traditions in Tension, which discusses one of them: 10.
    // That one is the rule working, not a regression; the ceiling holds the
    // rest, and may fall.
    expect(beginnerSentToAdvanced).toBeLessThanOrEqual(10);
    // No single lesson opens the line for more than a quarter of the guides
    // (quieting-the-planning-mind leads with 16 of 76 today).
    for (const [id, n] of firstSlot) expect(n, id).toBeLessThanOrEqual(19);

    // Measured 2026-09-21: 76 of 78 guides (del-close and framing-effect
    // share fewer than two atoms with any lesson, declared or in the body).
    expect(withLesson).toBeGreaterThanOrEqual(75);
    // Measured 2026-09-21: 15 of 25 lessons reached, against 7 before the
    // line existed. The ten still unreached (beyond-the-harold,
    // conversation-that-felt-like-magic, physics-of-every-room,
    // presence-and-commitment, shaping-shared-reality, show-as-architecture,
    // the-connective-tissue, the-plateau-is-a-map, the-practice-lab,
    // the-system-underneath) share fewer than two atoms with any guide, or
    // lose the top-two cut to a lesson that shares more. 16 on 2026-09-22
    // under the named-overlap rank (entry 298): presence-and-commitment and
    // the-system-underneath are now reached, the-game-beneath-the-game no
    // longer is (its one guide's pages named nothing in common with it).
    expect(reached.size).toBeGreaterThanOrEqual(14);
  });

  it("returns nothing for a slug that is not a guide", async () => {
    expect(await getGuideLessons("not-a-guide")).toEqual([]);
  });
});
