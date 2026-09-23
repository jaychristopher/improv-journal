/**
 * What the diagnosis hub lists.
 *
 * `/how-it-works/diagnosis` is the page for the three atom types that
 * organise failure — frameworks, antipatterns, patterns — and it lists them
 * from `loadAtoms` by type rather than by hand. That is the right source, but
 * it lived inline in the page, where no test could read it, and the hub's
 * hand-written prose linked two of the four frameworks. Pulling the selection
 * out here lets a guard assert that every atom of these types is on the hub,
 * so a fifth framework or an eleventh antipattern cannot land without a route.
 */

import { loadAtoms } from "./content";
import type { AtomType } from "./schema";

/** The atom types the diagnosis hub owns, in the order it lists them. */
export const DIAGNOSIS_TYPES = [
  "framework",
  "antipattern",
  "pattern",
] as const satisfies readonly AtomType[];

export type DiagnosisType = (typeof DIAGNOSIS_TYPES)[number];

type Atom = Awaited<ReturnType<typeof loadAtoms>>[number];

export interface DiagnosisAtoms {
  frameworks: Atom[];
  antipatterns: Atom[];
  patterns: Atom[];
}

export async function loadDiagnosisAtoms(): Promise<DiagnosisAtoms> {
  const atoms = await loadAtoms();
  const ofType = (type: DiagnosisType) => atoms.filter((a) => a.frontmatter.type === type);
  return {
    frameworks: ofType("framework"),
    antipatterns: ofType("antipattern"),
    patterns: ofType("pattern"),
  };
}
