import type { AtomFrontmatter } from "./schema";

/**
 * The line a concept page shows where its Source group would otherwise be
 * missing.
 *
 * 28 of the 173 concepts have no edge to any library work in either
 * direction, and they are the practice and diagnosis layers almost entirely:
 * ten formats, ten exercises, the three recovery patterns, the site's own
 * collapse-mode and scene-failure frameworks (tracker entry 284, 2026-09-22).
 * Every definition, principle, antipattern, insight and pedagogy atom has a
 * work behind it. Until this line the unsourced page omitted the group and
 * said nothing, so a reader could not tell "no source" from "not shown", and
 * the things the site tells a reader to *do* were the ones with no
 * provenance stated. The line states the absence instead.
 *
 * It is not shown where the atom records a source by another route: a
 * `sources:` entry (the raw material the Source group lists), a "Specific
 * sources" section in the body, or an attribution note that calls the idea
 * this site's synthesis — the claim that stands in for a citation. Those
 * are the atoms that have said something about where the idea came from;
 * the line is for the ones that have said nothing.
 */
export const NO_SOURCE_LINE = "No source recorded";

type Atom = { frontmatter: AtomFrontmatter; content: string };

/** `## Specific sources` as a heading anywhere in the body. */
export function hasSpecificSources(body: string): boolean {
  return /^#{2,3}\s+Specific sources\b/im.test(body);
}

/**
 * The body calls the idea a synthesis. Three attribution notes do on
 * 2026-09-22 — decay-recovery and systemic-collapse-modes as "original
 * synthesis", diagnosing-scene-failure as "this site's synthesis" — and the
 * word is the claim, so the search is for the word.
 */
export function claimsSynthesis(body: string): boolean {
  return /synthesis/i.test(body);
}

/**
 * Whether an atom has an edge to a library work in either direction: it
 * names a `reference` atom, or a `reference` atom names it.
 */
export function hasWorkEdge(
  fm: AtomFrontmatter,
  atoms: readonly { frontmatter: AtomFrontmatter }[],
): boolean {
  const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
  if ((fm.links ?? []).some((l) => byId.get(l.id)?.type === "reference")) return true;
  return atoms.some(
    (a) =>
      a.frontmatter.type === "reference" && (a.frontmatter.links ?? []).some((l) => l.id === fm.id),
  );
}

/**
 * True when the page should carry the line: a concept (not a work) with no
 * work edge, no `sources:` entry, no Specific sources section and no
 * synthesis claim.
 */
export function noSourceRecorded(
  atom: Atom,
  atoms: readonly { frontmatter: AtomFrontmatter }[],
): boolean {
  const fm = atom.frontmatter;
  if (fm.type === "reference") return false;
  if (fm.sources && fm.sources.length > 0) return false;
  if (hasWorkEdge(fm, atoms)) return false;
  if (hasSpecificSources(atom.content)) return false;
  if (claimsSynthesis(atom.content)) return false;
  return true;
}

/** The ids of every atom that carries the line, sorted, for the guard. */
export function unsourcedConceptIds(atoms: readonly Atom[]): string[] {
  return atoms
    .filter((a) => noSourceRecorded(a, atoms))
    .map((a) => a.frontmatter.id)
    .sort();
}
