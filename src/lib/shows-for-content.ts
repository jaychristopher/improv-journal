import { getEpisodesForShow, loadShows } from "./content";

/**
 * Which show, if any, carries a given page as an episode.
 *
 * Derived from the shows' own season filters rather than from content type.
 * The Improv Lab's seasons are the principles and the exercises, so a
 * technique page with audio is a page with audio — not an episode of it. An
 * earlier version mapped by type and had 95 atom pages claiming membership of
 * a show whose feed carries 26.
 */
export interface EpisodeSeries {
  id: string;
  title: string;
}

let cache: Map<string, EpisodeSeries> | null = null;

async function buildIndex(): Promise<Map<string, EpisodeSeries>> {
  if (cache) return cache;
  const index = new Map<string, EpisodeSeries>();

  for (const show of await loadShows()) {
    const series = { id: show.frontmatter.id, title: show.frontmatter.title };
    for (const season of await getEpisodesForShow(show.frontmatter.id)) {
      for (const episode of season.episodes) {
        // First show wins, so a page cannot claim two series.
        if (!index.has(episode.href)) index.set(episode.href, series);
      }
    }
  }

  cache = index;
  return index;
}

export async function getSeriesForPage(pageUrl: string): Promise<EpisodeSeries | null> {
  return (await buildIndex()).get(pageUrl) ?? null;
}
