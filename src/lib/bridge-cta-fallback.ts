/**
 * Derive a guide's primary drill from the text it already has.
 *
 * Forty guides end in a practice closer — an H2 such as "How to practise it"
 * or "The part you can practise" — and 38 of them name drills there in
 * backticks. On 23 of the 26 guides that also declare an exercise CTA, the
 * declared target is a hand copy of the closer's first drill; on 12 guides the
 * closer names a drill and no CTA is declared at all (novel-insights entry
 * 183, 2026-09-21). The field was a cache of the section, and the cache had
 * drifted in three places and was missing in twelve.
 *
 * So the closer is the source of truth and the field is an override. When a
 * guide declares no CTA, the page derives one from the closer's first
 * backticked token that resolves to an exercise atom. A guide with no closer
 * yields nothing, and falls through to the entry-path card it always had.
 *
 * Since 2026-09-22 the derivation also reads the reader's level: the entry
 * path's audiences, through the picker's `matchesLevel`, choose the first
 * closer drill that fits before the first closer drill at all, and a card
 * whose drill still fails carries a note saying so (tracker entry 275).
 */

import { matchesLevel } from "@/app/tools/exercise-picker/picker-config";

const H2 = /^##\s+(.+?)\s*$/;
const PRACTISE = /practis/i;
const BACKTICK_ID = /`([a-z0-9-]+)`/g;

/**
 * The body of the practice closer: the first H2 whose text matches /practis/i,
 * up to the next H2 or the end of the document. Null when there is none.
 */
