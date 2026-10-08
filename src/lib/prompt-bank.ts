/**
 * The prompt bank behind the generator on /improv-prompts.
 *
 * The page lists 140 prompts in its sections, the rest of this bank at its
 * foot (PromptBankAppendix), and argues, at length, about what makes one work:
 * specific beats general, personal beats clever, a prompt is not a punchline,
 * evocative not prescriptive. The generator applies that argument as a rubric,
 * so the order a reader meets prompts in is the order the article would rank
 * them, and the ranking shifts with what the reader says they are using them
 * for. A school room weights playability over emotional charge; a show weights
 * specificity, because the audience needs proof the scene came from the word.
 *
 * Every prompt the article lists is in here, and a test holds the two in
 * agreement. The rest were written to the same criteria.
 *
 * Since 2026-09-30 a row can also say who it needs (`g` a group, `d` a pair
 * worth naming), whether it reads as one line of a who-where-what draw (`x`
 * when it does not), and carry one coaching line for the room. Those came out
 * of reading every other generator in the field (docs/improv-prompts-
 * competitors.md): the combined draw, the cast and the per-prompt coaching
 * were the three things the field had that this bank did not, and each is a
 * field on a row rather than a control on the screen.
 */

import { PROMPT_ROWS } from "./prompt-bank-data";
import {
  ANYWHERE,
  PROMPT_SETTING_ROWS,
  PROMPT_SETTINGS,
  type PromptSetting,
} from "./prompt-settings-data";
import { WORD_ROWS, type WordRow } from "./prompt-words-data";

export type PromptCategory =
  | "relationship"
  | "first-line"
  | "location"
  | "situation"
  | "audience-question"
  | "task";

/**
 * The one kind that is not a scene starter: a single word for a longform
 * opening, kept in its own bank (prompt-words-data.ts) so the guide's count
 * of scene starters stays honest. Its rows are Prompts with this category.
 */
export type WordCategory = "word";

/**
 * What the reader can ask for: one of the six categories, one word, or the classic —
 * a relationship, a location and a task drawn together as one start.
 */
export type PromptKind = PromptCategory | WordCategory | "classic";

/** The three lines of a classic draw, in the order they are shown. */
export type ClassicPart = "relationship" | "location" | "task";
export const CLASSIC_PARTS: ClassicPart[] = ["relationship", "location", "task"];

/** What each line of the classic is called on the card. */
export const CLASSIC_PART_LABELS: Record<ClassicPart, string> = {
  relationship: "Who",
  location: "Where",
  task: "What",
};

/**
 * Where the prompts are used, or `any`: the blend of all four, which is what
 * the generator uses until the cog names a room (2026-09-30).
 */
export type PromptUseCase = "any" | "class" | "show" | "school" | "team";

export type RubricAxis = "specific" | "open" | "charge" | "doable" | "grounded";

/** Who a prompt needs, where that is worth saying on the card. */
export type PromptCast = "pair" | "group";

export interface Prompt {
  id: string;
  text: string;
  category: PromptCategory | WordCategory;
  scores: Record<RubricAxis, number>;
  /** Lands on somebody's actual life: households, money, bodies, a death. */
  personal: boolean;
  /** Needs experience a fourteen-year-old has not had: jobs, tenancies, a marriage. */
  adult: boolean;
  /** Has a built-in performer role, so it hands the scene to the loudest person. */
  loud: boolean;
  /**
   * Reads as one line of a who-where-what draw. Off for a relationship that
   * names its own place or moment, a task that names its own people, and a
   * constraint rather than a start; always off outside the three classic
   * categories.
   */
  combinable: boolean;
  /**
   * The kinds of place this line can sit in. The classic intersects them so
   * the three lines can share a room — see prompt-settings-data.ts for why
   * pure axes were not enough. Empty where nothing combines.
   */
  settings: readonly PromptSetting[];
  /** A pair worth naming, or a group of three or more; unsaid for most. */
  cast?: PromptCast;
  /** One coaching line for the room — what to fight about, what to play straight. */
  coach?: string;
}

