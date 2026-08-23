import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { CollectionJsonLd } from "@/components/CollectionJsonLd";
import { TagFilter } from "@/components/TagFilter";
import { getAtomUrl, loadAtoms } from "@/lib/content";
import { leadParagraph, pageTitle, stripLeadLabel } from "@/lib/seo";

export const metadata: Metadata = {
  title: pageTitle("Improv Formats"),
  description:
    "Long form and short form explained, every format from Harold to Armando, and how to choose one for the cast and the running time you actually have.",
  alternates: { canonical: "/practice/formats" },
};

const FILTER_GROUPS = [
  {
    label: "Form",
    tags: [
      { label: "Longform", tag: "longform" },
      { label: "Shortform", tag: "shortform" },
    ],
  },
  {
    label: "Level",
    tags: [
      { label: "Beginner-friendly", tag: "accessible" },
      { label: "Advanced", tag: "advanced" },
    ],
  },
  {
    label: "Style",
    tags: [
      { label: "Competition", tag: "competition" },
      { label: "Narrative", tag: "narrative" },
      { label: "Audience interaction", tag: "audience-interaction" },
      { label: "Duo", tag: "duo" },
      { label: "Music", tag: "music" },
    ],
  },
];

export default async function FormatsPage() {
  const atoms = await loadAtoms();
  const formats = atoms.filter((a) => a.frontmatter.type === "format");

  const items = formats.map((a) => ({
    id: a.frontmatter.id,
    title: a.frontmatter.title,
    href: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
    tags: a.frontmatter.tags ?? [],
    rules: a.frontmatter.how_to_play,
    preview: leadParagraph(stripLeadLabel(a.content), 180),
  }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <CollectionJsonLd
        name="Improv Formats"
        description="The structures improv is performed in — short-form games and long-form forms, and what each one asks of a cast."
        url="/practice/formats"
        partOf="/practice"
        items={items.map((i) => ({ name: i.title, url: i.href, description: i.preview }))}
      />
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Practice", href: "/practice" },
          { label: "Formats" },
        ]}
      />
      <header className="mb-8">
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Formats ({formats.length})</h1>
        <p className="text-foreground/60 mt-2 mb-2">
          Performance structures — from 2-minute games to 60-minute shows.
        </p>
      </header>
      <TagFilter items={items} filterGroups={FILTER_GROUPS} />

      <section className="border-foreground/10 mt-16 border-t pt-12">
        <h2 className="mb-3 text-xl font-semibold">What Is Long Form Improv?</h2>
        <p className="text-foreground/70 mb-4">
          One continuous piece rather than a sequence of separate bits. A long form show takes a
          suggestion and treats everything that follows as belonging to the same work, so something
          established in minute four can return in minute twenty-eight and mean what it could not
          have meant the first time. Short form is the other arrangement: discrete games, each with
          its own announced rule, each finished before the next begins.
        </p>
        <p className="text-foreground/70 mb-4">
          For a cast, the useful difference is where the difficulty sits. Short form is hardest at
          the start of every game, because you have seconds to make something specific inside a
          constraint the audience has already been told. Long form is hardest in the middle, once
          the opening energy has gone and the piece has to turn out to be about something. Most
          groups find one of those markedly harder than the other, and which one is a better guide
          to what they should be rehearsing than any ranking of the forms themselves. The{" "}
          <Link href="/what-is-improv" className="underline">
            what is improv
          </Link>{" "}
          guide covers where both came from.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="mb-3 text-xl font-semibold">Choosing One for a Group</h2>
        <p className="text-foreground/70 mb-4">
          Four constraints decide this, and none of them is taste.
        </p>
        <ul className="text-foreground/70 mb-4 space-y-2">
          <li>
            <strong>Cast size.</strong> Harold wants six to nine. A duo form with nine people on the
            back line leaves seven of them watching, which is a rehearsal problem before it is a
            show problem.
          </li>
          <li>
            <strong>How long they have been playing.</strong> Formats with an announced structure
            give newer players something to hold. Organic forms give them nothing, and a group that
            cannot yet edit will simply not end scenes.
          </li>
          <li>
            <strong>Show length.</strong> Twenty minutes is not a short Harold; it is a montage.
            Compressing a form is how casts end up rushing the part that needed the time.
          </li>
          <li>
            <strong>What the group is currently bad at.</strong> The most useful reason to pick a
            format is that it forces the thing being avoided — competitive formats force commitment,
            narrative formats force consequence.
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="mb-3 text-xl font-semibold">Format Choice Matters Less Than It Looks</h2>
        <p className="text-foreground/70 mb-4">
          Groups spend a great deal of time choosing between these and comparatively little on the
          thing that decides whether any of them works. A cast that listens will produce a good show
          in a format that suits them badly. A cast that does not will produce the same show in
          every format, and switching is how a team avoids noticing that for a year.
        </p>
        <p className="text-foreground/70">
          The structures are here because they are genuinely different instruments, not because the
          choice is the important part. For the games inside them, see{" "}
          <Link href="/improv-games" className="underline">
            improv games
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
