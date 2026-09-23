import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { CollectionJsonLd } from "@/components/CollectionJsonLd";
import { Diagram } from "@/components/Diagram";
import { Prose } from "@/components/Prose";
import { TableOfContents } from "@/components/TableOfContents";
import { getAtomUrl, loadAtoms } from "@/lib/content";
import { principleFailures } from "@/lib/principle-failures";
import { sortPrinciples } from "@/lib/principle-order";
import { FAILURES_LABEL } from "@/lib/relation-labels";
import { leadParagraph, pageTitle, stripLeadLabel } from "@/lib/seo";
import { getSystemCounts } from "@/lib/system-counts";

const SECTIONS = [
  {
    id: "principles-rather-than-rules",
    text: "What Makes These Principles Rather Than Rules",
    level: 2 as const,
  },
  { id: "how-the-nine-fit-together", text: "How the Nine Fit Together", level: 2 as const },
  { id: "where-they-came-from", text: "Where They Came From", level: 2 as const },
  { id: "which-one-to-work-on", text: "Which One to Work On", level: 2 as const },
];

export async function generateMetadata(): Promise<Metadata> {
  const { principles } = await getSystemCounts();
  return {
    /**
     * Deliberately not "rules of improv". /rules-of-improv is a 1,100-word
     * guide targeting that exact term, and this index carried it at the front
     * of its own title on 207 words of listing. Two pages competing for one
     * phrase splits the signal and the thin one can win, which is the worse
     * outcome.
     *
     * That fix went one word too far. Avoiding the phrase meant dropping
     * "improv" altogether, and Search Console has this page at position 43 for
     * "improv principles" — ranking for a term its own title never says. The
     * two are not the same claim: /rules-of-improv declares "rules of improv"
     * at 450 a month and "improv rules" at 150, and neither is this one, so
     * taking it back splits nothing.
     *
     * The old title also ended on the brand's own noun, which the suffix then
     * repeated, so the SERP line said Connection twice.
     *
     * Quoting the old title here verbatim is what tripped the system-counts
     * guard: it scans src for a literal digit before "Principles" and cannot
     * tell a comment from a rendered string. Blunt on purpose — it exists
     * because a hardcoded count survived in four places once — so the wording
     * moved rather than the rule.
     */
    title: pageTitle(`The ${principles} Improv Principles: What Each One Is For`),
    description:
      "The nine improv principles and what each is actually for — not moral rules but structural commands that stop a shared reality from collapsing.",
    alternates: { canonical: "/how-it-works/principles" },
  };
}

