import type { PageSubject } from "@/lib/schema";

/**
 * The named entity behind each school page.
 *
 * The five tradition pages emitted no structured data at all — no Article, no
 * entity, nothing — while being the most distinctive pages on the site and the
 * ones a query like "del close improv" actually lands on. A page about Keith
 * Johnstone that never says so is an untyped document that happens to contain
 * his name.
 *
 * Each record was checked against the Wikipedia API before being added, on the
 * rule schema.ts sets out: a sameAs asserts identity, so a wrong one is worse
 * than none. Two needed the check. The Annoyance is at "Annoyance Theatre"
 * rather than "The Annoyance", and iO is at "IO Theater" rather than "iO
 * Theater" or "ImprovOlympic", both of which redirect there.
 *
 * Where a page covers a pair — Close with Halpern, the Annoyance with TJ and
 * Dave — the subject names the entity the page is primarily about and that its
 * own title leads with. TJ and Dave have no article as a duo.
 */
export const TRADITION_SUBJECTS: Record<string, PageSubject> = {
  johnstone: {
    type: "Person",
    name: "Keith Johnstone",
    description: "British drama teacher, 1933-2023. Wrote Impro and invented Theatresports.",
    sameAs: ["https://en.wikipedia.org/wiki/Keith_Johnstone"],
  },
  spolin: {
    type: "Person",
    name: "Viola Spolin",
    description:
      "American theatre educator, 1906-1994. Invented Theater Games and wrote Improvisation for the Theater.",
    sameAs: ["https://en.wikipedia.org/wiki/Viola_Spolin"],
  },
  close: {
    type: "Person",
    name: "Del Close",
    description:
      "American improv teacher and director, 1934-1999. Developed the Harold and co-founded iO with Charna Halpern.",
    sameAs: ["https://en.wikipedia.org/wiki/Del_Close", "https://en.wikipedia.org/wiki/IO_Theater"],
  },
  ucb: {
    type: "Organization",
    name: "Upright Citizens Brigade",
    description:
      "Improv and sketch comedy theatre and training centre in New York and Los Angeles.",
    sameAs: ["https://en.wikipedia.org/wiki/Upright_Citizens_Brigade"],
  },
  annoyance: {
    type: "Organization",
    name: "Annoyance Theatre",
    description: "Chicago theatre group founded by Mick Napier, known for commitment-first improv.",
    sameAs: ["https://en.wikipedia.org/wiki/Annoyance_Theatre"],
  },
};
