import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { getEpisodesForShow, loadShows } from "@/lib/content";
import { pageTitle } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const shows = await loadShows();

  return {
    /**
     * "Listen" was the whole title — six characters, no subject in it — on a
     * page linked from the nav and the footer of all 376 pages. Nothing on
     * this site targets "improv podcast" and this hub holds three of them, so
     * the term was uncontested and simply unclaimed. The description had the
     * same problem: it said "through the lens of improvisation" and never the
     * word somebody searching would type.
     */
    title: pageTitle("Improv Podcasts: Three Shows and What Each Is For"),
    description:
      "Three improv podcasts built from one set of ideas — a problem worked through in conversation, three-minute concept drills, and long-form arguments.",
    // Every show's feed, so a reader landing on the hub can find them all.
    alternates: {
      canonical: "/listen",
      types: {
        "application/rss+xml": shows.map((s) => ({
          url: `/listen/${s.frontmatter.id}/feed.xml`,
          title: `${s.frontmatter.title} Podcast`,
        })),
      },
    },
  };
}

/**
 * Orienting paragraphs for this hub, held in a const the way guide-categories
 * holds them for the topic hubs. Kept out of JSX so the prose stays plain
 * strings rather than escaped markup, and so prose-overlap reads it as text.
 */
const HUB_ORIENTATION = [
  "The three shows are not three seasons of the same thing. One takes an ordinary problem and works it through in conversation, one gives a single idea about three minutes and a way to try it that night, and one goes long on the ideas underneath the practice. Which you want depends on whether you are looking for company, a drill, or an argument.",
  "Every episode has a written page behind it, and the audio is an alternative to reading rather than an extra on top. If you would rather have the text — to skim it, to search it, or because listening is slower — the episode links through to the page it was made from, and nothing is audio-only.",
  "Each show publishes a feed, so any podcast app that accepts a URL will take it. The site is not a substitute for a player, and the archive here exists so the episodes stay findable and readable rather than living only in an app that decides what you see.",
];

export default async function ListenPage() {
  const shows = await loadShows();

  // Resolve episode counts and find a featured episode
  const showsWithCounts = await Promise.all(
    shows.map(async (s) => {
      const seasons = await getEpisodesForShow(s.frontmatter.id);
      const totalEpisodes = seasons.reduce((sum, season) => sum + season.episodes.length, 0);
      const firstEpisode = seasons[0]?.episodes[0] ?? null;
      return {
        id: s.frontmatter.id,
        title: s.frontmatter.title,
        description: s.frontmatter.description,
        episodeCount: totalEpisodes,
        firstEpisode,
      };
    }),
  );

  const totalEpisodes = showsWithCounts.reduce((sum, s) => sum + s.episodeCount, 0);

  // Feature the flagship show's first episode
  const flagship = showsWithCounts.find((s) => s.id === "physics-of-connection");
  const featured = flagship?.firstEpisode ?? null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "Listen" }]} />

      <header className="mb-12">
        <span className="text-foreground/40 text-xs tracking-wider uppercase">podcast</span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Listen</h1>
        <p className="text-foreground/60 mt-2">
          {totalEpisodes} conversations exploring the physics of human connection through the lens
          of improvisation.
        </p>
      </header>

      <section className="mb-12">
        {HUB_ORIENTATION.map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="text-foreground/70 mb-4">
            {paragraph}
          </p>
        ))}
      </section>

      {/* Featured episode */}
      {featured && (
        <section className="mb-12">
          <h2 className="text-foreground/40 mb-3 text-sm font-semibold tracking-wider uppercase">
            Featured
          </h2>
          <div className="border-foreground/10 bg-surface rounded-lg border p-5">
            <Link href={featured.href} className="font-medium hover:underline">
              {featured.title}
            </Link>
            {featured.description && (
              <p className="text-foreground/50 mt-1 text-sm">{featured.description}</p>
            )}
            <audio controls preload="none" className="mt-3 w-full">
              <source src={featured.audioUrl} type="audio/mpeg" />
            </audio>
          </div>
        </section>
      )}

      {/* Show cards */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Three Shows</h2>
        <div className="space-y-4">
          {showsWithCounts.map((s) => (
            <div
              key={s.id}
              className="border-foreground/10 bg-surface hover:border-foreground/30 relative rounded-lg border p-5 transition-colors"
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold">
                  <Link href={`/listen/${s.id}`} className="after:absolute after:inset-0">
                    {s.title}
                  </Link>
                </h3>
                <span className="text-foreground/40 text-sm">{s.episodeCount} episodes</span>
              </div>
              <p className="text-foreground/50 mt-1 text-sm">{s.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
