import Link from "next/link";

import {
  AUDIENCE_LADDER,
  audienceRank,
  describeDirection,
  getNextPathAbove,
  getPathAudience,
  getPathTitle,
} from "@/lib/path-progression";
import { getRecommendedPath } from "@/lib/path-recommendations";
import type { Audience } from "@/lib/schema";

type Level = Audience;

interface LevelRedirectProps {
  /** The audience level of the current page's content */
  level: Level;
  /** Where this component appears — adjusts the messaging */
  /**
   * The bridge context was removed on 2026-09-22: the guide page mounted it
   * only when no primary CTA resolved, which never happens since the path
   * card became the fallback, so its "Not an improviser?" hatch rendered on
   * no guide (tracker entry 293). The audience note on the path card and the
   * topic hubs carry that hand-off now.
   */
  /** Kept on the call sites for readability; only the path context exists now. */
  context?: "path";
}

export interface LevelHint {
  label: string;
  href: string;
  /**
   * Which way the target moves through the graph — inward to the core,
   * outward to the formats, or back to the core in depth — rendered after
   * the link. The arrows said "up" for the performer track and for the
   * reference guide alike, and those are opposite directions (tracker entry
   * 281, 2026-09-22). Absent for a target that claims none.
   */
  direction?: string;
}

/**
 * The question each arrow asks, in the voice the hub already used. Only the
 * copy lives here; where the arrow points is derived below, so this cannot
 * name a path the progression does not.
 */
const UP_PROMPT: Partial<Record<Level, string>> = {
  beginner: "Already comfortable with improv?",
  intermediate: "Ready for mastery?",
  teacher: "Want the full map?",
  advanced: "Ready for mastery?",
};

const DOWN_PROMPT: Partial<Record<Level, string>> = {
  intermediate: "New to improv?",
  teacher: "Looking to improve your own improv?",
  advanced: "Want the classroom version?",
  performer: "Need to solidify the basics?",
};

/** "Foundations: Your First Steps in Improv" → "Foundations"; "The X" → "the X". */
function shortName(pathId: string): string {
  return getPathTitle(pathId).split(":")[0].replace(/^The /, "the ");
}

function hint(prompt: string, pathId: string): LevelHint {
  const verb = getPathAudience(pathId) === "beginner" ? "Start with" : "Try";
  const direction = describeDirection(pathId);
  return {
    label: `${prompt} ${verb} ${shortName(pathId)}`,
    href: `/paths/${pathId}`,
    ...(direction ? { direction } : {}),
  };
}

/**
 * Where a hub's up and down arrows point, read from the one ladder rather
 * than from a table of their own.
 *
 * This component used to hold six literal targets, three of which were the
 * Self-Coaching Toolkit — "up" for beginners and teachers, "down" for
 * performers and advanced readers — written in May and never reconciled
 * with the path chain or the audience recommender (tracker entry 247,
 * 2026-09-21). Now:
 *
 * - "up" is the first path above this level on the chain that starts at the
 *   audience's recommended path — the point where that sequence climbs — or,
 *   when the chain ends without climbing, the recommended path of the next
 *   audience up the ladder. The top rung has no up.
 * - "down" is the recommended path of the audience one rung below. The
 *   bottom rung has no down.
 */
export function getLevelHints(level: Level): { up?: LevelHint; down?: LevelHint } {
  const rank = audienceRank(level);
  if (rank < 0) return {};
  const hints: { up?: LevelHint; down?: LevelHint } = {};

  const below = AUDIENCE_LADDER[rank - 1];
  if (below && DOWN_PROMPT[level]) {
    hints.down = hint(DOWN_PROMPT[level]!, getRecommendedPath(below).id);
  }

  const above = AUDIENCE_LADDER[rank + 1];
  if (above && UP_PROMPT[level]) {
    const climb = getNextPathAbove(getRecommendedPath(level).id, level);
    hints.up = hint(UP_PROMPT[level]!, climb?.id ?? getRecommendedPath(above).id);
  }

  return hints;
}

export function LevelRedirect({ level }: LevelRedirectProps) {
  const redirect = getLevelHints(level);
  const hints = [redirect.down, redirect.up].filter((h): h is LevelHint => Boolean(h));
  if (hints.length === 0) return null;

  // The data attribute is how level-redirect.test.ts finds this block in the
  // built hubs. The path context rendered nowhere from 2026-08-22, when the
  // path page's syllabus rewrite dropped its mount, until 2026-09-21, when the
  // /learn hubs took it up (tracker entry 250); the arrows had been re-derived
  // and tested that same day against a component no page mounted.
  return (
    <div
      data-level-redirect={level}
      data-track="level-redirect"
      data-derived="true"
      className="text-foreground/30 border-foreground/5 mt-6 space-y-1 border-t pt-4 text-xs"
    >
      {hints.map((hint) => (
        <p key={hint.href}>
          <Link href={hint.href} className="hover:text-foreground/50 underline decoration-dotted">
            {hint.label}
          </Link>
          {hint.direction && <span>{` — it ${hint.direction}.`}</span>}
        </p>
      ))}
    </div>
  );
}
