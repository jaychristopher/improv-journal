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
 * routes, 2026-09-25, SA-11.1; the beginner picker, the games hub and the
 * exercises hub, 2026-09-28). Elsewhere absent means nobody has looked, and
 * inventing a verdict would be worse than having none.
 *
 * Adding a guide that targets anything here is the thing to avoid. If a hub
 * genuinely should hand a term over, move it — do not let both hold it.
 */
/** The same shape a guide's keyword has, so the three layers read alike. */
export type RouteKeyword = BridgeTargetKeyword;

export const ROUTE_KEYWORDS: Record<string, RouteKeyword[]> = {
  /**
   * The hub, and the head term of the site's largest cluster. Parent is the
   * collision test (CLAUDE.md), and it cuts both ways on this list:
   *
   * - "improv games for beginners" and "easy improv games" left on
   *   2026-09-28. Ahrefs files both under the parent "improv exercises", not
   *   "improv games", and the picker's beginner level had already surfaced
   *   for the first at 52 while this hub held it.
   * - The same reading, matching terms on "improv games" (US), found the
   *   terms Ahrefs files under the parent "improv games" and three of them
   *   registered nowhere. "improv games for adults" had been a TODO on this
   *   hub since the April research (docs/seo-research-2026-04-22.md) and
   *   was still targeted by nothing on 2026-09-21 (tracker entry 215); the
   *   two list terms are small on volume and carry the cluster's potential.
   *   The classroom terms (students, middle school, teens, high school)
   *   were already on the kids guide, and the team-building one is on its
   *   guide. The results page is in ROUTE_SERP.
   */
  "/improv-games": [
    { keyword: "improv games", volume: 3100 },
    {
      keyword: "improv games for adults",
      volume: 250,
      difficulty: 0,
      traffic_potential: 450,
      parent: "improv games",
    },
    { keyword: "fun improv games", volume: 150 },
    { keyword: "best improv games", volume: 100 },
    {
      keyword: "improv games list",
      volume: 50,
      difficulty: 0,
      traffic_potential: 3100,
      parent: "improv games",
    },
    {
      keyword: "list of improv games",
      volume: 50,
      difficulty: 1,
      traffic_potential: 2700,
      parent: "improv games",
    },
  ],
  /**
   * The full-page home of the prompt generator, and the one page on the site
   * that says "generator". "improv prompt generator" is its own search, not a
   * variant of "improv prompts": Ahrefs (2026-09-19, US) files it under the
   * parent "improv generator", which is not the guide's parent, so by the
   * collision rule in CLAUDE.md a second page may own it, and its title does.
   * The field's own word for the same tool is "suggestion" — Andi Smith's
   * page, Glasgow Improv's, a Play Store app — and "improv suggestion
   * generator" is the same size (150, read 2026-09-30, US; difficulty,
   * potential and parent were not returned, so only the volume is recorded).
   * "improv suggestions" sits under this page's own term as its parent. The
   * category terms were checked the same month and have nothing behind them
   * ("improv first lines", "improv location ideas", "improv relationship
   * prompts" all 0), so the six kinds of scene starter stay sections of the
   * guide. The results page is in ROUTE_SERP. Not in the rank tracker: its
   * list forbids never-surfaced terms, and neither prompt page has surfaced.
   */
  "/tools/improv-prompt-generator": [
    {
      keyword: "improv prompt generator",
      volume: 150,
      difficulty: 2,
      traffic_potential: 150,
      parent: "improv generator",
    },
    { keyword: "improv suggestion generator", volume: 150 },
    {
      keyword: "improv suggestions",
      volume: 10,
      difficulty: 0,
      traffic_potential: 70,
      parent: "improv prompt generator",
    },
    { keyword: "improv scenario generator", volume: 20 },
  ],
  /**
   * The beginner level of the exercise picker: the site's list of beginner
   * games, with the order to run them in. Read 2026-09-28, US: all three
   * terms sit under the parent "improv exercises" at difficulty 0, and the
   * results page (ROUTE_SERP) has a DR 4 blog holding position 8.
   */
  "/tools/exercise-picker/beginner": [
    {
      keyword: "improv games for beginners",
      volume: 150,
      difficulty: 0,
      traffic_potential: 450,
      parent: "improv exercises",
    },
    {
      keyword: "easy improv games",
      volume: 50,
      difficulty: 0,
      traffic_potential: 400,
      parent: "improv exercises",
    },
    {
      keyword: "beginner improv games",
      volume: 40,
      difficulty: 0,
      traffic_potential: 450,
      parent: "improv exercises",
    },
  ],
  // Read 2026-09-28, US: 250 a month at difficulty 0, potential 450, and its
  // own parent — the parent the beginner picker's three terms and the
  // get-better guide's "improv practice" sit under. An earlier reading said
  // 300. The results page is in ROUTE_SERP.
  "/practice/exercises": [
    {
      keyword: "improv exercises",
      volume: 250,
      difficulty: 0,
      traffic_potential: 450,
      parent: "improv exercises",
    },
  ],
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
  "/improv-games": {
    serp_query: "improv games",
    serp_checked: "2026-09-28",
    serp_min_dr: 22,
    serp_verdict: "winnable",
    serp_top10_dr: [95, 51, 48, 31, 22, 99, 32],
    serp_floor_traffic: 84,
    serp_top_share: 0.63,
    serp_audience:
      "Lists, and Reddit first among them: a thread at 2 on 2,735 visits, the Improv Encyclopedia at 3 " +
      "(DR 51, 764), Hoopla at 6 (DR 48, 362), a children's drama page at 7 (DR 31, 284), a DR 22 improv " +
      "blog at 8 on 84, YouTube at 9, a teen science cafe's list at 10 (DR 32, 73). Positions 1, 4 and 5 " +
      "were not organic results, so the top share is Reddit's of the seven returned. The adults term is " +
      "the same page in a different order, with a DR 8 collective at 4 on 146 visits.",
  },
  "/tools/exercise-picker/beginner": {
    serp_query: "improv games for beginners",
    serp_checked: "2026-09-28",
    serp_min_dr: 4,
    serp_verdict: "winnable",
    serp_top10_dr: [48, 95, 25, 100, 31, 4, 99, 48],
    serp_floor_traffic: 16,
    serp_top_share: 0.34,
    serp_audience:
      "Lists of games for a first class: Hoopla's exercise pages at 2 and 10 (DR 48, 360 and 205 visits), " +
      "a Reddit thread, andalsoimprov's list at 4 (DR 25, 51), a Facebook group post, a kids' game page at " +
      "7 (DR 31, 284), a DR 4 blog at 8 on 16 visits, a YouTube demo at 9. Positions 1 and 6 were not " +
      "organic results, so the top share is Hoopla's of the eight returned.",
  },
  "/practice/exercises": {
    serp_query: "improv exercises",
    serp_checked: "2026-09-28",
    serp_min_dr: 23,
    serp_verdict: "winnable",
    serp_top10_dr: [48, 95, 35, 51, 23, 53, 94],
    serp_floor_traffic: 6,
    serp_top_share: 0.75,
    serp_audience:
      "Lists for a class or a team: Hoopla's beginner exercises at 2 (DR 48, 360 visits, three quarters of " +
      "the page), a Reddit thread at 3, the Radical Agreement hub at 5 (DR 35, 19), Improwiki at 6 (DR 51, " +
      "15), a therapy group's category page at 7 (DR 23, 6), a theatre blog's list at 8 (DR 53, 10), Will " +
      "Hines on solo practice at 9. Positions 1, 4 and 10 were not organic results — a video carousel, " +
      "People also ask and a block of nine — so the share is Hoopla's of the seven returned.",
  },
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
  "/tools/improv-prompt-generator": {
    serp_query: "improv prompt generator",
    serp_checked: "2026-09-30",
    serp_min_dr: 0,
    serp_verdict: "winnable",
    serp_top10_dr: [95, 92, 20, 40, 4, 0, 35, 39, 10],
    serp_floor_traffic: 15,
    serp_top_share: 0.06,
    serp_audience:
      "Generators, and one article that out-earns them all: a Reddit thread asking for one at 1 (DR 95, " +
      "109 visits), a Webflow one-pager at 2 (DR 92, 92), Glasgow Improv's at 3 (DR 20, 108), Theatre " +
      "Haus at 4 (DR 40, 43), Impromuse at 5 (DR 4, 56), a company's own at 6 (DR 0, 15), Radical " +
      "Agreement's prompts article at 7 (DR 35, 1,429 — the term's biggest earner is a list, not a " +
      "tool), a review of generators at 8, Can I Get A at 9 (DR 10, 18), People Also Ask at 10 (what " +
      "are some good prompts for improv; the four pillars; prompts in dance). Nine organic results " +
      "were returned, so the top share is Reddit's of those. The sibling term \"improv suggestion " +
      'generator" (150 a month), read the same day: DRs 10, 20, 27, 75, 19, 94, 100, 4, 39, 4, the ' +
      "DR 4 page at 10 on 56 visits and the DR 20 page at 2 on 108 — the same hobbyist generators " +
      "handing out nouns.",
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
