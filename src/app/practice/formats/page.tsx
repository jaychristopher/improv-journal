import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { CollectionJsonLd } from "@/components/CollectionJsonLd";
import { Diagram } from "@/components/Diagram";
import { TableOfContents } from "@/components/TableOfContents";
import { TagFilter } from "@/components/TagFilter";
import { getAtomUrl, loadAtoms } from "@/lib/content";
import { leadParagraph, pageTitle, stripLeadLabel } from "@/lib/seo";

export const metadata: Metadata = {
  // Search Console has this page surfacing only for long-form queries —
  // "long form improv", "what is long form improv", "long form improv
  // formats" — while the title said neither "long" nor "short". The page
  // carries a section on exactly that question; the strongest signal on it
  // just did not mention the subject.
  title: pageTitle("Improv Formats: Long Form, Short Form and How to Choose"),
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

/** Written out because hub headings are JSX; anchor-targets checks them. */
const SECTIONS = [
  { id: "what-is-long-form-improv", text: "What Is Long Form Improv?", level: 2 as const },
  { id: "what-is-short-form-improv", text: "What Is Short Form Improv?", level: 2 as const },
  { id: "choosing-one-for-a-group", text: "Choosing One for a Group", level: 2 as const },
  {
    id: "format-choice-matters-less-than-it-looks",
    text: "Format Choice Matters Less Than It Looks",
    level: 2 as const,
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
    aliases: a.frontmatter.aliases,
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
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Improv Formats ({formats.length})
        </h1>
        <p className="text-foreground/60 mt-2 mb-2">
          Performance structures — from 2-minute games to 60-minute shows.
        </p>
      </header>
      {/* The list carries an h2 of its own so the entries below it do not jump
          the outline straight from h1 to h3 — the same fix /improv-games has. */}
      <h2 className="mb-4 text-xl font-semibold">Every Format</h2>
      <TagFilter items={items} filterGroups={FILTER_GROUPS} />

      <section className="border-foreground/10 mt-16 border-t pt-12">
        <TableOfContents headings={SECTIONS} />

        <h2 id="what-is-long-form-improv" className="mb-3 text-xl font-semibold">
          What Is Long Form Improv?
        </h2>
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
        <Diagram
          src="/images/longform-vs-shortform.svg"
          alt="Short form and long form as two timelines: short form four discrete games with the difficulty at each start, long form one continuous piece with the difficulty in the middle."
          caption="Most groups find one of the two markedly harder, and which one is a better guide to what they should be rehearsing than any ranking of the forms."
        />
        <p className="text-foreground/70 mb-4">
          It is a Chicago invention and a fairly recent one. Short form had been running for decades
          before{" "}
          <Link href="/del-close" className="underline">
            Del Close
          </Link>{" "}
          built the first named long form out of the conviction that an improvised piece could hold
          together the way a written one does. The result was the{" "}
          <Link href="/practice/formats/harold" className="underline">
            Harold
          </Link>
          , and almost every form below is either a descendant of it or an argument with it.
        </p>
        <p className="text-foreground/70 mb-4">
          Most long form sets are built the same way underneath, whatever they are called. Something
          at the top generates raw material &mdash; a monologue, a group game, a few minutes of
          movement &mdash; and the scenes that follow mine it. Later scenes return to what earlier
          ones established, which is the move{" "}
          <Link href="/practice/techniques/reincorporation" className="underline">
            reincorporation
          </Link>{" "}
          names and the reason a long form set feels like it was about something. Nobody decided
          what it was about in advance; the piece accumulated a subject and then paid it off.
        </p>
        <p className="text-foreground/70 mb-4">
          The families worth knowing, all of which have a page here:
        </p>
        <ul className="text-foreground/70 mb-4 space-y-2">
          <li>
            <strong>
              <Link href="/practice/formats/montage" className="underline">
                Montage
              </Link>
            </strong>{" "}
            &mdash; scenes connected by theme rather than by structure. The honest first long form,
            and the one most groups are actually doing when they say they are doing a Harold.
          </li>
          <li>
            <strong>
              <Link href="/practice/formats/harold" className="underline">
                Harold
              </Link>
            </strong>{" "}
            &mdash; an opening, three sets of scenes, and the returns between them. Taught early
            almost everywhere and considerably harder than what it is taught alongside.
          </li>
          <li>
            <strong>
              <Link href="/practice/formats/narrative-longform" className="underline">
                Narrative long form
              </Link>
            </strong>{" "}
            &mdash; one story, told forward, with characters who persist. Rarer in Chicago-descended
            training and the default in much of Europe.
          </li>
          <li>
            <strong>
              <Link href="/practice/formats/monoscene" className="underline">
                Monoscene
              </Link>
            </strong>{" "}
            &mdash; a single scene, one location, for the whole set. Removes every escape route,
            which is why it is a diagnostic as much as a form.
          </li>
          <li>
            <strong>
              <Link href="/practice/formats/two-person-longform" className="underline">
                Two-person long form
              </Link>
            </strong>{" "}
            &mdash; no backline, no edits to hide behind. The small cast makes it look like a
            beginner form and it is the opposite.
          </li>
        </ul>
        <p className="text-foreground/70 mb-4">
          A group starting out should run montages for longer than feels impressive. The structure
          in a Harold is not what makes a Harold good, and a cast that cannot yet sustain a
          two-handed scene for four minutes will not be rescued by having somewhere to be at minute
          twelve.
        </p>
      </section>

      <section className="mt-12">
        <h2 id="what-is-short-form-improv" className="mb-3 text-xl font-semibold">
          What Is Short Form Improv?
        </h2>
        <p className="text-foreground/70 mb-4">
          A sequence of separate games, each with a rule announced before it starts and each
          finished before the next begins. Nothing carries over: the scene about the locksmith does
          not come back, and is not meant to.
        </p>
        <p className="text-foreground/70 mb-4">
          The announced rule is the part people underrate. Telling an audience the constraint before
          the game starts makes them a party to it &mdash; they know what is difficult, so they are
          watching for whether it gets done, and a good deal of what reads as comedy is really the
          visible cost of the constraint. Long form asks an audience to work out what a piece is
          about; short form tells them what the problem is and lets them keep score.
        </p>
        <p className="text-foreground/70 mb-4">
          It also has a role long form mostly does not: a host. Somebody frames each game, collects
          the suggestion and decides when a game has finished, which is a real skill and the reason
          a short form set can survive an uneven cast. The lineage runs through Johnstone&rsquo;s{" "}
          <Link href="/practice/formats/theatresports" className="underline">
            Theatresports
          </Link>
          , which made it competitive on purpose, and reached most people through the television
          version of the same idea.
        </p>
        <p className="text-foreground/70 mb-4">
          What it is good at: rooms new to improv, short slots, and casts of mixed experience, since
          a weaker player can be carried inside a game in a way a thirty-minute piece does not
          allow. What it cannot do is accumulate. Nothing established in game three is available in
          game seven, so the depth an audience feels at the end of a good long form set is not on
          offer &mdash; which is a fair trade and worth making deliberately rather than by default.
        </p>

        <h2 id="choosing-one-for-a-group" className="mb-3 text-xl font-semibold">
          Choosing One for a Group
        </h2>
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
        <h2 id="format-choice-matters-less-than-it-looks" className="mb-3 text-xl font-semibold">
          Format Choice Matters Less Than It Looks
        </h2>
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
