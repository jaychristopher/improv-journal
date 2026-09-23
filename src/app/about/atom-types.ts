import type { AtomType } from "@/lib/schema";

/**
 * How the About page names each kind of atom.
 *
 * The page used to list five kinds by hand — "principles, techniques,
 * exercises, definitions, and failure patterns" — which was the type system
 * as it stood in April. Seven of the twelve were missing, among them the laws
 * the site is named for and the four types added since (framework, insight,
 * pedagogy, reference). Keyed by `AtomType` rather than by string so that a
 * type added to the schema without a name here is a compile error, and
 * rendered with live counts so the page cannot drift from the corpus again.
 *
 * Ordered the way the site is: the practice layer first, then the system
 * underneath it, then the diagnosis layer, then the library.
 */
export const ATOM_TYPE_NAMES: Record<AtomType, string> = {
  definition: "definitions",
  technique: "techniques",
  pedagogy: "teaching methods",
  exercise: "exercises",
  format: "formats",
  principle: "principles",
  law: "laws",
  insight: "insights",
  antipattern: "failure modes",
  pattern: "recovery patterns",
  framework: "diagnostic frameworks",
  reference: "references",
};

/** Every kind, in display order, with how many atoms are of it. */
export function countAtomTypes(atoms: { frontmatter: { type: AtomType } }[]) {
  return (Object.keys(ATOM_TYPE_NAMES) as AtomType[]).map((type) => ({
    type,
    name: ATOM_TYPE_NAMES[type],
    count: atoms.filter((a) => a.frontmatter.type === type).length,
  }));
}
