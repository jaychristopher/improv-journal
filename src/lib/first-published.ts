import record from "./first-published.json";

/**
 * When did the site first have a page, according to git?
 *
 * `created` was the answer, and it is a batch stamp: nine values across the
 * 205 atoms, 70 on the initial commit's day and 79 earlier than the
 * repository exists, fed to the concept pages' JSON-LD `datePublished` and
 * to the rank's months-of-age divisor as if it were the day the page was
 * written (novel-insights 321). Git records the day each file was added, so
 * that is the source now, with one exception the entry names: a file the
 * initial commit imported carries a `created` earlier than the repository,
 * and git can say only when the import happened. For those, `created` is
 * kept — the only witness there is.
 *
 * The rule, per file:
 *
 * - not in the record (added since `scripts/sync-first-published.mjs` last
 *   ran, or never committed): `created` — a hand-written new file's own date;
 * - added on the repository's first day, with a `created` before it: the
 *   file predates git, and `created` stands;
 * - otherwise: the date of the first commit that added it, renames followed.
 *
 * Reading of 2026-09-22: on the 205 atoms git agrees with `created` for every
 * one of the 126 files added after the initial commit, and 79 predate it
 * (the 27 of 29 March and the 52 of 3–4 April — the entry counted only
 * March, but the 3rd and 4th are before the 5th too). So the rule moves no
 * atom's date and the distinct count stays nine; what changed is what the
 * nine are evidence of. On the 78 guides it moves 13: ten of 22 April were
 * committed on the 23rd, three of 25 August on the 24th — the guide pages do
 * not read this yet.
 *
 * Why a record and not `git log` here: a deploy builds on a shallow clone,
 * where every file is "added" by the boundary commit. The walk runs in the
 * sync script where the history is whole; `first-published.test.ts` checks
 * the record against git wherever git is.
 *
 * The Improv Lab feed does not read this. Its episode dates are the show's
 * `created` plus twelve hours an episode (entry 236): a spacing that keeps a
 * client's date order and its episode numbers agreeing, not a claim about
 * when the concept was published, and a page's first-published date has no
 * business there.
 */

/** The root commit's date, `YYYY-MM-DD`, as the sync script read it from git. */
export const FIRST_COMMIT_DATE: string = record.firstCommit;

const files: Readonly<Record<string, string>> = record.files;

type FirstPublishedSource = "git" | "created" | "unrecorded";

interface FirstPublished {
  /** `YYYY-MM-DD`; undefined only when neither git nor the frontmatter has a date. */
  date: string | undefined;
  source: FirstPublishedSource;
}

/**
 * The first-published date of a content file, `rel` being its path from the
 * repo root with `/` (`content/atoms/yes-and.md`), and `created` the
 * frontmatter's own date.
 */
export function firstPublished(rel: string, created: string | undefined): FirstPublished {
  const added = files[rel];
  if (!added) return { date: created, source: "unrecorded" };
  if (added === FIRST_COMMIT_DATE && created !== undefined && created < added) {
    return { date: created, source: "created" };
  }
  return { date: added, source: "git" };
}

/** `firstPublished(...).date`, for the callers that want only the date. */
export function firstPublishedDate(rel: string, created: string | undefined): string | undefined {
  return firstPublished(rel, created).date;
}

/** The record's path for a content file, from its subdirectory and slug. */
export function contentPath(subdir: string, slug: string): string {
  return `content/${subdir}/${slug}.md`;
}

/** The paths the record holds, for the tests' population checks. */
export function recordedPaths(): string[] {
  return Object.keys(files);
}
