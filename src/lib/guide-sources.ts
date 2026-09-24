import { getAtomUrl, getBridgeBySlug, loadAtoms, loadBridges } from "@/lib/content";
import type { AtomFrontmatter } from "@/lib/schema";

import { librarySlug } from "./library-slug";

/**
 * The library works a guide stands on, computed from its `entry_atoms`.
 *
 * Tracker entry 334 (2026-09-22): 48 of 78 guides link no library work in
 * their body, yet every one of the 48 declares concepts that between them
 * cite 5 to 9 works (median 9; the median guide of all 78 could inherit 9).
 * The lesson page has rendered "Sources behind this lesson" from exactly
 * this walk since entry 219 — lesson → atom → `ref-*` link — and the guide
 * page, the layer built for search, was the one content page type with no
 * derived sources block. This is the same walk from a guide's declared
 * concepts, so the bibliography a guide has always had is shown on the guide.
 *
 * The walk is copied from `lessonSources` in lesson-sources.ts rather than
 * called, because the guide block names the concept that cites each work
 * beside it and the lesson reader keeps only the count. Same rule: any
 * relation counts (an atom that `contrasts` a work is still grounded in it),
 * and one atom citing a work through 2 relations is 1 citation.
 */

export interface GuideSourceCiter {
  id: string;
  title: string;
  url: string;
}

export interface GuideSource {
  id: string;
  title: string;
  url: string;
  /** The guide's declared concepts that link to this work, in declared order. */
  citedBy: GuideSourceCiter[];
}

/** How many works the block lists before folding the rest into "and N more". */
export const GUIDE_SOURCES_CAP = 6;

/**
 * The works reached through a list of atom ids, each with the atoms that
 * cite it. Ordered by how many of the atoms cite the work, so the book most
 * of the guide leans on comes first, then by title for a stable list.
 */
export function sourcesOf(
  atomIds: readonly string[],
  atoms: readonly { frontmatter: AtomFrontmatter }[],
): GuideSource[] {
  const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
  const citers = new Map<string, GuideSourceCiter[]>();

  for (const id of new Set(atomIds)) {
    const atom = byId.get(id);
    if (!atom) continue;
    const cited = new Set((atom.links ?? []).map((l) => l.id).filter((t) => t.startsWith("ref-")));
    for (const ref of cited) {
      if (byId.get(ref)?.type !== "reference") continue;
      const list = citers.get(ref) ?? [];
      list.push({ id, title: atom.title, url: getAtomUrl({ id, type: atom.type }) });
      citers.set(ref, list);
    }
  }

  return [...citers.entries()]
    .map(([id, citedBy]) => ({
      id,
      title: byId.get(id)!.title,
      url: `/library/${librarySlug(id)}`,
      citedBy,
    }))
    .sort((a, b) => b.citedBy.length - a.citedBy.length || a.title.localeCompare(b.title));
}

/** The library works a guide's `entry_atoms` cite; empty for an unknown guide. */
export async function guideSources(slug: string): Promise<GuideSource[]> {
  const [bridge, atoms] = await Promise.all([getBridgeBySlug(slug), loadAtoms()]);
  if (!bridge) return [];
  return sourcesOf(bridge.frontmatter.entry_atoms ?? [], atoms);
}

export interface CitingGuide {
  slug: string;
  title: string;
  href: string;
  /** How many of the guide's declared concepts cite this work. */
  citedBy: number;
}

/** How many guides the library page lists before folding the rest into "and N more". */
export const CITING_GUIDES_CAP = 12;

let _worksCitedByGuides: Promise<Map<string, CitingGuide[]>> | null = null;

/**
 * Work id → the guides whose sources block names it.
 *
 * The same walk as `guideSources`, run once over every guide and turned
 * round, so the library page lists exactly the guides that list the work
 * back — the shape entry 219 gave the lessons, which found 180 lesson → work
 * links answered by 1 library page until the two surfaces shared a function.
 * The guide that leans on the work hardest first, then by title.
 */
export function worksCitedByGuides(): Promise<Map<string, CitingGuide[]>> {
  if (!_worksCitedByGuides) {
    _worksCitedByGuides = (async () => {
      const [bridges, atoms] = await Promise.all([loadBridges(), loadAtoms()]);
      const index = new Map<string, CitingGuide[]>();
      for (const bridge of bridges) {
        const fm = bridge.frontmatter;
        for (const source of sourcesOf(fm.entry_atoms ?? [], atoms)) {
          const list = index.get(source.id) ?? [];
          list.push({
            slug: bridge.slug,
            title: fm.title,
            href: `/${bridge.slug}`,
            citedBy: source.citedBy.length,
          });
          index.set(source.id, list);
        }
      }
      for (const list of index.values()) {
        list.sort((a, b) => b.citedBy - a.citedBy || a.title.localeCompare(b.title));
      }
      return index;
    })();
  }
  return _worksCitedByGuides;
}

/** The guides whose "Sources behind this guide" block lists a work. */
export async function guidesCitingWork(workId: string): Promise<CitingGuide[]> {
  return (await worksCitedByGuides()).get(workId) ?? [];
}
