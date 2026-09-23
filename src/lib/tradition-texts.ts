/**
 * The texts a tradition is defined by, for the tradition page and the hub.
 *
 * Each school is defined in code by its books: `getAtomsForTradition` in
 * content.ts admits an atom to a tradition when it links one of the reference
 * ids in `TRADITION_REFS`, and `tradition-disagreements` keys the same ids
 * as `TRADITION_REF_IDS`. Until 2026-09-22 the tradition page rendered the
 * concepts found by walking to those works, the objections and the guides,
 * and never the works themselves — the five pages carried 0 links to any
 * library work while the works linked their tradition page from every one
 * of theirs, so the join ran one way and the page that says "this is the
 * school" could not send a reader to the book that is the school (tracker
 * entry 288). The books were the page's input, and the input was not shown.
 *
 * This module reads the table through `TRADITION_REF_IDS`, which content.ts
 * does not export its copy of; a test asserts the two tables agree so the
 * definition the page shows is the definition the membership uses.
 */

import { getAtomUrl, loadAtoms } from "./content";
import { type CitationRef, citedWorkId } from "./jsonld-edges";
import type { AtomFrontmatter } from "./schema";
import { TRADITION_REF_IDS } from "./tradition-disagreements";

export interface TraditionText {
  id: string;
  /** The work's full published title where the atom declares one, else the atom's title. */
  title: string;
  authors: string[];
  /** Publication year, absent for a continuously updated work such as a Substack. */
  year?: string;
  url: string;
  /** Non-reference atoms with an edge to the work — the library page's own count. */
  citedBy: number;
  /** The `#work` reference the library page declares, for the page's `citation` list. */
  citation?: CitationRef;
}

/** The reference ids each tradition is defined by, in table order. */
export function traditionTextIds(tradition: string): string[] {
  return TRADITION_REF_IDS[tradition] ?? [];
}

/** How many non-reference atoms cite each reference atom. */
function citeCounts(atoms: readonly { frontmatter: AtomFrontmatter }[]): Map<string, number> {
  const isRef = new Set(
    atoms.filter((a) => a.frontmatter.type === "reference").map((a) => a.frontmatter.id),
  );
  const counts = new Map<string, number>();
  for (const a of atoms) {
    if (a.frontmatter.type === "reference") continue;
    for (const link of a.frontmatter.links ?? []) {
      if (isRef.has(link.id)) counts.set(link.id, (counts.get(link.id) ?? 0) + 1);
    }
  }
  return counts;
}

function toText(fm: AtomFrontmatter, citedBy: number): TraditionText {
  const url = getAtomUrl({ id: fm.id, type: fm.type });
  const work = fm.work;
  return {
    id: fm.id,
    title: work?.name ?? fm.title,
    authors: work?.authors ?? [],
    ...(work?.published ? { year: work.published } : {}),
    url,
    citedBy,
    ...(work ? { citation: { "@type": work.type, "@id": citedWorkId(url), name: work.name } } : {}),
  };
}

/**
 * The works a tradition is defined by, in the table's order, each with its
 * bibliographic detail and the count of concepts citing it. An id the table
 * names but no atom carries is dropped rather than rendered as a card with
 * no page behind it; the population test catches that case.
 */
export async function traditionTexts(tradition: string): Promise<TraditionText[]> {
  const ids = traditionTextIds(tradition);
  if (ids.length === 0) return [];
  const atoms = await loadAtoms();
  const counts = citeCounts(atoms);
  const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
  const out: TraditionText[] = [];
  for (const id of ids) {
    const fm = byId.get(id);
    if (!fm || fm.type !== "reference") continue;
    out.push(toText(fm, counts.get(id) ?? 0));
  }
  return out;
}

/** `traditionTexts` for every tradition at once, for the hub's cards. */
export async function textCountsByTradition(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const tradition of Object.keys(TRADITION_REF_IDS)) {
    counts[tradition] = (await traditionTexts(tradition)).length;
  }
  return counts;
}
