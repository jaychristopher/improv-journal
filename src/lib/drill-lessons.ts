import { getPracticeRecommendationsForThread, getThreadBySlug, loadThreads } from "./content";

/**
 * What the journey's client surfaces cannot read from content, read once on
 * the server: which lessons a drill counts as practice for, the drill each
 * lesson's row leads with, and how many concepts a lesson has.
 *
 * The learner's record was keyed by the 25 lessons and written only on the
 * lesson page, while the drill is the unit every "practice" recommendation
 * means and the concept pages are 205 of the 319 (tracker entry 333,
 * 2026-09-22). The drill page's "I ran this" (`DrillPracticed`) lifts the
 * lessons this module names; the homepage's practice card names the drill
 * this module reads off the lesson's row; the syllabus's "3 of 12 concepts
 * read" divides by the count this module supplies. All three read the same
 * drill row the lesson page renders (`getPracticeRecommendationsForThread`),
 * so the lesson a drill credits is the lesson that sent the reader to it.
 */

interface LessonDrill {
  id: string;
  title: string;
  href: string;
  /** The lesson's title, for the card to say what the drill is for. */
  lessonTitle: string;
}

type Recommendation = Awaited<ReturnType<typeof getPracticeRecommendationsForThread>>[number];

let rowsPromise: Promise<Map<string, { title: string; row: Recommendation[] }>> | null = null;

/**
 * Lesson id → its title and drill row, every lesson, computed once per
 * process: the row reader parses the corpus per call, and the concept pages
 * ask for this 205 times a build.
 */
function lessonRows() {
  rowsPromise ??= (async () => {
    const threads = await loadThreads();
    const rows = await Promise.all(
      threads.map(async (thread) => {
        const row = await getPracticeRecommendationsForThread(thread.frontmatter.id);
        return [thread.frontmatter.id, { title: thread.frontmatter.title, row }] as const;
      }),
    );
    return new Map(rows);
  })();
  return rowsPromise;
}

/** A row entry that is a drill, not the picker's level page a lesson with no drill gets. */
function isDrill(entry: Recommendation): boolean {
  return entry.source !== "level-page";
}

/**
 * The lessons whose drill rows list `drillId`, in the threads' order. What a
 * rep on the drill page credits: the lesson's row is the site's claim that
 * the drill is that lesson's practice, so the record agrees with the row.
 */
export async function lessonsRecommendingDrill(drillId: string): Promise<string[]> {
  const rows = await lessonRows();
  return [...rows.entries()]
    .filter(([, { row }]) => row.some((entry) => isDrill(entry) && entry.id === drillId))
    .map(([lessonId]) => lessonId);
}

/**
 * Lesson id → the first drill on its row, for every lesson that has one. The
 * homepage's practice card is client-side and has no content access, so
 * this is passed down whole; a lesson whose row is only the picker's level
 * page has no entry and the card falls back to the lesson.
 */
export async function drillsByLesson(): Promise<Record<string, LessonDrill>> {
  const rows = await lessonRows();
  const out: Record<string, LessonDrill> = {};
  for (const [lessonId, { title, row }] of rows) {
    const first = row.find(isDrill);
    if (!first) continue;
    out[lessonId] = { id: first.id, title: first.title, href: first.url, lessonTitle: title };
  }
  return out;
}

interface LessonConcepts {
  title: string;
  /** How many atoms the lesson composes: the "of 12" in "3 of 12 concepts read". */
  concepts: number;
}

/**
 * For the lessons given, the title and concept count the syllabus divides
 * by. A lesson id with no file gets its id as title and 0 concepts, so the
 * client never divides by a count it was not given.
 */
export async function lessonConceptCounts(
  threadIds: string[],
): Promise<Record<string, LessonConcepts>> {
  const entries = await Promise.all(
    threadIds.map(async (id) => {
      const thread = await getThreadBySlug(id);
      return [
        id,
        {
          title: thread?.frontmatter.title ?? id,
          concepts: new Set(thread?.frontmatter.atoms ?? []).size,
        },
      ] as const;
    }),
  );
  return Object.fromEntries(entries);
}
