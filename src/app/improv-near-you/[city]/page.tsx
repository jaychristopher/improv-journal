import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/Breadcrumb";
import { Prose } from "@/components/Prose";
import {
  DIRECTORY_HUB_H1,
  DIRECTORY_PATH,
  directoryCityDescription,
  directoryCityH1,
  directoryCityPath,
  directoryCityTitle,
  type DirectoryEntry,
  type DirectoryKind,
  directoryNeighbours,
  formatDirectoryDate,
  isIndexableDirectoryCity,
  liveEntries,
  loadDirectoryCities,
  loadDirectoryCity,
} from "@/lib/directory";
import { DIRECTORY_COPY } from "@/lib/directory-copy";
import { hubMetadata, metaDescription, pageTitle, SITE_URL } from "@/lib/seo";

/**
 * One city of the improv directory: the theatres, schools and recurring
 * shows found there, each linking out to its own site. The data is
 * data/directory/<city>.json (src/lib/directory.ts); the engine rewrites it
 * on its cycle, and a page is served for every city from the first deploy,
 * thin or not, so the archive's shape never depends on how far the engine
 * has got. Thin cities are kept out of the index until they fill
 * (isIndexableDirectoryCity), and out of the sitemap with them.
 *
 * A listing and nothing more (the owner, 2026-10-01): the entries sit in the
 * order the data holds them, and the page shows no score, no rank and no
 * account of how the list is made. The engine's account is in CLAUDE.md and
 * the DI cards.
 */

const KIND_LABELS: Record<DirectoryKind, string> = {
  shows: "Shows",
  classes: "Classes",
  jams: "Jams",
};

export function generateStaticParams() {
  return loadDirectoryCities().map((c) => ({ city: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const city = loadDirectoryCity(slug);
  if (!city) return {};
  return hubMetadata({
    title: pageTitle(directoryCityTitle(city)),
    description: metaDescription(directoryCityDescription(city)),
    alternates: { canonical: directoryCityPath(slug) },
    ...(isIndexableDirectoryCity(city) ? {} : { robots: { index: false, follow: true } }),
  });
}

function EntryCard({ entry }: { entry: DirectoryEntry }) {
  const kinds = entry.kind.map((k) => KIND_LABELS[k]).join(" · ");
  return (
    <li className="border-foreground/10 bg-surface rounded-xl border p-5">
      <h3 className="text-lg font-semibold">
        <a href={entry.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {entry.name}
        </a>
      </h3>
      <p className="text-foreground/50 mt-1 text-xs tracking-wider uppercase">
        {kinds}
        {entry.area ? ` · ${entry.area}` : ""}
      </p>
      <p className="text-foreground/80 mt-2 text-sm leading-relaxed">{entry.summary}</p>
      {entry.schedule && <p className="text-foreground/60 mt-1 text-sm">{entry.schedule}</p>}
      {entry.signals.length > 0 && (
        <p className="text-foreground/50 mt-1 text-xs">{entry.signals.join(" · ")}</p>
      )}
    </li>
  );
}

function Names({ entries }: { entries: DirectoryEntry[] }) {
  return (
    <>
      {entries.map((e, i) => (
        <span key={e.id}>
          {i > 0 ? ", " : ""}
          <a href={e.url} target="_blank" rel="noopener noreferrer" className="underline">
            {e.name}
          </a>
        </span>
      ))}
      .
    </>
  );
}

export default async function DirectoryCityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params;
  const city = loadDirectoryCity(slug);
  if (!city) notFound();
  const path = directoryCityPath(slug);
  const title = directoryCityTitle(city);
  const description = metaDescription(directoryCityDescription(city));
  const entries = liveEntries(city);
  const classes = entries.filter((e) => e.kind.includes("classes"));
  const shows = entries.filter((e) => e.kind.includes("shows") || e.kind.includes("jams"));
  const neighbours = directoryNeighbours(city);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}${path}`,
    headline: title,
    name: title,
    description,
    url: `${SITE_URL}${path}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: entries.length,
      itemListElement: entries.map((e, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: e.name,
        description: e.summary,
        url: e.url,
      })),
    },
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: DIRECTORY_HUB_H1, href: DIRECTORY_PATH },
          { label: city.city },
        ]}
      />

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{directoryCityH1(city)}</h1>
        <p className="text-foreground/60 mt-2">{description}</p>
        {city.updated !== null && (
          <p className="text-foreground/70 mt-3 text-sm" data-directory-updated>
            Updated {formatDirectoryDate(city.updated)}.
          </p>
        )}
      </header>

      {entries.length > 0 ? (
        <>
          <h2 id="listed" className="text-2xl font-semibold">
            Theaters, schools and shows
          </h2>
          <ol
            className="mt-4 space-y-4"
            data-track="directory-entries"
            data-derived="true"
            data-directory-count={entries.length}
          >
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </ol>

          {classes.length > 0 && (
            <>
              <h2 id="classes" className="mt-10 text-2xl font-semibold">
                Classes
              </h2>
              <p
                className="text-foreground/80 mt-3 text-sm"
                data-track="directory-classes"
                data-derived="true"
              >
                <Names entries={classes} />
              </p>
            </>
          )}

          {shows.length > 0 && (
            <>
              <h2 id="shows" className="mt-10 text-2xl font-semibold">
                Shows and jams
              </h2>
              <p
                className="text-foreground/80 mt-3 text-sm"
                data-track="directory-shows"
                data-derived="true"
              >
                <Names entries={shows} />
              </p>
            </>
          )}
        </>
      ) : (
        <Prose
          text={DIRECTORY_COPY.cityEmpty}
          currentUrl={path}
          className="text-foreground/80 leading-relaxed"
        />
      )}

      <h2 id="nearby" className="mt-10 text-2xl font-semibold">
        Nearby
      </h2>
      <p
        className="text-foreground/80 mt-3 text-sm"
        data-track="directory-nearby"
        data-derived="true"
      >
        {neighbours.map((n) => (
          <span key={n.slug}>
            <Link href={directoryCityPath(n.slug)} className="underline">
              Improv in {n.city}
            </Link>
            {" · "}
          </span>
        ))}
        <Link href={DIRECTORY_PATH} className="underline">
          Every city
        </Link>
      </p>
    </main>
  );
}
