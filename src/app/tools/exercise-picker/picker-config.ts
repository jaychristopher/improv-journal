import type { AtomType, Link } from "@/lib/schema";

export interface LevelConfig {
  slug: string;
  label: string;
  title: string;
  description: string;
  /**
   * Orienting prose for the level page.
   *
   * These pages surface for informational queries — "beginner improv games",
   * "improv practice exercises" — and answered them with a list of fourteen
   * names in alphabetical order and one line of context. Which exercise to run
   * is the easy half; the order to run them in, and which ones need a circle
   * rather than a partner, is what a person arriving from that search needs.
   */
  orientation: string[];
}

export interface FocusConfig {
  slug: string;
  label: string;
  tag: string;
  extraTags: string[];
  description: string;
  /**
   * Orienting prose for the level+focus pages.
   *
   * Same problem the level pages had, one level down. These shipped a heading,
   * one line of description and three exercise cards — 130 to 179 words, which
   * clears the "three exercises" indexing bar and still says nothing a filtered
   * list does not. The exercises are already documented on their own pages; what
   * is missing here is why this focus is a thing you would train separately, and
   * what goes wrong when people do.
   */
  orientation: string[];
}

export const LEVELS: LevelConfig[] = [
  {
    slug: "beginner",
    label: "Beginner",
    title: "Beginner Improv Exercises",
    description:
      "Easy improv exercises for groups with no experience. Each one builds listening, presence, or collaboration — no performance skills required.",
    orientation: [
      "Order matters more than selection. Start with the exercises that need no words — mirroring, pass the clap, the machine — because what a beginner is actually afraid of is being judged on what they say. Twenty minutes where nobody has to say anything changes how the verbal exercises land afterwards.",
      "Check the group size before you plan. Big Booty, Pass the Clap and Zip Zap Zop need a circle of five or more. Mirroring, gift giving, last word response and one-word story work with two people, so if you are practising with one friend the usable list is shorter than it looks.",
      "Stop each one while it is still working. A short round that ends with the group wanting more teaches the thing; the same exercise run until attention goes teaches that improv is tiring and slightly embarrassing.",
    ],
  },
  {
    slug: "intermediate",
    label: "Intermediate",
    title: "Intermediate Improv Exercises",
    description:
      "Exercises for improvisers who know the basics and want to push past the plateau. Focus on emotional range, status, recovery, and scene-level skills.",
    orientation: [
      "A plateau is usually a habit rather than a missing skill, so choose the exercise that names something you already suspect about your own scenes. General practice is what stopped working; that is what a plateau is.",
      "Warm-ups have diminishing returns by this point. The value now is in a constraint that removes your default move — if an exercise still lets you do the thing you always do, it is not doing anything for you.",
      "Run them with the same partner over weeks. The point is noticing your pattern, and a pattern needs a witness who remembers what you did last time.",
    ],
  },
  {
    slug: "advanced",
    label: "Advanced",
    title: "Advanced Improv Exercises",
    description:
      "Exercises for experienced performers working on ensemble depth, show craft, and artistic voice. Assumes comfort with game, character, and longform.",
    orientation: [
      "At this level an exercise is a diagnostic rather than a lesson. You are looking for what this particular ensemble avoids, which is rarely what any individual in it would guess.",
      "Take them into a show context where you can. Anything that only works in a workshop is a workshop skill, and the gap between the two is where most experienced groups quietly live.",
      "Do not use these as a warm-up. They are built to expose things, and ten minutes before a show is the wrong time to find out what your cast has been avoiding.",
    ],
  },
];

