import { loadPaths } from "./content";
import { getPathTitle, progressionEdges } from "./path-progression";

/**
 * Where the paths repeat each other.
 *
 * Read as a sequence a reader actually walks, the ladder re-assigns lessons:
 * following "next path" from Foundations to The Art of Ensemble hands out 24
 * lesson slots for 19 distinct lessons, five of them already completed on an
 * earlier rung; Improv for Everyday Life shares two of Systems of Improv's
 * four; and Foundations' lessons are all inside Teaching Improv (tracker
 * entry 295, 2026-09-22). Nothing on the site said so: the header counted
 * every lesson, the next-path card promised four and owed two. This module
 * derives the overlap from `content/paths` so the path page can say it in
 * words and the client can subtract what the journey record says is done.
 */

/** Ordered lesson ids per path, as `content/paths` declares them. */
export async function getPathLessonMap(): Promise<Map<string, string[]>> {
  const paths = await loadPaths();
  return new Map(paths.map((p) => [p.frontmatter.id, p.frontmatter.threads ?? []]));
}

/** The lessons on both paths, in `pathA`'s order. Unknown paths share nothing. */
export async function sharedLessons(pathA: string, pathB: string): Promise<string[]> {
  const lessons = await getPathLessonMap();
  return sharedBetween(lessons.get(pathA) ?? [], lessons.get(pathB) ?? []);
}

function sharedBetween(a: readonly string[], b: readonly string[]): string[] {
  const inB = new Set(b);
  return a.filter((id) => inB.has(id));
}

/**
 * Every path from which following PROGRESSION reaches `pathId`: the rungs a
 * reader may have climbed before arriving here, not only the one directly
 * below. The toolkit's repeats come from The Physics of Connection two rungs
 * down, which is where the reader did them.
 */
export function predecessorsOf(pathId: string): string[] {
  const edges = progressionEdges();
  const found: string[] = [];
  const frontier = [pathId];
  while (frontier.length > 0) {
    const current = frontier.pop()!;
    for (const { from, to } of edges) {
      if (to === current && !found.includes(from) && from !== pathId) {
        found.push(from);
        frontier.push(from);
      }
    }
  }
  return found;
}

export interface PathOverlapEntry {
  /** The other path. */
  pathId: string;
  title: string;
  /** Lesson ids on both paths, in this path's order. */
  shared: string[];
  /** The same lessons as 1-based positions on this path. */
  positions: number[];
  /**
   * Whether the shared lessons are this path's opening run, so a reader who
   * did the other path can simply start later.
   */
  isPrefix: boolean;
  /** 1-based position of the first lesson the other path does not have, or null when it has them all. */
  startAt: number | null;
  /** Positions on this path the other path does not have. */
  newPositions: number[];
  /** Whether the other path leads here on PROGRESSION. */
  leadsHere: boolean;
  /** Whether the other path's lessons are all on this path (and it is shorter). */
  containsIt: boolean;
}

export interface PathOverlap {
  pathId: string;
  lessons: string[];
  /** Other paths that lead here and share a lesson, most shared first. */
  predecessors: PathOverlapEntry[];
  /** Every other path sharing at least one lesson, predecessors included, most shared first. */
  all: PathOverlapEntry[];
}

/**
 * What this path shares with the paths that lead to it and with any path at
 * all, each named with the positions and the first lesson that is new.
 */
export async function overlapWithPredecessors(pathId: string): Promise<PathOverlap> {
  return computeOverlap(pathId, await getPathLessonMap(), predecessorsOf(pathId));
}

/** The pure core of `overlapWithPredecessors`, for a synthetic map in tests. */
export function computeOverlap(
  pathId: string,
  lessons: Map<string, string[]>,
  leadsHere: readonly string[],
): PathOverlap {
  const own = lessons.get(pathId) ?? [];
  const predecessors = new Set(leadsHere);
  const all: PathOverlapEntry[] = [];
  for (const [otherId, theirs] of lessons) {
    if (otherId === pathId) continue;
    const shared = sharedBetween(own, theirs);
    if (shared.length === 0) continue;
    const positions = shared.map((id) => own.indexOf(id) + 1);
    const newPositions = own.map((id, i) => (theirs.includes(id) ? 0 : i + 1)).filter(Boolean);
    const isPrefix = positions.every((p, i) => p === i + 1);
    all.push({
      pathId: otherId,
      title: getPathTitle(otherId),
      shared,
      positions,
      isPrefix,
      startAt: newPositions[0] ?? null,
      newPositions,
      leadsHere: predecessors.has(otherId),
      containsIt: shared.length === theirs.length && theirs.length < own.length,
    });
  }
  all.sort((a, b) => b.shared.length - a.shared.length || a.title.localeCompare(b.title));
  return {
    pathId,
    lessons: own,
    predecessors: all.filter((entry) => entry.leadsHere),
    all,
  };
}

