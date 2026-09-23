import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { getNextAtomInThread, loadAtoms, loadThreads } from "../content";
import { getEpisodeNotes } from "../episode-notes";
import {
  forwardRequires,
  intraLessonRequires,
  lessonAtomOrder,
  type LinkedAtoms,
} from "../lesson-order";

const APP = path.join(process.cwd(), ".next", "server", "app");
const built =
  fs.existsSync(path.join(APP, "threads")) && fs.existsSync(path.join(APP, "index.html"));

/**
 * A lesson's atoms reach the reader in dependency order, not list order.
 *
 * Each lesson's `atoms:` list was written as a table of contents: of the 94
 * `requires` edges between two atoms of the same lesson, 41 (44%) pointed at
 * an atom listed later — the prerequisite after the concept that needs it —
 * and 16 of 25 lessons had at least one. No lesson body names one of its
 * atoms in backticks, so the only order a reader ever got was the list's,
 * through "Composed from", the drill router's walk, the episode notes and
 * the atom page's next-in-lesson card, every one of which read
 * `frontmatter.atoms` as written (tracker entry 273, 2026-09-22).
 *
 * `lessonAtomOrder` derives the order once — a stable topological sort of
 * the intra-lesson `requires`, authored order as the tiebreak — and the
 * consumers read it. The frontmatter is untouched, so the authored count is
 * pinned as a ceiling that may only fall, and the derived one as the
 * residual no order can remove.
 */
async function lessons() {
  const [threads, atoms] = await Promise.all([loadThreads(), loadAtoms()]);
  const atomsById: LinkedAtoms = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
  const titles = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter.title]));
  return { threads, atomsById, titles };
}

/**
 * The three mutual pairs — A requires B and B requires A — each inside one
 * lesson. Whichever member goes first, the other's edge points forward, so
 * each pair leaves exactly one forward edge in the derived order. The debt
 * is in the graph, not the sort: an edge in each pair should become
 * `enables` or `extends`, and this list shrinks as they do.
 */
const MUTUAL_PAIRS: Record<string, [string, string]> = {
  "building-on-offers": ["active-listening", "offers"],
  "hardest-thing-youll-never-plan": ["active-listening", "cognitive-bandwidth"],
  "the-game-beneath-the-game": ["heightening", "rest-beat"],
};

/** A lesson and graph small enough to read, for the rule's unit cases. */
function synthetic(atoms: string[], requires: [string, string][]) {
  const links = new Map<string, { id: string; relation: "requires" }[]>();
  for (const [from, to] of requires) {
    links.set(from, [...(links.get(from) ?? []), { id: to, relation: "requires" }]);
  }
  const graph: LinkedAtoms = new Map(atoms.map((id) => [id, { links: links.get(id) ?? [] }]));
  return { lesson: { frontmatter: { atoms } }, graph };
}

