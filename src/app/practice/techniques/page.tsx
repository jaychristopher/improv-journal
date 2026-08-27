import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { CollectionJsonLd } from "@/components/CollectionJsonLd";
import { TagFilter } from "@/components/TagFilter";
import { getAtomUrl, loadAtoms } from "@/lib/content";
import { leadParagraph, pageTitle, stripLeadLabel } from "@/lib/seo";

export const metadata: Metadata = {
  // Same correction as the exercises hub: the term alone was the entire title.
  title: pageTitle("Improv Techniques: The Moves and When to Use Them"),
  description:
    "The specific moves — how to listen, initiate, edit, support, heighten and recover — and which one a scene actually needs when it stalls.",
  alternates: { canonical: "/practice/techniques" },
};

const FILTER_GROUPS = [
  {
    label: "Level",
    tags: [
      { label: "Beginner", tag: "beginner" },
      { label: "Intermediate", tag: "intermediate" },
      { label: "Advanced", tag: "advanced" },
    ],
  },
  {
    label: "Area",
    tags: [
      { label: "Game", tag: "game" },
      { label: "Show craft", tag: "show-craft" },
      { label: "Character", tag: "character" },
      { label: "Ensemble", tag: "ensemble" },
      { label: "Performance", tag: "performance" },
      { label: "Teaching", tag: "pedagogy" },
      { label: "Harold", tag: "harold" },
    ],
  },
];

export default async function TechniquesPage() {
  const atoms = await loadAtoms();
  const techniques = atoms.filter(
    (a) => a.frontmatter.type === "technique" || a.frontmatter.type === "pedagogy",
  );

  const items = techniques.map((a) => ({
    id: a.frontmatter.id,
    title: a.frontmatter.title,
    href: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
    tags: a.frontmatter.tags ?? [],
    preview: leadParagraph(stripLeadLabel(a.content), 180),
    aliases: a.frontmatter.aliases,
  }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <CollectionJsonLd
        name="Improv Techniques"
        description="The specific moves — how to listen, initiate, edit, support, heighten, and recover in improv scenes."
        url="/practice/techniques"
        partOf="/practice"
        items={items.map((i) => ({ name: i.title, url: i.href, description: i.preview }))}
      />
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Practice", href: "/practice" },
          { label: "Techniques" },
        ]}
      />
      <header className="mb-8">
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Techniques ({techniques.length})</h1>
        <p className="text-foreground/60 mt-2 mb-2">
          The specific moves — how to listen, initiate, edit, support, heighten, and recover.
        </p>
      </header>
      {/* This hub was one sentence over a list of every technique on the site,
          while its siblings carry real treatments — /practice/formats and
          /improv-games both run to thousands of words. Techniques is the
          largest concept category here and had the thinnest category page, so
          the term had nothing on the site arguing for it. */}
      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold">What counts as a technique</h2>
        <p className="text-foreground/70 mb-3 text-sm leading-relaxed">
          A technique is a move you make. That distinguishes it from the other things this site
          catalogues, and the distinction is worth holding because they fail in different ways. A{" "}
          <Link href="/how-it-works/principles" className="underline">
            principle
          </Link>{" "}
          is a disposition — something you are doing continuously, which cannot be executed at a
          particular moment. An{" "}
          <Link href="/practice/exercises" className="underline">
            exercise
          </Link>{" "}
          is a drill that trains one, run outside a scene and usually with a constraint that would
          look strange inside one. A{" "}
          <Link href="/practice/formats" className="underline">
            format
          </Link>{" "}
          is the container the whole show sits in.
        </p>
        <p className="text-foreground/70 text-sm leading-relaxed">
          Techniques sit between them: small enough to perform deliberately, specific enough to
          coach, and useful mid-scene rather than only in a workshop. When a note lands and nothing
          changes, it is often because a principle was given where a technique was needed — being
          told to listen more is not something a person can do on the next line, whereas naming the
          last thing your partner said is.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold">The jobs they do</h2>
        <p className="text-foreground/70 mb-3 text-sm leading-relaxed">
          Almost everything here is doing one of six jobs: receiving what your partner gave you,
          initiating so the scene has somewhere to go, editing so it ends before it sags, supporting
          so somebody else&apos;s idea works, heightening so it escalates rather than repeats, and
          recovering when it has already gone wrong.
        </p>
        <p className="text-foreground/70 text-sm leading-relaxed">
          That last group is worth knowing exists before you need it. What to do about a scene that
          has already stalled is a separate body of work from what to do to make one go well, and it
          lives under{" "}
          <Link href="/how-it-works/diagnosis" className="underline">
            failure modes and recovery
          </Link>
          .
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold">Questions People Ask About Improv Techniques</h2>

        <h3 className="mt-4 mb-1 font-semibold">How many techniques do you actually need?</h3>
        <p className="text-foreground/70 text-sm leading-relaxed">
          Far fewer than are listed here, and the list is a reference rather than a syllabus.
          Working improvisers run on a small set they can reach without thinking, and the reason to
          have a catalogue at all is diagnostic — when something keeps going wrong in the same way,
          it helps to be able to look up the move that addresses it.
        </p>

        <h3 className="mt-4 mb-1 font-semibold">Which ones should a beginner learn first?</h3>
        <p className="text-foreground/70 text-sm leading-relaxed">
          The receiving ones, before anything that generates material. Most early scene problems get
          diagnosed as a shortage of ideas and are actually a failure to take in what was already
          offered, which is why adding more invention makes them worse rather than better.
        </p>

        <h3 className="mt-4 mb-1 font-semibold">Do techniques make improv formulaic?</h3>
        <p className="text-foreground/70 text-sm leading-relaxed">
          They can, and the traditions disagree about how much. A named, teachable move is easy to
          assess and easy to over-apply, and scenes built by assembling them do come out looking
          alike. The counter-argument is that the alternative is not freedom but a smaller
          vocabulary — a performer who cannot name what they did cannot repeat it deliberately.
        </p>

        <h3 className="mt-4 mb-1 font-semibold">
          What is the difference between a technique and a game?
        </h3>
        <p className="text-foreground/70 text-sm leading-relaxed">
          A technique is something one performer does; a game is a pattern the scene is running.
          They get confused because the word game also names a warm-up activity, which is a third
          thing again and lives with the{" "}
          <Link href="/improv-games" className="underline">
            improv games
          </Link>
          .
        </p>
      </section>

      {/* The list carries an h2 of its own so the entries below it do not jump
          the outline straight from h1 to h3 — the same fix /improv-games has. */}
      <h2 className="mb-4 text-xl font-semibold">Every Technique</h2>
      <TagFilter items={items} filterGroups={FILTER_GROUPS} />
    </main>
  );
}
