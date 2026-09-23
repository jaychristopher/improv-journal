import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { completedLessons, type JourneyState } from "../journey";
import {
  chainAssignment,
  computeOverlap,
  getPathLessonMap,
  lessonsOnManyPaths,
  overlapSentences,
  overlapWithPredecessors,
  predecessorsOf,
  sentencesFor,
  sentenceText,
  sharedLessons,
  subsetPaths,
} from "../path-overlap";

/**
 * Read as a sequence a reader actually walks, the ladder repeats itself: a
 * reader who follows "next path" from Foundations to The Art of Ensemble is
 * assigned 24 lesson slots of which 19 are distinct, five being lessons
 * already completed on an earlier rung; Improv for Everyday Life shares two
 * of Systems of Improv's four; six lessons sit on three or more paths; and
 * Foundations is a strict subset of Teaching Improv (tracker entry 295,
 * 2026-09-22). None of it was said: the path header counted every lesson,
 * the next-path card promised four and owed two, and the journey record —
 * keyed by lesson id, so it already knew — was read on the current path
 * only.
 *
 * These guards read the overlap from content/paths, record the readings as
 * ceilings that may only fall, and check the page says what the numbers
 * say. The author may remove the subset or reorder a path; a new repeat, a
 * second subset pair, or a page that shares a lesson and says nothing is
 * what fails here.
 */
const APP = path.join(process.cwd(), ".next", "server", "app");
const built = fs.existsSync(path.join(APP, "index.html"));

/**
 * The main chain's repeats as read on 2026-09-22: `lesson` assigned again
 * by `onPath`, first done on `firstOn`. Five of 24 slots. A repeat that is
 * not in this list is new and fails; one that disappears is the author's
 * fix and passes.
 */
const MAIN_CHAIN_REPEATS = [
  {
    lesson: "first-rule-you-already-know",
    onPath: "systems-of-improv",
    firstOn: "physics-of-connection",
  },
  {
    lesson: "presence-and-commitment",
    onPath: "systems-of-improv",
    firstOn: "beginner-foundations",
  },
  {
    lesson: "hardest-thing-youll-never-plan",
    onPath: "self-coaching-toolkit",
    firstOn: "physics-of-connection",
  },
  {
    lesson: "clear-signal-simple-signal",
    onPath: "self-coaching-toolkit",
    firstOn: "physics-of-connection",
  },
  {
    lesson: "quieting-the-planning-mind",
    onPath: "advanced-game-and-character",
    firstOn: "systems-of-improv",
  },
];

/** The other chains' readings the same night: slots / distinct / repeats. */
const OTHER_CHAINS: Record<string, { slots: number; distinct: number; repeats: number }> = {
  "improv-for-life": { slots: 20, distinct: 16, repeats: 4 },
  "improv-for-teams": { slots: 15, distinct: 14, repeats: 1 },
  "teaching-improv": { slots: 8, distinct: 7, repeats: 1 },
};

/** Subset pairs the site tolerates because the superset's page says so. */
const ALLOWED_SUBSETS: [string, string][] = [["beginner-foundations", "teaching-improv"]];