export const FOCUSES: FocusConfig[] = [
  {
    slug: "presence",
    label: "Presence & Listening",
    tag: "presence",
    extraTags: ["listening"],
    description:
      "Exercises that train sustained attention, active listening, and being fully in the moment.",
    orientation: [
      "This is the only focus on the list that trains an input rather than an output. Everything else here makes you better at doing something; these make you better at receiving, which is why they feel like doing nothing and why people quietly rate them as warm-ups rather than work.",
      "The measure of progress is latency, not quality. Somebody genuinely listening answers slightly faster and slightly worse — the pause before a response is almost always composition, not consideration. If the answers are getting more polished, the exercise has stopped working.",
      "Run these before anything demanding rather than after. Attention is the resource the rest of a session spends, and a group that has not been brought into the room will spend the first twenty minutes of any other exercise arriving.",
    ],
  },
  {
    slug: "ensemble",
    label: "Ensemble & Group Mind",
    tag: "ensemble",
    extraTags: [],
    description:
      "Exercises that build shared awareness, group coordination, and the ability to create as one.",
    orientation: [
      "Ensemble is the one focus that cannot be practised alone, and it is not a personality trait the group either has or lacks. It is a set of specific habits — matching what somebody else started, giving up your idea when a better one appears, noticing who has not spoken.",
      "Watch the distribution rather than the output. A group scene that goes brilliantly while two people carry it is a worse result than a mediocre one everybody built, because the first teaches the quiet members that their contribution is optional.",
      "These need the same people repeatedly. Ensemble is accumulated evidence that the others will catch what you throw, and evidence does not transfer between casts — which is why a group of individually strong improvisers is often worse than a weaker group who have played together for a year.",
    ],
  },
  {
    slug: "emotion",
    label: "Emotion & Honesty",
    tag: "emotion",
    extraTags: [],
    description: "Exercises that develop emotional range, vulnerability, and authentic response.",
    orientation: [
      "The obstacle is almost never a missing feeling. It is that reacting visibly in front of people is a risk, and the reflex is to convert the reaction into a comment about the reaction — which is safe, gets a laugh, and ends the scene's emotional life.",
      "Aim for a smaller feeling held longer rather than a larger one performed. Big emotion arrives on demand and reads as false; mild irritation that persists for ninety seconds is much harder and considerably more affecting.",
      "These want a group that already trusts each other, so they belong later in a session than their difficulty suggests. Asking somebody to be genuinely affected in a room where they are still working out where they stand produces performance, which is the exact thing being trained out.",
    ],
  },
  {
    slug: "courage",
    label: "Courage & Commitment",
    tag: "courage",
    extraTags: [],
    description:
      "Exercises that practice bold choices, full commitment, and acting before overthinking.",
    orientation: [
      "What these train is the interval between having a thought and acting on it, which is a different skill from confidence and improves much faster. Nobody in an improv exercise is short of ideas; they are short of the willingness to use the first one.",
      "The point is to make being wrong cheap and frequent. An exercise that can be done well is not doing the job — the useful version produces obvious failures at a rate high enough that failing stops registering as an event.",
      "Do not let the group discuss what happened. Analysis after a bold choice teaches that bold choices are followed by evaluation, which reintroduces exactly the hesitation the exercise removed. Run the next round instead.",
    ],
  },
  {
    slug: "physicality",
    label: "Physicality & Space",
    tag: "physicality",
    extraTags: [],
    description: "Exercises that develop body awareness, spatial work, and physical communication.",
    orientation: [
      "Physical work is trained separately because it is the first thing to disappear under pressure. A nervous improviser goes still and talks more, and telling them to move does nothing, because stillness is a symptom rather than a habit.",
      "Start from the body and let the character follow, not the reverse. Deciding who somebody is and then adding a walk produces an illustration of a decision; changing how you move and finding out who that turns out to be produces somebody you have not played before.",
      "These are the exercises most often skipped by groups who consider themselves verbal, and they are usually the ones with the most left to gain. A cast whose scenes all happen standing two feet apart in a neutral room has a physicality problem it has learned to call a style.",
    ],
  },
  {
    slug: "recovery",
    label: "Recovery & Adaptation",
    tag: "recovery",
    extraTags: [],
    description:
      "Exercises that train handling mistakes, staying flexible, and building from the unexpected.",
    orientation: [
      "Every other focus trains what to do when things go as intended. This one trains the far more common case, and it is the difference between a group that can perform and a group that can only rehearse.",
      "The skill is not avoiding the mistake, it is removing the apology. Most damage from an error comes from the visible second in which somebody signals that an error occurred — the audience did not know until they were told, and a scene absorbs almost anything that is treated as intentional.",
      "Practise these having deliberately broken something. An exercise where the failure is manufactured lets you rehearse the response without waiting for a real disaster, and the response is a physical habit rather than a decision you get to make calmly.",
    ],
  },
];

/**
 * Whether an exercise's tags admit it to a level.
 *
 * A level tag admits the exercise to that level. `fundamentals` is the tag the
 * ten August warm-up games carry (all of them also `beginner`), and until
 * 2026-09-21 it matched every level, so the advanced pages were majority
 * circle games — /tools/exercise-picker/advanced listed Zip Zap Zop and Big
 * Booty under an orientation that says "Do not use these as a warm-up"
 * (tracker entry 56). A fundamental is foundational, not universal: it reaches
 * beginner and intermediate, whose orientation allows for warm-ups with
 * "diminishing returns", and stops at advanced. One function for the level
 * pages, the level/focus router, the sitemap and the client picker, so the
 * four cannot disagree on who is offered what.
 */
export function matchesLevel(tags: string[], level: string): boolean {
  if (tags.includes(level)) return true;
  return tags.includes("fundamentals") && level !== "advanced";
}

export function getLevelBySlug(slug: string): LevelConfig | undefined {
  return LEVELS.find((l) => l.slug === slug);
}

export function getFocusBySlug(slug: string): FocusConfig | undefined {
  return FOCUSES.find((f) => f.slug === slug);
}

/**
 * Hand-assigned focuses, for the exercises that predate the derivation below.
 *
 * This map is an override, not the source: an exercise listed here gets
 * exactly these focuses (plus any focus tag in its own frontmatter), and an
 * exercise not listed here gets its focuses derived from what it links. It
 * used to be the only source, kept as two identical copies — here and in the
 * client component — and covered 17 of 27 exercises: the ten games added in
 * August were never entered, so the picker could reach them only through
 * whatever focus tags they happened to carry. Content grows; a hand list does
 * not, so the list is now the exception path.
 */
