/**
 * The lineage line on a concept page: the schools whose works it cites.
 *
 * A concept belongs to a school when it links one of the school's reference
 * atoms (`getAtomsForTradition`, keyed by `TRADITION_REFS` in content.ts),
 * and the tradition pages list their concepts on that basis. The edge ran
 * one way (tracker entry 331, 2026-09-22): the school page reached the drill
 * and the drill reached the school only if its prose happened to name the
 * founder in a form the entity linker routes there — which for Spolin it
 * never did, since "Spolin" went to her biography. So the tradition that
 * leads the most drills (12 of the 30 with a provenance edge) had the
 * least-linked page of the 5, at 5 body links against Johnstone's 128.
 *
 * This is the guides' lineage line (entry 271, `traditionsOf`) derived for
 * concepts from the edge that already exists: "Lineage: Spolin", one line,
 * linking `/traditions/<id>`, on the pages where the edge is and nowhere
 * else. Nothing is authored and the prose is not consulted.
 */

import { getAtomsForTradition, schoolOfGuide } from "./content";
import { TRADITION_SHORT_NAMES } from "./tradition-curriculum";
import { TRADITION_IDS, type TraditionId } from "./tradition-guides";

export interface AtomLineage {
  id: TraditionId;
  /** The school's name as the curriculum surfaces say it. */
  label: string;
  href: string;
}

/**
 * The hand-off up from a founder's biography guide to the school page, as
 * the guide's header says it (entry 331): the 2 guides that absorb the
 * founder's name link the school in a derived line under the title rather
 * than once in the body. Keyed by tradition id; `schoolOfGuide` in
 * content.ts says which guide is which founder's.
 */
const SCHOOL_HANDOFF_LABEL: Partial<Record<TraditionId, string>> = {
  spolin: "Spolin's theater games",
  close: "iO and the Harold",
};

/** The school line for a guide's header: the founder's school, or null for every other guide. */
export function schoolHandoffOf(slug: string): AtomLineage | null {
  const id = schoolOfGuide(slug);
  if (!id || !(TRADITION_IDS as string[]).includes(id)) return null;
  const label = SCHOOL_HANDOFF_LABEL[id as TraditionId];
  if (!label) return null;
  return { id: id as TraditionId, label, href: `/traditions/${id}` };
}

let _membership: Promise<Map<TraditionId, Set<string>>> | null = null;

/** Tradition → the ids of the concepts that cite its works, computed once per process. */
function membership(): Promise<Map<TraditionId, Set<string>>> {
  if (!_membership) {
    _membership = (async () => {
      const map = new Map<TraditionId, Set<string>>();
      for (const tradition of TRADITION_IDS) {
        const atoms = await getAtomsForTradition(tradition);
        map.set(tradition, new Set(atoms.map((a) => a.frontmatter.id)));
      }
      return map;
    })();
  }
  return _membership;
}

/**
 * The schools a concept cites, in the traditions' canonical order (Johnstone,
 * Spolin, Close, UCB, Annoyance) rather than by weight: a concept cites a
 * school's book or it does not, and the count of citations is not a claim
 * about how much of the idea is the school's. Empty for a concept that cites
 * no school's work, and for a reference atom, which is a work rather than
 * a concept.
 */
export async function lineageOf(atomId: string): Promise<AtomLineage[]> {
  const members = await membership();
  const lineage: AtomLineage[] = [];
  for (const id of TRADITION_IDS) {
    if (!members.get(id)?.has(atomId)) continue;
    lineage.push({ id, label: TRADITION_SHORT_NAMES[id], href: `/traditions/${id}` });
  }
  return lineage;
}
