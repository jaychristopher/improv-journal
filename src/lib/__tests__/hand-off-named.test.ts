import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { loadAtoms, loadBridges, loadThreads } from "../content";
import { getGuideLessons, HAND_OFF_NOTE_CAP, handOffNote } from "../guide-concepts";
import { conceptPhrase, namedAtomIds } from "../named-concepts";

const APP = path.join(process.cwd(), ".next", "server", "app");
const built = fs.existsSync(path.join(APP, "how-to-be-funny.html"));

/**
 * The "Taught in depth" hand-off follows the pages' words, not only their
 * declarations.
 *
 * `getGuideLessons` ranked lessons by path tier and then by declared
 * overlap (`entry_atoms` ∩ `atoms`, entry 205). Read by what the two pages
 * actually name (entry 294's measure, with backticked ids counted), the 133
 * hand-off slots declared 313 shared atoms, and 25 of them shared no
 * concept that both the guide's body and the lesson's body name (tracker
 * entry 298, 2026-09-22, which counted 27 on a title-only read): the guide
 * listed the atom, the lesson composed it, and neither said its name.
 *
 * Within a path tier the rank now prefers the lesson whose body names the
 * most of the guide's named concepts, with the declared overlap as the
 * tiebreak; the ≥2 threshold stays on the declared overlap so the
 * population does not move. After the change: 19 empty slots of 133,
 * 202 shared atoms named by both pages (190 before), 76 guides with a
 * hand-off (unchanged). Each lesson carries the named concepts and a note
 * that says them, so an empty hand-off reads as empty.
 */
async function handOffs() {
  const [bridges, threads, atoms] = await Promise.all([loadBridges(), loadThreads(), loadAtoms()]);
  expect(bridges.length).toBeGreaterThanOrEqual(70);
  expect(threads.length).toBeGreaterThanOrEqual(20);
  const titleById = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter.title]));
  const threadsById = new Map(threads.map((t) => [t.frontmatter.id, t]));
  const slots: {
    guide: string;
    lesson: string;
    named: string[];
    note: string;
    /** The ids both bodies name among those the two pages share, recomputed here. */
    expected: string[];
  }[] = [];
  let withHandOff = 0;
  for (const bridge of bridges) {
    const lessons = await getGuideLessons(bridge.slug);
    if (lessons.length > 0) withHandOff += 1;
    for (const lesson of lessons) {
      const thread = threadsById.get(lesson.id)!;
      // The guide's atom set is the declaration, or the body's backticks
      // when no lesson shares two declared atoms (the rule guide-lessons
      // .test.ts checks); either way the note may only name what both
      // bodies name, and must name all of it.
      const declared = new Set(bridge.frontmatter.entry_atoms ?? []);
      const declaredHits = threads.some(
        (t) => new Set(t.frontmatter.atoms.filter((a) => declared.has(a))).size >= 2,
      );
      const guideAtoms = declaredHits
        ? declared
        : new Set([...bridge.content.matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]));
      const shared = [...new Set(thread.frontmatter.atoms)]
        .filter((id) => guideAtoms.has(id) && titleById.has(id))
        .map((id) => ({ id, title: titleById.get(id)! }));
      const g = namedAtomIds(bridge.content, shared);
      const l = namedAtomIds(thread.content, shared);
      slots.push({
        guide: bridge.slug,
        lesson: lesson.id,
        named: lesson.named.map((n) => n.id),
        note: lesson.note,
        expected: shared.filter((a) => g.has(a.id) && l.has(a.id)).map((a) => a.id),
      });
    }
  }
  return { slots, withHandOff };
}

describe("the hand-off, read in the pages' words", () => {
  it("names only concepts both pages name, and all of them", async () => {
    const { slots } = await handOffs();
    // 133 slots on 2026-09-22.
    expect(slots.length).toBeGreaterThanOrEqual(120);
    for (const s of slots) {
      const where = `${s.guide} -> ${s.lesson}`;
      for (const id of s.named) expect(s.expected, where).toContain(id);
      expect(s.named.length, where).toBe(s.expected.length);
    }
    // Guard the guard: the join found named overlap somewhere. 202 on the day.
    const namedTotal = slots.reduce((n, s) => n + s.named.length, 0);
    expect(namedTotal).toBeGreaterThanOrEqual(190);
  });

  it("empty-by-prose slots: 19 of 133 on 2026-09-22 (25 before); ceiling 20, falls only", async () => {
    const { slots } = await handOffs();
    const empty = slots.filter((s) => s.named.length === 0);
    expect(empty.length).toBeLessThanOrEqual(20);
    // An empty slot says nothing rather than "works through" nothing.
    for (const s of empty) expect(s.note, `${s.guide} -> ${s.lesson}`).toBe("");
  });

  it("keeps the population: 76 of 78 guides have a hand-off, floor 74", async () => {
    const { withHandOff } = await handOffs();
    expect(withHandOff).toBeGreaterThanOrEqual(74);
  });

  it("the note says the named concepts, up to the cap, and nothing else", async () => {
    const { slots } = await handOffs();
    const atoms = await loadAtoms();
    const titleById = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter.title]));
    let withNote = 0;
    for (const s of slots) {
      if (s.named.length === 0) continue;
      withNote += 1;
      const titles = s.named.map((id) => conceptPhrase(titleById.get(id)!));
      expect(s.note).toBe(handOffNote(titles));
      expect(s.note.startsWith("works through ")).toBe(true);
      for (const title of titles.slice(0, HAND_OFF_NOTE_CAP)) expect(s.note).toContain(title);
      for (const title of titles.slice(HAND_OFF_NOTE_CAP)) expect(s.note).not.toContain(title);
    }
    expect(withNote).toBeGreaterThanOrEqual(100);
    expect(handOffNote([])).toBe("");
    expect(handOffNote(["Offers"])).toBe("works through Offers");
    expect(handOffNote(["Offers", "Trust"])).toBe("works through Offers and Trust");
    expect(handOffNote(["A", "B", "C", "D"])).toBe("works through A, B and C");
  });
});

describe.runIf(built)("the built guide page carries the note", () => {
  it("every rendered note is a lesson's own", async () => {
    const bridges = await loadBridges();
    let rendered = 0;
    for (const bridge of bridges) {
      const file = path.join(APP, `${bridge.slug}.html`);
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, "utf-8");
      const start = html.indexOf("data-guide-lessons");
      if (start === -1) continue;
      const line = html.slice(start, html.indexOf("</p>", start));
      // React separates the literal "; " from the note with a comment node
      // and escapes quotes and ampersands in titles.
      const notes = [...line.matchAll(/data-hand-off-note[^>]*>;\s*(?:<!-- -->)?([^<]+)</g)].map(
        (m) =>
          m[1]
            .replace(/&#x27;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, "&")
            .trim(),
      );
      const lessons = await getGuideLessons(bridge.slug);
      expect(notes, bridge.slug).toEqual(lessons.map((l) => l.note).filter(Boolean));
      rendered += notes.length;
    }
    // 114 slots carried a note on 2026-09-22.
    expect(rendered).toBeGreaterThanOrEqual(100);
  });
});
