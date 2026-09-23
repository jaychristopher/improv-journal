/**
 * What an audience hub links beyond its own paths.
 *
 * `/learn/<audience>` is the only surface keyed by audience, and until
 * 2026-09-21 each one linked exactly the paths whose `audience` matched and
 * nothing else (novel-insights 201): the beginner hub showed five path cards
 * to the audience 69 of the site's guides are written for, and linked none of
 * them, no lesson, and not the beginner level of the exercise picker — the
 * other route that carries the same word in its URL.
 *
 * Nothing here is authored. A guide belongs to an audience through its
 * `entry_path`, the path it hands its reader to, and that path's declared
 * `audience`; a lesson belongs through the paths that sequence it. The hub
 * then reads what the graph already says and stops being a filtered `/paths`
 * page under another name.
 */

import {
  getAtomUrl,
  getPathProgressionRank,
  loadAtoms,
  loadBridges,
  loadPaths,
  loadThreads,
} from "./content";
import { byReach } from "./guide-categories";
import type { Audience } from "./schema";

export const AUDIENCES: readonly Audience[] = [
  "beginner",
  "intermediate",
  "advanced",
  "teacher",
  "performer",
];

/**
 * Twelve, because the beginner hub would otherwise list 69 guide cards under
 * five path cards and the paths are the point of the page. The remainder is
 * reported so the hub can say how many more there are and send the reader to
 * /guides for them, rather than silently truncating.
 */
export const AUDIENCE_GUIDE_LIMIT = 12;

/** Eight: the longest path sequences four lessons, so two paths' worth. */
export const AUDIENCE_LESSON_LIMIT = 8;

export interface AudienceGuide {
  slug: string;
  title: string;
  description: string;
  /** The path the guide routes its reader to — how it came to be here. */
  entryPath: string;
}

export interface AudienceGuides {
  guides: AudienceGuide[];
  /** How many guides for this audience the cap left out. */
  remainder: number;
  /** Every guide for this audience, before the cap. */
  total: number;
}

export interface AudienceLesson {
  id: string;
  title: string;
  description?: string;
  url: string;
  /** The first path, in progression order, that sequences the lesson. */
  pathId: string;
  pathTitle: string;
}

export interface AudienceAtom {
  id: string;
  title: string;
  url: string;
}

/** The audience's paths, earliest in the progression first, then by id for stability. */
async function pathsForAudience(audience: Audience) {
  const paths = await loadPaths();
  return paths
    .filter((path) => path.frontmatter.audience?.includes(audience))
    .sort(
      (a, b) =>
        getPathProgressionRank(a.frontmatter.id) - getPathProgressionRank(b.frontmatter.id) ||
        a.frontmatter.id.localeCompare(b.frontmatter.id),
    );
}

/**
 * The guides whose entry path belongs to the audience, ordered by what they
 * can bring in — the same `byReach` rule the topic hubs use, so the first
 * card on this page is the same kind of page that leads a topic hub — and
 * capped at `AUDIENCE_GUIDE_LIMIT` with the remainder counted.
 */
export async function getAudienceGuides(audience: Audience): Promise<AudienceGuides> {
  const [bridges, paths] = await Promise.all([loadBridges(), loadPaths()]);
  const audienceOf = new Map(paths.map((p) => [p.frontmatter.id, p.frontmatter.audience ?? []]));

  const matching = bridges.filter((bridge) =>
    audienceOf.get(bridge.frontmatter.entry_path)?.includes(audience),
  );
  const ordered = byReach(matching);
  const guides = ordered.slice(0, AUDIENCE_GUIDE_LIMIT).map((bridge) => ({
    slug: bridge.slug,
    title: bridge.frontmatter.title,
    description: bridge.frontmatter.description,
    entryPath: bridge.frontmatter.entry_path,
  }));

  return { guides, remainder: ordered.length - guides.length, total: ordered.length };
}

/**
 * The lessons the audience's paths sequence, in the order a reader following
 * the site's own arrows would meet them: paths by progression rank, then each
 * path's declared thread order. A lesson on two of the audience's paths
 * (presence-and-commitment is on three beginner paths) appears once, under
 * the first. Capped at `AUDIENCE_LESSON_LIMIT`.
 */
export async function getAudienceLessons(audience: Audience): Promise<AudienceLesson[]> {
  const [paths, threads] = await Promise.all([pathsForAudience(audience), loadThreads()]);
  const byId = new Map(threads.map((t) => [t.frontmatter.id, t]));

  const seen = new Set<string>();
  const lessons: AudienceLesson[] = [];
  for (const path of paths) {
    for (const id of path.frontmatter.threads ?? []) {
      if (seen.has(id)) continue;
      const thread = byId.get(id);
      if (!thread) continue;
      seen.add(id);
      lessons.push({
        id,
        title: thread.frontmatter.title,
        description: thread.frontmatter.description,
        url: `/threads/${id}`,
        pathId: path.frontmatter.id,
        pathTitle: path.frontmatter.title,
      });
    }
  }
  return lessons.slice(0, AUDIENCE_LESSON_LIMIT);
}

/**
 * Which exercise-picker level shares the audience's vocabulary.
 *
 * The picker has three levels (picker-config `LEVELS`); the hubs have five
 * audiences. Beginner and intermediate are the same word on both. The
 * performer hub is "Pushing Toward Mastery" and the advanced hub is the
 * reference shelf; the advanced level's orientation — "an exercise is a
 * diagnostic rather than a lesson", "take them into a show context" — is
 * written for both. Teachers plan drills for other people's level, so the
 * hub offers the pedagogy atoms instead of a level.
 */
export function pickerLevelFor(
  audience: Audience,
): "beginner" | "intermediate" | "advanced" | null {
  switch (audience) {
    case "beginner":
      return "beginner";
    case "intermediate":
      return "intermediate";
    case "advanced":
    case "performer":
      return "advanced";
    case "teacher":
      return null;
  }
}

/** The audiences whose hub a picker level should point back at — the inverse of `pickerLevelFor`. */
export function audiencesForPickerLevel(level: string): Audience[] {
  return AUDIENCES.filter((audience) => pickerLevelFor(audience) === level);
}

/** The `pedagogy` atoms — what the teacher hub lists in place of a picker level. */
export async function getPedagogyAtoms(): Promise<AudienceAtom[]> {
  const atoms = await loadAtoms();
  return atoms
    .filter((atom) => atom.frontmatter.type === "pedagogy")
    .sort((a, b) => a.frontmatter.title.localeCompare(b.frontmatter.title))
    .map((atom) => ({
      id: atom.frontmatter.id,
      title: atom.frontmatter.title,
      url: getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type }),
    }));
}