describe("lesson atom order", () => {
  it("covers the lesson population, so a changed selector cannot pass vacuously", async () => {
    const { threads, atomsById } = await lessons();
    expect(threads.length).toBeGreaterThanOrEqual(20);
    const edges = threads.reduce((n, t) => n + intraLessonRequires(t, atomsById).length, 0);
    // 94 on 2026-09-22, the three mutual pairs counted once per direction.
    expect(edges).toBeGreaterThanOrEqual(90);
  });

  it("records the authored forward count as a ceiling that may only fall", async () => {
    const { threads, atomsById } = await lessons();
    const authored = threads.reduce((n, t) => n + forwardRequires(t, atomsById).authored, 0);
    // 41 of 94 on 2026-09-22 (tracker entry 273). The frontmatter keeps its
    // authored order, and this guards the graph against the habit getting
    // worse; a reordered list or a re-typed edge lowers it, and the new
    // figure belongs here with its date.
    expect(authored).toBeLessThanOrEqual(41);
    expect(authored).toBeGreaterThan(0);
  });

  it("leaves no forward edge in the derived order except inside a mutual pair", async () => {
    const { threads, atomsById } = await lessons();
    let residual = 0;
    for (const thread of threads) {
      const id = thread.frontmatter.id;
      const { derived } = forwardRequires(thread, atomsById);
      const pair = MUTUAL_PAIRS[id];
      expect(derived, `${id}: forward edges after sorting`).toBe(pair ? 1 : 0);
      residual += derived;
      if (!pair) continue;
      // The pair really is mutual, and the one forward edge is its second
      // member's, so a re-typed edge fails here and retires the entry above.
      const edges = intraLessonRequires(thread, atomsById);
      const [a, b] = pair;
      expect(edges, `${id}: ${a} requires ${b}`).toContainEqual({ from: a, to: b });
      expect(edges, `${id}: ${b} requires ${a}`).toContainEqual({ from: b, to: a });
    }
    // Three mutual pairs, three residual edges, 2026-09-22.
    expect(residual).toBe(Object.keys(MUTUAL_PAIRS).length);
    expect(residual).toBe(3);
  });

  it("is a permutation of the authored list for every lesson", async () => {
    const { threads, atomsById } = await lessons();
    for (const thread of threads) {
      const authored = thread.frontmatter.atoms ?? [];
      const derived = lessonAtomOrder(thread, atomsById);
      expect(derived.length, thread.frontmatter.id).toBe(authored.length);
      expect([...derived].sort(), thread.frontmatter.id).toEqual([...authored].sort());
      expect(new Set(derived).size, thread.frontmatter.id).toBe(derived.length);
    }
  });

  it("puts every prerequisite before the atom that requires it, outside the pairs", async () => {
    const { threads, atomsById } = await lessons();
    let checked = 0;
    for (const thread of threads) {
      const order = lessonAtomOrder(thread, atomsById);
      const position = new Map(order.map((id, i) => [id, i]));
      const pair = new Set(MUTUAL_PAIRS[thread.frontmatter.id] ?? []);
      for (const { from, to } of intraLessonRequires(thread, atomsById)) {
        if (pair.has(from) && pair.has(to)) continue;
        checked += 1;
        expect(
          position.get(to)!,
          `${thread.frontmatter.id}: ${to} should precede ${from}, which requires it`,
        ).toBeLessThan(position.get(from)!);
      }
    }
    expect(checked).toBeGreaterThanOrEqual(85);
  });

  it("keeps the authored order where the edges do not force a change", () => {
    // No edges at all: the list comes back as written.
    const flat = synthetic(["c", "a", "b"], []);
    expect(lessonAtomOrder(flat.lesson, flat.graph)).toEqual(["c", "a", "b"]);

    // One forward edge: only the prerequisite moves, and only as far as it
    // must — everything else holds its place.
    const one = synthetic(
      ["intro", "dependent", "aside", "prerequisite", "coda"],
      [["dependent", "prerequisite"]],
    );
    expect(lessonAtomOrder(one.lesson, one.graph)).toEqual([
      "intro",
      "prerequisite",
      "dependent",
      "aside",
      "coda",
    ]);

    // A backward edge is already satisfied and changes nothing.
    const back = synthetic(["prerequisite", "dependent"], [["dependent", "prerequisite"]]);
    expect(lessonAtomOrder(back.lesson, back.graph)).toEqual(["prerequisite", "dependent"]);

    // Edges to atoms outside the lesson, unknown ids and self-links are ignored.
    const noise = synthetic(
      ["x", "y"],
      [
        ["x", "elsewhere"],
        ["x", "x"],
      ],
    );
    noise.lesson.frontmatter.atoms.push("unknown");
    expect(lessonAtomOrder(noise.lesson, noise.graph)).toEqual(["x", "y", "unknown"]);
  });

  it("breaks a cycle by list order without letting an unrelated atom leapfrog it", () => {
    // A mutual pair listed first stays first, in authored order, and the
    // atom that waits on it follows; the free atom at the end stays at the
    // end rather than being pulled ahead of the pair.
    const cyc = synthetic(
      ["a", "b", "needs-a", "free"],
      [
        ["a", "b"],
        ["b", "a"],
        ["needs-a", "a"],
      ],
    );
    expect(lessonAtomOrder(cyc.lesson, cyc.graph)).toEqual(["a", "b", "needs-a", "free"]);
    expect(forwardRequires(cyc.lesson, cyc.graph)).toEqual({ authored: 1, derived: 1 });

    // A cycle listed after an atom that needs it: the whole cycle moves up
    // as one unit, in authored order.
    const later = synthetic(
      ["needs-b", "a", "b"],
      [
        ["a", "b"],
        ["b", "a"],
        ["needs-b", "b"],
      ],
    );
    expect(lessonAtomOrder(later.lesson, later.graph)).toEqual(["a", "b", "needs-b"]);
  });

  it("reorders The System Underneath prerequisite-first", async () => {
    // Authored: reality-construction first, though it requires every other
    // atom in the lesson; derived: it comes last. Tracker entry 273's
    // "testable check" named active-listening / cognitive-bandwidth here,
    // but active-listening is not in this lesson; these pairs are.
    const { threads, atomsById } = await lessons();
    const thread = threads.find((t) => t.frontmatter.id === "the-system-underneath")!;
    expect(thread.frontmatter.atoms[0]).toBe("reality-construction");
    const order = lessonAtomOrder(thread, atomsById);
    expect(order.indexOf("irreversibility")).toBeLessThan(order.indexOf("reality-construction"));
    expect(order.indexOf("meaning-is-relational")).toBeLessThan(
      order.indexOf("shared-reality-fragility"),
    );
    expect(order.at(-1)).toBe("reality-construction");
  });

  it("is the order the episode notes and the next-in-lesson card walk", async () => {
    const { threads, atomsById, titles } = await lessons();
    const thread = threads.find((t) => t.frontmatter.id === "the-system-underneath")!;
    const order = lessonAtomOrder(thread, atomsById);

    const notes = await getEpisodeNotes("/threads/the-system-underneath");
    const ideas = notes?.lines.find((l) => l.label === "Ideas in this episode");
    expect(ideas).toBeDefined();
    expect(ideas!.names.map((n) => n.title)).toEqual(
      order.slice(0, ideas!.names.length).map((id) => titles.get(id)),
    );

    const next = await getNextAtomInThread("irreversibility", "the-system-underneath");
    expect(next?.id).toBe(order[order.indexOf("irreversibility") + 1]);
    expect(await getNextAtomInThread("reality-construction", "the-system-underneath")).toBeNull();
  });

  it.runIf(built)("ships the composed-from block in dependency order", async () => {
    const html = fs.readFileSync(path.join(APP, "threads", "the-system-underneath.html"), "utf-8");
    const start = html.indexOf('data-track="composed-from"');
    expect(start).toBeGreaterThan(-1);
    const block = html.slice(start, html.indexOf("</nav>", start));
    // Concept links only. Since 2026-09-22 an item whose concept another
    // lesson also teaches carries that lesson's name, linked (tracker entry
    // 339: 28 concepts sit in 2 or more lessons and neither page said so), so
    // the block holds `/threads/…` hrefs as well and the order being asserted
    // is the order of the concepts.
    const hrefs = [...block.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((h) => !h.startsWith("/threads/"));
    const slugs = hrefs.map((h) => h.split("/").pop()!);

    const { threads, atomsById } = await lessons();
    const thread = threads.find((t) => t.frontmatter.id === "the-system-underneath")!;
    expect(slugs).toEqual(lessonAtomOrder(thread, atomsById));
    // The concrete pair: reality-construction requires irreversibility and
    // was authored ahead of it.
    expect(slugs.indexOf("irreversibility")).toBeLessThan(slugs.indexOf("reality-construction"));
    expect(slugs.indexOf("meaning-is-relational")).toBeLessThan(
      slugs.indexOf("shared-reality-fragility"),
    );
  });
});
