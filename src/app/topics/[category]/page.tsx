import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/Breadcrumb";
import { getCategoryBySlug, getGuidesInCategory, GUIDE_CATEGORIES } from "@/lib/guide-categories";
import { ogImages, pageTitle, SITE_URL } from "@/lib/seo";

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
  const others = GUIDE_CATEGORIES.filter((c) => c.slug !== slug);

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
        <p className="text-foreground/60 mt-2">{category.description}</p>
        <p className="text-foreground/40 mt-1 text-sm">
          {guides.length} guides, each connecting a specific difficulty to what improv performers do
          about it.
        </p>
      </header>

      <ul className="space-y-4">
        {guides.map((guide) => (
          <li key={guide.slug}>
            <div className="border-foreground/10 bg-surface hover:border-foreground/30 relative rounded-lg border p-5 transition-colors">
              <Link
                href={`/${guide.slug}`}
                className="block font-semibold after:absolute after:inset-0"
              >
                {guide.title}
              </Link>
              <span className="text-foreground/60 mt-1 block text-sm">{guide.description}</span>
            </div>
          </li>
        ))}
      </ul>

      <nav aria-labelledby="other-categories" className="border-foreground/10 mt-16 border-t pt-8">
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
                <span className="text-foreground/60 mt-1 block text-xs">{other.description}</span>
              </div>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
