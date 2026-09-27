/**
 * The two audience routes on the homepage, and what is behind each.
 *
 * The site is written for two readers who want opposite things from the same
 * material, and it says so in its own words. /learn/beginner opens: "Nothing
 * here assumes you want to perform... If you came looking for a way to be
 * less stuck in conversations, you are in the right place and you will never
 * need a stage", and closes by splitting the routes — "If your interest
 * genuinely is performance, the improv-first paths are the ones to take; if
 * it is the rest of life, the applied ones will get you there faster without
 * pretending the two are the same thing."
 *
 * From 2026-09-22 to 2026-09-27 the hero made that the first question: two
 * buttons, "What are you here for?", each opening a modal that asked a
 * second one before offering a link. That is audience-based navigation as
 * the primary route, which NN/g's research says to avoid — readers do not
 * reliably know which group they are, resent choosing before they have seen
 * anything, and wonder what the other door had — and a modal used for
 * navigation, which the same body of work rules out. Measured on
 * 2026-09-27, every answer the modal could give was already on the page:
 * the applied door's answers are the guide clusters, the craft door's are
 * the four levels (docs/homepage-principles.md).
 *
 * So the doors are two lines under the tagline, links, in the secondary
 * place NN/g allows an audience route, and the page answers the second
 * question itself: the clusters grid for one reader, the level list for
 * the other. `buildHomeDoors` still deals both sets from the same sources
 * as before — the applied set is what the guard checks against the
 * clusters, the craft set is what the level list renders.
 *
 * Nothing here is a new taxonomy. The applied set is the guide clusters
 * minus the craft one, in the order /guides already puts them; the craft
 * set is the audience hubs with the path each one is already recommended.
 */

import { getRecommendedPath } from "./path-recommendations";
import type { Audience } from "./schema";

type DoorId = "communication" | "improv";

interface DoorInfo {
  id: DoorId;
  /** Who the route is for, with the word "for" doing the work NN/g asks of it. */
  label: string;
  /** What this reader wants, in their terms rather than the site's. */
  note: string;
  /** Where the line sends them: the one page that holds every answer for that reader. */
  href: string;
}

export const HOME_DOORS: readonly DoorInfo[] = [
  {
    id: "communication",
    label: "For better conversations",
    note: "No stage, ever. The guides are grouped by the part of life they are for.",
    href: "/guides",
  },
  {
    id: "improv",
    label: "For improvisers",
    note: "You play, or want to. Start by level, from a first class to teaching it.",
    href: "/learn/beginner",
  },
];

/** The guide cluster written for improvisers; the rest are the applied door's. */
export const CRAFT_CLUSTER = "improv-skills";

/**
 * The audiences the craft door offers, in the order a player moves through
 * them, labelled the way a player would answer rather than the way the site
 * files them.
 *
 * `advanced` is left out on purpose: it is the reference map rather than a
 * stage of practice, and it is offered as a footnote instead of as an answer
 * to "where are you with it?".
 */
interface CraftStage {
  audience: Audience;
  label: string;
  note: string;
  /** The title of that audience's hub, held against the route file by the test. */
  hubTitle: string;
}

export const CRAFT_STAGES: readonly CraftStage[] = [
  {
    audience: "beginner",
    label: "Just starting",
    note: "No stage experience, or a class or two in.",
    hubTitle: "Improv for Beginners: Where to Start",
  },
  {
    audience: "intermediate",
    label: "Stuck on a plateau",
    note: "You know the basics and something is not clicking.",
    hubTitle: "Breaking Through a Plateau",
  },
  {
    audience: "performer",
    label: "Performing regularly",
    note: "The scene works; the show is the problem now.",
    hubTitle: "Pushing Toward Mastery",
  },
  {
    audience: "teacher",
    label: "I teach it",
    note: "Curriculum, feedback, and a safe room.",
    hubTitle: "Learning to Teach",
  },
];

/** A link on an answer panel: what it is, and what it is called. */
export interface DoorLink {
  kicker: string;
  label: string;
  href: string;
}

/** One answer to a door's question, with the two places it sends you. */
export interface DoorOption {
  id: string;
  label: string;
  note: string;
  /** Why this is the answer — the site's own rationale, not written here. */
  rationale: string;
  primary: DoorLink;
  secondary: DoorLink;
}

type HomeDoorOptions = Record<DoorId, DoorOption[]>;

/** A cluster as the homepage already has it, plus how many guides are in it. */
interface ClusterInput {
  slug: string;
  title: string;
  description: string;
  orientation: string[];
  count: number;
}

/**
 * The path each applied cluster hands over after its hub.
 *
 * Two entries rather than three because there are two applied paths: the
 * teams one for the cluster written for teams, the everyday one for the rest.
 * A cluster with no entry falls back to the everyday path.
 */
const APPLIED_PATHS: Record<string, { id: string; title: string }> = {
  teams: { id: "improv-for-teams", title: "Improv for Teams and Leaders" },
};
const EVERYDAY_PATH = { id: "improv-for-life", title: "Improv for Everyday Life" };

/** Everything the hero can deal, computed on the server. */
export function buildHomeDoors(clusters: readonly ClusterInput[]): HomeDoorOptions {
  const communication = clusters
    .filter((cluster) => cluster.slug !== CRAFT_CLUSTER)
    .map((cluster) => {
      const program = APPLIED_PATHS[cluster.slug] ?? EVERYDAY_PATH;
      return {
        id: cluster.slug,
        label: cluster.title,
        note: cluster.description,
        // The cluster hub's own opening line, so the answer says what the
        // page it is about to send you to says.
        rationale: firstSentence(cluster.orientation[0] ?? cluster.description),
        primary: {
          kicker: `${cluster.count} guides`,
          label: cluster.title,
          href: `/topics/${cluster.slug}`,
        },
        secondary: {
          kicker: "Or take it in order",
          label: program.title,
          href: `/paths/${program.id}`,
        },
      };
    });

  const improv = CRAFT_STAGES.map((stage) => {
    const recommended = getRecommendedPath(stage.audience);
    return {
      id: stage.audience,
      label: stage.label,
      note: stage.note,
      rationale: recommended.rationale,
      primary: {
        kicker: recommended.label,
        label: recommended.title,
        href: `/paths/${recommended.id}`,
      },
      secondary: {
        kicker: "Everything at this level",
        label: stage.hubTitle,
        href: `/learn/${stage.audience}`,
      },
    };
  });

  return { communication, improv };
}

/** The opening claim of an orientation paragraph, which is written to lead. */
function firstSentence(text: string): string {
  const end = text.search(/\.\s/);
  return end === -1 ? text : text.slice(0, end + 1);
}
