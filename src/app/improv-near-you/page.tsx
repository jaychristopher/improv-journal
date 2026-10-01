import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { Prose } from "@/components/Prose";
import { UsCityMap, type UsCityMapPlace } from "@/components/UsCityMap";
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
import { US_MAP_PLACE_BY_SLUG } from "@/lib/us-map-data";

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

  // The map's sixty markers. Positions come from the generated module
  // (scripts/build-us-map.mjs); the counts are the same ones the grid below
  // shows, read from the same entries, so the two views cannot disagree.
  const places: UsCityMapPlace[] = cities.flatMap((city) => {
    const point = US_MAP_PLACE_BY_SLUG.get(city.slug);
    if (!point) return [];
    const entries = liveEntries(city);
    return [
      {
        slug: city.slug,
        city: city.city,
        state: city.state,
        href: directoryCityPath(city.slug),
        listed: entries.length,
        classes: entries.filter((e) => e.kind.includes("classes")).length,
        shows: entries.filter((e) => e.kind.includes("shows") || e.kind.includes("jams")).length,
        x: point.x,
        y: point.y,
        markerX: point.markerX,
        markerY: point.markerY,
        moved: point.moved,
      },
    ];
  });

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
    // `w-full`: the body is a flex column that does not stretch its items, so
    // this element is otherwise sized to fit its contents — and the map is
    // 41rem wide inside its scroller, which put the whole page on a sideways
    // scrollbar on a phone. A definite width leaves the scrolling to the map.
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
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

      <h2 id="map" className="mt-12 text-2xl font-semibold">
        On the map
      </h2>
      <UsCityMap places={places} skipTo="#cities" skipLabel="Skip the map, go to the city list" />

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