export interface PromptKindInfo {
  id: PromptKind;
  label: string;
  /** The `##` heading in content/bridges/improv-prompts.md this kind enters through. */
  heading: string;
  /** What to do with one, in a sentence — the article's advice, compressed. */
  howToUse: string;
  /**
   * The atoms this kind is, under another name. A relationship prompt is
   * the concept `relationship`; a first line is `initiation`; a location is
   * `environment` and `space-work`; something already wrong is `want` and
   * `tilt`; a question for the audience is `suggestion`; the classic is
   * `base-reality`. The first id is the one the generator names under a
   * drawn prompt, so `howToUse` should read as that concept's page in a
   * sentence. Empty where no atom fits: a shared task is a drill idea, not a
   * concept (tracker entry 332, 2026-09-22).
   */
  concepts: string[];
  /** The exercise that isolates this kind of start, when the graph has one. */
  drill?: string;
  /** The categories a combined kind draws one line from each of. */
  combines?: ClassicPart[];
}

export interface PromptCategoryInfo extends PromptKindInfo {
  id: PromptCategory;
}

/** A kind's concept, resolved on the server for the generator to link. */
export interface PromptConceptLink {
  id: string;
  title: string;
  href: string;
}

/**
 * What the pages that mount the generator pass it: each kind's concepts
 * with a title and a route. The generator is a client component and the
 * graph lives behind node fs, so the resolution happens in the page
 * (prompt-concepts.ts) and arrives as a prop.
 */
export type PromptConceptMap = Record<PromptKind, PromptConceptLink[]>;

export interface PromptUseCaseInfo {
  id: PromptUseCase;
  label: string;
  description: string;
}

export const PROMPT_CATEGORIES: PromptCategoryInfo[] = [
  {
    id: "relationship",
    label: "A relationship",
    heading: "Relationship Prompts",
    howToUse:
      "Two people with something already between them. Play what is between them, not the label.",
    concepts: ["relationship"],
  },
  {
    id: "first-line",
    label: "A first line",
    heading: "First Lines You Can Open With",
    howToUse:
      "Say it. Then find out what it means. The first thing it makes you feel is the scene.",
    concepts: ["initiation"],
    drill: "first-line-drill",
  },
  {
    id: "location",
    label: "A location",
    heading: "Locations Worth Playing",
    howToUse:
      "Touch something in it before you speak. The objects will tell you what the scene is.",
    concepts: ["environment", "space-work"],
  },
  {
    id: "situation",
    label: "Something already wrong",
    heading: "Situations With Something Already Wrong",
    howToUse: "Play it completely straight. The comedy is in how much the people care.",
    concepts: ["want", "tilt"],
  },
  {
    id: "audience-question",
    label: "A question for the audience",
    heading: "Questions to Ask an Audience",
    howToUse:
      "Ask it, take the first honest answer, and build the scene from the feeling under it.",
    concepts: ["suggestion"],
  },
  {
    id: "task",
    label: "A shared task",
    heading: "Using Prompts in a Drama Class",
    howToUse: "Actually try to do the thing. Nobody has to be funny; the task carries the scene.",
    concepts: [],
  },
];

/**
 * The classic start: who, where, what, drawn together. Every generator with
 * any depth offers this and it is the one thing a reader arriving from
 * "improv scene generator" expects; here each line is individually ranked,
 * and tapping a line redraws that line alone (docs/improv-prompts-
 * competitors.md, items 1 and 2).
 */
export const CLASSIC_KIND: PromptKindInfo = {
  id: "classic",
  label: "Who, where, what",
  heading: "The Classic Start: Who, Where, What",
  howToUse:
    "Tap a line to change just that one. Play all three as true, and the first line is yours.",
  concepts: ["base-reality"],
  combines: CLASSIC_PARTS,
};

