import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { CollectionJsonLd } from "@/components/CollectionJsonLd";
import { TableOfContents } from "@/components/TableOfContents";
import { getAtomUrl, loadAtoms } from "@/lib/content";
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
  const principles = atoms.filter((a) => a.frontmatter.type === "principle");

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
        <p className="text-foreground/60 mt-2">
          Behavioral guidelines derived from the physics. Not moral rules — structural commands that
          prevent shared reality from collapsing.
        </p>
        <p className="text-foreground/50 mt-3 text-sm">
          If you arrived looking for the familiar list — yes and, don&apos;t block, make your
          partner look good — that is{" "}
          <Link href="/rules-of-improv" className="underline">
            the rules of improv
          </Link>
          , which covers where each one came from and which half of them are wrong. This page is the
          underlying set they are shorthand for.
        </p>
      </header>

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
          </div>
        ))}
      </div>

      <section className="border-foreground/10 mt-16 border-t pt-12">
        <TableOfContents headings={SECTIONS} />

        <h2 id="principles-rather-than-rules" className="mb-3 text-xl font-semibold">
          What Makes These Principles Rather Than Rules
        </h2>
        <p className="text-foreground/70 mb-4">
          The distinction is not pedantry. A rule tells you what you ought to do and carries a mild
          moral charge &mdash; somebody who blocks has been rude, somebody who steals focus has been
          selfish. A principle here is a structural claim instead: do this and the shared reality
          holds, do the other thing and it degrades in a way that is predictable, visible from the
          audience, and independent of anybody&rsquo;s intentions.
        </p>
        <p className="text-foreground/70 mb-4">
          Take{" "}
          <Link href="/how-it-works/principles/be-present" className="underline">
            Be Present
          </Link>
          . Read as a rule it is an instruction to care more, which is not actionable. Read as a
          principle it is an observation about a budget: attention spent composing your next line is
          attention not spent hearing the line being said, and there is no version of you that has
          enough of both. Nothing about that depends on being a good person.
        </p>
        <p className="text-foreground/70 mb-4">
          The practical consequence is that you cannot fail one of these by having the wrong
          attitude, only by producing the wrong behaviour &mdash; which makes each of them something
          to rehearse rather than something to become.
        </p>

        <h2 id="how-the-nine-fit-together" className="mt-10 mb-3 text-xl font-semibold">
          How the Nine Fit Together
        </h2>
        <p className="text-foreground/70 mb-4">
          They are not a checklist, and working through them in the order they happen to be listed
          is the least useful way to use them. They stand in a rough dependency.
        </p>
        <p className="text-foreground/70 mb-4">
          <Link href="/how-it-works/principles/be-present" className="underline">
            Be Present
          </Link>{" "}
          is the precondition &mdash; nothing else is available to somebody who is not actually
          hearing what happened.{" "}
          <Link href="/how-it-works/principles/be-changeable" className="underline">
            Be Changeable
          </Link>{" "}
          is what presence is for: the point of hearing an offer is to be altered by it, and a
          performer who hears everything and changes at nothing has spent the attention for nothing.
        </p>
        <p className="text-foreground/70 mb-4">
          <Link href="/how-it-works/principles/be-honest" className="underline">
            Be Honest
          </Link>{" "}
          and{" "}
          <Link href="/how-it-works/principles/be-brave" className="underline">
            Be Brave
          </Link>{" "}
          supply the material, and they fail in opposite directions &mdash; one by producing
          something invented rather than felt, the other by producing nothing at all.{" "}
          <Link href="/how-it-works/principles/be-supportive" className="underline">
            Be Supportive
          </Link>{" "}
          and{" "}
          <Link href="/how-it-works/principles/be-thankful" className="underline">
            Be Thankful
          </Link>{" "}
          are the partner-facing pair, and they are the two most often nodded at and least often
          done.
        </p>
        <p className="text-foreground/70 mb-4">
          <Link href="/how-it-works/principles/be-simple" className="underline">
            Be Simple
          </Link>{" "}
          is the corrective the others need, because every one of them can be over-served;{" "}
          <Link href="/how-it-works/principles/be-positive" className="underline">
            Be Positive
          </Link>{" "}
          is the most misread of the set, since it is about what you do with an offer rather than
          about cheerfulness. And{" "}
          <Link href="/how-it-works/principles/framing-as-angle-of-approach" className="underline">
            Framing as Angle of Approach
          </Link>{" "}
          sits slightly apart from the eight: it governs how you enter a thing rather than how you
          behave once you are in it.
        </p>

        <h2 id="where-they-came-from" className="mt-10 mb-3 text-xl font-semibold">
          Where They Came From
        </h2>
        <p className="text-foreground/70 mb-4">
          Not from a school. Most lists of improv rules are inherited &mdash; one teacher&rsquo;s
          phrasing that stuck and got repeated until it sounded like a law &mdash; which is why no
          two traditions quite agree on what the list is.
        </p>
        <p className="text-foreground/70 mb-4">
          These are derived rather than inherited.{" "}
          <Link href="/how-it-works" className="underline">
            How it works
          </Link>{" "}
          sets out what actually makes a shared reality hold or collapse, and each principle here is
          the behaviour that follows from one of those. That is why there are nine of them rather
          than the familiar five, and why the set does not match any school&rsquo;s list exactly.
          Where a familiar rule contradicts one of these,{" "}
          <Link href="/rules-of-improv" className="underline">
            the rules of improv
          </Link>{" "}
          is the page that takes each one in turn and says which half is wrong.
        </p>

        <h2 id="which-one-to-work-on" className="mt-10 mb-3 text-xl font-semibold">
          Which One to Work On
        </h2>
        <p className="text-foreground/70 mb-4">
          One at a time, chosen by symptom rather than by order. The useful question is not which
          principle you believe in least but which failure you keep producing.
        </p>
        <ul className="text-foreground/70 mb-4 space-y-2">
          <li>
            Going blank, or hearing your own head louder than your partner &mdash;{" "}
            <Link href="/how-it-works/principles/be-present" className="underline">
              Be Present
            </Link>
            .
          </li>
          <li>
            Scenes that stay where they started, however much is said in them &mdash;{" "}
            <Link href="/how-it-works/principles/be-changeable" className="underline">
              Be Changeable
            </Link>
            .
          </li>
          <li>
            Steering, or quietly relocating whatever your partner just offered &mdash;{" "}
            <Link href="/how-it-works/principles/be-supportive" className="underline">
              Be Supportive
            </Link>
            .
          </li>
          <li>
            Cleverness &mdash; scenes that are constructed, admired, and inert &mdash;{" "}
            <Link href="/how-it-works/principles/be-simple" className="underline">
              Be Simple
            </Link>
            .
          </li>
          <li>
            Hedging: playing safely, at half commitment, waiting to see what the scene turns out to
            be &mdash;{" "}
            <Link href="/how-it-works/principles/be-brave" className="underline">
              Be Brave
            </Link>
            .
          </li>
        </ul>
        <p className="text-foreground/70 mb-4">
          A group can work this way too, and it is a better use of a rehearsal than running the list
          in sequence. Name the failure the last show actually had, take the one principle that
          addresses it, and spend the whole session on that.
        </p>
      </section>
    </main>
  );
}
