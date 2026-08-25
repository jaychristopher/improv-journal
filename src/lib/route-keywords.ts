/**
 * What the hub pages target, for pages that live on a route rather than in
 * content and therefore have no frontmatter to declare it in.
 *
 * This exists because the biggest improv term on the site was invisible to its
 * own tooling. /improv-games targets "improv games" at 3,100 a month — larger
 * than any keyword any guide holds — and because it is a route it declared
 * nothing, so keyword-collisions could not see it, the unclaimed-keyword sweep
 * reported it as unclaimed, and nothing would have objected to a new guide
 * being built on top of it. That last one nearly happened: "improv games for
 * beginners" and "improv exercises" both read as free until you notice which
 * page already answers them.
 *
 * Only keywords whose volume is recorded in content/outlines are listed, on
 * the same rule the frontmatter follows — a number that is not sourced does
 * not go in. Difficulty and SERP verdicts are deliberately absent: these pages
 * have never been through a SERP check, and inventing one would be worse than
 * having none.
 *
 * Adding a guide that targets anything here is the thing to avoid. If a hub
 * genuinely should hand a term over, move it — do not let both hold it.
 */
export interface RouteKeyword {
  keyword: string;
  volume: number;
}

export const ROUTE_KEYWORDS: Record<string, RouteKeyword[]> = {
  "/improv-games": [
    { keyword: "improv games", volume: 3100 },
    { keyword: "fun improv games", volume: 150 },
    { keyword: "improv games for beginners", volume: 150 },
    { keyword: "best improv games", volume: 90 },
    { keyword: "easy improv games", volume: 80 },
  ],
  "/practice/exercises": [{ keyword: "improv exercises", volume: 300 }],
  "/traditions/ucb": [{ keyword: "ucb improv", volume: 200 }],
  "/library": [
    { keyword: "best improv books", volume: 50 },
    { keyword: "improv books", volume: 40 },
  ],
};

/**
 * Hubs that Search Console shows drawing impressions and that are not listed
 * above, because no volume for their terms is recorded anywhere in the repo.
 *
 * /practice/formats is the live one. It surfaces for "improv formats",
 * "improv forms", "long form improv" and "what is long form improv", which is
 * more distinct terms than any page here except the library, and
 * content/outlines/all-paths.md marks "improv formats" as inferred rather than
 * measured. The rule this file follows is that an unsourced number does not go
 * in, so it stays out and stays invisible to keyword-collisions until then.
 *
 * /tools/exercise-picker/beginner is the one to look at carefully when the
 * numbers arrive. It surfaces for "beginner improv games" while /improv-games
 * above claims "improv games for beginners" — the same intent, two pages, and
 * neither aware of the other. Decide which holds it rather than registering
 * both.
 *
 * /listen is the third. It holds three improv podcasts and nothing on this
 * site targets "improv podcast", so the term is uncontested — its title now
 * claims it, which needs no volume data, but registering the keyword does.
 *
 * Ahrefs resets 2026-09-22. Retrieve volumes then and move these in.
 */

/** Every keyword claimed by a hub, lowercased, mapped to the route holding it. */
export function routeKeywordOwners(): Map<string, string> {
  const owners = new Map<string, string>();
  for (const [route, keywords] of Object.entries(ROUTE_KEYWORDS)) {
    for (const { keyword } of keywords) owners.set(keyword.trim().toLowerCase(), route);
  }
  return owners;
}
