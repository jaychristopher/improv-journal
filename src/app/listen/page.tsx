import Link from "next/link";
import { loadShows, getEpisodesForShow, getAudioUrl } from "@/lib/content";
import { Breadcrumb } from "@/components/Breadcrumb";

export default async function ListenPage() {
  const shows = await loadShows();

  // Resolve episode counts and find a featured episode
  const showsWithCounts = await Promise.all(
    shows.map(async (s) => {
      const seasons = await getEpisodesForShow(s.frontmatter.id);
      const totalEpisodes = seasons.reduce(
        (sum, season) => sum + season.episodes.length,
        0
      );
      const firstEpisode = seasons[0]?.episodes[0] ?? null;
      return {
        id: s.frontmatter.id,
        title: s.frontmatter.title,
        description: s.frontmatter.description,
        episodeCount: totalEpisodes,
        firstEpisode,
      };
    })
  );

  const totalEpisodes = showsWithCounts.reduce(
    (sum, s) => sum + s.episodeCount,
    0
  );

  // Feature the flagship show's first episode
  const flagship = showsWithCounts.find(
    (s) => s.id === "physics-of-connection"
  );
  const featured = flagship?.firstEpisode ?? null;

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <Breadcrumb
        crumbs={[{ label: "Home", href: "/" }, { label: "Listen" }]}
      />

      <header className="mb-12">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          podcast
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Listen</h1>
        <p className="text-foreground/60 mt-2">
          {totalEpisodes} conversations between Chris and Sarah — exploring the
          physics of human connection through the lens of improvisation.
        </p>
      </header>

      {/* Featured episode */}
      {featured && (
        <section className="mb-12">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/40 mb-3">
            Featured
          </h2>
          <div className="border border-foreground/10 rounded-lg bg-surface p-5">
            <Link
              href={featured.href}
              className="font-medium hover:underline"
            >
              {featured.title}
            </Link>
            {featured.description && (
              <p className="text-sm text-foreground/50 mt-1">
                {featured.description}
              </p>
            )}
            <audio controls preload="none" className="w-full mt-3">
              <source src={featured.audioUrl} type="audio/mpeg" />
            </audio>
          </div>
        </section>
      )}

      {/* Show cards */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Three Shows</h2>
        <div className="space-y-4">
          {showsWithCounts.map((s) => (
            <Link
              key={s.id}
              href={`/listen/${s.id}`}
              className="block border border-foreground/10 rounded-lg bg-surface p-5 hover:border-foreground/30 transition-colors"
            >
              <div className="flex justify-between items-baseline">
                <h3 className="font-semibold">{s.title}</h3>
                <span className="text-sm text-foreground/40">
                  {s.episodeCount} episodes
                </span>
              </div>
              <p className="text-sm text-foreground/50 mt-1">
                {s.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
