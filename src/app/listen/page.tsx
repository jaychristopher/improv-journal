import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { getEpisodesForShow, loadShows } from "@/lib/content";

export const metadata: Metadata = {
  title: "Listen",
  description:
    "Podcast conversations exploring the physics of human connection through the lens of improvisation.",
  alternates: { canonical: "/listen" },
};

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
            <Link
              key={s.id}
              href={`/listen/${s.id}`}
              className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-5 transition-colors"
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold">{s.title}</h3>
                <span className="text-foreground/40 text-sm">{s.episodeCount} episodes</span>
              </div>
              <p className="text-foreground/50 mt-1 text-sm">{s.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
