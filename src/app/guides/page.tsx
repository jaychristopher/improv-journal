import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { loadBridges } from "@/lib/content";
import { byReach, GUIDE_CATEGORIES } from "@/lib/guide-categories";
import { pageTitle } from "@/lib/seo";

export const metadata: Metadata = {
  title: pageTitle("Practical Guides"),
  description:
    "Guides for overthinking, stage fright, team dynamics, feedback, and more — connecting improv principles to everyday challenges.",
  alternates: { canonical: "/guides" },
};

export default async function GuidesPage() {
  const bridges = await loadBridges();
  const bridgeBySlug = new Map(bridges.map((b) => [b.slug, b]));

  const categorized = GUIDE_CATEGORIES.map((cat) => ({
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
        <h1 className="text-3xl font-bold tracking-tight">Guides</h1>
        <p className="text-foreground/60 mt-2">
          Practical guides that connect improv principles to everyday challenges — overthinking,
          stage fright, team dynamics, giving feedback, and more. No stage required.
        </p>
      </header>

      {categorized.map((cat) => (
        <section key={cat.slug} className="mb-12">
          <h2 className="text-foreground/80 text-lg font-semibold">
            <Link href={`/topics/${cat.slug}`} className="hover:underline">
              {cat.title}
            </Link>
          </h2>
          <p className="text-foreground/40 mb-4 text-sm">{cat.description}</p>
          <div className="space-y-3">
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
                <p className="text-foreground/50 mt-1 text-sm">{b.frontmatter.description}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      {uncategorized.length > 0 && (
        <section className="mb-12">
          <h2 className="text-foreground/80 text-lg font-semibold">More Guides</h2>
          <div className="mt-4 space-y-3">
            {uncategorized.map((b) => (
              <Link
                key={b.slug}
                href={`/${b.slug}`}
                className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-5 transition-colors"
              >
                <h3 className="font-semibold">{b.frontmatter.title}</h3>
                <p className="text-foreground/50 mt-1 text-sm">{b.frontmatter.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
