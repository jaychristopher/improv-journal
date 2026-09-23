import { describe, expect, it } from "vitest";

import { getAtomUrl, getParentPath, getThreadsForAtom, loadAtoms, loadThreads } from "../content";
import { lessonAtomOrder } from "../lesson-order";
import { getAtomWhatsNext, type LessonLine } from "../whats-next";

/**
 * The concept page's foot card continues every lesson the concept sits in.
 *
 * Until 2026-09-22 the card read the primary lesson alone (entry 110): the
 * next concept in it, or the lesson itself once exhausted. A concept in 2 or
 * more lessons — 28 of the 137 in any lesson — continued its primary and
 * broke the chain of every other lesson it sat in. Walked card by card in
 * the order the card walks (lessonAtomOrder, entry 273), 123 of the 158
 * consecutive pairs the 25 lessons sequence were followed and 10 lessons
 * could be walked end to end; on the authored `atoms` list, which tracker
 * entry 326 measured, 90 of 158 and 5 lessons. The same rule left 30
 * non-library concepts the destination of no card, 6 of them lesson
 * openers. The card now carries a line per lesson, primary first, and on a
 * lesson's last concept the next lesson's opener where the path knows one.
 * After, 2026-09-22: 158 of 158 pairs and 25 of 25 lessons in the walked
 * order (107 of 158 on the authored list — the rest are pairs the
 * dependency order separates on purpose); 28 pages carry a second line;
 * 21 non-library concepts are still no card's destination, 3 of them
 * openers, and `be-honest` (47 inbound) and `be-simple` are reached; 8 of
 * the 18 exhausted cards gain the onward step; 153 distinct destinations,
 * from 144.
 */

type LessonCard = Extract<
  NonNullable<Awaited<ReturnType<typeof getAtomWhatsNext>>>,
  { lessons: LessonLine[] }
>;

async function lessonCards(): Promise<Map<string, LessonCard>> {
  const atoms = await loadAtoms();
  const cards = new Map<string, LessonCard>();
  for (const atom of atoms) {
    const card = await getAtomWhatsNext(atom.frontmatter.id);
    if (card && card.variant !== "related-concepts") cards.set(atom.frontmatter.id, card);
  }
  return cards;
}

