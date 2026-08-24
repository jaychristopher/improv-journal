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
  },
  {
    slug: "ensemble",
    label: "Ensemble & Group Mind",
    tag: "ensemble",
    extraTags: [],
    description:
      "Exercises that build shared awareness, group coordination, and the ability to create as one.",
  },
  {
    slug: "emotion",
    label: "Emotion & Honesty",
    tag: "emotion",
    extraTags: [],
    description: "Exercises that develop emotional range, vulnerability, and authentic response.",
  },
  {
    slug: "courage",
    label: "Courage & Commitment",
    tag: "courage",
    extraTags: [],
    description:
      "Exercises that practice bold choices, full commitment, and acting before overthinking.",
  },
  {
    slug: "physicality",
    label: "Physicality & Space",
    tag: "physicality",
    extraTags: [],
    description: "Exercises that develop body awareness, spatial work, and physical communication.",
  },
  {
    slug: "recovery",
    label: "Recovery & Adaptation",
    tag: "recovery",
    extraTags: [],
    description:
      "Exercises that train handling mistakes, staying flexible, and building from the unexpected.",
  },
];

export function getLevelBySlug(slug: string): LevelConfig | undefined {
  return LEVELS.find((l) => l.slug === slug);
}

export function getFocusBySlug(slug: string): FocusConfig | undefined {
  return FOCUSES.find((f) => f.slug === slug);
}

// Focus tag mapping for exercises
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
