/**
 * The concepts a guide is built on.
 *
 * Every guide declares `entry_atoms` — the principles, techniques and terms it
 * rests on — 224 references across the 42 guides. Nothing rendered them. The
 * link graph ran one way: an atom page lists the guides that cite it, but a
 * guide never linked back to the ideas underneath it, except where the prose
 * auto-linker happened to catch a mention.
 *
 * That left the site's highest-value pages without an explicit route into the
 * concept pages they depend on, and the concept pages without links from the
 * strongest content on the site.
 */

import { getAtomBySlug, getAtomUrl, getBridgeBySlug } from "./content";
import type { AtomType } from "./schema";
import { leadParagraph, stripLeadLabel } from "./seo";

export interface GuideConcept {
  id: string;
  title: string;
  url: string;
  description: string;
  type: AtomType;
}

/**
 * Resolved concepts for a guide, in declared order.
 *
 * References that no longer name a real atom are dropped rather than rendered
 * as dead links; guide-concepts.test.ts reports them so they can be fixed.
 */
export async function getGuideConcepts(slug: string): Promise<GuideConcept[]> {
  const bridge = await getBridgeBySlug(slug);
  if (!bridge) return [];

  const ids = bridge.frontmatter.entry_atoms ?? [];
  const resolved = await Promise.all(
    ids.map(async (id) => {
      const atom = await getAtomBySlug(id);
      if (!atom) return null;
      return {
        id,
        title: atom.frontmatter.title,
        url: getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type }),
        description: leadParagraph(stripLeadLabel(atom.content), 150),
        type: atom.frontmatter.type,
      };
    }),
  );

  return resolved.filter((concept): concept is GuideConcept => concept !== null);
}
