import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { CollectionJsonLd } from "@/components/CollectionJsonLd";
import { definedTermJsonLd } from "@/components/DefinedTermJsonLd";
import { Prose } from "@/components/Prose";
import { getAtomUrl, loadAtoms } from "@/lib/content";
import { CORE_TERM } from "@/lib/glossary";
import { hubCrumb, HUBS } from "@/lib/hubs";
import { leadParagraph, pageTitle, stripLeadLabel } from "@/lib/seo";
import {
  CORE_DEFINITION,
  CORE_HREF,
  coreMemberSummary,
  coreRepresentationCounts,
} from "@/lib/the-core";

/**
 * The page the phrase "the core" points at.
 *
 * Eighty-three built pages said "and the core", "through the core" or drew a
 * node called the core, and none said what it was (tracker entry 309). The
 * members are recomputed from the corpus on every build — the largest
 * strongly connected component of `requires` (the-core.ts) — so the page
 * lists exactly the knot the sidebar and the show notes collapse, and a
 * change in the cycle changes this page rather than leaving it stale.
 */
const DESCRIPTION =
  "The improv ideas that require each other: read any one and you are reading them all. Who they are, and why the sidebar folds them into one item.";

export const metadata: Metadata = {
  // The route-pages label is "The Core"; the title must start with it.
  title: pageTitle("The Core: The Improv Ideas That Require Each Other"),
  description: DESCRIPTION,
  alternates: { canonical: CORE_HREF },
};

export default async function TheCorePage() {
  const atoms = await loadAtoms();
  const groups = coreMemberSummary(atoms.map((a) => a.frontmatter));
  const members = groups.flatMap((g) => g.members);
  // On how many pages each member is the "<Title>" in "<Title> and the
  // core": the representative rule (direct-requires.ts, entry 315) read the
  // other way, so the author can see which faces the core wears.
  const standsFor = coreRepresentationCounts(atoms.map((a) => a.frontmatter));
  const standsForTotal = [...standsFor.values()].reduce((n, c) => n + c, 0);
  const byId = new Map(atoms.map((a) => [a.frontmatter.id, a]));
  const urlOf = (id: string, type: (typeof members)[number]["type"]) => getAtomUrl({ id, type });

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <CollectionJsonLd
        name="The Core"
        description={DESCRIPTION}
        url={CORE_HREF}
        partOf={HUBS.howItWorks.href}
        items={members.map((m) => ({
          name: m.title,
          url: urlOf(m.id, m.type),
          description: leadParagraph(stripLeadLabel(byId.get(m.id)?.content ?? ""), 180),
        }))}
      />
      {/* The glossary's DefinedTermSet points its "The core" entry at this
          url, so the page declares the term the set names. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermJsonLd(CORE_TERM)) }}
      />
      <Breadcrumb
        crumbs={[{ label: "Home", href: "/" }, hubCrumb(HUBS.howItWorks), { label: "The Core" }]}
      />

      <header className="mb-12">
        <span className="text-foreground/40 text-xs tracking-wider uppercase">
          system · the core
        </span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">The Core</h1>
        {/* The same sentence the glossary carries (CORE_DEFINITION), so the
            entry and the page it links agree word for word. */}
        <Prose text={CORE_DEFINITION} currentUrl={CORE_HREF} className="text-foreground/60 mt-2" />
      </header>

      <section className="mb-12" data-track="core-intro">
        <Prose
          text={`${members.length} concepts sit in one cycle under the prerequisite relation. Each requires another, and the chain from any of them reaches every other, so there is no first one to read: wherever you start, the rest are already assumed. A concept that names two of them has, by the graph's own logic, named them all. That is why a sidebar shows the one it named that the most other concepts require as 'and the core' instead of listing every one, and why the show notes do the same.`}
          currentUrl={CORE_HREF}
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="You will see it as 'and the core' in a concept's Builds on list and in the show notes, as 'through the core' in the count of what requires a concept, and as one node called the core in the search page's graph. Each of those means this list."
          currentUrl={CORE_HREF}
          className="text-foreground/70"
        />
      </section>

      <section data-track="core-members">
        <h2 className="mb-2 text-lg font-semibold">The {members.length} members, by kind</h2>
        <p className="text-foreground/40 mb-6 text-sm">
          Required by: how many concepts declare this one as a prerequisite. Stands for the core: on
          how many of the {standsForTotal} pages that fold the core into one item this is the member
          named beside it.
        </p>
        {groups.map((group) => (
          <div key={group.type} className="mb-8 last:mb-0">
            <h3
              id={`core-${group.type}`}
              className="text-foreground/40 mb-3 text-xs font-semibold tracking-wider uppercase"
            >
              {group.count} {group.label}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.members.map((m) => (
                <Link
                  key={m.id}
                  href={urlOf(m.id, m.type)}
                  data-core-member={m.id}
                  className="group border-foreground/10 bg-surface hover:border-foreground/30 rounded-lg border p-3 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{m.title}</span>
                    <span className="text-foreground/30 transition-transform group-hover:translate-x-0.5">
                      &rarr;
                    </span>
                  </div>
                  <span className="text-foreground/45 mt-1 block text-xs">
                    required by {m.requiredBy}
                    <span className="text-foreground/30"> · </span>
                    <span data-stands-for={standsFor.get(m.id) ?? 0}>
                      stands for the core on {standsFor.get(m.id) ?? 0}{" "}
                      {(standsFor.get(m.id) ?? 0) === 1 ? "page" : "pages"}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
