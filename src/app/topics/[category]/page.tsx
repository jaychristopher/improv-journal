import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/Breadcrumb";
import { Prose } from "@/components/Prose";
import { getPathBySlug } from "@/lib/content";
import {
  alsoCloseToCluster,
  dominantEntryPath,
  getCategoryBySlug,
  getGuidesInCategory,
  GUIDE_CATEGORIES,
} from "@/lib/guide-categories";
import { ogImages, pageTitle, SITE_NAME, SITE_URL } from "@/lib/seo";

export async function generateStaticParams() {
  return GUIDE_CATEGORIES.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return {};

  const title = `${category.title} Guides`;
  const url = `/topics/${category.slug}`;
  return {
    title: pageTitle(title),
    description: category.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      siteName: SITE_NAME,
      locale: "en_US",
      title,
      description: category.metaDescription,
      url,
      type: "website",
      images: ogImages(title, "Guides"),
    },
  };
}

export default async function GuideCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  const guides = await getGuidesInCategory(slug);
  const routing = await dominantEntryPath(slug);
  const routedPath = routing ? await getPathBySlug(routing.pathId) : null;
  const others = GUIDE_CATEGORIES.filter((c) => c.slug !== slug);
  // The guides filed elsewhere that share three or more entry atoms with one
  // of these: 134 of the 277 strongest guide pairs cross a cluster line
  // (tracker entry 290), and until this rail the hub sent a reader only to
  // its own cluster.
  const alsoClose = await alsoCloseToCluster(slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}/topics/${category.slug}`,
    name: `${category.title} Guides`,
    description: category.description,
    url: `${SITE_URL}/topics/${category.slug}`,
    isPartOf: { "@type": "CollectionPage", "@id": `${SITE_URL}/guides` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: guides.length,
      itemListElement: guides.map((guide, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: guide.title,
        description: guide.description,
        url: `${SITE_URL}/${guide.slug}`,
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
          { label: "Guides", href: "/guides" },
          { label: category.title },
        ]}
      />

      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">{category.title}</h1>
        <Prose
          text={category.description}
          currentUrl={`/topics/${slug}`}
          className="text-foreground/60 mt-2"
        />
        <p className="text-foreground/40 mt-1 text-sm">
          {guides.length} guides, each connecting a specific difficulty to what improv performers do
          about it.
        </p>
        {routing && routedPath && (
          <p
            className="text-foreground/40 mt-1 text-sm"
            data-cluster-routing
            data-track="cluster-routing"
            data-derived="true"
          >
            {routing.count} of the {routing.total} lead on to{" "}
            <Link href={`/paths/${routing.pathId}`} className="underline">
              {routedPath.frontmatter.title}
            </Link>
            {routing.count < routing.total ? "; the rest route elsewhere." : "."}
          </p>
        )}
      </header>

      <section className="mb-12">
        <h2 className="mb-3 text-xl font-semibold">What These Have in Common</h2>
        {category.orientation.map((paragraph) => (
          <Prose
            text={paragraph}
            currentUrl={`/topics/${slug}`}
            className="text-foreground/70 mb-4"
            key={paragraph.slice(0, 40)}
          />
        ))}
      </section>

      <ul className="space-y-4" data-track="guide-list" data-derived="true">
        {guides.map((guide) => (
          <li key={guide.slug}>
            <div className="border-foreground/10 bg-surface hover:border-foreground/30 relative rounded-lg border p-5 transition-colors">
              <Link
                href={`/${guide.slug}`}
                className="block font-semibold after:absolute after:inset-0"
              >
                {guide.title}
              </Link>
              <span className="text-foreground/60 mt-1 line-clamp-2 block text-sm">
                {guide.description}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {alsoClose.length > 0 && (
        <nav
          aria-labelledby="also-close-to"
          className="border-foreground/10 mt-16 border-t pt-8"
          data-track="topic-also-close"
          data-derived="true"
        >
          <h2
            id="also-close-to"
            className="text-foreground/40 mb-1 text-sm font-semibold tracking-wider uppercase"
          >
            Also close to
          </h2>
          <p className="text-foreground/60 mb-3 text-sm">
            Filed elsewhere, with three or more concepts in common.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {alsoClose.map((guide) => (
              <li key={guide.slug}>
                <div className="border-foreground/10 bg-surface hover:border-foreground/30 relative h-full rounded-lg border p-3 transition-colors">
                  <Link
                    href={`/${guide.slug}`}
                    className="block text-sm font-medium after:absolute after:inset-0"
                  >
                    {guide.title}
                  </Link>
                  <span className="text-foreground/60 mt-1 block text-xs">
                    In {guide.clusterTitle}; closest to {guide.closestToTitle} ({guide.shared}{" "}
                    shared concepts).
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <nav
        aria-labelledby="other-categories"
        className="border-foreground/10 mt-16 border-t pt-8"
        data-track="topic-clusters"
        data-derived="true"
      >
        <h2
          id="other-categories"
          className="text-foreground/40 mb-3 text-sm font-semibold tracking-wider uppercase"
        >
          Other guide categories
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {others.map((other) => (
            <li key={other.slug}>
              <div className="border-foreground/10 bg-surface hover:border-foreground/30 relative h-full rounded-lg border p-3 transition-colors">
                <span className="block text-sm font-medium">
                  <Link href={`/topics/${other.slug}`} className="after:absolute after:inset-0">
                    {other.title}
                  </Link>
                </span>
                <span className="text-foreground/60 mt-1 line-clamp-2 block text-xs">
                  {other.description}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
