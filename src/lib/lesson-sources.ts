import { loadAtoms, loadThreads } from "@/lib/content";
import type { AtomFrontmatter } from "@/lib/schema";

import { librarySlug } from "./library-slug";

export interface LessonSource {
  id: string;
  title: string;
  url: string;
  /** How many of the lesson's composed atoms link to this work. */
  citedBy: number;
}

/** How many works the block lists before folding the rest into "and N more". */
export const LESSON_SOURCES_CAP = 8;

/**
 * The library works a lesson rests on, computed from the atoms it composes.
 *
 * Entry 129 in docs/novel-insights.md: the lessons cite by surname (44
 * mentions, one italicised title, zero links to /library/), yet every lesson
 * inherits a bibliography through its atoms — each composed atom carries
 * `links` to `ref-*` atoms, and the union across a lesson runs from four to
 * seventeen works. The library page already walks this edge in reverse
 * (`citingAtoms`); this is the same walk forward, so the bibliography a lesson
 * has always had is finally shown on the lesson.
 *
 * Any relation counts. An atom that `contrasts` a work is still grounded in
 * it, and the relation vocabulary was chosen for concepts, not for citations
 * (entry 130 finds `contrasts` carrying descent among the formats).
 *
 * Ordered by how many of the lesson's atoms cite the work, so the book most
 * of the lesson leans on comes first, then by title for a stable list.
 */
export function lessonSources(
  atomIds: readonly string[],
  atoms: readonly { frontmatter: AtomFrontmatter }[],
): LessonSource[] {
  const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
  const counts = new Map<string, number>();

  for (const id of atomIds) {
    const atom = byId.get(id);
    if (!atom) continue;
    // One atom citing the same work through two relations is still one atom.
    const cited = new Set((atom.links ?? []).map((l) => l.id).filter((t) => t.startsWith("ref-")));
    for (const ref of cited) {
      if (byId.get(ref)?.type !== "reference") continue;
      counts.set(ref, (counts.get(ref) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([id, citedBy]) => ({
      id,
      title: byId.get(id)!.title,
      url: `/library/${librarySlug(id)}`,
      citedBy,
    }))
    .sort((a, b) => b.citedBy - a.citedBy || a.title.localeCompare(b.title));
}

export interface CitingLesson {
  id: string;
  title: string;
  href: string;
  /** How many of the lesson's composed atoms cite this work. */
  citedBy: number;
}

/** How many lessons the library page lists before folding the rest into "and N more". */
export const CITING_LESSONS_CAP = 12;

let _citingLessons: Promise<Map<string, CitingLesson[]>> | null = null;

/**
 * Work id → the lessons whose sources block names it.
 *
 * Tracker entry 219 (2026-09-21): the block above created 180 lesson → work
 * links and the library pages answered one of them, because a work's page
 * finds its citers in atom `links` and lessons have none. This is the same
 * walk as `lessonSources`, run once over every lesson and turned round, so
 * the library cannot list a lesson the lesson does not list back — the two
 * surfaces share one function rather than two that must be kept in step.
 * block-reciprocity.test.ts holds both ends to it.
 */
function citingLessonsIndex(): Promise<Map<string, CitingLesson[]>> {
  if (!_citingLessons) {
    _citingLessons = (async () => {
      const [threads, atoms] = await Promise.all([loadThreads(), loadAtoms()]);
      const index = new Map<string, CitingLesson[]>();
      for (const thread of threads) {
        const fm = thread.frontmatter;
        for (const source of lessonSources(fm.atoms ?? [], atoms)) {
          const list = index.get(source.id) ?? [];
          list.push({
            id: fm.id,
            title: fm.title,
            href: `/threads/${fm.id}`,
            citedBy: source.citedBy,
          });
          index.set(source.id, list);
        }
      }
      // The lesson that leans on the work hardest first, then by title: the
      // mirror of the order the lesson page gives its sources.
      for (const list of index.values()) {
        list.sort((a, b) => b.citedBy - a.citedBy || a.title.localeCompare(b.title));
      }
      return index;
    })();
  }
  return _citingLessons;
}

/** The lessons whose "Sources behind this lesson" block lists a work. */
export async function lessonsCitingWork(workId: string): Promise<CitingLesson[]> {
  return (await citingLessonsIndex()).get(workId) ?? [];
}
