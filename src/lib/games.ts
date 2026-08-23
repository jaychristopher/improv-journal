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
 *
 * SERP checked 2026-08-23: winnable, and the softest results page on the site.
 * divecollective.org holds position six at DR 8 with no backlinks at all,
 * DR 20 and DR 23 sit at nine and ten, and the traffic is spread across the
 * page rather than taken by one encyclopedic result — positions three to ten
 * share roughly 2,100 visits between them.
 *
 * Note for whoever picks this up: this page is not a bridge, so none of the SEO
 * guards and neither audit script can see it. The verdict above is a comment
 * because there is nowhere structured to put it. Bringing the hand-built app
 * routes into the audit is the outstanding work.
 */

import { getAtomUrl, loadAtoms } from "./content";
import { leadParagraph, stripLeadLabel } from "./seo";

export interface ImprovGame {
  id: string;
  title: string;
  href: string;
  tags: string[];
  /** The entry's opening paragraph, taken from its own content. */
  description: string;
  /** One sentence of rules. See `how_to_play` on AtomFrontmatter. */
  howToPlay?: string;
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
      howToPlay: atom.frontmatter.how_to_play,
      kind: atom.frontmatter.type === "exercise" ? ("exercise" as const) : ("format" as const),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}
