import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  getPracticeRecommendationsForThread,
  getThreadDrillLevels,
  loadAtoms,
  loadThreads,
} from "../content";
import { matchesLevel } from "../exercise-picker";
import { DRILLS_LABEL, DRILLS_SHOW_LABEL } from "../relation-labels";
import { buildTrainsIndex } from "../trains";

const APP = path.join(process.cwd(), ".next", "server", "app");
const built =
  fs.existsSync(path.join(APP, "threads")) && fs.existsSync(path.join(APP, "index.html"));

/**
 * The lesson's practice row picks the drill that says it is for the lesson.
 *
 * Entry 270 (2026-09-22) fitted the row to the reader's level and ranked
 * the candidates by shared edges; that evening entry 297 read the picks
 * against the drills' own `**Trains:**` lines and found that of 62 slots,
 * 16 carried a line naming one of the lesson's atoms, 32 named none of them
 * and 14 had no line. The disagreements were systematic — Genre Scene
 * (trains specificity, commitment, heightening) for the Harold lesson,
 * One-Word Scene (trains warm-up) for Building on Offers — because edge
 * counts reward the drills with the most edges into the knot, whatever the
 * lesson.
 *
 * The rank now puts a drill whose Trains line names a lesson atom first,
 * then by how many it names, then shared edges, then title; composed drills
 * keep their precedence. After the change 19 of 62 slots agree and the
 * first drill agrees on 13 of the 14 lessons that have any agreeing
 * candidate. The one exception is Quieting the Planning Mind, whose three
 * composed drills (Mirroring, One-Word Scene, Blind Offer) fill the row
 * ahead of the two linked drills that train Be Present. The ceiling is low
 * because only 16 of 24 Trains lines name a concept at all (entry 274):
 * the author's line is the cheapest way to raise every number here.
 */
async function lessonRows() {
  const [threads, atoms] = await Promise.all([loadThreads(), loadAtoms()]);
  const atomById = new Map(atoms.map((a) => [a.frontmatter.id, a]));
  const trains = buildTrainsIndex(atoms);
  // Guard the guard: the parser found the lines (24 of 27 drills carry one).
  expect(trains.withLine.length).toBeGreaterThanOrEqual(20);

  return Promise.all(
    threads.map(async (thread) => {
      const id = thread.frontmatter.id;
      const lessonAtoms = new Set(thread.frontmatter.atoms);
      const agrees = (drillId: string) =>
        (trains.trains.get(drillId) ?? []).some((c) => lessonAtoms.has(c));
      const [levels, recommendations] = await Promise.all([
        getThreadDrillLevels(id),
        getPracticeRecommendationsForThread(id),
      ]);
      const drills = recommendations.filter((r) => r.source !== "level-page");
      // Every level-admitted exercise the lesson composes or shares an edge
      // with, which is the population the recommender chooses from.
      const admits = (a: (typeof atoms)[number]) =>
        levels.length === 0 || levels.some((l) => matchesLevel(a.frontmatter.tags ?? [], l));
      const candidates = atoms.filter((a) => {
        if (a.frontmatter.type !== "exercise" || !admits(a)) return false;
        if (lessonAtoms.has(a.frontmatter.id)) return true;
        if ((a.frontmatter.links ?? []).some((l) => lessonAtoms.has(l.id))) return true;
        for (const atomId of lessonAtoms) {
          const links = atomById.get(atomId)?.frontmatter.links ?? [];
          if (links.some((l) => l.id === a.frontmatter.id)) return true;
        }
        return false;
      });
      return {
        id,
        drills,
        agrees,
        anyCandidateAgrees: candidates.some((a) => agrees(a.frontmatter.id)),
      };
    }),
  );
}

