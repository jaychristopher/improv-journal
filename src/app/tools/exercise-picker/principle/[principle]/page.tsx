import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/Breadcrumb";
import {
  isIndexablePrincipleFacet,
  principleFacet,
  principleFacetBackLabel,
  principleFacetCountLine,
  principleFacetDescription,
  principleFacets,
  principleFacetTitle,
} from "@/lib/picker-principles";
import { metaDescription, pageTitle } from "@/lib/seo";

export async function generateStaticParams() {
  // A principle no drill's Trains line names gets no page: it would promise
  // drills in its title and list none.
  return (await principleFacets()).map((f) => ({ principle: f.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ principle: string }>;
}): Promise<Metadata> {
  const { principle } = await params;
  const facet = await principleFacet(principle);
  if (!facet) return {};

  const title = principleFacetTitle(facet.title);
  return {
    title: pageTitle(title),
    description: metaDescription(principleFacetDescription(facet.title, facet.drills.length)),
    alternates: { canonical: facet.href },
    // Thin facets stay reachable and stay out of the index, as the
    // level/focus facets do. `follow` keeps the drills' signal flowing.
    ...(isIndexablePrincipleFacet(facet) ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function PrincipleFacetPage({
  params,
}: {
  params: Promise<{ principle: string }>;
}) {
  const { principle } = await params;
  const facet = await principleFacet(principle);
  if (!facet) notFound();
  const others = (await principleFacets()).filter((f) => f.id !== facet.id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Exercise Picker", href: "/tools/exercise-picker" },
          { label: facet.title },
        ]}
      />

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{principleFacetTitle(facet.title)}</h1>
        <p className="text-foreground/60 mt-2">
          {principleFacetDescription(facet.title, facet.drills.length)}
        </p>
        <p className="text-foreground/70 mt-3" data-facet-count>
          {principleFacetCountLine(facet.drills.length)} ·{" "}
          <Link href={facet.principleHref} className="underline" data-facet-principle>
            {principleFacetBackLabel(facet.title)}
          </Link>
        </p>
      </header>

      {/* The sibling facets, so every principle page the index reaches is one
          click from the others and the family is crawlable from any of them. */}
      <nav
        className="mb-10 flex flex-wrap gap-2"
        aria-label="Principle"
        data-track="principle-tabs"
      >
        <Link
          href="/tools/exercise-picker"
          className="bg-foreground/5 text-foreground/50 hover:bg-foreground/10 rounded-lg px-3 py-1.5 text-sm transition-colors"
        >
          All
        </Link>
        {others.map((f) => (
          <Link
            key={f.id}
            href={f.href}
            className="bg-foreground/5 text-foreground/50 hover:bg-foreground/10 rounded-lg px-3 py-1.5 text-sm transition-colors"
          >
            {f.title}
          </Link>
        ))}
      </nav>

      <div className="space-y-4" data-track="exercise-list">
        {facet.drills.map((drill) => (
          <div
            key={drill.id}
            className="border-foreground/10 bg-surface hover:border-foreground/30 group relative rounded-xl border p-6 transition-colors"
          >
            <h2 className="font-semibold group-hover:underline">
              <Link href={drill.href} className="after:absolute after:inset-0">
                {drill.title}
              </Link>
            </h2>
            <p className="text-foreground/50 mt-1 text-sm">{drill.description}</p>
          </div>
        ))}
      </div>

      <div className="text-foreground/30 mt-12 text-xs" data-track="picker-footer">
        {principleFacetCountLine(facet.drills.length)} ·{" "}
        <Link href="/tools/exercise-picker" className="underline">
          Back to Exercise Picker
        </Link>
      </div>
    </main>
  );
}
