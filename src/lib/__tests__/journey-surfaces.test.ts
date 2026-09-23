import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadAtoms, loadPaths, loadThreads } from "../content";
import { drillsByLesson, lessonConceptCounts, lessonsRecommendingDrill } from "../drill-lessons";

const SRC = path.join(process.cwd(), "src");
const read = (...parts: string[]) => fs.readFileSync(path.join(SRC, ...parts), "utf-8");

/**
 * The journey's record was written by the lesson page alone and read by the
 * homepage, the path and the quiz, so the 205 concept pages, the 27 drill
 * pages and the guides wrote nothing (tracker entry 333, 2026-09-22). Three
 * surfaces now write or read it off the lesson page — the concept page's
 * visit, the drill page's "I ran this", the homepage's practice card that
 * names a drill — and each depends on a server reader in `drill-lessons.ts`
 * that this file guards against reading nothing.
 *
 * The concept page and the drill page components are written but not yet
 * mounted in `AtomDetail.tsx` (another hand's file, 2026-09-22); when the
 * mounts land, assert them here as `ConceptVisit atomId={fm.id}` and
 * `DrillPracticed` under `fm.type === "exercise"`.
 */
describe("journey surfaces off the lesson page", () => {
  it("names, for every lesson with a drill on its row, the drill the practice card links", async () => {
    const [threads, map] = await Promise.all([loadThreads(), drillsByLesson()]);
    // Guard the guard.
    expect(threads.length).toBeGreaterThanOrEqual(20);

    const lessons = Object.keys(map);
    // 25 lessons; 6 format and diagnostic lessons have a level page and no
    // drill (content.ts, the row reader), so the floor sits under 19.
    expect(lessons.length).toBeGreaterThanOrEqual(18);
    for (const lessonId of lessons) {
      expect(threads.some((t) => t.frontmatter.id === lessonId)).toBe(true);
      const drill = map[lessonId];
      // A drill, never the picker's level page.
      expect(drill.href).toMatch(/^\/practice\/exercises\/[^/]+$/);
      expect(drill.id).not.toMatch(/^exercise-picker-/);
      expect(drill.title.length).toBeGreaterThan(0);
      expect(drill.lessonTitle.length).toBeGreaterThan(0);
    }
  });

  it("credits a drill rep to every lesson whose row lists the drill, and only those", async () => {
    const [atoms, map] = await Promise.all([loadAtoms(), drillsByLesson()]);
    const exercises = atoms.filter((a) => a.frontmatter.type === "exercise");
    expect(exercises.length).toBeGreaterThanOrEqual(25);

    // Each lesson's leading drill credits at least that lesson.
    for (const [lessonId, drill] of Object.entries(map)) {
      expect(await lessonsRecommendingDrill(drill.id)).toContain(lessonId);
    }

    // Across the 27 drills, most are on some row: the rows carry 3 slots
    // for 25 lessons, and the site's practice recommendations mean these
    // pages. 18 of 27 on 2026-09-22.
    const listed = [];
    for (const exercise of exercises) {
      const lessons = await lessonsRecommendingDrill(exercise.frontmatter.id);
      if (lessons.length > 0) listed.push(exercise.frontmatter.id);
    }
    expect(listed.length).toBeGreaterThanOrEqual(15);

    // A drill that is not one credits nothing.
    expect(await lessonsRecommendingDrill("exercise-picker-beginner")).toEqual([]);
    expect(await lessonsRecommendingDrill("no-such-drill")).toEqual([]);
  });

  it("supplies the syllabus a concept count and title for every lesson on every path", async () => {
    const paths = await loadPaths();
    expect(paths.length).toBeGreaterThanOrEqual(10);

    for (const p of paths) {
      const ids = p.frontmatter.threads ?? [];
      const counts = await lessonConceptCounts(ids);
      expect(Object.keys(counts)).toEqual(ids);
      for (const id of ids) {
        expect(counts[id].title.length).toBeGreaterThan(0);
        expect(counts[id].title).not.toBe(id);
        // Every lesson composes atoms; a 0 here would hide the lesson's line.
        expect(counts[id].concepts).toBeGreaterThan(0);
      }
    }
    // An id with no lesson gets a count of 0, so the client never divides
    // by a number it was not given.
    expect(await lessonConceptCounts(["no-such-lesson"])).toEqual({
      "no-such-lesson": { title: "no-such-lesson", concepts: 0 },
    });
  });

  it("wires the concept page's visit to the referrer lesson and the record", () => {
    const src = read("components", "ConceptVisit.tsx");
    expect(src).toContain('"use client"');
    // The same referrer read as the foot card's lift (entry 326).
    expect(src).toContain("lessonIdFromReferrer(document.referrer, window.location.origin)");
    expect(src).toContain("markConceptVisited(lessonId, atomId)");
    // Falls back to the primary lesson, the first id.
    expect(src).toContain("lessonIds[0]");
    // Holds no state: nothing to render, nothing for the setState rule to see.
    expect(src).not.toContain("useState");
  });

  it("gives the drill page a control that writes the drill's record and says its count", () => {
    const src = read("components", "DrillPracticed.tsx");
    expect(src).toContain('"use client"');
    expect(src).toContain("markDrillPracticed(drillId, lessonIds)");
    expect(src).toContain("data-drill-practiced");
    expect(src).toContain("formatJourneyRecency(");
    expect(src).toContain("I ran this");
  });

  it("passes the syllabus its concept counts and the homepage its drill map", () => {
    const pathPage = read("app", "paths", "[slug]", "page.tsx");
    const syllabusMount = pathPage.slice(
      pathPage.indexOf("<SyllabusProgress"),
      pathPage.indexOf("/>", pathPage.indexOf("<SyllabusProgress")),
    );
    expect(syllabusMount).toContain("concepts={");
    expect(pathPage).toContain("lessonConceptCounts");

    const home = read("app", "page.tsx");
    const continueMount = home.slice(
      home.indexOf("<ContinueJourney"),
      home.indexOf(">", home.indexOf("<ContinueJourney")),
    );
    expect(continueMount).toContain("drillsByLesson={");

    const syllabus = read("components", "SyllabusProgress.tsx");
    // The count is what lets a lesson read concept by concept count as visited.
    expect(syllabus).toContain("isThreadVisited(id, concepts?.[id]?.concepts)");
    expect(syllabus).toContain("syllabus-concepts-read");
    expect(syllabus).toContain('concept{line.total === 1 ? "" : "s"} read');

    const card = read("components", "ContinueJourney.tsx");
    expect(card).toContain("drillsByLesson?.[recommendation.threadId]");
    expect(card).toContain(
      "Practise <em>{state.drill.title}</em> for <em>{state.drill.lessonTitle}</em>",
    );
    // The lesson stays reachable from the card.
    expect(card).toContain("data-journey-lesson-link");
  });
});
