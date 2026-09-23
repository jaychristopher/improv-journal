import {
  getAtomUrl,
  getParentPath,
  getPathProgressionRank,
  loadAtoms,
  loadPaths,
  loadThreads,
} from "./content";
import {
  coreRepresentative,
  type RequireSet,
  requireSets,
  type RequiresGraph,
  requiresGraph,
} from "./direct-requires";
import { getNextPath } from "./path-progression";
import type { AtomType, Audience } from "./schema";

/**
 * A concept a path's lessons rest on without teaching it.
 *
 * Every path declares one free-text `prerequisites` sentence, and nothing
 * checks it against the graph. The graph's own prerequisite relation is the
 * atoms' `requires` edges, and by those no path is closed: each one's lessons
 * compose atoms that require between eight and twenty-four atoms the path
 * never composes (novel-insights 122). This is that list, derived rather than
 * authored, so the surface built to state prerequisites states the ones the
 * graph knows about.
 *
 * Read from the *direct* prerequisites (direct-requires.ts), not the declared
 * closure. The atoms declare their whole prerequisite set — 64% of the
 * acyclic `requires` edges are implied by a chain already in the graph, and
 * the 19-atom knot means an atom naming two of its members has named them
 * all — so until 2026-09-22 every path's block named the knot three or four
 * times over and counted `commitment` as required by fourteen atoms of which
 * one needed it next (tracker entry 277). What a lesson's atoms need *next*
 * is the block's claim; what that needs in turn is the next atom's page.
 *
 * And read with the knot as one thing (`requireSets`). The reduction names
 * a collapsed cycle by one member, and when entry 315 (2026-09-22) moved
 * that member from the first-declared to the most-required, the blocks
 * here — which had taken the member for the prerequisite — changed what
 * they said the paths owed: Beginner Foundations, closed under entry 277,
 * came to owe `commitment` from lesson 2 in lesson 1, where it had needed
 * `active-listening` from lesson 1, and forward concepts went 24 → 32 with
 * no thread list touched. A path teaches the core by teaching any of it,
 * so a `viaCore` need is satisfied by any member the path (or an earlier
 * lesson) composes; where none is, the block names one member and counts
 * the need once, not once per member the atoms happened to declare.
 */
export interface PathPrerequisite {
  id: string;
  title: string;
  url: string;
  type: AtomType;
  /** How many of the path's own atoms require this one. */
  requiredBy: number;
  /**
   * The earliest path in the progression whose lessons compose the atom,
   * or null when no lesson anywhere teaches it — two atoms in the corpus,
   * `specificity` and `tilt`, are in that state (novel-insights 166).
   *
   * Stated as the home path (`getParentPath`) of the earliest-homed lesson
   * that composes the atom, not as the earliest path found by scanning the
   * paths' thread lists (tracker entry 262, 2026-09-21). A lesson's home is
   * its lowest-ranked path, so the lowest home among the composing lessons
   * is the lowest-ranked path that teaches the atom — the same answer —
   * but a scan could name a path that ties on rank and is not the lesson's
   * home, and then the click lands on a breadcrumb saying something else,
   * which is what entry 262 found for 23 concepts. Read from the lesson,
   * the label and the lesson page cannot disagree. Earliest means
   * `getPathProgressionRank`, the rank the home rule reads, with
   * `progressionOrder` settling ties; the order alone put The Art of
   * Ensemble (rank 6) ahead of the teacher's branch (rank 5) and labelled
   * `trust` with it.
   */
  taughtIn: { pathId: string; pathTitle: string } | null;
  /**
   * True when `taughtIn` sits above this path on the reader ladder
   * (`readerLevel`): the page says "no experience required" and then names
   * a concept its own reader is not expected to have met. 13 of the 67
   * items on 2026-09-22, 10 of them on the 4 beginner paths (tracker entry
   * 329). False where nothing teaches the atom — there is no path to be
   * above.
   */
  taughtAbove: boolean;
}