function overlapText(html: string): string {
  const section = html.split('data-track="path-overlap"')[1]?.split("</p>")[0] ?? "";
  return section
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

describe("path overlap", () => {
  it("counts 11 paths, 39 lesson slots and 21 distinct lessons", async () => {
    const lessons = await getPathLessonMap();
    // Guard the guard: eleven paths, or a changed loader passes vacuously.
    expect(lessons.size).toBe(11);
    const slots = [...lessons.values()].reduce((sum, ids) => sum + ids.length, 0);
    const distinct = new Set([...lessons.values()].flat()).size;
    // Read 2026-09-22: 39 slots for 21 lessons. The gap between them is the
    // repetition this file is about; it may close, not widen.
    expect(slots).toBeGreaterThanOrEqual(30);
    expect(distinct).toBeGreaterThanOrEqual(20);
    expect(slots - distinct).toBeLessThanOrEqual(18);
  });

  it("shares two of Systems of Improv's four lessons with Improv for Everyday Life", async () => {
    const shared = await sharedLessons("systems-of-improv", "improv-for-life");
    // In Systems of Improv's order, as the page numbers them.
    expect(shared).toEqual(["presence-and-commitment", "quieting-the-planning-mind"]);
    expect(await sharedLessons("systems-of-improv", "mastering-the-form")).toEqual([]);
    expect(await sharedLessons("not-a-path", "systems-of-improv")).toEqual([]);
  });

  it("assigns the main chain 24 slots for 19 lessons, 5 of them repeats, each named", async () => {
    const main = await chainAssignment("beginner-foundations");
    expect(main.paths[0]).toBe("beginner-foundations");
    expect(main.paths[main.paths.length - 1]).toBe("the-art-of-ensemble");
    expect(main.paths.length).toBe(7);
    // The arithmetic the numbers must satisfy whatever they are.
    expect(main.slots - main.distinct).toBe(main.repeats.length);
    // Ceiling, read 2026-09-22: 24 / 19 / 5. Lower it when it falls.
    expect(main.repeats.length).toBeLessThanOrEqual(5);
    for (const repeat of main.repeats) {
      expect(MAIN_CHAIN_REPEATS, `new repeat: ${JSON.stringify(repeat)}`).toContainEqual(repeat);
    }
  });

  it("reads the side entrances' chains: life 20 / 16 / 4, teams 15 / 14 / 1, teacher 8 / 7 / 1", async () => {
    for (const [start, reading] of Object.entries(OTHER_CHAINS)) {
      const chain = await chainAssignment(start);
      expect(chain.slots - chain.distinct, start).toBe(chain.repeats.length);
      expect(chain.repeats.length, start).toBeLessThanOrEqual(reading.repeats);
      expect(chain.distinct, start).toBeGreaterThanOrEqual(reading.distinct - reading.repeats);
    }
  });

  it("finds six lessons on three or more paths, Presence and Commitment on four", async () => {
    const many = await lessonsOnManyPaths(3);
    // Ceiling, read 2026-09-22. A lesson newly spread across a third path
    // raises it and fails; a path trimmed lowers it.
    expect(many.length).toBeLessThanOrEqual(6);
    expect(many.length).toBeGreaterThanOrEqual(1);
    const presence = many.find((entry) => entry.lesson === "presence-and-commitment");
    expect(presence?.paths.length).toBeLessThanOrEqual(4);
  });

  it("tolerates one strict subset, Foundations inside Teaching Improv, and no other", async () => {
    const pairs = await subsetPaths();
    // The author may remove the first; a second may not appear.
    expect(pairs.length).toBeLessThanOrEqual(1);
    for (const pair of pairs) expect(ALLOWED_SUBSETS).toContainEqual(pair);
    // And the superset's page says so: every tolerated pair is named as
    // contained on the superset, with a link to the subset.
    for (const [sub, sup] of pairs) {
      const text = (await overlapSentences(sup)).map(sentenceText).join(" ");
      expect(text, sup).toMatch(/^This path contains both lessons of /);
      const links = (await overlapSentences(sup)).flat().filter((s) => typeof s !== "string");
      expect(links.map((l) => l.pathId)).toContain(sub);
    }
  });

  it("names the predecessors by walking PROGRESSION back, not just one rung", () => {
    expect(predecessorsOf("systems-of-improv").sort()).toEqual([
      "beginner-foundations",
      "improv-for-life",
      "physics-of-connection",
    ]);
    // The toolkit's repeats come from two rungs down.
    expect(predecessorsOf("self-coaching-toolkit")).toContain("physics-of-connection");
    expect(predecessorsOf("beginner-foundations")).toEqual([]);
  });

  it("tells the reader from Improv for Everyday Life which of Systems of Improv's lessons are new", async () => {
    const overlap = await overlapWithPredecessors("systems-of-improv");
    const life = overlap.predecessors.find((entry) => entry.pathId === "improv-for-life");
    expect(life?.positions).toEqual([3, 4]);
    expect(life?.isPrefix).toBe(false);
    expect(life?.newPositions).toEqual([1, 2]);
    const sentences = await overlapSentences("systems-of-improv");
    expect(sentenceText(sentences[0])).toBe(
      "Lessons 3 and 4 are also in Improv for Everyday Life; if you came from there, the new ones are lessons 1 and 2.",
    );
    // The names are links to the paths they name.
    expect(sentences[0]).toContainEqual({
      pathId: "improv-for-life",
      title: "Improv for Everyday Life",
    });
  });

  /**
   * No path today has a predecessor's lessons as its opening run, so the
   * "start at lesson N" branch is exercised on a synthetic map: a path whose
   * first two lessons are the whole of the path before it.
   */
  it("says 'start at lesson 3' when the shared lessons open the path", () => {
    const lessons = new Map([
      ["first", ["a", "b"]],
      ["second", ["a", "b", "c", "d"]],
      ["aside", ["d", "e"]],
    ]);
    const overlap = computeOverlap("second", lessons, ["first"]);
    const first = overlap.predecessors.find((entry) => entry.pathId === "first");
    expect(first?.isPrefix).toBe(true);
    expect(first?.startAt).toBe(3);
    const text = sentencesFor(overlap).map(sentenceText);
    expect(text[0]).toMatch(
      /^Two of these lessons are also in .*; if you came from there, start at lesson 3\.$/,
    );
    // "aside" shares one lesson and leads nowhere: named once, in the other sentence.
    expect(text[1]).toMatch(/^Elsewhere, lesson 4 is also in .*\.$/);
    // A path sharing nothing prints nothing.
    const alone = new Map([["first", ["a"]]]);
    expect(sentencesFor(computeOverlap("first", alone, []))).toEqual([]);
  });

  it("gives every path that shares a lesson a line, and none to a path that shares nothing", async () => {
    const lessons = await getPathLessonMap();
    let withOverlap = 0;
    for (const id of lessons.keys()) {
      const overlap = await overlapWithPredecessors(id);
      const sentences = await overlapSentences(id);
      expect(sentences.length > 0, id).toBe(overlap.all.length > 0);
      if (overlap.all.length > 0) withOverlap += 1;
      // Every path that routes the reader — leads here, or is contained or
      // containing — is linked exactly once; the rest are named in plain
      // text so the line does not re-link what the next-path card and the
      // "taught in" list link (link-repeats.test.ts holds the paths layer
      // at 30%, and linking all 44 names took it to 30.3%).
      const linked = sentences
        .flat()
        .filter((s) => typeof s !== "string")
        .map((s) => s.pathId);
      const routing = overlap.all
        .filter((e) => e.leadsHere || e.containsIt || e.shared.length === overlap.lessons.length)
        .map((e) => e.pathId);
      expect(linked.sort(), id).toEqual(routing.sort());
      // And the plain text still names every other overlap.
      const text = sentences.map(sentenceText).join(" ");
      for (const entry of overlap.all) expect(text, id).toContain(entry.title.split(":")[0]);
    }
    // Ten of eleven on 2026-09-22; Mastering the Form shares nothing.
    expect(withOverlap).toBeGreaterThanOrEqual(8);
  });

  it.runIf(built)(
    "renders the line on the built Systems of Improv page, naming Improv for Everyday Life",
    () => {
      const html = fs.readFileSync(path.join(APP, "paths", "systems-of-improv.html"), "utf-8");
      expect(html).toContain('data-track="path-overlap"');
      const text = overlapText(html);
      expect(text).toContain(
        "Lessons 3 and 4 are also in Improv for Everyday Life; if you came from there, the new ones are lessons 1 and 2.",
      );
      expect(html.split('data-track="path-overlap"')[1]?.split("</p>")[0]).toContain(
        'href="/paths/improv-for-life"',
      );
      // The static count stays for the reader with no record; the client
      // count beside it renders nothing at build time.
      expect(html.replace(/<!-- -->/g, "")).toMatch(/4 lessons · \d+ min to read/);
      expect(html).not.toContain('data-track="path-read-count"');
    },
  );

  it.runIf(built)("renders Teaching Improv as containing Foundations, with a link", () => {
    const html = fs.readFileSync(path.join(APP, "paths", "teaching-improv.html"), "utf-8");
    const section = html.split('data-track="path-overlap"')[1]?.split("</p>")[0] ?? "";
    expect(section).toContain('href="/paths/beginner-foundations"');
    expect(overlapText(html)).toContain(
      "This path contains both lessons of Foundations, as lessons 3 and 4; if you have done it, the new ones are lessons 1 and 2.",
    );
  });

  it.runIf(built)(
    "renders the line on every built path that shares a lesson and on no other",
    async () => {
      const lessons = await getPathLessonMap();
      for (const id of lessons.keys()) {
        const html = fs.readFileSync(path.join(APP, "paths", `${id}.html`), "utf-8");
        const overlap = await overlapWithPredecessors(id);
        expect(html.includes('data-track="path-overlap"'), id).toBe(overlap.all.length > 0);
      }
    },
  );
});

describe("completed lessons across paths", () => {
  const record: JourneyState = {
    pathId: "improv-for-life",
    visitedThreads: [
      "presence-and-commitment",
      "quieting-the-planning-mind",
      "the-system-underneath",
    ],
    reviewQueue: [],
    startedAt: "2026-09-01T00:00:00.000Z",
    threads: {
      "presence-and-commitment": {
        lastVisitedAt: "2026-09-02T00:00:00.000Z",
        completedAt: "2026-09-02T00:00:00.000Z",
      },
      "quieting-the-planning-mind": {
        lastVisitedAt: "2026-09-03T00:00:00.000Z",
        completedAt: "2026-09-03T00:00:00.000Z",
      },
      // Visited, not completed: does not count.
      "the-system-underneath": { lastVisitedAt: "2026-09-04T00:00:00.000Z" },
    },
  };

  /**
   * The record is keyed by lesson id and never by path, so what the reader
   * completed on Improv for Everyday Life is completed on Systems of Improv;
   * the header's client count and the next-path card's bracket both read it
   * this way, and the count is in the receiving path's order.
   */
  it("counts a lesson completed on one path as completed on the path that shares it", async () => {
    const systems = (await getPathLessonMap()).get("systems-of-improv")!;
    expect(completedLessons(record, systems)).toEqual([
      "presence-and-commitment",
      "quieting-the-planning-mind",
    ]);
    expect(completedLessons(record, systems).length).toBe(2);
    expect(completedLessons(null, systems)).toEqual([]);
    expect(completedLessons(record, ["the-system-underneath", "beyond-the-harold"])).toEqual([]);
  });
});