/**
 * The one word a longform opening takes: the Harold's suggestion, the word
 * an Armando monologist tells a true story from. The guide argues a bare
 * noun is the weakest start for a two-person scene, and it is; the opening
 * is the one place the single word is the right ask, because the scenes
 * come from three minutes of association and not from the word. Its rows
 * live in their own bank (prompt-words-data.ts) outside the scene-starter
 * count, and its concept is `opening` rather than the Harold: the line
 * under a drawn word prints the atom's title, and "Opening" is what the
 * word is for (2026-09-30, PG-2).
 */
export const WORD_KIND: PromptKindInfo = {
  id: "word",
  label: "One word",
  heading: "One Word for a Longform Opening",
  howToUse:
    "One word is a seed, not a scene. Say it back, free-associate as a group, and start the first scene from the third thing it made you think of.",
  concepts: ["opening"],
  drill: "organic-opening-exercise",
};

/** Everything the kind step offers: the classic first, then the word, then the six. */
export const PROMPT_KINDS: PromptKindInfo[] = [CLASSIC_KIND, WORD_KIND, ...PROMPT_CATEGORIES];

export const PROMPT_USE_CASES: PromptUseCaseInfo[] = [
  {
    id: "any",
    label: "Anywhere",
    description: "Every prompt, weighted for all four rooms at once.",
  },
  {
    id: "class",
    label: "A class or rehearsal",
    description: "Adults learning. Anything goes; depth first.",
  },
  {
    id: "show",
    label: "A show, with an audience",
    description: "Needs to prove the scene came from the prompt.",
  },
  {
    id: "school",
    label: "A school drama room",
    description: "Under-eighteens. Nothing that lands on a real life.",
  },
  {
    id: "team",
    label: "A team or work session",
    description: "Adults who arrived defended. Tasks to be honest inside.",
  },
];

/** The room the generator uses until the cog says otherwise: the blend. */
export const DEFAULT_USE_CASE: PromptUseCase = "any";

export const RUBRIC_AXES: { id: RubricAxis; label: string; question: string }[] = [
  {
    id: "specific",
    label: "Specificity",
    question: "Does it arrive with texture — a smell, a light, an object — or is it a category?",
  },
  {
    id: "open",
    label: "Openness",
    question: "How many different scenes could two people make from it, and is a joke pre-loaded?",
  },
  {
    id: "charge",
    label: "Charge",
    question: "Is something already at stake between the people before anyone speaks?",
  },
  {
    id: "doable",
    label: "Playability",
    question: "Can a player start inside three seconds without inventing anything?",
  },
  {
    id: "grounded",
    label: "Groundedness",
    question: "Is the base reality ordinary, so the partner pays nothing to understand it?",
  },
];

/**
 * How much each axis matters, by what the reader is using the prompt for.
 *
 * The article's own reasoning, made numeric. A class can afford charge because
 * there is a teacher to hold the room. A school room cannot, and playability
 * is what stops a fourteen-year-old freezing. A show needs specificity most,
 * because the audience is auditing whether the scene came from the word. A
 * team session sits between: adults, so charge is fine, but they stay clever
 * unless the prompt gives them a task to be honest inside.
 */
const ROOM_WEIGHTS: Record<Exclude<PromptUseCase, "any">, Record<RubricAxis, number>> = {
  class: { specific: 0.2, open: 0.25, charge: 0.2, doable: 0.2, grounded: 0.15 },
  show: { specific: 0.3, open: 0.25, charge: 0.2, doable: 0.1, grounded: 0.15 },
  school: { specific: 0.15, open: 0.2, charge: 0.05, doable: 0.4, grounded: 0.2 },
  team: { specific: 0.15, open: 0.25, charge: 0.15, doable: 0.25, grounded: 0.2 },
};

/**
 * The blend: each axis at the mean of the four rooms. What a reader gets
 * until the cog names a room — the owner's call on 2026-09-30, that the room
 * is nominally useful next to the kind and should not be the first question.
 */
