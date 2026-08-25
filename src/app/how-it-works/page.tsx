import type { Metadata } from "next";
import Link from "next/link";

import { AlsoCalled } from "@/components/AlsoCalled";
import { Breadcrumb } from "@/components/Breadcrumb";
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
        <p className="text-foreground/60 mt-2">
          There are six reasons every conversation is hard — and eight things you can do about it.
          Improv performers figured this out by doing it live, every night, with no script.
          Here&apos;s what they found.
        </p>
      </header>

      <section className="mb-12">
        {HUB_ORIENTATION.map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="text-foreground/70 mb-4">
            {paragraph}
          </p>
        ))}
      </section>

      <section className="mb-12">
        <h2 id="the-six-reasons-it-s-hard" className="mb-2 text-lg font-semibold">
          The six reasons it&apos;s hard
        </h2>
        <p className="text-foreground/40 mb-4 text-sm">
          Every conversation you&apos;ve ever had operates under these constraints — you just
          don&apos;t notice them until something goes wrong.
        </p>
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

      <section className="mb-12">
        <h2 className="mb-2 text-lg font-semibold">
          <Link href="/how-it-works/principles" className="hover:underline">
            Eight things that help
          </Link>
        </h2>
        <p className="text-foreground/40 mb-4 text-sm">
          Behavioral guidelines discovered through decades of improv practice. Not rules — things
          that consistently make connection work better.
        </p>
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

      <section className="mb-12">
        <h2 className="mb-2 text-lg font-semibold">
          <Link href="/how-it-works/diagnosis" className="hover:underline">
            When it goes wrong
          </Link>
        </h2>
        <p className="text-foreground/40 mb-4 text-sm">
          Conversations fail in predictable ways. Once you can name the pattern, you can fix it.
        </p>
        <Link href="/how-it-works/diagnosis" className="text-foreground/60 text-sm hover:underline">
          See the failure patterns &rarr;
        </Link>
      </section>

      <section className="mb-12">
        <h2 id="which-layer-you-need" className="mb-3 text-lg font-semibold">
          Which Layer You Need
        </h2>
        <p className="text-foreground/70 mb-4">
          The difference between a law and a principle is not how important it is. A law is
          something you cannot violate, only pay for &mdash; you will not make time reversible or
          attention infinite by being disciplined about it. A principle is something you can ignore
          whenever you like, and people do, which is why they need stating at all.
        </p>
        <p className="text-foreground/70 mb-4">
          That decides where to start when something has gone wrong.
        </p>
        <p className="text-foreground/70 mb-4">
          <strong>If you can already name what happened</strong> &mdash; somebody blocked, nobody
          listened, the scene never settled anywhere &mdash; go straight to{" "}
          <Link href="/how-it-works/diagnosis" className="underline">
            the failure patterns
          </Link>
          . Naming it is most of the work and the fix is usually specific.
        </p>
        <p className="text-foreground/70 mb-4">
          <strong>If it just felt dead and you cannot say why</strong>, start with the laws. There
          are six of them, they are the constraints every exchange runs under, and a scene that felt
          flat for no visible reason has almost always hit one of them rather than something exotic.
        </p>
        <p className="text-foreground/70 mb-4">
          <strong>If you know exactly what you did and keep doing it anyway</strong>, the problem is
          not knowledge, and{" "}
          <Link href="/how-it-works/principles" className="underline">
            the principles
          </Link>{" "}
          are where the habit-level answer lives. Knowing you should have listened has never once
          made anybody listen.
        </p>
        <p className="text-foreground/70">
          The order is not a curriculum. Most people arrive at one of these pages from a search,
          read the thing that describes their own week, and never touch the rest &mdash; which is a
          reasonable way to use it.
        </p>
      </section>

      {insights.length > 0 && (
        <section>
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
