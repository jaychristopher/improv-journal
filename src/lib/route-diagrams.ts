/**
 * One content diagram for each route page that had none (SA-13.1, 2026-09-25).
 *
 * The markdown layers get diagrams through `inlineDiagrams`; the JSX routes
 * through `<Diagram>`, which /practice/formats, /how-it-works/principles and
 * /improv-games already used. The eleven paths and the five school pages were
 * the same case and had zero between them, against a corpus norm of one to
 * four, while public/images held 248 diagrams. Each entry reuses an existing
 * diagram that depicts what the page teaches — nothing was commissioned — and
 * the `alt` is the description the diagram already carries where it lives, so
 * one picture has one accessible name across the site. The caption is the
 * page's own sentence.
 *
 * Keyed by route so the page and its share card read the same entry: the OG
 * card puts the diagram's description under the title (`ogImages`'s third
 * argument). route-diagrams.test.ts holds every path and tradition to an entry
 * whose file exists.
 */
export interface RouteDiagram {
  /** Path under public/, as `<Diagram>` takes it. */
  src: string;
  /** The information the diagram shows — its accessible name. */
  alt: string;
  /** One sentence beneath it, in the page's voice. */
  caption: string;
}

export const ROUTE_DIAGRAMS: Record<string, RouteDiagram> = {
  "/paths/beginner-foundations": {
    src: "/images/what-to-train-first.svg",
    alt: "Six theatre-game skill areas in three tiers: attention and listening as the foundation, then ensemble, physicality, spontaneity and structure in any order, with emotional range left until later.",
    caption:
      "Attention and listening first; the rest is built on them, in any order, with emotional range last.",
  },
  "/paths/teaching-improv": {
    src: "/images/three-layers-four-levels.svg",
    alt: "Three layers against four levels: principles run continuously, techniques arrive one level at a time, and exercises do both — present throughout and progressing.",
    caption:
      "A curriculum is three layers, not one list: principles run the whole way, techniques arrive by level, and exercises do both.",
  },
  "/paths/mastering-the-form": {
    src: "/images/longform-vs-shortform.svg",
    alt: "Short form and long form as two timelines: short form four discrete games with the difficulty at each start, long form one continuous piece with the difficulty in the middle.",
    caption:
      "Short form restarts its difficulty with every game; long form carries one piece, and its hardest stretch is the middle.",
  },
  "/paths/the-art-of-ensemble": {
    src: "/images/what-the-ensemble-runs-on.svg",
    alt: "Three links: a dashed one from liking to the ensemble working, and solid ones from confidence to it working and from liking to the cost of a note.",
    caption:
      "Liking each other feeds confidence in each other, and confidence is what the ensemble runs on; liking alone is the dashed line.",
  },
  "/paths/improv-for-teams": {
    src: "/images/what-safe-teams-do-more-of.svg",
    alt: "Three quantities with a short assumed bar above and a longer actual bar below in each case.",
    caption:
      "Three things safe teams do more of than anyone assumes: the short bar is the assumption, the long one is what was measured.",
  },
  "/paths/improv-for-life": {
    src: "/images/same-constraints-different-stakes.svg",
    alt: "The same four constraints in both rows with the stakes bar short on stage and long everyday.",
    caption:
      "Every conversation runs under the four constraints a scene does; only the stakes bar changes length, and off stage it is the long one.",
  },
  "/paths/physics-of-connection": {
    src: "/images/shared-reality-fragility.svg",
    alt: "Two facts over the same scene: a physical one touched repeatedly survives the whole span, a spoken one stated once fades early.",
    caption:
      "A fact you touch survives the whole scene; a fact you only say fades early. That is the physics that makes a shared reality fragile.",
  },
  "/paths/systems-of-improv": {
    src: "/images/health-stack.svg",
    alt: "The three indicators form a stack: cumulative state requires coherence, which requires mutual recognition, so the only one worth acting on directly is the one at the bottom.",
    caption:
      "The three health indicators stack: cumulative state needs coherence, coherence needs mutual recognition, so the bottom one is the only one you can act on directly.",
  },
  "/paths/self-coaching-toolkit": {
    src: "/images/collapse-cascade.svg",
    alt: "Latency leads to fracture, which leads to decay; the mode you noticed at the end is rarely the one that has to be drilled.",
    caption:
      "Latency leads to fracture leads to decay; what you noticed at the end is rarely the thing that needs drilling.",
  },
  "/paths/reference-guide": {
    src: "/images/where-the-rules-came-from.svg",
    alt: "Where the popular five rules of improv come from: Close to Fey's memoir summary to the list that circulates, with Johnstone standing outside the line of descent entirely.",
    caption:
      "The five rules everyone quotes trace to Close through a memoir's summary; Johnstone stands outside that line, which is why the traditions disagree.",
  },
  "/paths/advanced-game-and-character": {
    src: "/images/four-ways-to-break-it.svg",
    alt: "Two beats establish a pattern and the third is treated four ways: pushed further, reversed below the line, withheld entirely, or moved somewhere else.",
    caption:
      "Two beats make a pattern; the third can go further, reverse, withhold or move — the four ways a game evolves.",
  },
  "/traditions/johnstone": {
    src: "/images/matched-status.svg",
    alt: "Two players' status makes a two-by-two: the complementary high-low pairings are the taught case, while both-high produces competition and both-low produces indecision.",
    caption:
      "Status as Johnstone taught it is a relationship, not a trait: the complementary pair is the taught case, and the two matched ones produce competition and indecision.",
  },
  "/traditions/spolin": {
    src: "/images/point-of-concentration.svg",
    alt: "How a Point of Concentration works: one narrow thing to attend to occupies the part of you that monitors your own performance, so the behaviour the teacher wanted arrives as a side effect.",
    caption:
      "One narrow thing to attend to, and the part of you that watches your own performance has nowhere left to stand — which is why the games work on people who have never acted.",
  },
  "/traditions/close": {
    src: "/images/harold-structure.svg",
    alt: "Six stages of the training-wheels Harold running top to bottom — an opening, three beats of three scenes each, two group games — with each beat labelled discovery, heightening, connection, and material from the first beat returning in the third.",
    caption:
      "The training-wheels Harold: an opening, three beats of three scenes, two group games — the scaffold iO teaches first and then asks you to forget.",
  },
  "/traditions/ucb": {
    src: "/images/inside-the-game.svg",
    alt: "A box containing the two moves that keep the game — heightening and exploring — with pivot, inversion, combination and transcendence marked outside it.",
    caption:
      "Find the game, then heighten and explore it; pivot, inversion, combination and transcendence are what you reach for when the game runs out.",
  },
  "/traditions/annoyance": {
    src: "/images/two-person-longform-structure.svg",
    alt: "Two ways a duo builds a show: TJ and Dave's single uncut reality above, Middleditch and Schwartz's plot with time jumps below, where every cut is the performers' own.",
    caption:
      "TJ & Dave's hour is one uncut reality; Middleditch and Schwartz cut and jump. The Annoyance's bet is on the first, and the difference is who makes the cuts.",
  },
};

export function routeDiagram(route: string): RouteDiagram | undefined {
  return ROUTE_DIAGRAMS[route];
}
