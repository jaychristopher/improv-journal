import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/Breadcrumb";
import { getEpisodesForShow, getShowBySlug, loadShows } from "@/lib/content";

export async function generateStaticParams() {
  const shows = await loadShows();
  return shows.map((s) => ({ show: s.frontmatter.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ show: string }>;
}): Promise<Metadata> {
  const { show: showSlug } = await params;
  const show = await getShowBySlug(showSlug);
  if (!show) return {};
  return {
    title: show.frontmatter.title,
    description: show.frontmatter.description,
    alternates: { canonical: `/listen/${showSlug}` },
    openGraph: {
      title: show.frontmatter.title,
      description: show.frontmatter.description,
      url: `/listen/${showSlug}`,
      type: "article",
    },
  };
}

export default async function ShowPage({ params }: { params: Promise<{ show: string }> }) {
  const { show: showSlug } = await params;
  const show = await getShowBySlug(showSlug);
  if (!show) notFound();

  const fm = show.frontmatter;
  const seasons = await getEpisodesForShow(fm.id);
  const totalEpisodes = seasons.reduce((sum, s) => sum + s.episodes.length, 0);

  // First episode as "Start here"
  const startHere = seasons[0]?.episodes[0] ?? null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Listen", href: "/listen" },
          { label: fm.title },
        ]}
      />

      <header className="mb-10">
        <span className="text-foreground/40 text-xs tracking-wider uppercase">podcast</span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{fm.title}</h1>
        <p className="text-foreground/60 mt-2">{fm.description}</p>
        <p className="text-foreground/40 mt-2 text-sm">
          {totalEpisodes} episodes &middot;{" "}
          <Link href={`/listen/${fm.id}/feed.xml`} className="hover:text-foreground/60">
            RSS Feed
          </Link>
        </p>
      </header>

      {/* Start Here */}
      {startHere && (
        <section className="mb-12">
          <h2 className="text-foreground/40 mb-3 text-sm font-semibold tracking-wider uppercase">
            Start here
          </h2>
          <div className="border-foreground/10 bg-surface rounded-lg border p-5">
            <Link href={startHere.href} className="font-medium hover:underline">
              {startHere.title}
            </Link>
            {startHere.description && (
              <p className="text-foreground/50 mt-1 text-sm">{startHere.description}</p>
            )}
            <audio controls preload="none" className="mt-3 w-full">
              <source src={startHere.audioUrl} type="audio/mpeg" />
            </audio>
          </div>
        </section>
      )}

      {/* Show intro content */}
      {show.html && (
        <article
          className="prose prose-neutral dark:prose-invert prose-sm mb-12 max-w-none"
          dangerouslySetInnerHTML={{ __html: show.html }}
        />
      )}

      {/* Seasons */}
      {seasons.map((season) => (
        <section key={season.label} className="mb-12">
          <h2 className="mb-4 text-lg font-semibold">
            {season.label}
            <span className="text-foreground/40 ml-2 font-normal">({season.episodes.length})</span>
          </h2>
          <div className="space-y-3">
            {season.episodes.map((ep) => (
              <div
                key={ep.audioUrl}
                className="border-foreground/10 bg-surface rounded-lg border p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Link href={ep.href} className="text-sm font-medium hover:underline">
                      {ep.title}
                    </Link>
                    {ep.duration && (
                      <span className="text-foreground/30 ml-2 text-xs">{ep.duration}</span>
                    )}
                  </div>
                  <Link
                    href={ep.href}
                    className="text-foreground/40 hover:text-foreground/60 ml-3 shrink-0 text-xs"
                  >
                    Transcript &rarr;
                  </Link>
                </div>
                {ep.description && (
                  <p className="text-foreground/40 mt-1 line-clamp-1 text-xs">{ep.description}</p>
                )}
                <audio controls preload="none" className="mt-2 w-full">
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