/**
 * What a path's audience assumes its reader already knows, as a rung.
 *
 * Not `audienceRank` from path-progression, which is the order the site
 * recommends *walking* the paths — beginner, intermediate, teacher,
 * advanced, performer — and puts the reference shelf under the performer
 * paths because a reader is sent there before them. Read as knowledge
 * assumed, the shelf is the top: its sentence asks for a reader who studies
 * improv as a system, and by the walking order it would be leaning on 3
 * performer-taught concepts that are not above it by level. The teacher's
 * path asks for "solid personal improv experience", the intermediate's for
 * "basic familiarity with yes-and" — the same rung, a reader who has done
 * some. Entry 329 counted with this ladder: 13 items taught above their
 * path's level; the walking order would count 16.
 */
export const READER_LEVEL: Record<Audience, number> = {
  beginner: 0,
  intermediate: 1,
  teacher: 1,
  performer: 2,
  advanced: 3,
};

/**
 * A path's rung: the lowest of its audiences, because a path listed for
 * beginners and intermediates is written for the beginner in the room. A
 * path with no audience ranks above every rung, so nothing is above it.
 */
export function readerLevel(audience: readonly Audience[] | undefined): number {
  const rungs = (audience ?? []).map((a) => READER_LEVEL[a]);
  return rungs.length ? Math.min(...rungs) : Number.POSITIVE_INFINITY;
}

/**
 * Eight, because the smallest gap any path has is eight and a longer list
 * stops being a prerequisite block and becomes a second syllabus. The
 * ordering puts the most-required first, so what is cut is what the fewest
 * lessons lean on.
 */
export const PATH_PREREQUISITE_LIMIT = 8;

/**
 * Paths in the order the site recommends walking them.
 *
 * path-progression holds a next-path map rather than a sequence: one main
 * chain and three entry paths that each join it partway. The order here is
 * the main chain (the longest walk to the end) with each branch inserted
 * just before the path it joins, so "the earliest path that teaches X"
 * means the first one a reader following the site's own arrows would meet.
 */
export function progressionOrder(pathIds: string[]): string[] {
  const distance = (id: string): number => {
    const seen = new Set<string>();
    let steps = 0;
    let cur: string | undefined = id;
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      cur = getNextPath(cur)?.id;
      if (cur) steps += 1;
    }
    return steps;
  };

  const ranked = [...pathIds].sort((a, b) => distance(b) - distance(a) || a.localeCompare(b));
  if (ranked.length === 0) return [];

  const order: string[] = [];
  const walked = new Set<string>();
  let cur: string | undefined = ranked[0];
  while (cur && !walked.has(cur)) {
    walked.add(cur);
    order.push(cur);
    cur = getNextPath(cur)?.id;
  }

  for (const id of ranked) {
    if (walked.has(id)) continue;
    walked.add(id);
    const target = getNextPath(id)?.id;
    const at = target ? order.indexOf(target) : -1;
    if (at === -1) order.push(id);
    else order.splice(at, 0, id);
  }
  return order;
}

/**
 * The member that stands for a core need on a path: the most-required of
 * the members the group's atoms declared (`coreRepresentative`, the
 * sidebar's rule, so the two surfaces name the knot alike). Where `among`
 * is given only members it holds are eligible — it is the lesson that will
 * teach the need — falling back from declared members to any it holds.
 */
function nearestMember(
  graph: RequiresGraph,
  need: RequireSet,
  own: ReadonlySet<string>,
  among?: ReadonlySet<string>,
): string {
  const eligible = (ids: readonly string[]) =>
    ids.filter((id) => !own.has(id) && (!among || among.has(id)));
  const declared = eligible(need.declared);
  const pool = declared.length > 0 ? declared : eligible(need.ids);
  return coreRepresentative(graph, pool) ?? need.ids[0];
}

/**
 * The atoms a path's lessons rest on that none of its lessons teach, most
 * required first, capped at PATH_PREREQUISITE_LIMIT.
 *
 * Returns an empty list for an unknown path so the page can render nothing
 * rather than throw.
 */
