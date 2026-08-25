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
 * Where a page covers a pair — the Annoyance with TJ and Dave — the subject
 * names the entity the page is primarily about and that its own title leads
 * with. TJ and Dave have no article as a duo.
 *
 * `close` follows that rule and is the reason it is worth stating. It was
 * Del Close the person while the page was titled after him; the title now
 * names the school, so the subject is the theatre. Del Close is asserted by
 * /del-close, which is the page that should own that identity — one entity
 * claimed by one page.
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
    type: "Organization",
    name: "iO Theater",
    description:
      "Chicago improv theatre and training centre founded by Charna Halpern, where Del Close developed the Harold.",
    sameAs: ["https://en.wikipedia.org/wiki/IO_Theater"],
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
