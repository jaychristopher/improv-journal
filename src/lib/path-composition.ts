import { ATOM_TYPE_NAMES } from "@/app/about/atom-types";

import { loadAtoms, loadPaths, loadThreads } from "./content";
import type { AtomType, Audience } from "./schema";

/**
 * What a path is made of, by atom type.
 *
 * Each path's page lists its lessons, and each lesson its atoms, but nothing
 * added the column up: the beginner paths teach nearly every principle and
 * law with a sixth of the techniques and no format, the performer paths
 * twenty-six techniques and eight formats with three principles, and the
 * teacher paths every law and no drill (tracker entry 249, 2026-09-21).
 * None of that was visible on the page a reader chooses a path from. This
 * derives the row — one count per type over the union of atoms the path's
 * lessons compose — so a reader and the author can see the drill-to-principle
 * balance rather than infer it.
 */
interface PathCompositionEntry {
  type: AtomType;
  /**
   * The site's name for the type, as the About page uses it, in the number
   * the count needs: "6 principles", "1 failure mode".
   */
  label: string;
  count: number;
}

/**
 * The types in the schema's own order, so the row reads the way `AtomType`
 * is declared and a type added there without a name in ATOM_TYPE_NAMES is a
 * compile error rather than a silent omission.
 */
export const COMPOSITION_TYPE_ORDER: readonly AtomType[] = [
  "principle",
  "technique",
  "exercise",
  "insight",
  "definition",
  "pattern",
  "antipattern",
  "law",
  "framework",
  "reference",
  "format",
  "pedagogy",
];

/**
 * ATOM_TYPE_NAMES is the plural, and every one of its twelve is a regular
 * plural — "failure modes", "teaching methods", "references" — so the
 * singular is the same word without its "s". The beginner programme's row
 * reads "1 definition · 1 failure mode", not "1 definitions".
 */
export function typeLabel(type: AtomType, count: number): string {
  const plural = ATOM_TYPE_NAMES[type];
  return count === 1 ? plural.replace(/s$/, "") : plural;
}

/**
 * Ordered counts by type over a set of paths' lessons' atoms, distinct across
 * the set. Types with no atom are omitted, so a row is only as long as the
 * curriculum is wide.
 */
async function composeTypes(
  paths: { frontmatter: { threads?: string[] } }[],
): Promise<PathCompositionEntry[]> {
  const [threads, atoms] = await Promise.all([loadThreads(), loadAtoms()]);
  const threadAtoms = new Map(threads.map((t) => [t.frontmatter.id, t.frontmatter.atoms ?? []]));
  const composed = new Set<string>();
  for (const path of paths) {
    for (const threadId of path.frontmatter.threads ?? []) {
      for (const atomId of threadAtoms.get(threadId) ?? []) composed.add(atomId);
    }
  }

  const typeOf = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter.type]));
  const counts = new Map<AtomType, number>();
  for (const atomId of composed) {
    const type = typeOf.get(atomId);
    if (!type) continue;
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }

  return COMPOSITION_TYPE_ORDER.filter((type) => (counts.get(type) ?? 0) > 0).map((type) => ({
    type,
    label: typeLabel(type, counts.get(type)!),
    count: counts.get(type)!,
  }));
}

/**
 * What one path is made of: ordered counts by type over the distinct atoms
 * its lessons compose. An unknown path, or one whose lessons compose nothing
 * the corpus has, yields an empty list.
 */
export async function getPathComposition(pathId: string): Promise<PathCompositionEntry[]> {
  const paths = await loadPaths();
  const path = paths.find((p) => p.frontmatter.id === pathId);
  return path ? composeTypes([path]) : [];
}

/**
 * What an audience is taught: the same row over every path declared for it,
 * atoms counted once across the set. This is entry 249's matrix, one row at a
 * time — the beginner row is 6 principles and 6 laws with no format, the
 * performer row 26 techniques and 8 formats — and the test reads
 * it, because no single path shows the shape; the beginner programme on its
 * own is three techniques, a definition and a failure mode.
 */
export async function getAudienceComposition(audience: Audience): Promise<PathCompositionEntry[]> {
  const paths = await loadPaths();
  return composeTypes(paths.filter((p) => p.frontmatter.audience?.includes(audience)));
}

/** "6 principles · 7 techniques · 7 exercises", the row the path header shows. */
export function formatPathComposition(entries: PathCompositionEntry[]): string {
  return entries.map((e) => `${e.count} ${e.label}`).join(" · ");
}
