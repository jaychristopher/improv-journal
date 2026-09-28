/**
 * The improv exercises hub's by-need paragraphs: the routes out of the index.
 *
 * The hub registers the site's second-largest term and, until 2026-09-28,
 * linked no guide at all. A reader who arrived wanting warm-ups, a first
 * class, a work team or a pair was handed the filterable index and nothing
 * else, while the games hub had said which page answers each room since
 * September. The results page for "improv exercises" (ROUTE_SERP) is lists
 * for a class or a team, and every one of those rooms has a guide here, so
 * naming them is the page's second job. hub-spokes.test.ts holds the links.
 *
 * Held here rather than in the route for the reason games-hub-copy.ts gives:
 * hub-prose-links.test.ts counts prose in route files under a ceiling that
 * may only fall, and lists this module under PROSE_MODULES so every value is
 * still checked to render as itself. Every value is markdown; the autolinker
 * runs over it at render time, and the hand-written links are the ones it
 * would not make.
 */
export const EXERCISES_HUB_COPY = {
  whichNeed:
    "The index above is sorted by what each exercise trains and cut by the level and skill filters, which is the right order once you know what you are fixing. If what you know is who is in the room or how long you have, these are the shorter routes.",
  warmingUp:
    "**Warming a room up.** The first ten minutes want no ideas in them, and the order matters more than the game: [improv warm up games](/improv-warm-up-games) is the sequence from arrival to playing, with the exercises that do each stage's job.",
  firstClass:
    "**A first class.** [Improv games for beginners](/tools/exercise-picker/beginner) is the beginner level of the picker — the exercises nobody can be visibly bad at, filtered by what you want the room to build — and [improv prompts](/improv-prompts) has the scene starters for when an exercise needs a suggestion.",
  children:
    "**Children and school groups.** Most of the index assumes people who volunteered. [Improv games for kids](/improv-games-for-kids) says which games work at which age and what changes with thirty in the room.",
  workTeam:
    "**A work team.** [Improv team building](/improv-team-building) says what a session genuinely changes about a team and what it does not, and [5-minute team building](/5-minute-team-building) is the twenty exercises that fit inside a meeting, grouped by what is wrong with the room.",
  pair: "**Only two of you.** Most exercises here quietly assume a circle of eight. [2 person improv games](/2-person-improv-games) is what a pair can train alone, what they cannot, and how to run the session.",
  oneSkill:
    "**One skill in particular.** Each of these takes one thing the index trains and runs it as a session: [trust building exercises](/trust-building-exercises), [confidence building exercises](/confidence-building-exercises), [active listening exercises](/active-listening-exercises).",
  gettingBetter:
    "**Between classes.** Doing more shows is not practice. [How to get better at improv](/how-to-get-better-at-improv) is how to diagnose what is breaking and choose the exercise that fixes it.",
} as const;
