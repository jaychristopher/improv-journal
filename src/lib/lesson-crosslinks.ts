import { getAtomUrl, getParentPath, loadAtoms, loadPaths, loadThreads } from "./content";
import {
  coreRepresentative,
  type RequireSet,
  requireSets,
  type RequiresGraph,
  requiresGraph,
} from "./direct-requires";
import { buildLessonPrerequisites } from "./journey-prerequisites";

/**
 * What a lesson owes the lesson before it, so the page can say it.
 *
 * Measured over rendered bodies with the chrome and the derived blocks out,
 * concepts link concepts 1,014 times and guides link guides 280, and
 * lesson → lesson is 0: no lesson's prose names another lesson's title in
 * any of the 25 files, 0 of the 600 ordered pairs, and 1 lesson uses a
 * sequence phrase at all (tracker entry 339, 2026-09-22). The paths do the
 * joining and do it completely — 17 mentions, 17 linked — so every statement
 * that the lessons form an order is furniture: the prev/next nav, the
 * program map, the progress bar. A layer sequenced on 11 ladders is 25
 * essays that never refer to each other, which is why the declared order can
 * drift (entries 98 and 269) without anything reading wrong.
 *
 * This is the one derived sentence that says it. Nothing here is a new
 * computation of who teaches what: `buildLessonPrerequisites` already ranks,
 * per path and per lesson, the other lessons that teach a prerequisite of
 * this one's atoms (journey-prerequisites.ts, built for the shaky-reader
 * router), and this reads that map with the home path's order deciding
 * "before". Only the labels are worked out here — which concept to name —
 * because the map carries lesson ids and the sentence needs a title.
 *
 * The home path is `getParentPath`, the rule every other surface uses for
 * "the path this lesson is in" (tracker entry 262): a lesson sequenced by
 * more than one path has one home, and a line that named a different path's
 * neighbour would contradict the breadcrumb above it.
 *
 * The author's sentence is meant to replace this one. Entry 339's ask is 24
 * sentences — a lesson names the lesson before it once — and docs/seeds.md
 * lists the pairs with the concepts they share so each can be written.
 */

/** A concept the predecessor taught that this lesson's atoms need next. */
export interface CrosslinkConcept {
  id: string;
  title: string;
  href: string;
}

/** One lesson's line: the lesson before it on its home path, and what it taught. */
export interface LessonCrosslink {
  lessonId: string;
  lessonTitle: string;
  lessonHref: string;
  concepts: CrosslinkConcept[];
}

/**
 * At most 2 concepts in the sentence.
 *
 * The line is 1 sentence above the lesson's own prose, and the lessons are
 * the shortest prose on the site (median 481 words, entry 254); a list of 5
 * concepts there stops being a sentence and becomes another block. The 2 are
 * the most-required first, which is the same ordering the paths' leans-on
 * list uses, so the reader meets the heaviest debt.
 */
export const LESSON_CROSSLINK_CONCEPT_LIMIT = 2;

/**
 * The member that stands for a collapsed cycle in the sentence: the
 * most-required of the members the lesson's atoms declared that the
 * predecessor actually composes, falling back to any member it composes.
 *
 * Same rule as the sidebar's and the paths' leans-on list
 * (`coreRepresentative`), so the 3 surfaces name the knot alike. It is
 * spelled again here rather than imported because path-prerequisites keeps
 * its copy private, and importing that module for 1 helper would pull the
 * whole prerequisite build into the lesson page.
 */
function namedMember(graph: RequiresGraph, need: RequireSet, taught: ReadonlySet<string>): string {
  const eligible = (ids: readonly string[]) => ids.filter((id) => taught.has(id));
  const declared = eligible(need.declared);
  const pool = declared.length > 0 ? declared : eligible(need.ids);
  return coreRepresentative(graph, pool) ?? need.ids[0];
}

let _crosslinks: Promise<Map<string, LessonCrosslink>> | null = null;

/**
 * Lesson id → its line, for every lesson that has one.
 *
 * Built once for the corpus and cached, because 25 lesson pages each asking
 * for their own would load atoms, threads and paths 25 times over and
 * rebuild the prerequisite map with them.
 *
 * A lesson gets a line when all of these hold, and the test records the
 * population:
 * - it has a home path (`getParentPath`) that sequences it;
 * - it is not that path's first lesson, so there is something before it;
 * - some lesson before it on that path teaches a concept its own atoms
 *   require *next* (`requireSets`, the direct prerequisites, with the core
 *   read as the rest of the cycle — the same call journey-prerequisites
 *   makes). The best such lesson is the first the map ranks, which is why
 *   the choice is the map's and not this module's.
 *
 * A candidate the map ranks only for the declared closure — it teaches
 * something the lesson's needs need in turn — is passed over here, because
 * the sentence claims the lesson builds on the concept and the honest form
 * of that claim is a direct need. Never itself: the map excludes the lesson
 * from its own candidates, and the earlier-on-path filter would drop it
 * anyway.
 */
