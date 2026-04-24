export interface LevelConfig {
  slug: string;
  label: string;
  title: string;
  description: string;
  keywords: string[];
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
    keywords: [
      "improv exercises for beginners",
      "easy improv games",
      "beginner improv warm ups",
      "improv games no experience",
    ],
  },
  {
    slug: "intermediate",
    label: "Intermediate",
    title: "Intermediate Improv Exercises",
    description:
      "Exercises for improvisers who know the basics and want to push past the plateau. Focus on emotional range, status, recovery, and scene-level skills.",
    keywords: [
      "intermediate improv exercises",
      "improv exercises for experienced",
      "advanced improv warm ups",
    ],
  },
  {
    slug: "advanced",
    label: "Advanced",
    title: "Advanced Improv Exercises",
    description:
      "Exercises for experienced performers working on ensemble depth, show craft, and artistic voice. Assumes comfort with game, character, and longform.",
    keywords: [
      "advanced improv exercises",
      "improv exercises for performers",
      "ensemble improv exercises",
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