describe("the lesson lines on the what's-next card", () => {
  it("carries a line per lesson, primary first, and the anchor is the primary's step", async () => {
    const cards = await lessonCards();
    // Guard the guard: 137 concepts sit in a lesson on 2026-09-22.
    expect(cards.size).toBeGreaterThanOrEqual(130);

    for (const [id, card] of cards) {
      const threads = await getThreadsForAtom(id);
      expect(
        card.lessons.map((l) => l.lessonId),
        `${id}: 1 line per lesson, in getThreadsForAtom order`,
      ).toEqual(threads.map((t) => t.frontmatter.id));
      const primary = card.lessons[0];
      expect(primary.lessonHref).toBe(`/threads/${primary.lessonId}`);
      // The variant is the primary's: a next concept makes `next-atom` with
      // that concept as the anchor; none makes `back-to-thread` with the
      // lesson as the anchor.
      if (card.variant === "next-atom") {
        expect(card.href, id).toBe(primary.next?.href);
        expect(card.title, id).toBe(primary.next?.title);
      } else {
        expect(primary.next, id).toBeUndefined();
        expect(card.threadHref, id).toBe(primary.lessonHref);
        expect(card.threadTitle, id).toBe(primary.lessonTitle);
      }
      for (const line of card.lessons) {
        // A line is a step: a next concept, or the lesson (and its successor).
        if (line.next) expect(line.onward, `${id}/${line.lessonId}`).toBeUndefined();
        expect(line.next?.href ?? line.lessonHref, `${id}/${line.lessonId}`).toMatch(/^\//);
      }
    }
  });

  it("follows every consecutive pair of every lesson, in the order the card walks", async () => {
    const [atoms, threads, cards] = await Promise.all([loadAtoms(), loadThreads(), lessonCards()]);
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a]));
    const frontmatter = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));

    let pairs = 0;
    const broken: string[] = [];
    const walkable: string[] = [];
    for (const thread of threads) {
      const ids = lessonAtomOrder(thread, frontmatter);
      let kept = 0;
      for (let i = 0; i + 1 < ids.length; i++) {
        pairs += 1;
        const to = byId.get(ids[i + 1]);
        if (!to) continue;
        const want = getAtomUrl({ id: ids[i + 1], type: to.frontmatter.type });
        const line = cards.get(ids[i])?.lessons.find((l) => l.lessonId === thread.frontmatter.id);
        if (line?.next?.href === want) kept += 1;
        else broken.push(`${thread.frontmatter.id}: ${ids[i]} -> ${ids[i + 1]}`);
      }
      if (ids.length > 1 && kept === ids.length - 1) walkable.push(thread.frontmatter.id);
    }

    // Guard the guard: 25 lessons and 158 pairs on 2026-09-22.
    expect(threads.length).toBeGreaterThanOrEqual(20);
    expect(pairs).toBeGreaterThanOrEqual(150);
    // 123 of 158 and 10 lessons before (90 and 5 on the authored list).
    expect(broken).toEqual([]);
    expect(walkable.length).toBe(
      threads.filter((t) => (t.frontmatter.atoms?.length ?? 0) > 1).length,
    );
  });

  it("gives every concept shared by lessons a line for each of them", async () => {
    const cards = await lessonCards();
    const shared = [...cards].filter(([, card]) => card.lessons.length >= 2);
    // 28 on 2026-09-22 — 14 in 2 lessons, 11 in 3, 2 in 4, 1 in 5 — every
    // one of them a page whose card carried a single lesson before. Floor
    // just under; a lesson dropped or a concept cut from one lowers it.
    expect(shared.length).toBeGreaterThanOrEqual(25);
    const widest = Math.max(...shared.map(([, card]) => card.lessons.length));
    expect(widest).toBeGreaterThanOrEqual(4);
    // Every line on a shared page is a distinct lesson.
    for (const [id, card] of shared) {
      expect(new Set(card.lessons.map((l) => l.lessonId)).size, id).toBe(card.lessons.length);
    }
  });

  it("reaches concepts the primary-only card never did", async () => {
    const [atoms, threads] = await Promise.all([loadAtoms(), loadThreads()]);
    const frontmatter = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const targeted = new Set<string>();
    for (const atom of atoms) {
      const card = await getAtomWhatsNext(atom.frontmatter.id);
      if (!card) continue;
      if (card.variant === "related-concepts") {
        for (const item of card.items) targeted.add(item.href);
        continue;
      }
      for (const line of card.lessons) {
        if (line.next) targeted.add(line.next.href);
        if (line.onward) targeted.add(line.onward.href);
      }
    }
    const never = atoms
      .filter(
        (a) =>
          a.frontmatter.type !== "reference" &&
          !targeted.has(getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })),
      )
      .map((a) => a.frontmatter.id);
    const openers = new Set(threads.map((t) => lessonAtomOrder(t, frontmatter)[0]));

    // 30 non-library concepts were no card's destination on 2026-09-22 and
    // 6 of them opened a lesson; 21 and 3 after. The 18 others sit in no
    // lesson and their neighbours' cards rank other pages first; the 3
    // openers (callback, emotion-switch, game-types) open a lesson that is
    // in no path or first on its path, so no lesson's foot can step to it —
    // debt entry 326 leaves to the path page. Floors at the readings; a
    // change that reaches more may lower them, one that reaches fewer fails.
    expect(never.length).toBeLessThanOrEqual(21);
    expect(never.filter((id) => openers.has(id)).length).toBeLessThanOrEqual(3);
    // Guard the guard: 205 concept pages; 144 distinct destinations before,
    // 153 after.
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    expect(targeted.size).toBeGreaterThanOrEqual(150);
  });

  it("steps into the next lesson's first concept at a lesson's foot where the path knows one", async () => {
    const [atoms, threads, cards] = await Promise.all([loadAtoms(), loadThreads(), lessonCards()]);
    const frontmatter = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const exhausted = [...cards].filter(([, card]) => card.variant === "back-to-thread");
    // 18 lessons' last concepts have the lesson as their primary card.
    expect(exhausted.length).toBeGreaterThanOrEqual(15);

    let onward = 0;
    for (const [id, card] of cards) {
      for (const line of card.lessons) {
        if (line.next) continue;
        // The successor is the lesson after this one on its home path — the
        // same "Next" the lesson page shows (entry 262) — and the concept
        // its walked order opens with.
        const parent = await getParentPath(line.lessonId);
        const siblings = parent?.frontmatter.threads ?? [];
        const nextId = siblings[siblings.indexOf(line.lessonId) + 1];
        const nextLesson = threads.find((t) => t.frontmatter.id === nextId);
        const firstId = nextLesson ? lessonAtomOrder(nextLesson, frontmatter)[0] : undefined;
        if (!nextLesson || !firstId || firstId === id) {
          expect(
            line.onward,
            `${id}/${line.lessonId}: no next lesson to step into`,
          ).toBeUndefined();
          continue;
        }
        expect(line.onward?.lessonHref, `${id}/${line.lessonId}`).toBe(
          `/threads/${nextLesson.frontmatter.id}`,
        );
        expect(line.onward?.href, `${id}/${line.lessonId}`).toBe(
          getAtomUrl({ id: firstId, type: frontmatter.get(firstId)!.type }),
        );
        if (card.lessons[0] === line) onward += 1;
      }
    }
    // 8 of the 18 exhausted cards on 2026-09-22. The other 10 end a lesson
    // that is its home path's last (7), where the lesson page's own
    // next-path card takes over, or that sits in no path (3: Anatomy of a
    // Scene, The Connective Tissue, The Practice Lab).
    expect(onward).toBeGreaterThanOrEqual(7);
  });
});
