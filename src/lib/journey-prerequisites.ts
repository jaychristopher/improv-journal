import { loadAtoms, loadPaths, loadThreads } from "./content";
import { directRequires, type RequireSet, requireSets, requiresGraph } from "./direct-requires";
import type { LessonPrerequisiteMap, PathLessonPrerequisites } from "./journey";

/**
 * Which lesson on a path to send a shaky learner back to.
 *
 * The journey's only remedy for "still shaky" used to be the same lesson
 * again, for ever (novel-insights 119). The graph knows better: a lesson
 * composes atoms, those atoms `require` others, and for 37 of the 39
 * path-lesson slots another lesson on the same path teaches at least one of
 * them. This module reads that out of the content once, server side, so the
 * client-side router can consult it without loading the corpus.
 *
 * Shape: pathId → lessonId → the other lessons on that path that teach a
 * prerequisite of the lesson's atoms, best first. "Best" is: lessons placed
 * earlier on the path before lessons placed later (remediation means going
 * back, and half the corpus's prerequisite lessons sit after the lesson that
 * needs them — entry 98's inversions seen from the learner's side); within
 * that, the lesson teaching the most of the prerequisites; then path order.
 * Atoms the shaky lesson composes itself are not prerequisites of it, so a
 * lesson that only shares atoms with it is not a candidate.
 *
 * "The prerequisites" are ranked as the atoms' *direct* ones first
 * (direct-requires.ts). Read from the declared closure alone, the lesson
 * that teaches the 19-atom knot won by default — a shaky lesson's atoms
 * named `commitment`, `be-present` and `active-listening`, and *Presence
 * and Commitment* taught all three at once — so the map sent most shaky
 * readers to the same two lessons whatever they were shaky on (tracker
 * entry 277, 2026-09-22). A lesson teaching what the atoms need *next*
 * now outranks one teaching only what that needs in turn. The closure is
 * kept as the tie-break and the last resort, because on 8 of 39 slots it
 * is the only prerequisite any lesson on the path teaches (Beginner
 * Foundations' two lessons each teach the other's door into the knot and
 * nothing else), and a lesson that teaches the knot is a better answer to
 * "still shaky" than the same lesson again.
 *
 * A direct prerequisite that stands for the knot is read as the knot
 * (`requireSets`, `core: "rest"`): the members the shaky lesson does not
 * compose, satisfied by any of them another lesson teaches, counted once.
 * Until 2026-09-22 the map took the one member `directRequires` names for
 * the cycle as the prerequisite, so when entry 315 moved that member from
 * the first-declared to the most-required, lessons swapped places in the
 * ranking without a thread changing — the name had become the need. The
 * members the shaky lesson's atoms declared, the representative among
 * them, stay in the closure tie-break, so two lessons that each teach the
 * knot are separated by how much of what the atoms named each teaches,
 * then by path order — the closure's own order for that slot.
 */

interface AtomLike {
  id: string;
  links?: { id: string; relation: string }[];
}

interface ThreadLike {
  id: string;
  atoms?: string[];
}

interface PathLike {
  id: string;
  threads?: string[];
}

export function buildLessonPrerequisites(
  atoms: AtomLike[],
  threads: ThreadLike[],
  paths: PathLike[],
): LessonPrerequisiteMap {
  const graph = requiresGraph(atoms);
  const threadAtoms = new Map(threads.map((thread) => [thread.id, thread.atoms ?? []]));

  const requiredByLesson = (lessonId: string): { direct: RequireSet[]; implied: Set<string> } => {
    const own = new Set(threadAtoms.get(lessonId) ?? []);
    const direct = requireSets(graph, own, { core: "rest" });
    const implied = new Set<string>();
    for (const atomId of own) {
      for (const { id } of directRequires(graph, atomId).implied) if (!own.has(id)) implied.add(id);
    }
    for (const need of direct) {
      // An ordinary direct need is not also implied; a core need's declared
      // members, the representative included, are the closure tie-break.
      if (need.viaCore) for (const id of need.declared) implied.add(id);
      else implied.delete(need.ids[0]);
    }
    return { direct, implied };
  };

  const map: LessonPrerequisiteMap = {};

  for (const path of paths) {
    const lessonIds = path.threads ?? [];
    const perPath: PathLessonPrerequisites = {};

    lessonIds.forEach((lessonId, index) => {
      const required = requiredByLesson(lessonId);
      if (required.direct.length === 0 && required.implied.size === 0) return;

      const candidates = lessonIds
        .map((otherId, otherIndex) => {
          if (otherId === lessonId) return null;
          const atoms = new Set(threadAtoms.get(otherId) ?? []);
          const taught = required.direct.filter((need) =>
            need.ids.some((id) => atoms.has(id)),
          ).length;
          const taughtImplied = [...atoms].filter((atomId) => required.implied.has(atomId)).length;
          return taught + taughtImplied > 0
            ? { id: otherId, index: otherIndex, taught, taughtImplied }
            : null;
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
        .sort(
          (a, b) =>
            Number(b.index < index) - Number(a.index < index) ||
            b.taught - a.taught ||
            b.taughtImplied - a.taughtImplied ||
            a.index - b.index,
        );

      if (candidates.length > 0) {
        perPath[lessonId] = candidates.map((entry) => entry.id);
      }
    });

    map[path.id] = perPath;
  }

  return map;
}

/**
 * The map for the whole corpus, from the content loaders. Serialisable, so a
 * server component can hand it to `ContinueJourney` or `SyllabusProgress`
 * as a prop.
 */
export async function getLessonPrerequisites(): Promise<LessonPrerequisiteMap> {
  const [atoms, threads, paths] = await Promise.all([loadAtoms(), loadThreads(), loadPaths()]);
  return buildLessonPrerequisites(
    atoms.map((atom) => atom.frontmatter),
    threads.map((thread) => thread.frontmatter),
    paths.map((path) => path.frontmatter),
  );
}