export function practiceCloser(markdown: string): string | null {
  const lines = markdown.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const heading = H2.exec(lines[i]);
    if (heading && PRACTISE.test(heading[1])) {
      start = i + 1;
      break;
    }
  }
  if (start < 0) return null;

  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    if (H2.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

/**
 * The first backticked id in the practice closer that is an exercise. Pure:
 * the caller supplies the set of exercise ids so the function needs no loader.
 */
export function fallbackExerciseId(
  markdown: string,
  exerciseIds: ReadonlySet<string>,
): string | null {
  return closerExerciseIds(markdown, exerciseIds)[0] ?? null;
}

/**
 * Every backticked id in the practice closer that is an exercise, in the
 * order the closer names them, deduplicated. The candidate list behind
 * `fallbackExerciseId` and `fallbackExerciseForLevels`, exposed so a test can
 * say "no closer drill fits" rather than trusting the chooser's word for it.
 */
export function closerExerciseIds(markdown: string, exerciseIds: ReadonlySet<string>): string[] {
  const closer = practiceCloser(markdown);
  if (!closer) return [];
  const ids: string[] = [];
  for (const match of closer.matchAll(BACKTICK_ID)) {
    if (exerciseIds.has(match[1]) && !ids.includes(match[1])) ids.push(match[1]);
  }
  return ids;
}

/**
 * Path audience → picker level. A twin of AUDIENCE_DRILL_LEVEL in
 * src/lib/content.ts (`getThreadDrillLevels`, the lesson page's version of the
 * same question, tracker entry 270). Copied rather than imported: this module
 * is pure and loader-free, and content.ts is the loader.
 */
const AUDIENCE_DRILL_LEVEL: Record<string, string> = {
  beginner: "beginner",
  intermediate: "intermediate",
  teacher: "intermediate",
  advanced: "advanced",
  performer: "advanced",
};

const DRILL_LEVEL_ORDER = ["beginner", "intermediate", "advanced"];

/**
 * The picker levels a guide's readers are at, in picker order: its entry
 * path's audiences mapped through AUDIENCE_DRILL_LEVEL. A guide has no
 * audience field of its own; `entry_path` is the site's one statement of who
 * it is for, and the path card on the same page already reads it (tracker
 * entry 275). A path with two audiences admits both. Empty when the guide
 * has no entry path: nothing says who is reading, so nothing is filtered.
 */
export function guideDrillLevels(pathAudience: readonly string[] | undefined): string[] {
  const levels = new Set((pathAudience ?? []).map((a) => AUDIENCE_DRILL_LEVEL[a]).filter(Boolean));
  return DRILL_LEVEL_ORDER.filter((level) => levels.has(level));
}

/**
 * Whether a drill's tags pass the picker's rule (`matchesLevel`) for any of
 * the guide's levels. No levels means no rule, so everything fits.
 */
export function drillFitsLevels(tags: readonly string[], levels: readonly string[]): boolean {
  return levels.length === 0 || levels.some((level) => matchesLevel([...tags], level));
}

/**
 * The level a drill's tags declare, for the card's note: the first of the
 * picker's levels its tags carry; `fundamentals` counts as beginner (that is
 * what `matchesLevel` reads it as). Null when the tags name no level.
 */
export function drillLevel(tags: readonly string[]): string | null {
  const own = DRILL_LEVEL_ORDER.find((level) => tags.includes(level));
  if (own) return own;
  return tags.includes("fundamentals") ? "beginner" : null;
}

/**
 * What the drill card says when the drill does not fit the reader the entry
 * path names (tracker entry 275: seven declared CTAs, eleven of the thirteen
 * failures sending a beginner-path reader to an intermediate drill). A
 * declared drill is kept — the field is the author's override — but the card
 * says so, and says which way the gap runs: a harder drill than the reader,
 * or an easier one. `pathBelow` is whether a path card follows on the page
 * (all seven declared failures also declare the entry path as their
 * secondary CTA, so "the path below" is on screen); the five derived
 * failures have no path card, so the note names the guide instead. Null when
 * the drill fits, or when neither side names a level.
 */
export function drillLevelNote(
  tags: readonly string[],
  levels: readonly string[],
  pathBelow = true,
): string | null {
  if (drillFitsLevels(tags, levels)) return null;
  const level = drillLevel(tags);
  if (!level || levels.length === 0) return null;
  const drillRank = DRILL_LEVEL_ORDER.indexOf(level);
  const article = level === "intermediate" || level === "advanced" ? "An" : "A";
  const subject = pathBelow ? "the path below" : "this guide";
  // Every level the path admits sits on one side of the drill, or the drill
  // would have fitted; compare with the highest to name the direction.
  const highest = Math.max(...levels.map((l) => DRILL_LEVEL_ORDER.indexOf(l)));
  return drillRank > highest
    ? `${article} ${level} drill; ${subject} starts earlier.`
    : `${article} ${level} drill; ${subject} assumes more.`;
}

/**
 * The closer's first exercise that fits the guide's levels; failing that,
 * the closer's first exercise at all, which is what `fallbackExerciseId`
 * returns and what every guide got until 2026-09-22. Of the twelve derived
 * CTAs, six failed the entry path's level and one had a fitting drill later
 * in its closer (how-to-be-more-charismatic: Status Transfer, then
 * Mirroring). The other five closers name only drills a level up or down
 * from the path — the courage drills — and keep the first, with the level
 * note the page appends to a failing card. Null for no closer or no drill.
 */
export function fallbackExerciseForLevels(
  markdown: string,
  exerciseTags: ReadonlyMap<string, readonly string[]>,
  levels: readonly string[],
): string | null {
  const candidates = closerExerciseIds(markdown, new Set(exerciseTags.keys()));
  if (candidates.length === 0) return null;
  return (
    candidates.find((id) => drillFitsLevels(exerciseTags.get(id) ?? [], levels)) ?? candidates[0]
  );
}

/**
 * Path audience → the readers a path card names, in the plural the level
 * hubs use ("for beginners"). Local rather than shared: path-progression.ts
 * describes a path's direction, not its reader, and no module exported this.
 */
const AUDIENCE_READERS: Record<string, string> = {
  beginner: "beginners",
  intermediate: "intermediate improvisers",
  teacher: "teachers",
  advanced: "advanced improvisers",
  performer: "performers",
};

/** "beginners", "beginners and intermediate improvisers"; null when no audience is known. */
export function audienceReaders(pathAudience: readonly string[] | undefined): string | null {
  const readers = (pathAudience ?? []).map((a) => AUDIENCE_READERS[a]).filter(Boolean);
  if (readers.length === 0) return null;
  return readers.length === 1
    ? readers[0]
    : `${readers.slice(0, -1).join(", ")} and ${readers[readers.length - 1]}`;
}

/** The parts of a path the guide's card notes read. */
export interface GuideEntryPath {
  id: string;
  title: string;
  audience?: readonly string[];
  threads?: readonly string[];
}

/**
 * Whether a CTA target sits on the guide's entry path: the path itself, or
 * one of the lessons it sequences. The test for a guide saying two things
 * about its own audience (tracker entry 285).
 */
export function targetOnEntryPath(targetId: string, entryPath: GuideEntryPath): boolean {
  return targetId === entryPath.id || (entryPath.threads ?? []).includes(targetId);
}

/**
 * What a guide's path card says about who the guide is for, from the entry
 * path's `audience` — the field seven modules read for the lesson tier, the
 * audience hubs and the level checks, and which no page rendered until
 * 2026-09-22 (tracker entry 285). "For beginners." when the card's target
 * is the entry path or a lesson on it. When the card points elsewhere — six
 * of the 39 secondary CTAs on 2026-09-22 sent the reader to Foundations or a
 * beginner lesson while `entry_path` said another path — the author's card
 * stays and the note says where the guide is actually filed, so the
 * disagreement is visible on the page rather than only in the derived
 * surfaces: "This guide is filed under The Art of Ensemble, for performers."
 * Null only when the target agrees and the path names no audience.
 */
export function guidePathNote(entryPath: GuideEntryPath, onEntryPath: boolean): string | null {
  const readers = audienceReaders(entryPath.audience);
  if (onEntryPath) return readers ? `For ${readers}.` : null;
  return readers
    ? `This guide is filed under ${entryPath.title}, for ${readers}.`
    : `This guide is filed under ${entryPath.title}.`;
}
