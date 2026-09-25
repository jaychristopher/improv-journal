import type { BridgeTargetKeyword, SerpReading } from "./schema";

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
 * Only keywords whose volume is sourced — content/outlines, or Ahrefs on a
 * recorded date — are listed, on the same rule the frontmatter follows: a
 * number that is not sourced does not go in. Difficulty, potential and parent
 * are recorded where Ahrefs returned them, and a results-page reading lives in
 * ROUTE_SERP below only where somebody read the page (the five tradition
 * routes, 2026-09-25, SA-11.1). Elsewhere absent means nobody has looked,
 * and inventing a verdict would be worse than having none.
 *
 * Adding a guide that targets anything here is the thing to avoid. If a hub
 * genuinely should hand a term over, move it — do not let both hold it.
 */
/** The same shape a guide's keyword has, so the three layers read alike. */
export type RouteKeyword = BridgeTargetKeyword;

export const ROUTE_KEYWORDS: Record<string, RouteKeyword[]> = {
  "/improv-games": [
    { keyword: "improv games", volume: 3100 },
    { keyword: "fun improv games", volume: 150 },
    { keyword: "improv games for beginners", volume: 150 },
    { keyword: "best improv games", volume: 90 },
    { keyword: "easy improv games", volume: 80 },
  ],
  "/practice/exercises": [{ keyword: "improv exercises", volume: 300 }],
  "/traditions/johnstone": [
    { keyword: "keith johnstone", volume: 100, difficulty: 30, traffic_potential: 30 },
  ],
  "/traditions/ucb": [
    {
      keyword: "ucb improv",
      volume: 200,
      difficulty: 10,
      traffic_potential: 5200,
      parent: "upright citizens brigade",
    },
    { keyword: "upright citizens brigade", volume: 2400, difficulty: 31, traffic_potential: 4400 },
  ],
  "/traditions/annoyance": [
    { keyword: "annoyance theatre", volume: 150, difficulty: 0, traffic_potential: 700 },
    {
      keyword: "annoyance theater",
      volume: 600,
      difficulty: 3,
      traffic_potential: 600,
      parent: "annoyance theater",
    },
  ],
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
 * /paths/teaching-improv is a fourth and a different shape. Search Console
 * has it at position 46 for "teaching improv", no bridge targets any teaching
 * keyword, and the term is uncontested — but the page holding it is a 327-word
 * curated path, and paths are a templated layer whose eleven members run 251
 * to 511 words with no headings of their own. Deepening one into a guide would
 * break that layer's shape; the right home is a bridge that does not exist
 * yet. That is a content decision needing volume data, not a fix.
 *
 * Ahrefs resets 2026-09-22. Retrieve volumes then and move these in.
 */

/**
 * The results pages read for route pages, on the fields the guides and atoms
 * carry (`SerpReading` in schema.ts), plus the query each was read for and,
 * where a guide owns the page's term, which guide.
 *
 * The five school pages, read 2026-09-25 (SA-11.1). Every one is a
 * navigational or biographical results page — the theatre's own site with
 * sitelinks, Wikipedia, the socials and the listings — so "io theater chicago"
 * at difficulty 1 with 1,700 of potential and "annoyance theatre" at 0, the
 * softest terms twelve audit firings had found, are the theatres' homepages
 * and not open to a page about the school. Gated, all of them, and recorded.
 *
 * A route registers a keyword above only where its own title says the term
 * (the H1 rule in keyword-collisions.test.ts); iO's page is "iO and the
 * Harold", so it registers nothing and keeps its reading here. The Spolin
 * route names the guide that owns "viola spolin" and carries the guide's
 * reading, which route-serp.test.ts holds equal so the two cannot drift.
 */
export type RouteSerpReading = SerpReading & {
  /** The query the results page was read for. */
  serp_query: string;
  /** The guide that owns this page's term for search — SA-5.1's `search_owner`. */
  search_owner?: string;
};

export const ROUTE_SERP: Record<string, RouteSerpReading> = {
  "/traditions/johnstone": {
    serp_query: "keith johnstone",
    serp_checked: "2026-09-25",
    serp_min_dr: 45,
    serp_verdict: "authority",
    serp_top10_dr: [97, 45, 96, 93, 99, 92, 76, 94],
    serp_floor_traffic: 8,
    serp_audience:
      "A biographical query: Wikipedia, the estate's site at 4 on DR 45, Impro on Amazon and Goodreads, " +
      "the Guardian obituary, a TEDx talk, IMDb. Three results are retailers' root URLs whose traffic is " +
      "the whole domain, so no top share is recorded; the Guardian's 126 is the most any page earns on it.",
  },
  "/traditions/spolin": {
    serp_query: "viola spolin",
    search_owner: "viola-spolin",
    serp_checked: "2026-09-25",
    serp_min_dr: 23,
    serp_verdict: "authority",
    serp_top10_dr: [97, 35, 32, 75, 96, 85, 41, 23],
    serp_floor_traffic: 29,
    serp_top_share: 0.58,
    serp_audience:
      "Read on the guide viola-spolin (SA-3.1), which owns the term: Wikipedia, then the estate's three " +
      "sites, Second City, Amazon, Backstage. This page is the school's and registers no keyword; its own " +
      'question, "What is Viola Spolin technique?" at 20 a month, is below the index\'s floor.',
  },
  "/traditions/close": {
    serp_query: "io theater chicago",
    serp_checked: "2026-09-25",
    serp_min_dr: 44,
    serp_verdict: "authority",
    serp_top10_dr: [58, 97, 100, 62, 44, 93, 94],
    serp_floor_traffic: 1,
    serp_top_share: 0.82,
    serp_audience:
      "People going to iO: its own site with shows, classes and event-space sitelinks (1,840 visits), " +
      "Wikipedia, Instagram, Do312, TripAdvisor, Yelp. Navigational; the 1,700 of potential is the " +
      "theatre's homepage. Not a competitor of the del-close guide, whose page is Wikipedia's biography.",
  },
  "/traditions/ucb": {
    serp_query: "upright citizens brigade",
    serp_checked: "2026-09-25",
    serp_min_dr: 71,
    serp_verdict: "authority",
    serp_top10_dr: [71, 97, 99, 94, 100, 91, 99],
    serp_floor_traffic: 4007,
    serp_top_share: 0.86,
    serp_audience:
      "The institution's own site with shows and classes sitelinks, then Wikipedia, YouTube, IMDb for " +
      "the TV series, Instagram, the New Yorker profile; People Also Ask is Amy Poehler and Tina Fey. " +
      "Nothing under DR 71.",
  },
  "/traditions/annoyance": {
    serp_query: "annoyance theatre",
    serp_checked: "2026-09-25",
    serp_min_dr: 44,
    serp_verdict: "authority",
    serp_top10_dr: [50, 97, 100, 44, 80, 94, 62],
    serp_floor_traffic: 2,
    serp_top_share: 0.86,
    serp_audience:
      "The theatre's own site with shows, classes and bar sitelinks, Wikipedia, Instagram, listings and " +
      "Yelp. People Also Ask asks what the Annoyance's style of improv is and who founded it — the two " +
      "questions this page answers, sitting at 3 as questions. Navigational; the 700 is the homepage.",
  },
};

/** Every keyword claimed by a hub, lowercased, mapped to the route holding it. */
export function routeKeywordOwners(): Map<string, string> {
  const owners = new Map<string, string>();
  for (const [route, keywords] of Object.entries(ROUTE_KEYWORDS)) {
    for (const { keyword } of keywords) owners.set(keyword.trim().toLowerCase(), route);
  }
  return owners;
}
