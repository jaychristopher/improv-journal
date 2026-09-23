import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { Prose } from "@/components/Prose";
import { CORE_TERM, GLOSSARY_URL, groupGlossaryTerms, loadGlossaryTerms } from "@/lib/glossary";
import { hubCrumb, HUBS, hubSelfCrumb } from "@/lib/hubs";
import { pageTitle, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: pageTitle(`${HUBS.glossary.h1}: Vocabulary and Terms Explained`),
  description:
    "A glossary of improv terms — what each one means and what it names in a scene, a show, or a conversation.",
  alternates: { canonical: GLOSSARY_URL },
};

export default async function VocabularyPage() {
  // The atoms' terms, plus the one the site coined for its own structure:
  // "the core" is said on eighty-odd pages and was defined on none (tracker
  // entry 309). It is not an atom, so it is appended here rather than loaded.
  const terms = [...(await loadGlossaryTerms()), CORE_TERM];
  // The count in the heading is every named concept except the books — all
  // eleven term types — and the subtitle used to leave a reader assuming it
  // counted definitions. Say what the number is made of, in the heading too:
  // the practice hub, the nav and the sitemap treat this route as the
  // definitions alone, so a bare "(173)" beside them read as a second count
  // for one page (tracker entry 264).
  const definitions = terms.filter((term) => term.type === "definition").length;

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
          hubCrumb(HUBS.practice),
          hubSelfCrumb(HUBS.glossary),
        ]}
      />
      <header className="mb-12">
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {HUBS.glossary.h1}{" "}
          <span className="text-foreground/40 font-normal">
            ({terms.length} terms, {definitions} of them definitions)
          </span>
        </h1>
        <p className="text-foreground/60 mt-2">
          Every named concept on this site except the books: {definitions} terms proper, and{" "}
          {terms.length - definitions} more — techniques, exercises, formats, failure modes,
          principles and laws — that name what&apos;s happening in scenes, shows, and conversations.
          Grouped by kind below. The shared language that makes diagnosis possible.
        </p>
      </header>

      {/* Grouped rather than one alphabetical run: the best part of two
          hundred entries in a single list is a wall, and the grouping is the
          site's own taxonomy. */}
      {groupGlossaryTerms(terms).map((group) => (
        <section key={group.label} className="mb-12 last:mb-0" data-track="glossary-list">
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
        <Prose
          text="Most improv teaching arrives as encouragement, and encouragement cannot be applied to a specific scene that died. A vocabulary can. If you can say that the scene failed because nobody established where they were, or because a partner accepted everything and added nothing, you have something to practise tomorrow — and if all you can say is that it did not feel good, you have not."
          currentUrl="/practice/vocabulary"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="That is the whole reason this list exists. Every entry names a thing that happens, so it can be pointed at afterwards. The terms are not jargon for its own sake; they are the difference between a note that changes what somebody does and a note that makes them feel worse."
          currentUrl="/practice/vocabulary"
          className="text-foreground/70"
        />
      </section>

      <section className="mt-12" data-track="learn-first">
        <h2 className="mb-3 text-xl font-semibold">The Six Worth Learning First</h2>
        {/*
          This used to claim the six "account for the great majority of what
          goes wrong in a beginner's scene" — copy from before the failure
          layer existed. The antipatterns disagree: none of them links base
          reality or game of the scene, and the atoms they point at most are
          offers, commitment, courage, status and trust. What is true of these
          six is that the rest of the list is defined in terms of them, which
          is why they are the ones to learn first; what goes wrong is
          catalogued where the failure modes live.
        */}
        <Prose
          text="The list is long and most of it can wait. These six are the ones the rest of it is defined in terms of — most entries describe what happened to an offer, what was blocked, or what the base reality or the game turned out to be — so knowing them makes the rest legible. For what actually goes wrong, and how to recover, the [failure modes](/how-it-works/diagnosis) are catalogued separately."
          currentUrl="/practice/vocabulary"
          className="text-foreground/70 mb-4"
        />
        <ul className="text-foreground/70 mb-4 space-y-2">
          <Prose
            as="li"
            text="[Offers](/practice/vocabulary/offers) — everything said or done that a partner can build with. Nearly every other term is a description of what happened to one."
            currentUrl="/practice/vocabulary"
          />
          <Prose
            as="li"
            text="[Blocking](/how-it-works/diagnosis/blocking) — refusing what was established. The single most common cause of a dead scene, and usually invisible to the person doing it."
            currentUrl="/practice/vocabulary"
          />
          <Prose
            as="li"
            text="[Yes, and](/practice/techniques/yes-and) — accepting and extending. Widely known, widely misread as a rule about being agreeable."
            currentUrl="/practice/vocabulary"
          />
          <Prose
            as="li"
            text="[Base reality](/practice/vocabulary/base-reality) — the ordinary world established before anything strange happens. Scenes that feel random are usually missing it."
            currentUrl="/practice/vocabulary"
          />
          <Prose
            as="li"
            text="[Game of the scene](/practice/vocabulary/game-of-the-scene) — the repeatable pattern a scene turns out to be about."
            currentUrl="/practice/vocabulary"
          />
          <Prose
            as="li"
            text="[Status](/practice/vocabulary/status) — relative social position, played through behaviour. The fastest way to make a scene about something."
            currentUrl="/practice/vocabulary"
          />
        </ul>
      </section>

      <section className="mt-12" data-track="synonyms">
        <h2 className="mb-3 text-xl font-semibold">The Same Thing Under Different Names</h2>
        <Prose
          text="Improv vocabulary is not standardised. Five traditions developed largely in parallel and named things independently, so a term you learned in one class can be absent, or mean something adjacent, in the next. This trips people up constantly and is almost never mentioned by the class doing the teaching."
          currentUrl="/practice/vocabulary"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="Where this site is confident two names describe one thing, the entry above says so. The clearest cases:"
          currentUrl="/practice/vocabulary"
          className="text-foreground/70 mb-4"
        />
        <ul className="text-foreground/70 mb-4 space-y-2">
          <Prose
            as="li"
            text="**Base reality** is also **the platform** (Johnstone) and **who/what/where** (widely, and the phrase most beginners meet first)."
            currentUrl="/practice/vocabulary"
          />
          <Prose
            as="li"
            text="**Space work** is also **object work** in most Chicago rooms — and the two are not quite interchangeable, which the [space work](/practice/techniques/space-work) entry sets out."
            currentUrl="/practice/vocabulary"
          />
          <Prose
            as="li"
            text="**Initiation** is also the **opening line** or **first line**, though the site's [initiation](/practice/techniques/initiation) entry argues the wider word is the more useful one, because the strongest openings are frequently not lines at all."
            currentUrl="/practice/vocabulary"
          />
        </ul>
        <Prose
          text="Where a mapping is contested, this site does not assert one. If a term here disagrees with how you were taught it, the disagreement is usually real and worth knowing about rather than a mistake on either side — the [five traditions](/traditions) set out who believes what."
          currentUrl="/practice/vocabulary"
          className="text-foreground/70"
        />
      </section>
    </main>
  );
}
