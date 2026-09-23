/**
 * The two doors on the homepage, and what is behind each.
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
 * That distinction was made three levels in. The homepage asked one question
 * of both readers, and since the symptom quiz replaced the old router the
 * question has been first-person and applied — "I freeze and overthink", "I
 * feel awkward and disconnected" — so an improviser looking for something to
 * run on Tuesday had no door at all. The April audit's persona rows D, E and
 * F still describe the router that used to give them one (docs/ux-audit-
 * matrix.md, rows 1D-1F, written against a quiz whose step 0 offered "I do
 * improv").
 *
 * So the hero asks which reader you are first, and each door asks its own
 * second question. Neither repeats the symptom quiz below it: that asks what
 * is breaking, these ask what you are here for.
 *
 * Nothing here is a new taxonomy. The applied door deals the guide clusters
 * minus the craft one, in the order /guides already puts them; the craft door
 * deals the audience hubs with the path each one is already recommended.
 */

import { getRecommendedPath } from "./path-recommendations";
import type { Audience } from "./schema";

export type DoorId = "communication" | "improv";

export interface DoorInfo {
  id: DoorId;
  label: string;
  /** What this reader wants, in their terms rather than the site's. */
  note: string;
  /** The door's own second question. */
  question: string;
  /** One line under the question, saying how to answer it. */
  preamble: string;
  /** The way back from an answer, in the door's own terms. */
  back: string;
}

export const HOME_DOORS: readonly DoorInfo[] = [
  {
    id: "communication",
    label: "Communication skills",
    note: "You want conversations to go better. No stage, ever.",
    question: "Where does it matter most?",
    preamble:
      "The same material, sorted by the part of your life it is for. Every guide starts from what is going wrong rather than from a principle.",
    back: "A different part of life",
  },
  {
    id: "improv",
    label: "Practice improv",
    note: "You play, or want to. You want the form itself to get better.",
    question: "Where are you with it?",
    preamble:
      "Take one sequence rather than browsing several — the fundamentals compound, and they compound in an order.",
    back: "I am somewhere else with it",
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
export interface CraftStage {
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

export type HomeDoorOptions = Record<DoorId, DoorOption[]>;

/** A cluster as the homepage already has it, plus how many guides are in it. */
export interface ClusterInput {
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