/**
 * Pairs `[subset, superset]` where every lesson of the first path is on the
 * second and the second has more. One today: Foundations inside Teaching
 * Improv. The superset's page says so; the author may remove the subset.
 */
export async function subsetPaths(): Promise<[string, string][]> {
  const lessons = await getPathLessonMap();
  const pairs: [string, string][] = [];
  for (const [subId, sub] of lessons) {
    if (sub.length === 0) continue;
    for (const [superId, sup] of lessons) {
      if (subId === superId || sup.length <= sub.length) continue;
      if (sub.every((id) => sup.includes(id))) pairs.push([subId, superId]);
    }
  }
  return pairs.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
}

export interface ChainRepeat {
  lesson: string;
  /** The path on the chain that assigns the lesson again. */
  onPath: string;
  /** The earlier rung where the reader already did it. */
  firstOn: string;
}

export interface ChainAssignment {
  /** Path ids in the order the chain visits them. */
  paths: string[];
  /** Lesson slots across every rung, repeats included. */
  slots: number;
  distinct: number;
  repeats: ChainRepeat[];
}

/**
 * What a reader is assigned by following "next path" from `startId` to the
 * end of the chain: how many lesson slots, how many are distinct, and which
 * slots repeat a lesson an earlier rung already gave them.
 */
export async function chainAssignment(startId: string): Promise<ChainAssignment> {
  const lessons = await getPathLessonMap();
  const next = new Map(progressionEdges().map(({ from, to }) => [from, to]));
  const paths: string[] = [];
  for (let id: string | undefined = startId; id && !paths.includes(id); id = next.get(id)) {
    paths.push(id);
  }
  const firstSeenOn = new Map<string, string>();
  const repeats: ChainRepeat[] = [];
  let slots = 0;
  for (const pathId of paths) {
    for (const lesson of lessons.get(pathId) ?? []) {
      slots += 1;
      const firstOn = firstSeenOn.get(lesson);
      if (firstOn) repeats.push({ lesson, onPath: pathId, firstOn });
      else firstSeenOn.set(lesson, pathId);
    }
  }
  return { paths, slots, distinct: firstSeenOn.size, repeats };
}

/** Lesson id → the paths it sits on, for lessons on at least `min` paths, most first. */
export async function lessonsOnManyPaths(min = 3): Promise<{ lesson: string; paths: string[] }[]> {
  const lessons = await getPathLessonMap();
  const byLesson = new Map<string, string[]>();
  for (const [pathId, ids] of lessons) {
    for (const id of ids) byLesson.set(id, [...(byLesson.get(id) ?? []), pathId]);
  }
  return [...byLesson]
    .filter(([, paths]) => paths.length >= min)
    .map(([lesson, paths]) => ({ lesson, paths }))
    .sort((a, b) => b.paths.length - a.paths.length || a.lesson.localeCompare(b.lesson));
}

const COUNT_WORDS = ["", "one", "two", "three", "four", "five", "six"];

/** "Two" for 2, "7" past the words a sentence can open with. */
function countWord(n: number): string {
  const word = COUNT_WORDS[n];
  return word ? word[0].toUpperCase() + word.slice(1) : String(n);
}

/** "lesson 2", "lessons 2 and 4", "lessons 1, 3 and 4". */
export function listPositions(positions: readonly number[]): string {
  if (positions.length === 1) return `lesson ${positions[0]}`;
  const head = positions.slice(0, -1).join(", ");
  return `lessons ${head} and ${positions[positions.length - 1]}`;
}

function capitalise(text: string): string {
  return text[0].toUpperCase() + text.slice(1);
}

/**
 * The name a sentence calls a path by: the title before its subtitle, so
 * "Systems of Improv" rather than "Systems of Improv: A Thinking Person's
 * Guide" in the middle of a clause. The link carries the full title.
 */
export function shortPathTitle(pathId: string): string {
  return getPathTitle(pathId).split(":")[0].trim();
}

/** A run of prose, or a path to link. */
export type OverlapSegment = string | { pathId: string; title: string };

/** One sentence of the overlap line, with the paths it names as links. */
export type OverlapSentence = OverlapSegment[];