function blend(rooms: Record<string, Record<RubricAxis, number>>): Record<RubricAxis, number> {
  const list = Object.values(rooms);
  return Object.fromEntries(
    RUBRIC_AXES.map((axis) => [
      axis.id,
      list.reduce((sum, weights) => sum + weights[axis.id], 0) / list.length,
    ]),
  ) as Record<RubricAxis, number>;
}

export const RUBRIC_WEIGHTS: Record<PromptUseCase, Record<RubricAxis, number>> = {
  any: blend(ROOM_WEIGHTS),
  ...ROOM_WEIGHTS,
};

/**
 * Which prompts a use case may draw from. The school filters are the article's
 * three, verbatim: nothing that lands on somebody's actual life, nothing
 * requiring adult knowledge, nothing that rewards being the loudest. A work
 * room gets adult knowledge back but keeps the other two out. The blend and
 * the two adult rooms admit everything.
 */
export function suitsUseCase(prompt: Prompt, useCase: PromptUseCase): boolean {
  switch (useCase) {
    case "school":
      return !prompt.personal && !prompt.adult && !prompt.loud;
    case "team":
      return !prompt.personal && !prompt.loud;
    case "any":
    case "class":
    case "show":
      return true;
  }
}

/**
 * The kinds that name a given atom, so a concept page can offer the material
 * to run its idea on: `want` is named by "something already wrong",
 * `base-reality` by the classic, `commitment` by nothing. Client-safe, so
 * either side of the boundary can ask.
 */
export function categoriesNaming(atomId: string): PromptKindInfo[] {
  return PROMPT_KINDS.filter((c) => c.concepts.includes(atomId));
}

/**
 * The tool page, for the try line on a concept. It once carried
 * `?category=<kind>` so the first tap skipped to that kind; since the kind
 * is the first tap (2026-09-30) the page is enough.
 */
export const GENERATOR_HREF = "/tools/improv-prompt-generator";

/** The fragment the guide gives a kind's heading, so a link can land on it. */
export function categoryAnchor(category: PromptKindInfo): string {
  return category.heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Stable, short, and derived from the text: the id survives a reorder of the file. */
function promptId(category: Prompt["category"], text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  }
  return `${category}:${hash.toString(36)}`;
}

const CLASSIC_SET = new Set<Prompt["category"]>(CLASSIC_PARTS);

/**
 * One row into one prompt, for both banks: the category comes from the row
 * in the bank and from the caller for the words, and everything else — the
 * hashed id, the five scores, the flags read into fields — is the same rule,
 * so the ranking cannot treat the two banks differently by accident.
 */
/**
 * A row's settings, with `anywhere` expanded to the whole taxonomy so that
 * compatibility is a plain intersection everywhere and nothing has to special
 * case the portable prompts.
 */
export function settingsFor(text: string): readonly PromptSetting[] {
  const raw = PROMPT_SETTING_ROWS[text];
  if (!raw) return [];
  if (raw === ANYWHERE) return PROMPT_SETTINGS;
  return raw.split("|") as PromptSetting[];
}

export function rowToPrompt(
  category: Prompt["category"],
  [text, specific, open, charge, doable, grounded, flags = "", coach]: WordRow,
): Prompt {
  return {
    id: promptId(category, text),
    text,
    category,
    scores: { specific, open, charge, doable, grounded },
    personal: flags.includes("p"),
    adult: flags.includes("a"),
    loud: flags.includes("l"),
    combinable: CLASSIC_SET.has(category) && !flags.includes("x"),
    settings: settingsFor(text),
    ...(flags.includes("g") ? { cast: "group" as const } : {}),
    ...(flags.includes("d") ? { cast: "pair" as const } : {}),
    ...(coach ? { coach } : {}),
  };
}

export const PROMPT_BANK: Prompt[] = PROMPT_ROWS.map(([category, ...fields]) =>
  rowToPrompt(category, fields),
);

/** The words, ranked and drawn by the same rule; ids `word:<hash>`, a namespace of their own. */
export const WORD_BANK: Prompt[] = WORD_ROWS.map((fields) => rowToPrompt("word", fields));
