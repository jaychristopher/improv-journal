import { notFound } from "next/navigation";
import Link from "next/link";
import { loadShows, getShowBySlug, getEpisodesForShow } from "@/lib/content";
import { Breadcrumb } from "@/components/Breadcrumb";

export async function generateStaticParams() {
  const shows = await loadShows();
  return shows.map((s) => ({ show: s.frontmatter.id }));
}

export default async function ShowPage({
  params,
}: {
  params: Promise<{ show: string }>;
}) {
  const { show: showSlug } = await params;
  const show = await getShowBySlug(showSlug);
  if (!show) notFound();

  const fm = show.frontmatter;
  const seasons = await getEpisodesForShow(fm.id);
  const totalEpisodes = seasons.reduce((sum, s) => sum + s.episodes.length, 0);

  // First episode as "Start here"
  const startHere = seasons[0]?.episodes[0] ?? null;

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Listen", href: "/listen" },
          { label: fm.title },
        ]}
      />

      <header className="mb-10">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          podcast
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">{fm.title}</h1>
        <p className="text-foreground/60 mt-2">{fm.description}</p>
        <p className="text-sm text-foreground/40 mt-2">
          {totalEpisodes} episodes &middot;{" "}
          <Link
            href={`/listen/${fm.id}/feed.xml`}
            className="hover:text-foreground/60"
          >
            RSS Feed
          </Link>
        </p>
      </header>

      {/* Start Here */}
      {startHere && (
        <section className="mb-12">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/40 mb-3">
            Start here
          </h2>
          <div className="border border-foreground/10 rounded-lg p-5">
            <Link
              href={startHere.href}
              className="font-medium hover:underline"
            >
              {startHere.title}
            </Link>
            {startHere.description && (
              <p className="text-sm text-foreground/50 mt-1">
                {startHere.description}
              </p>
            )}
            <audio controls preload="none" className="w-full mt-3">
              <source src={startHere.audioUrl} type="audio/mpeg" />
            </audio>
          </div>
        </section>
      )}

      {/* Show intro content */}
      {show.html && (
        <article
          className="prose prose-neutral dark:prose-invert prose-sm max-w-none mb-12"
          dangerouslySetInnerHTML={{ __html: show.html }}
        />
      )}

      {/* Seasons */}
      {seasons.map((season) => (
        <section key={season.label} className="mb-12">
          <h2 className="text-lg font-semibold mb-4">
            {season.label}
            <span className="text-foreground/40 font-normal ml-2">
              ({season.episodes.length})
            </span>
          </h2>
          <div className="space-y-3">
            {season.episodes.map((ep) => (
              <div
                key={ep.audioUrl}
                className="border border-foreground/10 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <Link
                      href={ep.href}
                      className="font-medium text-sm hover:underline"
                    >
                      {ep.title}
                    </Link>
                    {ep.duration && (
                      <span className="text-xs text-foreground/30 ml-2">
                        {ep.duration}
                      </span>
                    )}
                  </div>
                  <Link
                    href={ep.href}
                    className="text-xs text-foreground/40 hover:text-foreground/60 shrink-0 ml-3"
                  >
                    Read &rarr;
                  </Link>
                </div>
                {ep.description && (
                  <p className="text-xs text-foreground/40 mt-1 line-clamp-1">
                    {ep.description}
                  </p>
                )}
                <audio controls preload="none" className="w-full mt-2">
                  <source src={ep.audioUrl} type="audio/mpeg" />
                </audio>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
