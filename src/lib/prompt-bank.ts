/**
 * The prompt bank behind the generator on /improv-prompts.
 *
 * The page lists 140 prompts and argues, at length, about what makes one work:
 * specific beats general, personal beats clever, a prompt is not a punchline,
 * evocative not prescriptive. The generator applies that argument as a rubric,
 * so the order a reader meets prompts in is the order the article would rank
 * them, and the ranking shifts with what the reader says they are using them
 * for. A school room weights playability over emotional charge; a show weights
 * specificity, because the audience needs proof the scene came from the word.
 *
 * Every prompt the article lists is in here, and a test holds the two in
 * agreement. The rest were written to the same criteria.
 */

import { PROMPT_ROWS } from "./prompt-bank-data";

export type PromptCategory =
  | "relationship"
  | "first-line"
  | "location"
  | "situation"
  | "audience-question"
  | "task";

export type PromptUseCase = "class" | "show" | "school" | "team";

export type RubricAxis = "specific" | "open" | "charge" | "doable" | "grounded";

export interface Prompt {
  id: string;
  text: string;
  category: PromptCategory;
  scores: Record<RubricAxis, number>;
  /** Lands on somebody's actual life: households, money, bodies, a death. */
  personal: boolean;
  /** Needs experience a fourteen-year-old has not had: jobs, tenancies, a marriage. */
  adult: boolean;
  /** Has a built-in performer role, so it hands the scene to the loudest person. */
  loud: boolean;
}

export interface PromptCategoryInfo {
  id: PromptCategory;
  label: string;
  /** The `##` heading in content/bridges/improv-prompts.md this category enters through. */
  heading: string;
  /** What to do with one, in a sentence — the article's advice, compressed. */
  howToUse: string;
  /**
   * The atoms this category is, under another name. A relationship prompt is
   * the concept `relationship`; a first line is `initiation`; a location is
   * `environment` and `space-work`; something already wrong is `want` and
   * `tilt`; a question for the audience is `suggestion`. The first id is the
   * one the generator names under a drawn prompt, so `howToUse` should read
   * as that concept's page in a sentence. Empty where no atom fits: a shared
   * task is a drill idea, not a concept (tracker entry 332, 2026-09-22).
   */
  concepts: string[];
  /** The exercise that isolates this kind of start, when the graph has one. */
  drill?: string;
}

/** A category's concept, resolved on the server for the generator to link. */
export interface PromptConceptLink {
  id: string;
  title: string;
  href: string;
}

/**
 * What the pages that mount the generator pass it: each category's concepts
 * with a title and a route. The generator is a client component and the
 * graph lives behind node fs, so the resolution happens in the page
 * (prompt-concepts.ts) and arrives as a prop.
 */
export type PromptConceptMap = Record<PromptCategory, PromptConceptLink[]>;

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

export const PROMPT_USE_CASES: PromptUseCaseInfo[] = [
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
export const RUBRIC_WEIGHTS: Record<PromptUseCase, Record<RubricAxis, number>> = {
  class: { specific: 0.2, open: 0.25, charge: 0.2, doable: 0.2, grounded: 0.15 },
  show: { specific: 0.3, open: 0.25, charge: 0.2, doable: 0.1, grounded: 0.15 },
  school: { specific: 0.15, open: 0.2, charge: 0.05, doable: 0.4, grounded: 0.2 },
  team: { specific: 0.15, open: 0.25, charge: 0.15, doable: 0.25, grounded: 0.2 },
};

/**
 * Which prompts a use case may draw from. The school filters are the article's
 * three, verbatim: nothing that lands on somebody's actual life, nothing
 * requiring adult knowledge, nothing that rewards being the loudest. A work
 * room gets adult knowledge back but keeps the other two out.
 */
export function suitsUseCase(prompt: Prompt, useCase: PromptUseCase): boolean {
  switch (useCase) {
    case "school":
      return !prompt.personal && !prompt.adult && !prompt.loud;
    case "team":
      return !prompt.personal && !prompt.loud;
    case "class":
    case "show":
      return true;
  }
}

/**
 * The categories that name a given atom, so a concept page can offer the
 * material to run its idea on: `want` is named by "something already wrong",
 * `commitment` by nothing. Client-safe, so either side of the boundary can ask.
 */
export function categoriesNaming(atomId: string): PromptCategoryInfo[] {
  return PROMPT_CATEGORIES.filter((c) => c.concepts.includes(atomId));
}

/**
 * The gloss after a concept's title: the last sentence of `howToUse`, since
 * the sentence before it restates the prompt and the last one is the advice.
 * "…Play what is between them, not the label." becomes "play what is between
 * them, not the label." after the dash.
 */
export function conceptGloss(howToUse: string): string {
  const sentences = howToUse.match(/[^.!?]+[.!?]+/g) ?? [howToUse];
  const last = sentences[sentences.length - 1].trim();
  return last.charAt(0).toLowerCase() + last.slice(1);
}

/** The query the tool page reads to open on one kind of prompt: `?category=relationship`. */
export const CATEGORY_QUERY_PARAM = "category";

/** The tool page pre-set to one category, for the link from that category's concept. */
export function generatorHrefFor(category: PromptCategory): string {
  return `/tools/improv-prompt-generator?${CATEGORY_QUERY_PARAM}=${category}`;
}

/** The fragment the guide gives a category's heading, so a link can land on it. */
export function categoryAnchor(category: PromptCategoryInfo): string {
  return category.heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Stable, short, and derived from the text: the id survives a reorder of the file. */
function promptId(category: PromptCategory, text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  }
  return `${category}:${hash.toString(36)}`;
}

export const PROMPT_BANK: Prompt[] = PROMPT_ROWS.map(
  ([category, text, specific, open, charge, doable, grounded, flags = ""]) => ({
    id: promptId(category, text),
    text,
    category,
    scores: { specific, open, charge, doable, grounded },
    personal: flags.includes("p"),
    adult: flags.includes("a"),
    loud: flags.includes("l"),
  }),
);
