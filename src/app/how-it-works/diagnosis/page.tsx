import type { Metadata } from "next";
import Link from "next/link";

import { AlsoCalled } from "@/components/AlsoCalled";
import { Breadcrumb } from "@/components/Breadcrumb";
import { CollectionJsonLd } from "@/components/CollectionJsonLd";
import { Prose } from "@/components/Prose";
import { getAtomUrl, loadAtoms } from "@/lib/content";
import { COUNTER_DRILLS_CAP, counterDrills } from "@/lib/counter-drills";
import { loadDiagnosisAtoms } from "@/lib/diagnosis";
import { leadParagraph, pageTitle, stripLeadLabel } from "@/lib/seo";

export const metadata: Metadata = {
  title: pageTitle("When It Breaks: Improv Failure Modes and Recovery"),
  description:
    "Collapse modes, failure patterns, and recovery — the diagnostic vocabulary for naming what went wrong and finding the way back.",
  alternates: { canonical: "/how-it-works/diagnosis" },
};

export default async function DiagnosisPage() {
  // Every framework, antipattern and pattern atom, by type — see lib/diagnosis
  // for why the selection lives there and the guard that reads it.
  const { frameworks, antipatterns, patterns } = await loadDiagnosisAtoms();
  // The drills that counter each failure, from the `contrasts` edges the
  // drills declare toward it. The hub told a reader to name the failure and
  // named nothing to do about it while the graph held 37 such pairings
  // (tracker entry 286); "Counter it with" ends the naming in a drill.
  const counters = counterDrills(await loadAtoms());

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
        <Prose
          text="Collapse modes, failure patterns, and recovery — the diagnostic vocabulary for naming what went wrong and finding the way back."
          currentUrl="/how-it-works/diagnosis"
          className="text-foreground/60 mt-2"
        />
      </header>

      {/* This hub was one sentence over three grouped lists. The grouping labels
          — Frameworks, Antipatterns, Patterns — name the taxonomy without ever
          explaining it, and the collapse modes the whole layer is organised
          around were never stated on the page that organises them. */}
      <section className="mb-12">
        <h2 className="mb-3 text-lg font-semibold">The vocabulary gap this closes</h2>
        <Prose
          text="Most improvisers can tell a scene did not work long before they can say why. The feeling arrives immediately; the words do not arrive at all, and “it just died” is where the note usually stops. That gap is the thing keeping people stuck, because a failure you cannot name is a failure you cannot practise against."
          currentUrl="/how-it-works/diagnosis"
          className="text-foreground/70 mb-3 text-sm leading-relaxed"
        />
        <Prose
          text="Everything on this page exists to close it. Not to make you more critical — the point is the opposite, since a specific diagnosis is far less discouraging than a vague sense of having been bad."
          currentUrl="/how-it-works/diagnosis"
          className="text-foreground/70 text-sm leading-relaxed"
        />
      </section>

      <section className="mb-12" data-track="collapse-modes">
        <h2 className="mb-3 text-lg font-semibold">The three ways a scene collapses</h2>
        <Prose
          text="Underneath the individual failures, scenes come apart in [three ways](/how-it-works/diagnosis/systemic-collapse-modes), and each has its own way back."
          currentUrl="/how-it-works/diagnosis"
          className="text-foreground/70 mb-3 text-sm leading-relaxed"
        />
        <ul className="text-foreground/70 mb-3 space-y-2 text-sm leading-relaxed">
          <Prose
            as="li"
            text="**Latency** — the responses came too slow or landed on the wrong beat. Somebody retreated into their head, and by the time they resurfaced the scene had moved on. [Recovering from latency](/how-it-works/diagnosis/latency-recovery)."
            currentUrl="/how-it-works/diagnosis"
          />
          <Prose
            as="li"
            text="**Fracture** — the two players ended up in different scenes. An offer was missed or misread, the shared reality split, and neither can see it from inside. [Recovering from fracture](/how-it-works/diagnosis/fracture-recovery)."
            currentUrl="/how-it-works/diagnosis"
          />
          <Prose
            as="li"
            text="**Decay** — the scene went thin. Details stopped mattering, earlier threads were dropped, nothing accumulated. It did not break; it faded. [Recovering from decay](/how-it-works/diagnosis/decay-recovery)."
            currentUrl="/how-it-works/diagnosis"
          />
        </ul>
        <Prose
          text="The named antipatterns below are how those collapses get produced. Working backwards from the mode to the behaviour is usually faster than trying to spot the behaviour directly; [diagnosing scene failure](/how-it-works/diagnosis/diagnosing-scene-failure) is that procedure written out in three steps."
          currentUrl="/how-it-works/diagnosis"
          className="text-foreground/70 text-sm leading-relaxed"
        />
      </section>

      <section className="mb-12" data-track="diagnosis-faq">
        <h2 className="mb-3 text-lg font-semibold">
          Questions People Ask About Scenes Going Wrong
        </h2>

        <h3 className="mt-4 mb-1 font-semibold">
          Why did the scene die when nobody did anything wrong?
        </h3>
        {/* The answer described wimping without naming it, on the page that
            lists wimping forty lines down (tracker entry 72). */}
        <Prose
          text="Because most scenes are not killed by an error. Decay needs nobody to make a mistake — it only needs everyone to stop building, and a scene where both players are being agreeable and adding nothing will fade with no identifiable moment where it went wrong. The failure has a name, [wimping](/how-it-works/diagnosis/wimping): nobody did anything, which is the mistake."
          currentUrl="/how-it-works/diagnosis"
          className="text-foreground/70 text-sm leading-relaxed"
        />

        <h3 className="mt-4 mb-1 font-semibold">Is blocking really the main problem?</h3>
        <Prose
          text="It is the most taught and rarely the most common. Outright denial is easy to spot and therefore easy to stop doing. The versions that survive training are quieter — [steering](/how-it-works/diagnosis/steering), which accepts the words while refusing to be changed by them — which is why the [blocking taxonomy](/how-it-works/diagnosis/blocking-taxonomy) is worth more than the instruction not to block."
          currentUrl="/how-it-works/diagnosis"
          className="text-foreground/70 text-sm leading-relaxed"
        />

        <h3 className="mt-4 mb-1 font-semibold">
          Can you diagnose a scene while you are still in it?
        </h3>
        <Prose
          text="Partly, and carefully. Watching for the [health indicators](/how-it-works/diagnosis/systemic-health-indicators) costs attention the scene needs, so the mid-scene version has to be cheap — one question, not an audit. The indicators’ own is “would my next move surprise my partner?” The detailed work belongs afterwards."
          currentUrl="/how-it-works/diagnosis"
          className="text-foreground/70 text-sm leading-relaxed"
        />

        <h3 className="mt-4 mb-1 font-semibold">
          Does naming failures make people more self-conscious?
        </h3>
        <Prose
          text="It can, if the vocabulary gets used during scenes rather than after them. Used afterwards it does the reverse: a person who knows their recurring problem is latency has something to work on, where a person who only knows they were bad has something to dread."
          currentUrl="/how-it-works/diagnosis"
          className="text-foreground/70 text-sm leading-relaxed"
        />
      </section>

      {frameworks.length > 0 && (
        <section className="mb-12" data-track="framework-list" data-derived="true">
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

      <section className="mb-12" data-track="antipattern-list" data-derived="true">
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
              {(counters.get(a.frontmatter.id) ?? []).length > 0 && (
                // Above the title's stretched link, so the drills are
                // reachable as links rather than swallowed by the card — the
                // principles hub's "Failures this addresses" line, one layer
                // down (entry 155). Capped at three; the failure's own page
                // lists the rest under "Drills that counter this".
                <p className="text-foreground/60 relative z-10 mt-1 text-xs">
                  Counter it with:{" "}
                  {(counters.get(a.frontmatter.id) ?? [])
                    .slice(0, COUNTER_DRILLS_CAP)
                    .map((d, i, all) => (
                      <span key={d.id}>
                        <Link href={d.url} className="underline">
                          {d.title}
                        </Link>
                        {i < all.length - 1 ? ", " : ""}
                      </span>
                    ))}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section data-track="pattern-list" data-derived="true">
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
