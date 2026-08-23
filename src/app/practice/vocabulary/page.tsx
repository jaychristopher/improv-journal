import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { GLOSSARY_URL, groupGlossaryTerms, loadGlossaryTerms } from "@/lib/glossary";
import { pageTitle, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: pageTitle("Improv Glossary: Vocabulary and Terms Explained"),
  description:
    "A glossary of improv terms — what each one means and what it names in a scene, a show, or a conversation.",
  alternates: { canonical: GLOSSARY_URL },
};

export default async function VocabularyPage() {
  const terms = await loadGlossaryTerms();

  // DefinedTermSet ties the individual DefinedTerm entries together, so the
  // page reads as a glossary rather than a list of links.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": `${SITE_URL}${GLOSSARY_URL}`,
    name: "Improv Vocabulary",
    description:
      "A glossary of improv terms — what each one means and what it names in a scene, a show, or a conversation.",
    url: `${SITE_URL}${GLOSSARY_URL}`,
    hasDefinedTerm: terms.map((term) => ({
      "@type": "DefinedTerm",
      "@id": `${SITE_URL}${term.url}`,
      name: term.term,
      description: term.definition,
      termCode: term.id,
      url: `${SITE_URL}${term.url}`,
      ...(term.aliases?.length ? { alternateName: term.aliases } : {}),
    })),
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
          { label: "Practice", href: "/practice" },
          { label: "Vocabulary" },
        ]}
      />
      <header className="mb-12">
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Improv Glossary ({terms.length})</h1>
        <p className="text-foreground/60 mt-2">
          Every concept this site defines — the terms, techniques, failure modes, principles and
          formats that name what&apos;s happening in scenes, shows, and conversations. The shared
          language that makes diagnosis possible.
        </p>
      </header>

      {/* Grouped rather than one alphabetical run: 151 entries in a single
          list is a wall, and the grouping is the site's own taxonomy. */}
      {groupGlossaryTerms(terms).map((group) => (
        <section key={group.label} className="mb-12 last:mb-0">
          <h2
            id={group.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
            className="text-foreground/40 mb-4 text-xs font-semibold tracking-wider uppercase"
          >
            {group.label} ({group.terms.length})
          </h2>
          <dl className="space-y-6">
            {group.terms.map((term) => (
              <div
                key={term.id}
                className="border-foreground/10 border-b pb-6 last:border-b-0 last:pb-0"
              >
                <dt>
                  <Link href={term.url} className="text-lg font-semibold hover:underline">
                    {term.term}
                  </Link>
                </dt>
                <dd className="text-foreground/60 mt-1 text-sm">
                  {term.definition}
                  {term.aliases?.length ? (
                    <span className="text-foreground/45 block pt-1 text-xs">
                      Also called {term.aliases.join(", ")}.
                    </span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </main>
  );
}
