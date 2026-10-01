/**
 * The improv directory's prose, held here for the reason games-hub-copy.ts
 * gives: the route files sit under a ceiling that may only fall
 * (hub-prose-links.test.ts), and that file lists this module so every value
 * is still checked to render as itself. Every value is markdown; the
 * autolinker runs over it at render time.
 *
 * A listing and nothing more (the owner, 2026-10-01): the pages do not say
 * how the list is made or why it is in the order it is in.
 */
export const DIRECTORY_COPY = {
  hubIntro:
    "Improv theaters, schools and regular improv shows in sixty US cities, each with a link to its own site. Pick your city. If you are new to this, the [improv games](/improv-games) hub and the [beginner path](/paths/beginner-foundations) say what to expect from a first class, and the [improv prompts](/improv-prompts) guide is for when you are in one.",
  cityEmpty:
    "Nothing is listed for this city yet. Check back; if you run improv here and your site is live, it will be found.",
} as const;