export async function lessonCrosslinks(): Promise<Map<string, LessonCrosslink>> {
  if (!_crosslinks) {
    _crosslinks = (async () => {
      const [atoms, threads, paths] = await Promise.all([loadAtoms(), loadThreads(), loadPaths()]);
      const atomById = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
      const graph = requiresGraph(atoms.map((a) => a.frontmatter));
      const threadById = new Map(threads.map((t) => [t.frontmatter.id, t.frontmatter]));
      const prerequisites = buildLessonPrerequisites(
        atoms.map((a) => a.frontmatter),
        threads.map((t) => t.frontmatter),
        paths.map((p) => p.frontmatter),
      );

      const out = new Map<string, LessonCrosslink>();
      for (const thread of threads) {
        const lessonId = thread.frontmatter.id;
        const home = await getParentPath(lessonId);
        if (!home) continue;
        const order = home.frontmatter.threads ?? [];
        const at = order.indexOf(lessonId);
        if (at <= 0) continue;

        const own = new Set(thread.frontmatter.atoms ?? []);
        const needs = requireSets(
          graph,
          [...own].filter((id) => atomById.has(id)),
          { core: "rest" },
        );
        if (needs.length === 0) continue;

        // The map's ranking, restricted to the lessons the home path places
        // before this one. Ranked best first already, so the first candidate
        // that names a concept is the answer.
        for (const candidateId of prerequisites[home.frontmatter.id]?.[lessonId] ?? []) {
          const before = order.indexOf(candidateId);
          if (before === -1 || before >= at) continue;
          const candidate = threadById.get(candidateId);
          if (!candidate) continue;
          const taught = new Set(candidate.atoms ?? []);
          const named = needs
            .filter((need) => need.ids.some((id) => taught.has(id)))
            .map((need) => ({
              need,
              id: need.viaCore ? namedMember(graph, need, taught) : need.ids[0],
            }))
            .filter(({ id }) => atomById.has(id))
            .sort((a, b) => {
              const byNeed = b.need.requiredBy - a.need.requiredBy;
              if (byNeed !== 0) return byNeed;
              return atomById.get(a.id)!.title.localeCompare(atomById.get(b.id)!.title);
            })
            .slice(0, LESSON_CROSSLINK_CONCEPT_LIMIT)
            .map(({ id }) => {
              const atom = atomById.get(id)!;
              return { id, title: atom.title, href: getAtomUrl({ id, type: atom.type }) };
            });
          if (named.length === 0) continue;
          out.set(lessonId, {
            lessonId: candidateId,
            lessonTitle: candidate.title,
            lessonHref: `/threads/${candidateId}`,
            concepts: named,
          });
          break;
        }
      }
      return out;
    })();
  }
  return _crosslinks;
}

/** One lesson's line, or null where the rule above gives it none. */
export async function crosslinkFor(threadId: string): Promise<LessonCrosslink | null> {
  return (await lessonCrosslinks()).get(threadId) ?? null;
}

/** The other lesson that teaches a concept this one also composes. */
export interface SharedConceptLesson {
  id: string;
  title: string;
  href: string;
}

let _shared: Promise<Map<string, Map<string, SharedConceptLesson>>> | null = null;

/**
 * Lesson id → concept id → the 1 other lesson the composed-from list names.
 *
 * 28 concepts sit in 2 or more lessons (entry 339's supporting count, and
 * the reason entry 326's concept card breaks the chain of every lesson but
 * the primary one). The composed-from list is where a lesson's concepts are
 * already a list, so it is where the overlap can be shown without a new
 * block: a concept another lesson also teaches carries that lesson's name.
 *
 * Capped at 1 other lesson, because 5 of these concepts sit in 3 lessons and
 * a list item that names 2 neighbours stops being a mark and becomes a
 * second list. The rule for which 1, in order:
 *
 * 1. A lesson the reader's own path sequences before or after this one —
 *    the home path (`getParentPath`, entry 262's rule, the path the
 *    breadcrumb above the list names) — earliest on that path first. The
 *    reader can reach it from the page they are on, and "earliest" points
 *    back at where the concept was introduced rather than forward.
 * 2. Otherwise the alphabetically first by title, so the choice is stable
 *    across runs and does not depend on the order the loader returns files.
 *
 * Both halves are recorded in lesson-crosslinks.test.ts, the second as the
 * fallback it is: a concept shared only with a lesson on another path.
 */
export async function sharedConceptLessons(): Promise<
  Map<string, Map<string, SharedConceptLesson>>
> {
  if (!_shared) {
    _shared = (async () => {
      const threads = await loadThreads();
      const composedBy = new Map<string, string[]>();
      for (const thread of threads) {
        for (const atomId of thread.frontmatter.atoms ?? []) {
          const list = composedBy.get(atomId) ?? [];
          list.push(thread.frontmatter.id);
          composedBy.set(atomId, list);
        }
      }
      const titleOf = new Map(threads.map((t) => [t.frontmatter.id, t.frontmatter.title]));

      const out = new Map<string, Map<string, SharedConceptLesson>>();
      for (const thread of threads) {
        const lessonId = thread.frontmatter.id;
        const home = await getParentPath(lessonId);
        const order = home?.frontmatter.threads ?? [];
        const marks = new Map<string, SharedConceptLesson>();
        for (const atomId of thread.frontmatter.atoms ?? []) {
          const others = (composedBy.get(atomId) ?? []).filter((id) => id !== lessonId);
          if (others.length === 0) continue;
          const onHome = others
            .filter((id) => order.includes(id))
            .sort((a, b) => order.indexOf(a) - order.indexOf(b));
          const chosen =
            onHome[0] ??
            [...others].sort((a, b) => (titleOf.get(a) ?? a).localeCompare(titleOf.get(b) ?? b))[0];
          marks.set(atomId, {
            id: chosen,
            title: titleOf.get(chosen) ?? chosen,
            href: `/threads/${chosen}`,
          });
        }
        if (marks.size > 0) out.set(lessonId, marks);
      }
      return out;
    })();
  }
  return _shared;
}

/** The marks for 1 lesson's composed-from list, empty where it shares nothing. */
export async function sharedConceptsFor(
  threadId: string,
): Promise<Map<string, SharedConceptLesson>> {
  return (await sharedConceptLessons()).get(threadId) ?? new Map();
}
