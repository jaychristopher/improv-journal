import { describe, expect, it } from "vitest";

import {
  buildLessonsIndex,
  countWord,
  pathMembershipSentence,
  STANDALONE_GROUP_ID,
  STANDALONE_LABEL,
} from "../../app/threads/lessons-index";
import { loadPaths, loadThreads } from "../content";

/**
 * The lessons index groups by path, honestly.
 *
 * It used to group by tag with a first-match tie-break. Eight lessons carried
 * tags from two groups and landed in whichever list was written first — the
 * teacher's toolkit under "Fundamentals", *The System Underneath* not under
 * "The system" — and `traditions-in-tension`, the lesson nine flagship atom
 * pages name as their primary, carried none of the fifteen group tags and was
 * presented as "Everything else (1)". Above it all the introduction said "most
 * of these stand alone" over twenty-five lessons of which twenty-one sat in a
 * path. These guards hold the replacement to its data.
 */
describe("lessons index groups", () => {
  it("places every lesson in exactly one group", async () => {
    const [threads, index] = await Promise.all([loadThreads(), buildLessonsIndex()]);
    expect(threads.length).toBeGreaterThanOrEqual(25);

    const placements = new Map<string, string[]>();
    for (const group of index.groups) {
      for (const item of group.items) {
        placements.set(item.id, [...(placements.get(item.id) ?? []), group.id]);
      }
    }

    const missing = threads.map((t) => t.frontmatter.id).filter((id) => !placements.has(id));
    const duplicated = [...placements].filter(([, groups]) => groups.length > 1);
    expect(missing).toEqual([]);
    expect(duplicated).toEqual([]);
    expect(index.entries.length).toBe(threads.length);
  });

  it("has no leftover group, only paths and an honest standalone group", async () => {
    const [paths, index] = await Promise.all([loadPaths(), buildLessonsIndex()]);
    const pathIds = new Set(paths.map((p) => p.frontmatter.id));

    for (const group of index.groups) {
      expect(group.label.toLowerCase()).not.toContain("everything else");
      if (group.id === STANDALONE_GROUP_ID) {
        expect(group.label).toBe(STANDALONE_LABEL);
        expect(group.href).toBeUndefined();
      } else {
        expect(pathIds.has(group.id)).toBe(true);
        expect(group.href).toBe(`/paths/${group.id}`);
      }
    }
    // The standalone group comes last, so the paths read as the structure.
    expect(index.groups.at(-1)?.id).toBe(STANDALONE_GROUP_ID);
  });

  it("files a lesson under a path that sequences it, and names the others", async () => {
    const [paths, index] = await Promise.all([loadPaths(), buildLessonsIndex()]);
    const containing = (id: string) =>
      paths.filter((p) => p.frontmatter.threads?.includes(id)).map((p) => p.frontmatter.id);

    for (const group of index.groups) {
      for (const item of group.items) {
        const on = containing(item.id);
        if (group.id === STANDALONE_GROUP_ID) {
          expect(`${item.id} on ${on.join(",")}`).toBe(`${item.id} on `);
          expect(item.alsoIn).toEqual([]);
        } else {
          expect(on).toContain(group.id);
          // Every other path that sequences it is named, none twice, not itself.
          expect(item.alsoIn.map((p) => p.id).sort()).toEqual(
            on.filter((p) => p !== group.id).sort(),
          );
        }
      }
    }
  });

  it("lists a path's lessons in the path's own order", async () => {
    const [paths, index] = await Promise.all([loadPaths(), buildLessonsIndex()]);
    for (const group of index.groups) {
      const path = paths.find((p) => p.frontmatter.id === group.id);
      if (!path) continue;
      const order = path.frontmatter.threads ?? [];
      const positions = group.items.map((i) => order.indexOf(i.id));
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    }
  });

  /**
   * The lesson nine concept pages point to must not be the leftover. It sits
   * on the reference-guide path, so it is filed there.
   */
  it("files traditions-in-tension under a path", async () => {
    const index = await buildLessonsIndex();
    const group = index.groups.find((g) => g.items.some((i) => i.id === "traditions-in-tension"));
    expect(group?.id).toBe("reference-guide");
  });

  it("introduces the layer with the true split between path and standalone", async () => {
    const [threads, paths, index] = await Promise.all([
      loadThreads(),
      loadPaths(),
      buildLessonsIndex(),
    ]);
    const sequenced = new Set(paths.flatMap((p) => p.frontmatter.threads ?? []));
    const onAPath = threads.filter((t) => sequenced.has(t.frontmatter.id)).length;
    expect(index.onAPath).toBe(onAPath);
    expect(index.standalone).toBe(threads.length - onAPath);
    // 2026-09-21: 21 of 25. If this flips the sentence flips with it.
    expect(onAPath).toBeGreaterThan(threads.length / 2);

    const sentence = pathMembershipSentence(index);
    expect(sentence).toContain(`${countWord(onAPath)} of the ${countWord(threads.length)}`);
    expect(sentence.startsWith("Most")).toBe(true);
    expect(sentence).not.toMatch(/most of these stand alone/i);
    expect(sentence).toContain("stand alone");
  });

  it("spells small counts the way the prose does", () => {
    expect(countWord(4)).toBe("four");
    expect(countWord(21)).toBe("twenty-one");
    expect(countWord(25)).toBe("twenty-five");
    expect(countWord(30)).toBe("30");
  });
});
