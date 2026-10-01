import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { Prose } from "@/components/Prose";
import { TableOfContents } from "@/components/TableOfContents";
import {
  DIRECTORY_HUB_H1,
  DIRECTORY_PATH,
  directoryCityPath,
  directoryHubDescription,
  directoryHubTitle,
  directorySummary,
  formatDirectoryDate,
  liveEntries,
  loadDirectory,
} from "@/lib/directory";
import { DIRECTORY_COPY } from "@/lib/directory-copy";
import { hubMetadata, metaDescription, pageTitle, SITE_URL } from "@/lib/seo";

/**
 * The improv directory's hub: sixty US cities, each a page of the theatres,
 * schools and recurring shows an engine could verify there, ranked.
 *
 * Read from data/directory at build time (src/lib/directory.ts); written by
 * scripts/directory-engine.mjs on a daily cycle. The prose is in
 * src/lib/directory-copy.ts, under the ceiling hub-prose-links.test.ts holds
 * route files to. Every list here is derived from the data and says so.
 *
 * Search demand (Ahrefs, US, 2026-09-30): "improv classes near me" 3,600 a
 * month, "improv near me" 800, "improv classes" 1,300, the city terms from
 * 700 (nyc) down. Nothing is registered in ROUTE_KEYWORDS until the pages
 * have been read by Search Console; the readings live here meanwhile.
 */

const SECTIONS = [
  { id: "cities", text: "Cities", level: 2 as const },
  { id: "how-the-ranking-works", text: "How the ranking works", level: 2 as const },
  { id: "how-it-stays-current", text: "How it stays current", level: 2 as const },
];

export const metadata: Metadata = hubMetadata({
  title: pageTitle(directoryHubTitle()),
  description: metaDescription(directoryHubDescription()),
  alternates: { canonical: DIRECTORY_PATH },
});

export default function ImprovNearYouPage() {
  const cities = loadDirectory();
  const summary = directorySummary(cities);
  const description = metaDescription(directoryHubDescription());
  const title = directoryHubTitle();
  const freshness =
    summary.latest === null
      ? "The engine has not made its first pass yet."
      : `${summary.read} of ${summary.cities} cities read so far; the latest pass was ${formatDirectoryDate(summary.latest)}.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}${DIRECTORY_PATH}`,
    headline: title,
    name: title,
    description,
    url: `${SITE_URL}${DIRECTORY_PATH}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: cities.length,
      itemListElement: cities.map((city, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `Improv in ${city.city}, ${city.stateCode}`,
        url: `${SITE_URL}${directoryCityPath(city.slug)}`,
      })),
    },
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: DIRECTORY_HUB_H1 }]} />

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{DIRECTORY_HUB_H1}</h1>
        <p className="text-foreground/60 mt-2">{description}</p>
        <p className="text-foreground/70 mt-3 text-sm" data-directory-summary>
          {freshness}
        </p>
      </header>

      <Prose
        text={DIRECTORY_COPY.hubIntro}
        currentUrl={DIRECTORY_PATH}
        className="text-foreground/80 leading-relaxed"
      />
      <Prose
        text={DIRECTORY_COPY.hubHow}
        currentUrl={DIRECTORY_PATH}
        className="text-foreground/80 mt-4 leading-relaxed"
      />

      <TableOfContents headings={SECTIONS} />

      <h2 id="cities" className="mt-12 text-2xl font-semibold">
        Cities
      </h2>
      <div
        className="mt-4 grid gap-2 sm:grid-cols-2"
        data-track="directory-cities"
        data-derived="true"
      >
        {cities.map((city) => {
          const n = liveEntries(city).length;
          return (
            <Link
              key={city.slug}
              href={directoryCityPath(city.slug)}
              className="border-foreground/10 bg-surface hover:border-foreground/30 flex items-baseline justify-between gap-3 rounded-lg border px-4 py-3 transition-colors"
            >
              <span className="font-medium">
                {city.city}, {city.stateCode}
              </span>
              <span className="text-foreground/50 shrink-0 text-xs">
                {n === 0 ? "not read yet" : n === 1 ? "1 listed" : `${n} listed`}
              </span>
            </Link>
          );
        })}
      </div>

      <h2 id="how-the-ranking-works" className="mt-12 text-2xl font-semibold">
        How the ranking works
      </h2>
      <Prose
        text={DIRECTORY_COPY.ranking}
        currentUrl={DIRECTORY_PATH}
        className="text-foreground/80 mt-4 leading-relaxed"
      />

      <h2 id="how-it-stays-current" className="mt-12 text-2xl font-semibold">
        How it stays current
      </h2>
      <Prose
        text={DIRECTORY_COPY.engine}
        currentUrl={DIRECTORY_PATH}
        className="text-foreground/80 mt-4 leading-relaxed"
      />
      <Prose
        text={DIRECTORY_COPY.thin}
        currentUrl={DIRECTORY_PATH}
        className="text-foreground/80 mt-4 leading-relaxed"
      />
    </main>
  );
}
