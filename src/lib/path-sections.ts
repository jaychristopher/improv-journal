import { slugifyHeading } from "./content";
import type { PathFrontmatter } from "./schema";

/**
 * The outline a path page renders, and the only copy of it.
 *
 * The path layer had no structure to read at all: 0 headings across the 11
 * bodies, 0 figures, 0 question sections, while a third of its authored prose
 * lives in frontmatter — 1,376 words across 7 hand-written fields against
 * 2,665 in the bodies, a ratio of 0.52 where every other layer is at or under
 * 0.03 (tracker entry 341, 2026-09-22). So the section field of entry 337 left
 * the paths at the share they already had, a deep link into a path had nowhere
 * to land, and the author's sentences arrived inside furniture cards rather
 * than under a heading saying what they answer.
 *
 * These are headings over fields that were already on the page. No field left
 * the page, no authored word changed, and nothing here is derived — the
 * headings are structure, so they carry no "computed" caption.
 *
 * The list lives in its own module because two readers need the same one:
 * src/app/paths/[slug]/page.tsx renders it, and scripts/build-search-index.mjs
 * indexes it. A second copy in the builder would store anchors the page does
 * not render, which fails silently — the reader lands at the top of the page
 * and nothing says why.
 */

/** A section's name in the page, so the page needs no index into the array. */
export type PathSectionKey = "audience" | "outcome" | "method";

export interface PathSection {
  key: PathSectionKey;
  /** The `<h2>` text, verbatim. */
  heading: string;
  /** The id the page renders it under, and the anchor the index stores. */
  id: string;
  /**
   * The authored frontmatter fields that render under the heading. Typed
   * against PathFrontmatter so a renamed field fails to compile rather than
   * quietly indexing nothing.
   */
  fields: readonly (keyof PathFrontmatter)[];
}

function section(
  key: PathSectionKey,
  heading: string,
  fields: readonly (keyof PathFrontmatter)[],
): PathSection {
  // The renderer's own slugifier, not a second rule: an id written by hand
  // here would drift from the one `remarkHeadingIds` gives a body heading of
  // the same words, and the two have to agree for a section anchor to work.
  return { key, heading, id: slugifyHeading(heading), fields };
}

export const PATH_SECTIONS: readonly PathSection[] = [
  section("audience", "Who this is for", ["who_this_is_for", "prerequisites"]),
  section("outcome", "What you will be able to do", ["learning_objectives", "completion_outcome"]),
  section("method", "How to work through it", [
    "estimated_time",
    "practice_cadence",
    "core_habits",
  ]),
];

export function pathSection(key: PathSectionKey): PathSection {
  const found = PATH_SECTIONS.find((candidate) => candidate.key === key);
  if (!found) throw new Error(`unknown path section: ${key}`);
  return found;
}

/**
 * The authored prose under one heading, for the index's opening sentence.
 *
 * The fields are the source and the heading is the structure over them, so
 * what a query should reach under a path's heading is what the author wrote in
 * those fields — the same bargain the rest of the corpus makes, where a
 * section is indexed as its heading plus the first sentence beneath it.
 */
export function pathSectionText(frontmatter: PathFrontmatter, section: PathSection): string {
  return section.fields
    .map((field) => frontmatter[field])
    .flatMap((value) => {
      if (Array.isArray(value)) return value.map(String);
      return typeof value === "string" ? [value] : [];
    })
    .join(" ")
    .trim();
}
