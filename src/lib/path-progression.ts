import type { Audience } from "./schema";

/**
 * The audience ladder, lowest rung first: the order /paths draws, the lessons
 * index groups by, and the one every "next path" answer on the site has to
 * climb. Three modules used to answer "where next" — this chain, the audience
 * hubs' up/down arrows (LevelRedirect) and the audience recommender
 * (path-recommendations) — and each was its own table, so a reader could be
 * told three different next steps by walking one page further (tracker entry
 * 247, 2026-09-21). PROGRESSION is now the single source: the other two
 * derive their targets from it, and path-progression.test.ts asserts every
 * edge here is non-decreasing on this ladder.
 */
export const AUDIENCE_LADDER: readonly Audience[] = [
  "beginner",
  "intermediate",
  "teacher",
  "advanced",
  "performer",
];

export function audienceRank(audience: Audience): number {
  return AUDIENCE_LADDER.indexOf(audience);
}

/**
 * Static map defining the mastery sequence across paths.
 * Each path points to the next recommended path.
 *
 * Every edge runs level or up the audience ladder. Two used to run down:
 * teaching-improv (teacher) pointed at the intermediate toolkit, and the
 * performer's last path pointed at the advanced reference shelf. The
 * teacher's next is now the reference shelf, one rung up; The Art of
 * Ensemble is the top of the ladder and has no next.
 */
const PROGRESSION: Record<string, string> = {
  "beginner-foundations": "physics-of-connection",
  "physics-of-connection": "systems-of-improv",
  "systems-of-improv": "self-coaching-toolkit",
  "self-coaching-toolkit": "advanced-game-and-character",
  "improv-for-life": "systems-of-improv",
  "improv-for-teams": "self-coaching-toolkit",
  "teaching-improv": "reference-guide",
  "advanced-game-and-character": "mastering-the-form",
  "mastering-the-form": "the-art-of-ensemble",
};

const PATH_TITLES: Record<string, string> = {
  "beginner-foundations": "Foundations: Your First Steps in Improv",
  "physics-of-connection": "The Physics of Connection",
  "systems-of-improv": "Systems of Improv: A Thinking Person's Guide",
  "self-coaching-toolkit": "The Self-Coaching Toolkit",
  "improv-for-life": "Improv for Everyday Life",
  "improv-for-teams": "Improv for Teams and Leaders",
  "teaching-improv": "Teaching Improv: From Performer to Pedagogue",
  "advanced-game-and-character": "Advanced Game and Character",
  "mastering-the-form": "Mastering the Form",
  "the-art-of-ensemble": "The Art of Ensemble",
  "reference-guide": "The Improv Reference Guide",
};

/**
 * Each path's primary audience — the first entry of its frontmatter
 * `audience`, the same one the path page and its breadcrumb use. Held here
 * rather than read from content because this module is imported by
 * content.ts and by a build script; path-progression.test.ts checks every
 * entry against content/paths so it cannot drift.
 */
const PATH_AUDIENCES: Record<string, Audience> = {
  "beginner-foundations": "beginner",
  "physics-of-connection": "beginner",
  "systems-of-improv": "beginner",
  "self-coaching-toolkit": "intermediate",
  "improv-for-life": "beginner",
  "improv-for-teams": "beginner",
  "teaching-improv": "teacher",
  "advanced-game-and-character": "performer",
  "mastering-the-form": "performer",
  "the-art-of-ensemble": "performer",
  "reference-guide": "advanced",
};

/**
 * Which way each audience's paths move through the graph, for the next-path
 * card and the audience hubs' arrows.
 *
 * The ladder walks outward from the centre. Foundations teaches the atoms
 * the rest of the site requires most; the beginner and intermediate paths
 * teach the core around them; the performer paths leave it for the formats,
 * drills and show craft at the graph's edge. The one path called "advanced",
 * the reference guide, turns back to the core at a higher register. So
 * "performer" and "advanced" name opposite directions, and the cards said
 * "the next level up" for both (tracker entry 281, 2026-09-22).
 * path-gradient.test.ts measures the gradient from the paths' lessons and
 * checks these phrases stay on the side of it they describe. The teacher's
 * path sits mid-graph and claims no direction.
 */
const DIRECTIONS: Partial<Record<Audience, string>> = {
  beginner: "works inward on the ideas everything else depends on",
  intermediate: "works inward on the ideas everything else depends on",
  advanced: "returns to the core ideas in depth, not a continuation of the performer track",
  performer: "works outward into formats and show craft, the specific end of the graph",
};

/**
 * The direction a path moves through the graph, as a predicate ("works
 * outward into ..."), or undefined for a path with no claim to make.
 */
export function describeDirection(pathId: string): string | undefined {
  const audience = PATH_AUDIENCES[pathId];
  return audience ? DIRECTIONS[audience] : undefined;
}

export interface NextPath {
  id: string;
  title: string;
  /**
   * Why this is next, from the audience delta and the direction: the ladder
   * the site is walking the reader along, and which way through the graph
   * that step goes, said on the card rather than implied.
   */
  reason: string;
}

export function getNextPath(currentPathId: string): NextPath | null {
  const nextId = PROGRESSION[currentPathId];
  if (!nextId) return null;
  return {
    id: nextId,
    title: PATH_TITLES[nextId] ?? nextId,
    reason: describeStep(currentPathId, nextId),
  };
}

export function getPathTitle(pathId: string): string {
  return PATH_TITLES[pathId] ?? pathId;
}

export function getPathAudience(pathId: string): Audience | undefined {
  return PATH_AUDIENCES[pathId];
}

/** Every path with a next, plus every path that is some path's next. */
export function isOnProgression(pathId: string): boolean {
  return pathId in PROGRESSION || Object.values(PROGRESSION).includes(pathId);
}

/** The progression as edges, for tests and scripts that need to walk it. */
export function progressionEdges(): { from: string; to: string }[] {
  return Object.entries(PROGRESSION).map(([from, to]) => ({ from, to }));
}

/**
 * The reason a next-path card gives: "the next level up" when the target's
 * audience is higher on the ladder, otherwise the same level, next in
 * sequence — then which way the target moves through the graph, so a reader
 * sent "up" to the reference guide is told it is a return to the core and
 * not the performer track's continuation.
 */
export function describeStep(fromId: string, toId: string): string {
  const from = PATH_AUDIENCES[fromId];
  const to = PATH_AUDIENCES[toId];
  const rises = from !== undefined && to !== undefined && audienceRank(to) > audienceRank(from);
  const level = rises ? "The next level up." : "The same level, next in sequence.";
  const direction = describeDirection(toId);
  return direction ? `${level} It ${direction}.` : level;
}

/**
 * The first path reached by following the chain from `pathId` whose
 * audience is above `level`, or null when the chain ends first. This is what
 * "up" means for an audience hub: not the next path in sequence, which is
 * usually another path at the same level, but the point where the sequence
 * climbs.
 */
export function getNextPathAbove(pathId: string, level: Audience): NextPath | null {
  const seen = new Set<string>([pathId]);
  for (let next = getNextPath(pathId); next && !seen.has(next.id); next = getNextPath(next.id)) {
    seen.add(next.id);
    const audience = PATH_AUDIENCES[next.id];
    if (audience && audienceRank(audience) > audienceRank(level)) return next;
  }
  return null;
}