describe("lesson drill purpose", () => {
  it("puts an agreeing drill first wherever a candidate agrees: 13 of 14 lessons", async () => {
    const rows = await lessonRows();
    expect(rows.length).toBeGreaterThanOrEqual(20);
    const withCandidate = rows.filter((r) => r.anyCandidateAgrees);
    // The ceiling: 14 of 25 lessons have any level-admitted candidate whose
    // Trains line names one of their atoms. Exact, so a Trains line that
    // stops parsing is seen.
    expect(withCandidate.length).toBe(14);
    const firstAgrees = withCandidate.filter((r) => r.drills[0] && r.agrees(r.drills[0].id));
    const misses = withCandidate.filter((r) => !firstAgrees.includes(r));
    // The one miss is composed-drills-first, a rule this test keeps.
    expect(misses.map((r) => r.id)).toEqual(["quieting-the-planning-mind"]);
    for (const r of misses) {
      expect(
        r.drills.every((d) => d.source === "direct"),
        r.id,
      ).toBe(true);
    }
    expect(firstAgrees.length).toBe(13);
  });

  it("agreeing slots: 19 of 62 on 2026-09-22 (16 before); floor 0.29, rises only", async () => {
    const rows = await lessonRows();
    const slots = rows.flatMap((r) => r.drills.map((d) => ({ lesson: r, drill: d })));
    expect(slots.length).toBeGreaterThanOrEqual(55);
    const agreeing = slots.filter((s) => s.lesson.agrees(s.drill.id));
    expect(agreeing.length / slots.length).toBeGreaterThanOrEqual(0.29);
  });

  it("says why each drill is there, in the sidebar's two words", async () => {
    const rows = await lessonRows();
    let trainsNotes = 0;
    let showsNotes = 0;
    for (const r of rows) {
      for (const d of r.drills) {
        // A linked drill is on the row because it shares an edge, so it
        // always has a concept to name; a composed drill may have neither
        // an edge nor a line (The Practice Lab's Emotion Switch) and then
        // says nothing. Where there is a note, `trains` is exactly the
        // Trains line's agreement.
        if (d.source === "linked") expect(d.purpose, `${r.id}: ${d.id}`).toBeDefined();
        if (!d.purpose) {
          expect(d.source, `${r.id}: ${d.id}`).toBe("direct");
          expect(r.agrees(d.id), `${r.id}: ${d.id}`).toBe(false);
          continue;
        }
        expect(d.purpose.concept.length).toBeGreaterThan(0);
        expect(d.purpose.trains, `${r.id}: ${d.id}`).toBe(r.agrees(d.id));
        if (d.purpose.trains) trainsNotes += 1;
        else showsNotes += 1;
      }
    }
    expect(trainsNotes).toBeGreaterThanOrEqual(18);
    expect(showsNotes).toBeGreaterThanOrEqual(30);
    // The words come from relation-labels.ts, where the sidebar's are.
    expect(DRILLS_LABEL).toMatch(/train/);
    expect(DRILLS_SHOW_LABEL).toMatch(/show/);
  });
});

describe.runIf(built)("the built lesson page carries the note", () => {
  it("/threads/beyond-the-harold: a shows/trains note on every drill", () => {
    const html = fs.readFileSync(path.join(APP, "threads", "beyond-the-harold.html"), "utf-8");
    const start = html.indexOf('data-track="lesson-reps"');
    expect(start).toBeGreaterThan(-1);
    const section = html.slice(
      start,
      html.indexOf("</section>", html.indexOf("Practice with others", start)),
    );
    const drills = section.match(/data-source="(direct|linked)"/g) ?? [];
    // Two drills on 2026-09-22 (Genre Scene, Organic Opening Exercise),
    // neither of whose Trains line names a format atom: both read "shows".
    expect(drills.length).toBeGreaterThanOrEqual(2);
    const notes = section.match(/data-purpose="(trains|shows)"/g) ?? [];
    expect(notes.length).toBe(drills.length);
    // React puts a comment node between the verb and the concept.
    expect(section).toMatch(/data-purpose="shows"[^>]*>shows(<!-- -->)? /);
  });
});
