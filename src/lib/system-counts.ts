/**
 * Counts of the laws and principles the site is built on.
 *
 * These numbers appear in the site-wide meta description, the Organization
 * markup, the default share card and the principles hub's own title and
 * heading. They were hardcoded as "six laws, eight principles" and then a
 * seventh law and a ninth principle were written, leaving the homepage
 * description, the structured data and a page title that said "The 8
 * Principles" above a list of nine.
 *
 * Deriving them from the content means the claim cannot drift from the thing
 * it describes.
 */

import { loadAtoms } from "./content";

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];

/** Spelled-out number for use in prose, falling back to digits past twelve. */
export function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

export interface SystemCounts {
  laws: number;
  principles: number;
  /** e.g. "Seven laws, nine principles" */
  tagline: string;
}

export async function getSystemCounts(): Promise<SystemCounts> {
  const atoms = await loadAtoms();
  const laws = atoms.filter((a) => a.frontmatter.type === "law").length;
  const principles = atoms.filter((a) => a.frontmatter.type === "principle").length;

  const capitalised = numberWord(laws).charAt(0).toUpperCase() + numberWord(laws).slice(1);
  return {
    laws,
    principles,
    tagline: `${capitalised} laws, ${numberWord(principles)} principles`,
  };
}
