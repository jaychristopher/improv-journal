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

      {/*
        The site's largest page and its most linked, and until now every word
        on it came from the term list — an index with no page around it. The
        three sections below are the part a glossary cannot generate: what the
        vocabulary is for, which of it to learn first, and the fact that the
        terminology is not standardised, which is the thing that confuses
        people arriving from a class taught in a different tradition.
      */}
      <section className="border-foreground/10 mt-16 border-t pt-12">
        <h2 className="mb-3 text-xl font-semibold">Why a Glossary Rather Than Advice</h2>
        <p className="text-foreground/70 mb-4">
          Most improv teaching arrives as encouragement, and encouragement cannot be applied to a
          specific scene that died. A vocabulary can. If you can say that the scene failed because
          nobody established where they were, or because a partner accepted everything and added
          nothing, you have something to practise tomorrow &mdash; and if all you can say is that it
          did not feel good, you have not.
        </p>
        <p className="text-foreground/70">
          That is the whole reason this list exists. Every entry names a thing that happens, so it
          can be pointed at afterwards. The terms are not jargon for its own sake; they are the
          difference between a note that changes what somebody does and a note that makes them feel
          worse.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="mb-3 text-xl font-semibold">The Six Worth Learning First</h2>
        <p className="text-foreground/70 mb-4">
          The list is long and most of it can wait. These six account for the great majority of what
          goes wrong in a beginner&apos;s scene, and knowing them makes the rest legible.
        </p>
        <ul className="text-foreground/70 mb-4 space-y-2">
          <li>
            <Link href="/practice/vocabulary/offers" className="underline">
              Offers
            </Link>{" "}
            &mdash; everything said or done that a partner can build with. Nearly every other term
            is a description of what happened to one.
          </li>
          <li>
            <Link href="/how-it-works/diagnosis/blocking" className="underline">
              Blocking
            </Link>{" "}
            &mdash; refusing what was established. The single most common cause of a dead scene, and
            usually invisible to the person doing it.
          </li>
          <li>
            <Link href="/practice/techniques/yes-and" className="underline">
              Yes, and
            </Link>{" "}
            &mdash; accepting and extending. Widely known, widely misread as a rule about being
            agreeable.
          </li>
          <li>
            <Link href="/practice/vocabulary/base-reality" className="underline">
              Base reality
            </Link>{" "}
            &mdash; the ordinary world established before anything strange happens. Scenes that feel
            random are usually missing it.
          </li>
          <li>
            <Link href="/practice/vocabulary/game-of-the-scene" className="underline">
              Game of the scene
            </Link>{" "}
            &mdash; the repeatable pattern a scene turns out to be about.
          </li>
          <li>
            <Link href="/practice/vocabulary/status" className="underline">
              Status
            </Link>{" "}
            &mdash; relative social position, played through behaviour. The fastest way to make a
            scene about something.
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="mb-3 text-xl font-semibold">The Same Thing Under Different Names</h2>
        <p className="text-foreground/70 mb-4">
          Improv vocabulary is not standardised. Five traditions developed largely in parallel and
          named things independently, so a term you learned in one class can be absent, or mean
          something adjacent, in the next. This trips people up constantly and is almost never
          mentioned by the class doing the teaching.
        </p>
        <p className="text-foreground/70 mb-4">
          Where this site is confident two names describe one thing, the entry above says so. The
          clearest cases:
        </p>
        <ul className="text-foreground/70 mb-4 space-y-2">
          <li>
            <strong>Base reality</strong> is also <strong>the platform</strong> (Johnstone) and{" "}
            <strong>who/what/where</strong> (widely, and the phrase most beginners meet first).
          </li>
          <li>
            <strong>Space work</strong> is also <strong>object work</strong> in most Chicago rooms
            &mdash; and the two are not quite interchangeable, which the{" "}
            <Link href="/practice/techniques/space-work" className="underline">
              space work
            </Link>{" "}
            entry sets out.
          </li>
          <li>
            <strong>Initiation</strong> is also the <strong>opening line</strong> or{" "}
            <strong>first line</strong>, though the site&apos;s{" "}
            <Link href="/practice/techniques/initiation" className="underline">
              initiation
            </Link>{" "}
            entry argues the wider word is the more useful one, because the strongest openings are
            frequently not lines at all.
          </li>
        </ul>
        <p className="text-foreground/70">
          Where a mapping is contested, this site does not assert one. If a term here disagrees with
          how you were taught it, the disagreement is usually real and worth knowing about rather
          than a mistake on either side &mdash; the{" "}
          <Link href="/traditions" className="underline">
            five traditions
          </Link>{" "}
          set out who believes what.
        </p>
      </section>
    </main>
  );
}
