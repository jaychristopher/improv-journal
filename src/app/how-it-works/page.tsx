import type { Metadata } from "next";
import Link from "next/link";

import { AlsoCalled } from "@/components/AlsoCalled";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Prose } from "@/components/Prose";
import { getAtomUrl, loadAtoms } from "@/lib/content";
import { pageTitle } from "@/lib/seo";

export const metadata: Metadata = {
  /**
   * The last major hub whose title claimed no subject.
   *
   * "Why Conversations Work (or Don't)" is a good headline and names nothing
   * anybody searches for, on a page carrying a link from the nav and the
   * footer of all 376 pages. Its siblings all lead with the subject — Improv
   * Formats, Improv Glossary, Improv Reading List — and this one did not.
   *
   * Search Console shows the shape of the cost: performance-state,
   * meaning-is-relational, interdependence, cognitive-bandwidth and
   * diagnosis/blocking all draw impressions, and the hub they sit under draws
   * none.
   *
   * "How improv works" is targeted by nothing here and collides with nothing.
   * /improv-theory holds the neighbouring cluster — improv philosophy, history
   * of improv — and /what-is-improv holds the definitional query, which is a
   * different question from how the thing operates.
   */
  title: pageTitle("How Improv Works: The Laws Underneath a Scene"),
  description:
    "How improv works underneath the games: six reasons every conversation is hard, and eight things that help. Worked out live, on stage, without a script.",
  alternates: { canonical: "/how-it-works" },
};

/**
 * Orienting paragraphs for this hub, held in a const the way guide-categories
 * holds them for the topic hubs. Kept out of JSX so the prose is plain strings
 * rather than escaped markup, and so prose-overlap reads it as text.
 */
const HUB_ORIENTATION = [
  "This is the layer underneath the advice, and it splits in two. The laws are constraints — you cannot take a line back, attention is finite, a shared reality decays if nobody maintains it. The principles are what to do about them. The distinction is load-bearing: you can disagree with a principle and work differently, and you cannot disagree with a law, only pay for ignoring it.",
  "It reads as physics rather than psychology because of where it came from. These were not derived from a theory of people and then tested; they were noticed by performers watching the same failures recur, live, in public, with nothing to fall back on. Improv is unusual in how legible its failures are — a scene dies in front of everyone, immediately, and the cause is usually still visible in the last ten seconds.",
  "You do not need any of this to use the guides. It is here for the point where a technique stops working and the advice starts sounding like superstition, because that is when knowing which constraint you are up against is the difference between trying harder and trying something else.",
];

