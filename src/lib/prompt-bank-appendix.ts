import type { ContentHeading } from "./headings";
import { type Prompt, PROMPT_BANK, PROMPT_CATEGORIES, type PromptCategory } from "./prompt-bank";

/**
 * The rest of the bank, for the foot of the improv prompts guide.
 *
 * The guide's sections list 140 prompts and argue for them; the generator
 * draws from a bank three times that size, which lived only in JavaScript
 * until 2026-09-30. Everything the sections do not list is rendered after
 * the prose by PromptBankAppendix, grouped by kind in the sections' order, so
 * every prompt is in the HTML, prints as a slip, and the title can say the
 * bank's real number. What counts as "listed" is read from the guide's own
 * markdown — every `- ` line, the way prompt-bank.test.ts reads it — so a
 * prompt moved into a section drops out of the appendix on its own.
 */
export const APPENDIX_ID = "the-rest-of-the-bank";

/**
 * The guides that carry the appendix, by slug. One registry, read by the
 * route that renders it and by title-counts.test.ts, which counts the
 * generated items with the written ones so a title can claim the bank's
 * number without the guard calling it a promise the page does not keep.
 */
export const APPENDIX_GUIDES = new Set(["improv-prompts"]);

/** How many items a guide renders beyond its markdown: the appendix, or none. */
export function generatedItems(slug: string, markdown: string): number {
  return APPENDIX_GUIDES.has(slug) ? unlistedPrompts(markdown).length : 0;
}

/** What each kind is called at the foot, where the sections' headings have already argued. */
export const KIND_HEADINGS: Record<PromptCategory, string> = {
  relationship: "Relationships",
  "first-line": "First lines",
  location: "Locations",
  situation: "Situations with something already wrong",
  "audience-question": "Questions for an audience",
  task: "Shared tasks",
};

/** Lower-cased, punctuation dropped, whitespace collapsed: the guard's own comparison. */
export function normalizePrompt(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** The prompts the guide's sections list, normalised. */
export function listedPrompts(markdown: string): Set<string> {
  return new Set(
    markdown
      .split("\n")
      .filter((line) => /^- /.test(line))
      .map((line) => line.replace(/^- /, "").trim())
      .map((line) => line.replace(/^["“]|["”]$/g, ""))
      .map(normalizePrompt),
  );
}

/** The bank minus the sections, in the sections' order of kinds. */
export function unlistedPrompts(markdown: string): Prompt[] {
  const listed = listedPrompts(markdown);
  const order = new Map(PROMPT_CATEGORIES.map((c, i) => [c.id, i]));
  return PROMPT_BANK.filter((p) => !listed.has(normalizePrompt(p.text))).sort(
    (a, b) => (order.get(a.category) ?? 0) - (order.get(b.category) ?? 0),
  );
}

export function appendixHeading(count: number): string {
  return `The Other ${count}, by Kind`;
}

/** The appendix's entry for the page's contents list. */
export function appendixContents(markdown: string): ContentHeading[] {
  const count = unlistedPrompts(markdown).length;
  return count > 0 ? [{ id: APPENDIX_ID, text: appendixHeading(count), level: 2 }] : [];
}
