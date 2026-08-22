/**
 * The improv games collection.
 *
 * "improv games" is the site's most winnable keyword by a distance — real
 * monthly demand at a keyword difficulty of 1, on the site's home turf — but
 * the hub listed only the 17 exercise atoms, each cut to a 150-character
 * fragment.
 *
 * Short-form formats belong in the same collection: Freeze Tag and Scenes from
 * a Hat are improv games in every sense a searcher means. Long-form structures
 * like the Harold are not, so membership is taken from each atom's own
 * `shortform` tag rather than guessed at here.
 */

import { getAtomUrl, loadAtoms } from "./content";
import { leadParagraph } from "./seo";

/**
 * Exercise atoms open with a bold "Trains:" label naming the skill built.
 * Useful on the page itself, but as a description it reads as a stray label,
 * so the prefix is dropped and the sentence it introduces is kept.
 */
function stripLeadLabel(markdownContent: string): string {
  const match = /^---[\s\S]*?---\n*/m.exec(markdownContent);
  const frontmatter = match ? match[0] : "";
  const body = markdownContent.slice(frontmatter.length);
  return frontmatter + body.replace(/^\s*\*\*[^*]+\*\*:?\s*/, "");
}

export interface ImprovGame {
  id: string;
  title: string;
  href: string;
  tags: string[];
  /** The entry's opening paragraph, taken from its own content. */
  description: string;
  /** Short-form formats are played as games; exercises are trained as drills. */
  kind: "exercise" | "format";
}

export async function loadImprovGames(): Promise<ImprovGame[]> {
  const atoms = await loadAtoms();

  return atoms
    .filter((atom) => {
      const { type, tags } = atom.frontmatter;
      if (type === "exercise") return true;
      return type === "format" && (tags ?? []).includes("shortform");
    })
    .map((atom) => ({
      id: atom.frontmatter.id,
      title: atom.frontmatter.title,
      href: getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type }),
      tags: atom.frontmatter.tags ?? [],
      description: leadParagraph(stripLeadLabel(atom.content), 200),
      kind: atom.frontmatter.type === "exercise" ? ("exercise" as const) : ("format" as const),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}