function link(pathId: string): OverlapSegment {
  return { pathId, title: shortPathTitle(pathId) };
}

/** The sentence as plain text, for tests and logs. */
export function sentenceText(sentence: OverlapSentence): string {
  return sentence.map((s) => (typeof s === "string" ? s : s.title)).join("");
}

/**
 * The sentence for a path that leads here. When the shared lessons open
 * this path the reader is told where to start; when they sit later, "start
 * at lesson 1" would say nothing, so the sentence names which lessons are
 * new instead.
 */
function describePredecessor(entry: PathOverlapEntry): OverlapSentence {
  const { pathId, positions, newPositions, isPrefix, startAt } = entry;
  const count = positions.length;
  if (isPrefix && startAt) {
    const lead =
      count === 1 ? "The first of these lessons is" : `${countWord(count)} of these lessons are`;
    return [
      `${lead} also in `,
      link(pathId),
      `; if you came from there, start at lesson ${startAt}.`,
    ];
  }
  const rest =
    newPositions.length === 1
      ? `lesson ${newPositions[0]} is new`
      : `the new ones are ${listPositions(newPositions)}`;
  return [
    `${capitalise(listPositions(positions))} ${count === 1 ? "is" : "are"} also in `,
    link(pathId),
    `; if you came from there, ${rest}.`,
  ];
}

/** The sentence for a path whose every lesson is on this one. */
function describeContained(entry: PathOverlapEntry): OverlapSentence {
  const { pathId, positions, newPositions } = entry;
  const which = positions.length === 2 ? "both" : `all ${positions.length}`;
  return [
    `This path contains ${which} lessons of `,
    link(pathId),
    `, as ${listPositions(positions)}; if you have done it, the new ones are ${listPositions(newPositions)}.`,
  ];
}

/** The sentence for a path this one is wholly inside. */
function describeContainer(entry: PathOverlapEntry): OverlapSentence {
  const which = entry.positions.length === 2 ? "Both" : `All ${entry.positions.length}`;
  return [`${which} of these lessons are also in `, link(entry.pathId), "."];
}

/**
 * One sentence for every other overlap: "Elsewhere, lesson 1 is also in
 * The Physics of Connection, lessons 2 and 3 in Systems of Improv and
 * lesson 4 in The Art of Ensemble."
 *
 * Names, not links. The sentences above route a reader — start here, these
 * are new — and link the path they route from; this one is information,
 * and the paths it names are mostly the ones the page's next-path card and
 * "taught in" list already link. Linking them again raised the paths
 * layer's repeat share past its ceiling (link-repeats.test.ts, 30%).
 */
function describeElsewhere(entries: PathOverlapEntry[], prefixed: boolean): OverlapSentence {
  const parts = entries.map((entry, i) => {
    const joiner = i === 0 ? "" : i === entries.length - 1 ? " and " : ", ";
    const verb = i === 0 ? ` ${entry.positions.length === 1 ? "is" : "are"} also in ` : " in ";
    const lead = listPositions(entry.positions);
    return `${joiner}${i === 0 && !prefixed ? capitalise(lead) : lead}${verb}${shortPathTitle(entry.pathId)}`;
  });
  return [`${prefixed ? "Elsewhere, " : ""}${parts.join("")}.`];
}

/**
 * The sentences a path page prints, in the order a reader needs them: the
 * paths that lead here first, then a path this one contains whole or is
 * inside, then one sentence for every other path that shares a lesson.
 * Empty for a path that shares nothing.
 */
export async function overlapSentences(pathId: string): Promise<OverlapSentence[]> {
  return sentencesFor(await overlapWithPredecessors(pathId));
}

/** The pure half of `overlapSentences`. */
export function sentencesFor(overlap: PathOverlap): OverlapSentence[] {
  const total = overlap.lessons.length;
  const sentences: OverlapSentence[] = overlap.predecessors.map(describePredecessor);
  const rest: PathOverlapEntry[] = [];
  for (const entry of overlap.all) {
    if (entry.leadsHere) continue;
    if (entry.containsIt) sentences.push(describeContained(entry));
    else if (entry.shared.length === total) sentences.push(describeContainer(entry));
    else rest.push(entry);
  }
  // In lesson order, so the sentence walks the syllabus rather than the
  // share counts the entries are sorted by.
  rest.sort((a, b) => a.positions[0] - b.positions[0] || a.title.localeCompare(b.title));
  if (rest.length > 0) sentences.push(describeElsewhere(rest, sentences.length > 0));
  return sentences;
}
