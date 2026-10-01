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
 * One city of the improv directory: every theatre, school and recurring show
 * the engine could verify there, in rank order, each linking out to its own
 * site. The data is data/directory/<city>.json (src/lib/directory.ts); the
 * engine rewrites it on its cycle, and a page is served for every city from
 * the first deploy, thin or not, so the archive's shape never depends on how
 * far the engine has got. Thin cities are kept out of the index until they
 * fill (isIndexableDirectoryCity), and out of the sitemap with them.
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
      <div className="flex items-baseline gap-3">
        <span className="text-foreground/40 w-6 shrink-0 text-sm tabular-nums">{entry.rank}</span>
        <h3 className="text-lg font-semibold">
          <a href={entry.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {entry.name}
          </a>
        </h3>
        <span
          className="text-foreground/50 ml-auto shrink-0 text-sm tabular-nums"
          title="Score out of 100"
        >
          {entry.score}
        </span>
      </div>
      <p className="text-foreground/50 mt-1 pl-9 text-xs tracking-wider uppercase">
        {kinds}
        {entry.area ? ` · ${entry.area}` : ""}
      </p>
      <p className="text-foreground/80 mt-2 pl-9 text-sm leading-relaxed">{entry.summary}</p>
      {entry.schedule && <p className="text-foreground/60 mt-1 pl-9 text-sm">{entry.schedule}</p>}
      {entry.signals.length > 0 && (
        <p className="text-foreground/50 mt-1 pl-9 text-xs">{entry.signals.join(" · ")}</p>
      )}
      <p className="text-foreground/40 mt-2 pl-9 text-xs">
        {entry.reasons} {entry.status === "live" ? "Verified" : "Last seen"}{" "}
        {formatDirectoryDate(entry.lastSeen)}.
      </p>
    </li>
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
  const updated =
    city.updated === null
      ? "Not read yet."
      : `Last pass ${formatDirectoryDate(city.updated)}; the engine returns about weekly.`;

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
      itemListElement: entries.map((e) => ({
        "@type": "ListItem",
        position: e.rank,
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
        <p className="text-foreground/70 mt-3 text-sm" data-directory-updated>
          {updated}
        </p>
      </header>

      <Prose
        text={entries.length > 0 ? DIRECTORY_COPY.cityIntro : DIRECTORY_COPY.cityEmpty}
        currentUrl={path}
        className="text-foreground/80 leading-relaxed"
      />

      {entries.length > 0 && (
        <>
          <h2 id="ranked" className="mt-10 text-2xl font-semibold">
            Ranked
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
                {classes.map((e, i) => (
                  <span key={e.id}>
                    {i > 0 ? ", " : ""}
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="underline">
                      {e.name}
                    </a>
                  </span>
                ))}
                .
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
                {shows.map((e, i) => (
                  <span key={e.id}>
                    {i > 0 ? ", " : ""}
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="underline">
                      {e.name}
                    </a>
                  </span>
                ))}
                .
              </p>
            </>
          )}
        </>
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

      <h2 id="how-this-list-is-made" className="mt-10 text-2xl font-semibold">
        How this list is made
      </h2>
      <Prose
        text={DIRECTORY_COPY.cityHow}
        currentUrl={path}
        className="text-foreground/80 mt-3 leading-relaxed"
      />
    </main>
  );
}