export async function getPathPrerequisites(pathId: string): Promise<PathPrerequisite[]> {
  const [atoms, threads, paths] = await Promise.all([loadAtoms(), loadThreads(), loadPaths()]);
  const pathData = paths.find((p) => p.frontmatter.id === pathId);
  if (!pathData) return [];

  const atomById = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
  const graph = requiresGraph(atoms.map((a) => a.frontmatter));
  const threadAtoms = new Map(threads.map((t) => [t.frontmatter.id, t.frontmatter.atoms ?? []]));

  const taughtBy = (threadIds: string[]): Set<string> => {
    const set = new Set<string>();
    for (const threadId of threadIds) {
      for (const atomId of threadAtoms.get(threadId) ?? []) set.add(atomId);
    }
    return set;
  };

  const taught = taughtBy(pathData.frontmatter.threads ?? []);

  // Each need once, with a cycle the path teaches no member of standing
  // under the member the path's own atoms come nearest to: the sidebar's
  // rule (`coreRepresentative`) over the members they named.
  const requiredBy = new Map<string, number>();
  for (const need of requireSets(
    graph,
    [...taught].filter((id) => atomById.has(id)),
  )) {
    const id = need.viaCore ? nearestMember(graph, need, taught) : need.ids[0];
    requiredBy.set(id, (requiredBy.get(id) ?? 0) + need.requiredBy);
  }

  // Each lesson's home path, so the label names the path the lesson page
  // will say it is in. Earliest by the rank the home rule reads; the
  // recommended walking order settles ties between paths at the same step.
  const position = new Map(
    progressionOrder(paths.map((p) => p.frontmatter.id)).map((id, i) => [id, i]),
  );
  const earlier = (a: string, b: string) =>
    getPathProgressionRank(a) - getPathProgressionRank(b) || position.get(a)! - position.get(b)!;
  const titleOf = new Map(paths.map((p) => [p.frontmatter.id, p.frontmatter.title]));
  // Each path's rung, so an item can say whether the path that teaches it
  // is above the reader this page is written for (entry 329).
  const levelOf = new Map(
    paths.map((p) => [p.frontmatter.id, readerLevel(p.frontmatter.audience)]),
  );
  const ownLevel = levelOf.get(pathId)!;
  const homeOf = new Map<string, string>();
  for (const thread of threads) {
    const home = await getParentPath(thread.frontmatter.id);
    if (home) homeOf.set(thread.frontmatter.id, home.frontmatter.id);
  }

  const taughtIn = (atomId: string) => {
    let best: string | null = null;
    for (const [threadId, atomIds] of threadAtoms) {
      if (!atomIds.includes(atomId)) continue;
      const home = homeOf.get(threadId);
      if (!home) continue;
      if (best === null || earlier(home, best) < 0) best = home;
    }
    return best ? { pathId: best, pathTitle: titleOf.get(best)! } : null;
  };

  return [...requiredBy.entries()]
    .map(([id, count]) => {
      const atom = atomById.get(id)!;
      const home = taughtIn(id);
      return {
        id,
        title: atom.title,
        url: getAtomUrl({ id, type: atom.type }),
        type: atom.type,
        requiredBy: count,
        taughtIn: home,
        taughtAbove: home !== null && levelOf.get(home.pathId)! > ownLevel,
      };
    })
    .sort((a, b) => b.requiredBy - a.requiredBy || a.title.localeCompare(b.title))
    .slice(0, PATH_PREREQUISITE_LIMIT);
}

/** How many of a path's leans-on items are taught only above the path's level. */
export function taughtAboveCount(items: readonly PathPrerequisite[]): number {
  return items.filter((item) => item.taughtAbove).length;
}

/**
 * The one line under the leans-on list that keeps "no experience required"
 * from standing silently over concepts taught to a reader further up the
 * ladder (tracker entry 329, 2026-09-22). The authored sentence describes
 * the reader and the derived list describes other paths' content, and the
 * page presented them as one statement; this says how many of the list the
 * reader is not expected to bring, and that the lesson carries them. Null
 * where nothing on the list is taught above, so the line renders only where
 * it says something — 6 of the 11 paths today, The Physics of Connection at
 * 4 of 7.
 *
 * Held here and not in the route file because hub-prose-links.test.ts holds
 * a ceiling on the prose a route file carries.
 */
export function leansAboveLine(items: readonly PathPrerequisite[]): string | null {
  const above = taughtAboveCount(items);
  if (above === 0) return null;
  return above === 1
    ? "1 of these is taught on an intermediate or performer path; the lesson explains it where it appears."
    : `${above} of these are taught on intermediate or performer paths; the lesson explains them where they appear.`;
}

