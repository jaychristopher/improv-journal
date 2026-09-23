import { getAtomBySlug, getAtomUrl } from "./content";
import { PROMPT_CATEGORIES, type PromptConceptLink, type PromptConceptMap } from "./prompt-bank";

/**
 * The prompt generator's categories as concept links.
 *
 * The six kinds of prompt are the first five atoms of *The Anatomy of a
 * Scene* under other names, and the generator — the above-the-fold tool on
 * the site's fastest-growing page — linked its categories to the guide's own
 * section anchors and to no concept, no drill and no lesson (tracker entry
 * 332, 2026-09-22). `PROMPT_CATEGORIES` now declares the ids; this resolves
 * them to a title and a route on the server, where the graph is readable,
 * so the client component can render "The idea behind it" with a link.
 *
 * Server only: content.ts reads the filesystem. The generator receives the
 * result as a prop from the page that mounts it.
 */

/** Every category's concepts, resolved. An id that is not an atom is dropped, not invented. */
export async function resolvePromptConcepts(): Promise<PromptConceptMap> {
  const entries = await Promise.all(
    PROMPT_CATEGORIES.map(async (category) => [category.id, await resolveIds(category.concepts)]),
  );
  return Object.fromEntries(entries) as PromptConceptMap;
}

/** Ids to links, in the declared order, so the first stays the one the generator names. */
export async function resolveIds(ids: string[]): Promise<PromptConceptLink[]> {
  const links = await Promise.all(
    ids.map(async (id): Promise<PromptConceptLink | null> => {
      const atom = await getAtomBySlug(id);
      if (!atom) return null;
      return {
        id,
        title: atom.frontmatter.title,
        href: getAtomUrl({ id, type: atom.frontmatter.type }),
      };
    }),
  );
  return links.filter((l): l is PromptConceptLink => l !== null);
}
