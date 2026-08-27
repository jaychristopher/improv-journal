import type { Metadata } from "next";
import Link from "next/link";

import { AlsoCalled } from "@/components/AlsoCalled";
import { Breadcrumb } from "@/components/Breadcrumb";
import { CollectionJsonLd } from "@/components/CollectionJsonLd";
import { getAtomUrl, loadAtoms } from "@/lib/content";
import { leadParagraph, pageTitle, stripLeadLabel } from "@/lib/seo";

export const metadata: Metadata = {
  title: pageTitle("When It Breaks: Improv Failure Modes and Recovery"),
  description:
    "Collapse modes, failure patterns, and recovery — the diagnostic vocabulary for naming what went wrong and finding the way back.",
  alternates: { canonical: "/how-it-works/diagnosis" },
};

export default async function DiagnosisPage() {
  const atoms = await loadAtoms();
  const antipatterns = atoms.filter((a) => a.frontmatter.type === "antipattern");
  const patterns = atoms.filter((a) => a.frontmatter.type === "pattern");
  const frameworks = atoms.filter((a) => a.frontmatter.type === "framework");

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <CollectionJsonLd
        name="When It Breaks: Improv Failure Modes and Recovery"
        description="Collapse modes, failure patterns, and recovery — the diagnostic vocabulary for naming what went wrong and finding the way back."
        url="/how-it-works/diagnosis"
        partOf="/how-it-works"
        items={[...frameworks, ...antipatterns, ...patterns].map((a) => ({
          name: a.frontmatter.title,
          url: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
          description: leadParagraph(stripLeadLabel(a.content), 180),
        }))}
      />
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "How It Works", href: "/how-it-works" },
          { label: "Diagnosis" },
        ]}
      />
      <header className="mb-12">
        <span className="text-foreground/40 text-xs tracking-wider uppercase">
          system · diagnosis
        </span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">When It Breaks</h1>
        <p className="text-foreground/60 mt-2">
          Collapse modes, failure patterns, and recovery — the diagnostic vocabulary for naming what
          went wrong and finding the way back.
        </p>
      </header>

      {/* This hub was one sentence over three grouped lists. The grouping labels
          — Frameworks, Antipatterns, Patterns — name the taxonomy without ever
          explaining it, and the collapse modes the whole layer is organised
          around were never stated on the page that organises them. */}
      <section className="mb-12">
        <h2 className="mb-3 text-lg font-semibold">The vocabulary gap this closes</h2>
        <p className="text-foreground/70 mb-3 text-sm leading-relaxed">
          Most improvisers can tell a scene did not work long before they can say why. The feeling
          arrives immediately; the words do not arrive at all, and &ldquo;it just died&rdquo; is
          where the note usually stops. That gap is the thing keeping people stuck, because a
          failure you cannot name is a failure you cannot practise against.
        </p>
        <p className="text-foreground/70 text-sm leading-relaxed">
          Everything on this page exists to close it. Not to make you more critical — the point is
          the opposite, since a specific diagnosis is far less discouraging than a vague sense of
          having been bad.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-3 text-lg font-semibold">The three ways a scene collapses</h2>
        <p className="text-foreground/70 mb-3 text-sm leading-relaxed">
          Underneath the individual failures, scenes come apart in three ways, and each has its own
          way back.
        </p>
        <ul className="text-foreground/70 mb-3 space-y-2 text-sm leading-relaxed">
          <li>
            <strong>Latency</strong> — the responses came too slow or landed on the wrong beat.
            Somebody retreated into their head, and by the time they resurfaced the scene had moved
            on.{" "}
            <Link href="/how-it-works/diagnosis/latency-recovery" className="underline">
              Recovering from latency
            </Link>
            .
          </li>
          <li>
            <strong>Fracture</strong> — the two players ended up in different scenes. An offer was
            missed or misread, the shared reality split, and neither can see it from inside.{" "}
            <Link href="/how-it-works/diagnosis/fracture-recovery" className="underline">
              Recovering from fracture
            </Link>
            .
          </li>
          <li>
            <strong>Decay</strong> — the scene went thin. Details stopped mattering, earlier threads
            were dropped, nothing accumulated. It did not break; it faded.{" "}
            <Link href="/how-it-works/diagnosis/decay-recovery" className="underline">
              Recovering from decay
            </Link>
            .
          </li>
        </ul>
        <p className="text-foreground/70 text-sm leading-relaxed">
          The named antipatterns below are how those collapses get produced. Working backwards from
          the mode to the behaviour is usually faster than trying to spot the behaviour directly.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-3 text-lg font-semibold">
          Questions People Ask About Scenes Going Wrong
        </h2>

        <h3 className="mt-4 mb-1 font-semibold">
          Why did the scene die when nobody did anything wrong?
        </h3>
        <p className="text-foreground/70 text-sm leading-relaxed">
          Because most scenes are not killed by an error. Decay needs nobody to make a mistake — it
          only needs everyone to stop building, and a scene where both players are being agreeable
          and adding nothing will fade with no identifiable moment where it went wrong.
        </p>

        <h3 className="mt-4 mb-1 font-semibold">Is blocking really the main problem?</h3>
        <p className="text-foreground/70 text-sm leading-relaxed">
          It is the most taught and rarely the most common. Outright denial is easy to spot and
          therefore easy to stop doing. The versions that survive training are quieter — accepting
          the words while refusing to be changed by them — which is why the{" "}
          <Link href="/how-it-works/diagnosis/blocking-taxonomy" className="underline">
            blocking taxonomy
          </Link>{" "}
          is worth more than the instruction not to block.
        </p>

        <h3 className="mt-4 mb-1 font-semibold">
          Can you diagnose a scene while you are still in it?
        </h3>
        <p className="text-foreground/70 text-sm leading-relaxed">
          Partly, and carefully. Watching for the{" "}
          <Link href="/how-it-works/diagnosis/systemic-health-indicators" className="underline">
            health indicators
          </Link>{" "}
          costs attention the scene needs, so the mid-scene version has to be cheap — one question,
          not an audit. The detailed work belongs afterwards.
        </p>

        <h3 className="mt-4 mb-1 font-semibold">
          Does naming failures make people more self-conscious?
        </h3>
        <p className="text-foreground/70 text-sm leading-relaxed">
          It can, if the vocabulary gets used during scenes rather than after them. Used afterwards
          it does the reverse: a person who knows their recurring problem is latency has something
          to work on, where a person who only knows they were bad has something to dread.
        </p>
      </section>

      {frameworks.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold">Frameworks</h2>
          <div className="space-y-3">
            {frameworks.map((a) => (
              <div
                key={a.frontmatter.id}
                className="border-foreground/10 bg-surface hover:border-foreground/30 relative rounded-lg border p-4 transition-colors"
              >
                <h3 className="font-medium">
                  <Link
                    href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })}
                    className="after:absolute after:inset-0"
                  >
                    {a.frontmatter.title}
                  </Link>
                </h3>
                <p className="text-foreground/60 mt-1 text-sm">
                  {leadParagraph(stripLeadLabel(a.content), 180)}
                </p>
                <AlsoCalled aliases={a.frontmatter.aliases} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">Antipatterns ({antipatterns.length})</h2>
        <p className="text-foreground/40 mb-4 text-sm">
          Named failure modes. You can&apos;t fix what you can&apos;t name.
        </p>
        <div className="space-y-3">
          {antipatterns.map((a) => (
            <div
              key={a.frontmatter.id}
              className="border-foreground/10 bg-surface hover:border-foreground/30 relative rounded-lg border p-3 transition-colors"
            >
              <Link
                href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })}
                className="block text-sm font-medium after:absolute after:inset-0"
              >
                {a.frontmatter.title}
              </Link>
              <span className="text-foreground/60 mt-1 block text-xs">
                {leadParagraph(stripLeadLabel(a.content), 180)}
              </span>
              <AlsoCalled aliases={a.frontmatter.aliases} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Patterns ({patterns.length})</h2>
        <p className="text-foreground/40 mb-4 text-sm">
          Emergent dynamics — heightening, discovery, recovery.
        </p>
        <div className="space-y-3">
          {patterns.map((a) => (
            <div
              key={a.frontmatter.id}
              className="border-foreground/10 bg-surface hover:border-foreground/30 relative rounded-lg border p-3 transition-colors"
            >
              <Link
                href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })}
                className="block text-sm font-medium after:absolute after:inset-0"
              >
                {a.frontmatter.title}
              </Link>
              <span className="text-foreground/60 mt-1 block text-xs">
                {leadParagraph(stripLeadLabel(a.content), 180)}
              </span>
              <AlsoCalled aliases={a.frontmatter.aliases} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