export interface LeaningPath {
  id: string;
  title: string;
  href: string;
  /** How many of the path's own atoms require this one. */
  requiredBy: number;
}

let _leaningPaths: Promise<Map<string, LeaningPath[]>> | null = null;

/**
 * Atom id → the paths whose "Ideas this path leans on" block names it.
 *
 * Tracker entry 220 (2026-09-21): 88 path → atom links from that block and
 * none answered, because the atom page reaches paths only through the
 * lessons that compose it, and an atom a path leans on is by definition one
 * its lessons do not compose. So the 32 atoms the paths rest on — specificity,
 * tilt, base-reality, do-feel-say — said from their own pages that they were
 * in no path at all. Built by running `getPathPrerequisites` over every path
 * once and inverting, so the atom page can only name a path whose block
 * names the atom. Listed in progression order, the way the site recommends
 * walking them. block-reciprocity.test.ts asserts both ends.
 */
function leaningPathsIndex(): Promise<Map<string, LeaningPath[]>> {
  if (!_leaningPaths) {
    _leaningPaths = (async () => {
      const paths = await loadPaths();
      const byId = new Map(paths.map((p) => [p.frontmatter.id, p.frontmatter]));
      const index = new Map<string, LeaningPath[]>();
      for (const pathId of progressionOrder(paths.map((p) => p.frontmatter.id))) {
        const fm = byId.get(pathId)!;
        for (const item of await getPathPrerequisites(pathId)) {
          const list = index.get(item.id) ?? [];
          list.push({
            id: fm.id,
            title: fm.title,
            href: `/paths/${fm.id}`,
            requiredBy: item.requiredBy,
          });
          index.set(item.id, list);
        }
      }
      return index;
    })();
  }
  return _leaningPaths;
}

/** The paths whose "Ideas this path leans on" block names an atom. */
export async function pathsLeaningOn(atomId: string): Promise<LeaningPath[]> {
  return (await leaningPathsIndex()).get(atomId) ?? [];
}

/** A concept a lesson's atoms require that a later lesson on the same path teaches. */
export interface ForwardNeed {
  atomId: string;
  title: string;
  url: string;
  /** The nearest later lesson on the path that composes the atom. */
  taughtBy: { id: string; title: string; position: number };
}

/** One lesson's forward needs on one path. */
export interface LessonForwardNeeds {
  lessonId: string;
  title: string;
  /** 1-based place on the path. */
  position: number;
  needs: ForwardNeed[];
  /**
   * True when a lesson this one needs something from also needs something
   * from this one — the pair lean on each other, and no order clears it.
   */
  mutual: boolean;
  /** The later lessons that both teach this one a prerequisite and need one from it. */
  mutualWith: { id: string; title: string; position: number }[];
}

/**
 * The prerequisites a path teaches after the lesson that needs them.
 *
 * Read as a schedule, the paths teach 40% of their own prerequisites late:
 * of the `requires` edges between two lessons on the same path, 84 point at
 * a later lesson and 124 back, and Mastering the Form runs entirely
 * backwards — *Beyond the Harold* composes `harold`, `montage` and
 * `armando`, all of which require `editing`, which *Show as Architecture*
 * teaches second (tracker entry 269, 2026-09-22). "Why this order" explained
 * the sequences; nothing told the reader what each sequence assumes.
 *
 * Per lesson: the concepts its atoms require, that it does not compose
 * itself, and that no earlier lesson on the path teaches but a later one
 * does — each concept once, credited to the nearest later lesson. A concept
 * an earlier lesson also teaches is not a forward need: the reader met it.
 * Counted at the concept, not the atom-edge, so three atoms in one lesson
 * requiring `editing` is one need; entry 269's 84 was the edge count.
 *
 * `mutual` marks the residue no reorder fixes: lesson A needs something
 * from later lesson B while B needs something from A. Entry 269 counted 32
 * such pairs across the paths. Only lessons with at least one forward need
 * are listed; an unknown path returns an empty list.
 *
 * Needs are the atoms' direct prerequisites (direct-requires.ts), as the
 * leans-on block above. With the declared closure the count was 56 concepts
 * across 21 lessons; a lesson whose atoms name `commitment`, `be-present`
 * and `active-listening` was owed the knot three times by a later lesson
 * that taught one member of it (entry 277, 2026-09-22). And a core need is
 * owed only when no earlier lesson teaches any member of the core — it is
 * one thing — and is printed under the member the later lesson composes,
 * preferring one the atoms declared (entry 315's representative, read as a
 * set).
 */