export default async function PrinciplesPage() {
  const atoms = await loadAtoms();
  // In the dependency order the diagram and prose below give, not directory
  // order — which put be present, the precondition, fifth.
  const principles = sortPrinciples(atoms.filter((a) => a.frontmatter.type === "principle"));
  // "Name the failure, take the principle that addresses it" — the closing
  // advice below — was an instruction with no map. The pairs are the
  // `contrasts` edges between each principle and the antipatterns, read
  // from either end (tracker entry 155).
  const failures = principleFailures(atoms);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <CollectionJsonLd
        name={`The ${principles.length} Principles of Improv`}
        description="Behavioral guidelines derived from the physics of connection — structural commands that prevent shared reality from collapsing."
        url="/how-it-works/principles"
        partOf="/how-it-works"
        items={principles.map((a) => ({
          name: a.frontmatter.title,
          url: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
          description: leadParagraph(stripLeadLabel(a.content), 180),
        }))}
      />
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "How It Works", href: "/how-it-works" },
          { label: "Principles" },
        ]}
      />
      <header className="mb-12">
        <span className="text-foreground/40 text-xs tracking-wider uppercase">
          system · principles
        </span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          The {principles.length} Improv Principles
        </h1>
        <Prose
          text="Behavioral guidelines derived from the physics. Not moral rules — structural commands that prevent shared reality from collapsing."
          currentUrl="/how-it-works/principles"
          className="text-foreground/60 mt-2"
        />
        <Prose
          text="If you arrived looking for the familiar list — yes and, don't block, make your partner look good — that is [the rules of improv](/rules-of-improv), which covers where each one came from and which half of them are wrong. This page is the underlying set they are shorthand for."
          currentUrl="/how-it-works/principles"
          className="text-foreground/50 mt-3 text-sm"
        />
      </header>

      {/* The list carries an h2 of its own so the entries below it do not jump
          the outline straight from h1 to h3 — the same fix /improv-games has. */}
      <h2 className="mb-4 text-xl font-semibold">Every Principle</h2>
      <div className="space-y-4">
        {principles.map((a) => (
          <div
            key={a.frontmatter.id}
            className="border-foreground/10 bg-surface hover:border-foreground/30 relative rounded-lg border p-5 transition-colors"
          >
            <h3 className="font-semibold">
              <Link
                href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })}
                className="after:absolute after:inset-0"
              >
                {a.frontmatter.title}
              </Link>
            </h3>
            <p className="text-foreground/50 mt-1 line-clamp-2 text-sm">
              {leadParagraph(stripLeadLabel(a.content), 180)}
              ...
            </p>
            {(failures.get(a.frontmatter.id) ?? []).length > 0 && (
              // Above the title's stretched link, so the failures are
              // reachable as links rather than swallowed by the card.
              <p className="text-foreground/60 relative z-10 mt-2 text-sm">
                {`${FAILURES_LABEL}: `}
                {(failures.get(a.frontmatter.id) ?? []).map((f, i, all) => (
                  <span key={f.id}>
                    <Link
                      href={getAtomUrl({ id: f.id, type: "antipattern" })}
                      className="underline"
                    >
                      {f.title}
                    </Link>
                    {i < all.length - 1 ? ", " : ""}
                  </span>
                ))}
              </p>
            )}
          </div>
        ))}
      </div>

      <section className="border-foreground/10 mt-16 border-t pt-12">
        <TableOfContents headings={SECTIONS} />

        <h2 id="principles-rather-than-rules" className="mb-3 text-xl font-semibold">
          What Makes These Principles Rather Than Rules
        </h2>
        <Prose
          text="The distinction is not pedantry. A rule tells you what you ought to do and carries a mild moral charge — somebody who blocks has been rude, somebody who steals focus has been selfish. A principle here is a structural claim instead: do this and the shared reality holds, do the other thing and it degrades in a way that is predictable, visible from the audience, and independent of anybody’s intentions."
          currentUrl="/how-it-works/principles"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="Take [Be Present](/how-it-works/principles/be-present). Read as a rule it is an instruction to care more, which is not actionable. Read as a principle it is an observation about a budget: attention spent composing your next line is attention not spent hearing the line being said, and there is no version of you that has enough of both. Nothing about that depends on being a good person."
          currentUrl="/how-it-works/principles"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="The practical consequence is that you cannot fail one of these by having the wrong attitude, only by producing the wrong behaviour — which makes each of them something to rehearse rather than something to become."
          currentUrl="/how-it-works/principles"
          className="text-foreground/70 mb-4"
        />

        <h2 id="how-the-nine-fit-together" className="mt-10 mb-3 text-xl font-semibold">
          How the Nine Fit Together
        </h2>
        <Prose
          text="They are not a checklist, and working through them alphabetically is the least useful way to use them. They stand in a rough dependency, which is the order the list above follows."
          currentUrl="/how-it-works/principles"
          className="text-foreground/70 mb-4"
        />
        <Diagram
          src="/images/principles-dependency.svg"
          // Counts belong to the content, not to a string in a component. This
          // said "nine … six … the eight" and would have gone quietly wrong the
          // next time a principle was written, which is the drift
          // system-counts.ts exists to stop.
          alt="The principles in rough dependency: be present as the precondition, the ones that build on it, be simple as the corrective they all need, and framing sitting apart from the rest."
          caption="The dependency the list above follows: be present first, framing apart from the rest."
        />
        <Prose
          text="[Be Present](/how-it-works/principles/be-present) is the precondition — nothing else is available to somebody who is not actually hearing what happened. [Be Changeable](/how-it-works/principles/be-changeable) is what presence is for: the point of hearing an offer is to be altered by it, and a performer who hears everything and changes at nothing has spent the attention for nothing."
          currentUrl="/how-it-works/principles"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="[Be Honest](/how-it-works/principles/be-honest) and [Be Brave](/how-it-works/principles/be-brave) supply the material, and they fail in opposite directions — one by producing something invented rather than felt, the other by producing nothing at all. [Be Supportive](/how-it-works/principles/be-supportive) and [Be Thankful](/how-it-works/principles/be-thankful) are the partner-facing pair, and they are the two most often nodded at and least often done."
          currentUrl="/how-it-works/principles"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="[Be Simple](/how-it-works/principles/be-simple) is the corrective the others need, because every one of them can be over-served; [Be Positive](/how-it-works/principles/be-positive) is the most misread of the set, since it is about what you do with an offer rather than about cheerfulness. And [Framing as Angle of Approach](/how-it-works/principles/framing-as-angle-of-approach) sits slightly apart from the eight: it governs how you enter a thing rather than how you behave once you are in it."
          currentUrl="/how-it-works/principles"
          className="text-foreground/70 mb-4"
        />

        <h2 id="where-they-came-from" className="mt-10 mb-3 text-xl font-semibold">
          Where They Came From
        </h2>
        <Prose
          text="Not from a school. Most lists of improv rules are inherited — one teacher’s phrasing that stuck and got repeated until it sounded like a law — which is why no two traditions quite agree on what the list is."
          currentUrl="/how-it-works/principles"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="These are derived rather than inherited. [How it works](/how-it-works) sets out what actually makes a shared reality hold or collapse, and each principle here is the behaviour that follows from one of those. That is why there are nine of them rather than the familiar five, and why the set does not match any school’s list exactly. Where a familiar rule contradicts one of these, [the rules of improv](/rules-of-improv) is the page that takes each one in turn and says which half is wrong."
          currentUrl="/how-it-works/principles"
          className="text-foreground/70 mb-4"
        />

        <h2 id="which-one-to-work-on" className="mt-10 mb-3 text-xl font-semibold">
          Which One to Work On
        </h2>
        <Prose
          text="One at a time, chosen by symptom rather than by order. The useful question is not which principle you believe in least but which failure you keep producing."
          currentUrl="/how-it-works/principles"
          className="text-foreground/70 mb-4"
        />
        <ul className="text-foreground/70 mb-4 space-y-2">
          <Prose
            as="li"
            text="Going blank, or hearing your own head louder than your partner — [Be Present](/how-it-works/principles/be-present)."
            currentUrl="/how-it-works/principles"
          />
          <Prose
            as="li"
            text="Scenes that stay where they started, however much is said in them — [Be Changeable](/how-it-works/principles/be-changeable)."
            currentUrl="/how-it-works/principles"
          />
          <Prose
            as="li"
            text="Steering, or quietly relocating whatever your partner just offered — [Be Supportive](/how-it-works/principles/be-supportive)."
            currentUrl="/how-it-works/principles"
          />
          <Prose
            as="li"
            text="Cleverness — scenes that are constructed, admired, and inert — [Be Simple](/how-it-works/principles/be-simple)."
            currentUrl="/how-it-works/principles"
          />
          <Prose
            as="li"
            text="Hedging: playing safely, at half commitment, waiting to see what the scene turns out to be — [Be Brave](/how-it-works/principles/be-brave)."
            currentUrl="/how-it-works/principles"
          />
        </ul>
        <Prose
          text="A group can work this way too, and it is a better use of a rehearsal than running the list in sequence. Name the failure the last show actually had, take the one principle that addresses it, and spend the whole session on that."
          currentUrl="/how-it-works/principles"
          className="text-foreground/70 mb-4"
        />
      </section>
    </main>
  );
}
