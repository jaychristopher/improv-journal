/**
 * Authority records for the people the library cites.
 *
 * Library pages are how this site is currently found. Search Console shows
 * every query that reaches one is [author] plus [work] — "keith sawyer group
 * genius", "attention and effort daniel kahneman", "anne bogart viewpoints" —
 * so the author is the part of the query doing the work. The markup did not
 * say who those people were: CitedWorkJsonLd emitted `author` as a bare
 * `{ "@type": "Person", name: "Anne Bogart" }`, which is a string a crawler
 * has to guess at rather than an entity it can resolve.
 *
 * Every URL here was checked against the Wikipedia API and confirmed by the
 * article's own description before being added, because schema.ts states the
 * rule this follows: a sameAs points at an authority record and is the part
 * doing the disambiguating, so omit it rather than guess one.
 *
 * Seven cited authors have no article and are deliberately absent — Jimmy
 * Carrane, Will Hines, Allen R. Braun, Dennis Longwell, Tom Salinsky, Pam
 * Victor and Christopher D. Wickens. An eighth nearly went in wrong: "Ian
 * Roberts" and "Ian Roberts (actor)" are both disambiguation pages listing a
 * rugby player, a Guyanese educator and others, and only "Ian Roberts
 * (American actor)" is the UCB founder.
 *
 * Keyed by the author string exactly as the frontmatter writes it, which is
 * why Keith Sawyer appears twice — the library cites him under two forms.
 */
export const AUTHOR_SAMEAS: Record<string, string> = {
  "Amy C. Edmondson": "https://en.wikipedia.org/wiki/Amy_Edmondson",
  "Anne Bogart": "https://en.wikipedia.org/wiki/Anne_Bogart",
  "Brené Brown": "https://en.wikipedia.org/wiki/Bren%C3%A9_Brown",
  "Charles J. Limb": "https://en.wikipedia.org/wiki/Charles_Limb",
  "Charna Halpern": "https://en.wikipedia.org/wiki/Charna_Halpern",
  "Constantin Stanislavski": "https://en.wikipedia.org/wiki/Konstantin_Stanislavski",
  "Daniel Kahneman": "https://en.wikipedia.org/wiki/Daniel_Kahneman",
  "Dave Pasquesi": "https://en.wikipedia.org/wiki/David_Pasquesi",
  "Deborah Frances-White": "https://en.wikipedia.org/wiki/Deborah_Frances-White",
  "Del Close": "https://en.wikipedia.org/wiki/Del_Close",
  "E. Colin Cherry": "https://en.wikipedia.org/wiki/Colin_Cherry",
  "Erving Goffman": "https://en.wikipedia.org/wiki/Erving_Goffman",
  "Ian Roberts": "https://en.wikipedia.org/wiki/Ian_Roberts_(American_actor)",
  "John Sweller": "https://en.wikipedia.org/wiki/John_Sweller",
  "Keith Johnstone": "https://en.wikipedia.org/wiki/Keith_Johnstone",
  "Keith Sawyer": "https://en.wikipedia.org/wiki/Keith_Sawyer",
  'Kim "Howard" Johnson': "https://en.wikipedia.org/wiki/Kim_%22Howard%22_Johnson",
  "Mary Overlie": "https://en.wikipedia.org/wiki/Mary_Overlie",
  "Matt Besser": "https://en.wikipedia.org/wiki/Matt_Besser",
  "Matt Walsh": "https://en.wikipedia.org/wiki/Matt_Walsh_(comedian)",
  "Mick Napier": "https://en.wikipedia.org/wiki/Mick_Napier",
  "Mihaly Csikszentmihalyi": "https://en.wikipedia.org/wiki/Mihaly_Csikszentmihalyi",
  "Nelson Cowan": "https://en.wikipedia.org/wiki/Nelson_Cowan",
  "Patricia Ryan Madson": "https://en.wikipedia.org/wiki/Patricia_Ryan_Madson",
  "Patti Stiles": "https://en.wikipedia.org/wiki/Patti_Stiles",
  "R. Keith Sawyer": "https://en.wikipedia.org/wiki/Keith_Sawyer",
  "Sanford Meisner": "https://en.wikipedia.org/wiki/Sanford_Meisner",
  "TJ Jagodowski": "https://en.wikipedia.org/wiki/T._J._Jagodowski",
  "Tina Fey": "https://en.wikipedia.org/wiki/Tina_Fey",
  "Tina Landau": "https://en.wikipedia.org/wiki/Tina_Landau",
  "Viola Spolin": "https://en.wikipedia.org/wiki/Viola_Spolin",
};

/** The authority record for a cited author, when one has been verified. */
export function authorSameAs(name: string): string | undefined {
  return AUTHOR_SAMEAS[name];
}