export async function getForwardPrerequisites(pathId: string): Promise<LessonForwardNeeds[]> {
  const [atoms, threads, paths] = await Promise.all([loadAtoms(), loadThreads(), loadPaths()]);
  const pathData = paths.find((p) => p.frontmatter.id === pathId);
  if (!pathData) return [];

  const atomById = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
  const graph = requiresGraph(atoms.map((a) => a.frontmatter));
  const threadById = new Map(threads.map((t) => [t.frontmatter.id, t.frontmatter]));
  const lessonIds = (pathData.frontmatter.threads ?? []).filter((id) => threadById.has(id));
  const lessons = lessonIds.map((id, i) => ({
    id,
    title: threadById.get(id)!.title,
    position: i + 1,
    atoms: new Set(threadById.get(id)!.atoms ?? []),
  }));
  type Lesson = (typeof lessons)[number];
  // What a lesson's atoms need next and do not compose themselves, a
  // collapsed cycle as one need.
  const needsOf = (lesson: Lesson): RequireSet[] =>
    requireSets(
      graph,
      [...lesson.atoms].filter((id) => atomById.has(id)),
    );
  const teaches = (lesson: Lesson, need: RequireSet): boolean =>
    need.ids.some((id) => lesson.atoms.has(id));

  // Lesson index → the set of lesson indexes it takes a forward need from.
  const needsFrom = new Map<number, Set<number>>();
  const result: LessonForwardNeeds[] = [];

  for (const [i, lesson] of lessons.entries()) {
    // Keyed by the concept the block will print: a core need is named by
    // the member its teaching lesson composes, and an ordinary need for the
    // same member folds into it rather than printing twice.
    const needs = new Map<string, ForwardNeed>();
    for (const need of needsOf(lesson)) {
      if (lessons.slice(0, i).some((earlier) => teaches(earlier, need))) continue;
      const later = lessons.slice(i + 1).find((l) => teaches(l, need));
      if (!later) continue;
      const atomId = need.viaCore
        ? nearestMember(graph, need, lesson.atoms, later.atoms)
        : need.ids[0];
      const held = needs.get(atomId);
      if (held && held.taughtBy.position <= later.position) continue;
      const atom = atomById.get(atomId)!;
      needs.set(atomId, {
        atomId,
        title: atom.title,
        url: getAtomUrl({ id: atomId, type: atom.type }),
        taughtBy: { id: later.id, title: later.title, position: later.position },
      });
      const from = needsFrom.get(i) ?? new Set<number>();
      from.add(later.position - 1);
      needsFrom.set(i, from);
    }
    if (needs.size === 0) continue;

    const sorted = [...needs.values()].sort(
      (a, b) => a.taughtBy.position - b.taughtBy.position || a.title.localeCompare(b.title),
    );
    result.push({
      lessonId: lesson.id,
      title: lesson.title,
      position: lesson.position,
      needs: sorted,
      mutual: false,
      mutualWith: [],
    });
  }

  // Mutual means B teaches A a prerequisite (A's forward need) and A teaches
  // B one — which, A being earlier, is one of B's *backward* prerequisites,
  // so it is read from the atoms directly rather than from the forward list.
  const teachesPrerequisiteOf = (teacherIdx: number, learnerIdx: number): boolean =>
    needsOf(lessons[learnerIdx]).some((need) => teaches(lessons[teacherIdx], need));

  for (const entry of result) {
    const i = entry.position - 1;
    const laterIdxs = [...(needsFrom.get(i) ?? [])].sort((a, b) => a - b);
    entry.mutualWith = laterIdxs
      .filter((j) => teachesPrerequisiteOf(i, j))
      .map((j) => ({ id: lessons[j].id, title: lessons[j].title, position: lessons[j].position }));
    entry.mutual = entry.mutualWith.length > 0;
  }

  return result;
}
