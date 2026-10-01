import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { Prose } from "@/components/Prose";
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
 * The improv directory's hub: sixty US cities, each a page listing the
 * theatres, schools and recurring shows found there.
 *
 * Read from data/directory at build time (src/lib/directory.ts); written by
 * scripts/directory-engine.mjs on a daily cycle. The prose is in
 * src/lib/directory-copy.ts, under the ceiling hub-prose-links.test.ts holds
 * route files to. The page is a listing and says nothing about how the list
 * is made or ordered (the owner, 2026-10-01); the engine's account is in
 * CLAUDE.md and the DI cards.
 *
 * Search demand (Ahrefs, US, 2026-09-30): "improv classes near me" 3,600 a
 * month, "improv near me" 800, "improv classes" 1,300, the city terms from
 * 700 (nyc) down. Nothing is registered in ROUTE_KEYWORDS until the pages
 * have been read by Search Console; the readings live here meanwhile.
 */

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
        {summary.latest !== null && (
          <p className="text-foreground/70 mt-3 text-sm" data-directory-summary>
            Updated {formatDirectoryDate(summary.latest)}.
          </p>
        )}
      </header>

      <Prose
        text={DIRECTORY_COPY.hubIntro}
        currentUrl={DIRECTORY_PATH}
        className="text-foreground/80 leading-relaxed"
      />

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
                {n === 0 ? "none yet" : n === 1 ? "1 listed" : `${n} listed`}
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