export default async function SystemPage() {
  const atoms = await loadAtoms();
  const laws = atoms.filter((a) => a.frontmatter.type === "law");
  const insights = atoms.filter((a) => a.frontmatter.type === "insight");
  const principles = atoms.filter((a) => a.frontmatter.type === "principle");

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "How It Works" }]} />

      <header className="mb-12">
        {/* Kept in step with the metadata title; see the note on it. */}
        <h1 className="text-3xl font-bold tracking-tight">
          How Improv Works: The Laws Underneath a Scene
        </h1>
        <Prose
          text="There are six reasons every conversation is hard — and eight things you can do about it. Improv performers figured this out by doing it live, every night, with no script. Here's what they found."
          currentUrl="/how-it-works"
          className="text-foreground/60 mt-2"
        />
      </header>

      <section className="mb-12">
        {HUB_ORIENTATION.map((paragraph) => (
          <Prose
            text={paragraph}
            currentUrl="/how-it-works"
            className="text-foreground/70 mb-4"
            key={paragraph.slice(0, 40)}
          />
        ))}
      </section>

      <section className="mb-12" data-track="law-list">
        <h2 id="the-six-reasons-it-s-hard" className="mb-2 text-lg font-semibold">
          The six reasons it&apos;s hard
        </h2>
        <Prose
          text="Every conversation you've ever had operates under these constraints — you just don't notice them until something goes wrong."
          currentUrl="/how-it-works"
          className="text-foreground/40 mb-4 text-sm"
        />
        <div className="space-y-3">
          {laws.map((a) => (
            <Link
              key={a.frontmatter.id}
              href={getAtomUrl({
                id: a.frontmatter.id,
                type: a.frontmatter.type,
              })}
              className="group border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-4 transition-colors"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{a.frontmatter.title}</h3>
                <span className="text-foreground/30 transition-transform group-hover:translate-x-0.5">
                  &rarr;
                </span>
              </div>
              <AlsoCalled aliases={a.frontmatter.aliases} />
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-12" data-track="principle-list">
        <h2 className="mb-2 text-lg font-semibold">
          <Link href="/how-it-works/principles" className="hover:underline">
            Eight things that help
          </Link>
        </h2>
        <Prose
          text="Behavioral guidelines discovered through decades of improv practice. Not rules — things that consistently make connection work better."
          currentUrl="/how-it-works"
          className="text-foreground/40 mb-4 text-sm"
        />
        <div className="grid grid-cols-2 gap-3">
          {principles.map((a) => (
            <Link
              key={a.frontmatter.id}
              href={getAtomUrl({
                id: a.frontmatter.id,
                type: a.frontmatter.type,
              })}
              className="group border-foreground/10 bg-surface hover:border-foreground/30 rounded-lg border p-3 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{a.frontmatter.title}</span>
                <span className="text-foreground/30 transition-transform group-hover:translate-x-0.5">
                  &rarr;
                </span>
              </div>
              <AlsoCalled aliases={a.frontmatter.aliases} />
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-12" data-track="diagnosis-link">
        <h2 className="mb-2 text-lg font-semibold">
          <Link href="/how-it-works/diagnosis" className="hover:underline">
            When it goes wrong
          </Link>
        </h2>
        <Prose
          text="Conversations fail in predictable ways. Once you can name the pattern, you can fix it."
          currentUrl="/how-it-works"
          className="text-foreground/40 mb-4 text-sm"
        />
        <Link href="/how-it-works/diagnosis" className="text-foreground/60 text-sm hover:underline">
          See the failure patterns &rarr;
        </Link>
      </section>

      <section className="mb-12" data-track="which-layer">
        <h2 id="which-layer-you-need" className="mb-3 text-lg font-semibold">
          Which Layer You Need
        </h2>
        <Prose
          text="The difference between a law and a principle is not how important it is. A law is something you cannot violate, only pay for — you will not make time reversible or attention infinite by being disciplined about it. A principle is something you can ignore whenever you like, and people do, which is why they need stating at all."
          currentUrl="/how-it-works"
          className="text-foreground/70 mb-4"
        />
        <p className="text-foreground/70 mb-4">
          That decides where to start when something has gone wrong.
        </p>
        <Prose
          text="**If you can already name what happened** — somebody blocked, nobody listened, the scene never settled anywhere — go straight to [the failure patterns](/how-it-works/diagnosis). Naming it is most of the work and the fix is usually specific."
          currentUrl="/how-it-works"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="**If it just felt dead and you cannot say why**, start with the laws. There are six of them, they are the constraints every exchange runs under, and a scene that felt flat for no visible reason has almost always hit one of them rather than something exotic."
          currentUrl="/how-it-works"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="**If you know exactly what you did and keep doing it anyway**, the problem is not knowledge, and [the principles](/how-it-works/principles) are where the habit-level answer lives. Knowing you should have listened has never once made anybody listen."
          currentUrl="/how-it-works"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="The order is not a curriculum. Most people arrive at one of these pages from a search, read the thing that describes their own week, and never touch the rest — which is a reasonable way to use it."
          currentUrl="/how-it-works"
          className="text-foreground/70"
        />
      </section>

      {insights.length > 0 && (
        <section data-track="insight-list">
          <h2 id="bigger-picture" className="mb-2 text-lg font-semibold">
            Bigger picture
          </h2>
          <p className="text-foreground/40 mb-4 text-sm">
            Where these ideas lead beyond the stage.
          </p>
          <div className="space-y-3">
            {insights.map((a) => (
              <Link
                key={a.frontmatter.id}
                href={getAtomUrl({
                  id: a.frontmatter.id,
                  type: a.frontmatter.type,
                })}
                className="group border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-4 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{a.frontmatter.title}</h3>
                  <span className="text-foreground/30 transition-transform group-hover:translate-x-0.5">
                    &rarr;
                  </span>
                </div>
                <AlsoCalled aliases={a.frontmatter.aliases} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
