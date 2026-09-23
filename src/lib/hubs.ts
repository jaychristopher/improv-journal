/**
 * One name per hub, held in one place.
 *
 * Four of the site's nine hubs had two names across surfaces (tracker entry
 * 264, 2026-09-22). `/threads` was "Lessons" in the nav, on the homepage, in
 * every path header ("6 lessons"), on the audience hubs and in the guides'
 * "Taught in depth" line, and "Essays" in its own H1, title, breadcrumb and
 * the footer — so a reader who followed "Lessons" landed on "Improv Essays".
 * `/library` was "Library" in the breadcrumb and "Reading List" everywhere
 * else; `/practice/vocabulary` was "Vocabulary" in the nav and the breadcrumb
 * and "Glossary" in the footer and the H1. Each surface had been written by
 * hand at a different time, and nothing compared them.
 *
 * Nav, Footer, the hub pages this table names and the breadcrumbs of their
 * children read these fields rather than restating them, and
 * `hub-names.test.ts` reads the built HTML back and checks that every surface
 * says what the table says. The hub pages the test compares without their
 * reading the table are the ones whose names already agreed; the test holds
 * them to the table all the same.
 *
 * - `label`: the name in the nav and the footer. A menu's "Overview" child,
 *   repeating a section's root, is a menu convention and not a name.
 * - `crumb`: the name in a breadcrumb trail — as the hub's own final crumb
 *   and as the parent crumb on its children.
 * - `h1`: the hub page's heading, without any derived count the page appends.
 * - `formerNames`: the names the hub answered to on some surface before the
 *   table unified them, held so a reader who learned the old name can still
 *   find the hub. The rename that made the nav, footer, breadcrumb and H1
 *   agree removed the old names from the one surface where a rename is a
 *   deletion: site search indexed the hubs by their current title and
 *   description, so "library" returned three results and not the Reading
 *   List, "essays" one book and not the Lessons hub (tracker entry 312,
 *   2026-09-22). route-pages.mjs reads this column into each route page's
 *   `aliases`, the boosted field the search index already holds for the
 *   concepts' other names. A hub that was never renamed has no entry.
 *
 * Kept free of imports so the client-side nav can read it.
 */
export interface Hub {
  href: string;
  label: string;
  crumb: string;
  h1: string;
  formerNames?: readonly string[];
}

export const HUBS = {
  howItWorks: {
    href: "/how-it-works",
    label: "How It Works",
    crumb: "How It Works",
    h1: "How Improv Works: The Laws Underneath a Scene",
  },
  principles: {
    href: "/how-it-works/principles",
    label: "Principles",
    crumb: "Principles",
    // The page counts the principles into its heading; the count is derived
    // there and stripped by the test, so the table never carries it.
    h1: "Improv Principles",
  },
  diagnosis: {
    href: "/how-it-works/diagnosis",
    label: "Diagnosis",
    crumb: "Diagnosis",
    h1: "When It Breaks",
  },
  practice: {
    href: "/practice",
    label: "Practice",
    crumb: "Practice",
    h1: "Improv Practice",
  },
  exercises: {
    href: "/practice/exercises",
    label: "Exercises",
    crumb: "Exercises",
    h1: "Improv Exercises",
  },
  techniques: {
    href: "/practice/techniques",
    label: "Techniques",
    crumb: "Techniques",
    h1: "Improv Techniques",
  },
  formats: {
    href: "/practice/formats",
    label: "Formats",
    crumb: "Formats",
    h1: "Improv Formats",
  },
  /**
   * "Glossary" throughout: the footer, the H1, the title and the homepage
   * already said it, and the route's own module is `glossary.ts`. The nav and
   * the crumb said "Vocabulary".
   */
  glossary: {
    href: "/practice/vocabulary",
    label: "Glossary",
    crumb: "Glossary",
    h1: "Improv Glossary",
    formerNames: ["Vocabulary"],
  },
  guides: {
    href: "/guides",
    label: "Guides",
    crumb: "Guides",
    h1: "Improv Guides",
  },
  paths: {
    href: "/paths",
    label: "Learning Paths",
    crumb: "Learning Paths",
    h1: "Improv Learning Paths",
  },
  /**
   * "Lessons" throughout. Eight surfaces already called a thread a lesson —
   * the nav, the homepage, the path headers, the audience hubs, the guides'
   * "Taught in depth" line, the journey events, `LessonJsonLd` and the
   * lessons index — against five that said "essay", all of them derived from
   * this hub's own metadata.
   */
  threads: {
    href: "/threads",
    label: "Lessons",
    crumb: "Lessons",
    h1: "Improv Lessons",
    formerNames: ["Essays"],
  },
  /**
   * "Reading List" throughout: the nav, the footer, the H1 and the title said
   * it; only the breadcrumb said "Library", after the route.
   */
  library: {
    href: "/library",
    label: "Reading List",
    crumb: "Reading List",
    h1: "Improv Reading List",
    formerNames: ["Library"],
  },
  listen: {
    href: "/listen",
    label: "Listen",
    crumb: "Listen",
    h1: "Improv Podcasts",
  },
  traditions: {
    href: "/traditions",
    label: "Traditions",
    crumb: "Traditions",
    h1: "Improv Traditions",
  },
  /**
   * The level ladder's first rung stands for the five audience hubs. Each
   * names itself in its trail by its own title, and since the paths moved
   * under Learning Paths no trail names an audience hub as a parent; the
   * path header links it under this label instead.
   */
  learn: {
    href: "/learn/beginner",
    label: "Start by Level",
    crumb: "Start by Level",
    h1: "Improv for Beginners: Where to Start",
  },
  tools: {
    href: "/tools/exercise-picker",
    label: "Exercise Picker",
    crumb: "Exercise Picker",
    h1: "Improv Exercise Picker: Find the Right Warm-Up Game",
  },
} as const satisfies Record<string, Hub>;

export type HubKey = keyof typeof HUBS;

export const ALL_HUBS: readonly Hub[] = Object.values(HUBS);

/** A nav or footer item for the hub. */
export function hubLink(hub: Hub): { href: string; label: string } {
  return { href: hub.href, label: hub.label };
}

/** A linked breadcrumb naming the hub, as a child page's trail carries it. */
export function hubCrumb(hub: Hub): { label: string; href: string } {
  return { label: hub.crumb, href: hub.href };
}

/** The hub page's own final crumb, unlinked. */
export function hubSelfCrumb(hub: Hub): { label: string } {
  return { label: hub.crumb };
}
