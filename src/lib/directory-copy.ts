/**
 * The improv directory's prose, held here for the reason games-hub-copy.ts
 * gives: the route files sit under a ceiling that may only fall
 * (hub-prose-links.test.ts), and that file lists this module so every value
 * is still checked to render as itself. Every value is markdown; the
 * autolinker runs over it at render time.
 */
export const DIRECTORY_COPY = {
  hubIntro:
    "Every improv theater, school and regular improv show we can verify in sixty US cities, each with a link to its own site, ranked for someone choosing where to take a class or see a show. The list is read from the live web by Claude, every website is checked before it is listed, and the whole archive is re-read a few cities a day, so a theater that closes falls off and a new one appears without anyone editing a page.",
  hubHow:
    "Pick your city. Each page lists what is there in rank order, says what each place offers (shows, classes, drop-in jams) and links out to it. If you are new to this, the [improv games](/improv-games) hub and the [beginner path](/paths/beginner-foundations) say what to expect from a first class, and the [improv prompts](/improv-prompts) guide is for when you are in one.",
  ranking:
    "Each entry carries a score out of a hundred: up to thirty-five points for longevity and a permanent home, twenty-five for a real class program with levels and regular terms, twenty for regular shows and house teams, ten for standing in the scene, and ten for a website that shows this month. The score is read fresh on every pass and the order follows it, so a place that stops running classes slides, and a new theater with a full calendar rises.",
  engine:
    "The engine is a script that asks Claude to search the web for a city, then checks that every website it names actually answers, merges the reading with what the archive already holds, and drops anything not seen on three passes. It runs daily on the next few cities of the cycle, so every city is re-read about once a week. Nothing is added by hand; a listing that is wrong is wrong on the web too, and the next pass corrects it.",
  thin: "A city with fewer than three verified places is listed but kept out of search engines until it fills, so a thin page never stands for a whole scene.",
  cityIntro:
    "What is listed here is what the engine could verify on its last pass: an organization with its own site, still running, in this city or its metro area. The ranking is the archive's rubric, read from the sites themselves. A place that stops running classes slides down; one that closes falls off within three passes.",
  cityEmpty:
    "The engine has not reached this city yet, or found nothing it could verify on its last pass. It returns to every city on the cycle, so check back; if you run improv here and your site is live, it will be read.",
  cityHow:
    "The score is out of a hundred: longevity and a permanent home, the class program, regular shows, standing in the scene, and a website that shows this month, in that order of weight. [How the ranking works](/improv-near-you#how-the-ranking-works) has the rubric in full, and the [improv games](/improv-games) hub says what a first class will ask of you.",
} as const;
