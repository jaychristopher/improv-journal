import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { Prose } from "@/components/Prose";
import { loadBridges } from "@/lib/content";
import { byReach, GUIDE_CATEGORIES, orderedCategories } from "@/lib/guide-categories";
import { pageTitle } from "@/lib/seo";

export const metadata: Metadata = {
  title: pageTitle("Improv Guides: Confidence, Conversation and Teams"),
  description:
    "Guides for overthinking, stage fright, team dynamics, feedback, and more — connecting improv principles to everyday challenges.",
  alternates: { canonical: "/guides" },
};

export default async function GuidesPage() {
  const bridges = await loadBridges();
  const bridgeBySlug = new Map(bridges.map((b) => [b.slug, b]));

  // Sections by the reach of their winnable guides, not the order the array
  // was typed in: Personal Growth led with a sixth of the demand of the
  // cluster below it (tracker entry 209).
  const categorized = orderedCategories(bridges).map((cat) => ({
    ...cat,
    bridges: byReach(
      cat.slugs.map((slug) => bridgeBySlug.get(slug)).filter((b) => b !== undefined),
    ),
  }));

  // Catch any bridges not placed in a category
  const categorizedSlugs = new Set(GUIDE_CATEGORIES.flatMap((c) => c.slugs));
  const uncategorized = bridges.filter((b) => !categorizedSlugs.has(b.slug));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "Guides" }]} />

      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight">Improv Guides</h1>
        <Prose
          text="Practical guides that connect improv principles to everyday challenges — overthinking, stage fright, team dynamics, giving feedback, and more. No stage required."
          currentUrl="/guides"
          className="text-foreground/60 mt-2"
        />
      </header>

      {categorized.map((cat) => (
        <section key={cat.slug} className="mb-12" data-track="guide-category">
          <h2 className="text-foreground/80 text-lg font-semibold">
            <Link href={`/topics/${cat.slug}`} className="hover:underline">
              {cat.title}
            </Link>
          </h2>
          <Prose
            text={cat.description}
            currentUrl="/guides"
            className="text-foreground/40 mb-4 text-sm"
          />
          <div className="space-y-3" data-track="guide-list">
            {cat.bridges.map((b) => (
              <div
                key={b.slug}
                className="border-foreground/10 bg-surface hover:border-foreground/30 relative rounded-lg border p-5 transition-colors"
              >
                <h3 className="font-semibold">
                  <Link href={`/${b.slug}`} className="after:absolute after:inset-0">
                    {b.frontmatter.title}
                  </Link>
                </h3>
                <p className="text-foreground/50 mt-1 line-clamp-2 text-sm">
                  {b.frontmatter.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}

      {uncategorized.length > 0 && (
        <section className="mb-12">
          <h2 id="more-guides" className="text-foreground/80 text-lg font-semibold">
            More Guides
          </h2>
          <div className="mt-4 space-y-3" data-track="guide-list">
            {uncategorized.map((b) => (
              <div
                key={b.slug}
                className="border-foreground/10 bg-surface hover:border-foreground/30 relative rounded-lg border p-5 transition-colors"
              >
                <h3 className="font-semibold">
                  <Link href={`/${b.slug}`} className="after:absolute after:inset-0">
                    {b.frontmatter.title}
                  </Link>
                </h3>
                <p className="text-foreground/50 mt-1 line-clamp-2 text-sm">
                  {b.frontmatter.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