export const EXERCISE_FOCUS_MAP: Record<string, string[]> = {
  mirroring: ["presence", "ensemble", "listening"],
  "last-word-response": ["presence", "listening"],
  "one-word-scene": ["presence", "courage"],
  "gift-giving": ["ensemble", "courage"],
  "blind-offer": ["courage", "presence"],
  "yes-and-chain": ["presence", "ensemble"],
  "emotional-honesty-scene": ["emotion"],
  "first-line-drill": ["courage"],
  "status-transfer": ["physicality", "ensemble"],
  "space-work-scene": ["physicality"],
  "group-mind-cultivation": ["ensemble"],
  "no-backspace-scene": ["courage", "recovery"],
  "fracture-repair-drill": ["recovery"],
  "directed-scene": ["ensemble", "listening"],
  "emotion-switch": ["emotion", "recovery"],
  "genre-scene": ["courage", "physicality"],
  "organic-opening-exercise": ["ensemble"],
};

/**
 * Which focus an exercise trains when it illustrates or requires this atom.
 *
 * Read off the hand map above: the exercises it marks `courage` illustrate
 * be-brave, initiation and commitment (the focus is labelled "Courage &
 * Commitment"); the `presence` ones illustrate be-present and the bandwidth
 * pair; `physicality` follows space-work and environment; `recovery` follows
 * the recovery patterns and irreversibility. Atoms the hand map points in
 * more than one direction — be-supportive, be-changeable, justification — are
 * left out rather than guessed.
 *
 * Checked against the seventeen hand entries: reading `illustrates` alone
 * reproduces or narrows the hand focus for fourteen of them (six exactly). It
 * is the relation that says what the exercise trains. `requires` says what a
 * player brings to it, and reading that too would call mirroring, space work
 * and last word response "courage" because each requires commitment — so it
 * is only consulted when an exercise illustrates nothing in this table.
 *
 * `listening` is not a focus of its own; the presence focus lists it as an
 * extra tag, and the games hub folds it into presence the same way.
 */
export const ATOM_FOCUS_MAP: Record<string, string> = {
  "be-present": "presence",
  presence: "presence",
  "cognitive-bandwidth": "presence",
  bandwidth: "presence",
  "active-listening": "listening",
  ensemble: "ensemble",
  "group-mind": "ensemble",
  interdependence: "ensemble",
  "emotional-truth": "emotion",
  "be-honest": "emotion",
  "do-feel-say": "emotion",
  "be-brave": "courage",
  commitment: "courage",
  initiation: "courage",
  spontaneity: "courage",
  physicality: "physicality",
  "space-work": "physicality",
  environment: "physicality",
  "fracture-recovery": "recovery",
  "latency-recovery": "recovery",
  "decay-recovery": "recovery",
  "failing-forward": "recovery",
  irreversibility: "recovery",
};

/** Every tag the picker reads as a focus, including the presence extras. */
export const FOCUS_TAGS: readonly string[] = FOCUSES.flatMap((f) => [f.tag, ...f.extraTags]);

function focusesLinkedBy(links: Link[], relation: Link["relation"]): string[] {
  return links
    .filter((link) => link.relation === relation)
    .map((link) => ATOM_FOCUS_MAP[link.id])
    .filter((focus): focus is string => focus !== undefined);
}

/**
 * The focuses an exercise is offered under.
 *
 * One function, used by the picker page, the level pages, the level/focus
 * router and the games hub, so there is one answer to "what does this train".
 * Frontmatter focus tags always count. Beyond those, the hand map wins where
 * it has an entry; otherwise the focuses come from the atoms the exercise
 * illustrates, or, when it illustrates none in the table, the atoms it
 * requires.
 *
 * The `requires` fallback is for exercises only. A format's prerequisites are
 * not its purpose: 19 of 24 formats `require` commitment, because every show
 * needs it, and reading that as a focus filed 13 of the 14 short forms on
 * /improv-games under "Courage & Commitment" and seven of them — Blind Line,
 * Bus Stop, Gorilla Theatre, Micetro, Scenes from a Hat, Superheroes, World's
 * Worst — under courage alone (tracker entry 203, 2026-09-21). A format reads
 * its tags, the hand map and what it `illustrates`, and a format with none of
 * those gets no focus here; the games hub files it under its own "Show
 * formats" facet. The picker never sees formats — every picker surface
 * filters to `type === "exercise"` — so its results are unchanged.
 */
export function exerciseFocuses(
  id: string,
  tags: string[],
  links: Link[] = [],
  type: AtomType = "exercise",
): string[] {
  const fromTags = tags.filter((tag) => FOCUS_TAGS.includes(tag));
  const trained = focusesLinkedBy(links, "illustrates");
  const fallback = type === "format" ? [] : focusesLinkedBy(links, "requires");
  const derived = EXERCISE_FOCUS_MAP[id] ?? (trained.length > 0 ? trained : fallback);
  return [...new Set([...derived, ...fromTags])];
}
