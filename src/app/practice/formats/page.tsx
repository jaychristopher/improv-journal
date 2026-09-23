import type { Metadata } from "next";

import { Breadcrumb } from "@/components/Breadcrumb";
import { CollectionJsonLd } from "@/components/CollectionJsonLd";
import { Diagram } from "@/components/Diagram";
import { Prose } from "@/components/Prose";
import { TableOfContents } from "@/components/TableOfContents";
import { TagFilter } from "@/components/TagFilter";
import { getAtomUrl } from "@/lib/content";
import { PREPARE_WITH_LABEL, prepareWithFor } from "@/lib/format-drills";
import { orderedFormats } from "@/lib/hub-order";
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
  // Short form before long form, by title within — the prose below says the
  // games are what suits a room new to improv — not load order (entry 208).
  const formats = await orderedFormats();

  const items = await Promise.all(
    formats.map(async (a) => ({
      id: a.frontmatter.id,
      title: a.frontmatter.title,
      href: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
      tags: a.frontmatter.tags ?? [],
      rules: a.frontmatter.how_to_play,
      preview: leadParagraph(stripLeadLabel(a.content), 180),
      aliases: a.frontmatter.aliases,
      // The drills that prepare for the format, derived from shared targets
      // (format-drills.ts): the formats pointed at each other and at nothing
      // a reader could rehearse (tracker entry 283).
      note: {
        label: PREPARE_WITH_LABEL,
        links: (await prepareWithFor(a.frontmatter.id)).map((d) => ({
          key: d.id,
          href: d.url,
          label: d.title,
        })),
        track: "prepare-with",
      },
    })),
  );

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
          Improv Formats <span className="text-foreground/40 font-normal">({formats.length})</span>
        </h1>
        <Prose
          text="Performance structures — from 2-minute games to 60-minute shows."
          currentUrl="/practice/formats"
          className="text-foreground/60 mt-2 mb-2"
        />
      </header>
      {/* The list carries an h2 of its own so the entries below it do not jump
          the outline straight from h1 to h3 — the same fix /improv-games has. */}
      <h2 className="mb-4 text-xl font-semibold">Every Format</h2>
      <div data-track="format-list">
        <TagFilter items={items} filterGroups={FILTER_GROUPS} />
      </div>

      <section className="border-foreground/10 mt-16 border-t pt-12" data-track="long-form">
        <TableOfContents headings={SECTIONS} />

        <h2 id="what-is-long-form-improv" className="mb-3 text-xl font-semibold">
          What Is Long Form Improv?
        </h2>
        <Prose
          text="One continuous piece rather than a sequence of separate bits. A long form show takes a suggestion and treats everything that follows as belonging to the same work, so something established in minute four can return in minute twenty-eight and mean what it could not have meant the first time. Short form is the other arrangement: discrete games, each with its own announced rule, each finished before the next begins."
          currentUrl="/practice/formats"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="For a cast, the useful difference is where the difficulty sits. Short form is hardest at the start of every game, because you have seconds to make something specific inside a constraint the audience has already been told. Long form is hardest in the middle, once the opening energy has gone and the piece has to turn out to be about something. Most groups find one of those markedly harder than the other, and which one is a better guide to what they should be rehearsing than any ranking of the forms themselves. The [what is improv](/what-is-improv) guide covers where both came from."
          currentUrl="/practice/formats"
          className="text-foreground/70 mb-4"
        />
        <Diagram
          src="/images/longform-vs-shortform.svg"
          alt="Short form and long form as two timelines: short form four discrete games with the difficulty at each start, long form one continuous piece with the difficulty in the middle."
          caption="Most groups find one of the two markedly harder, and which one is a better guide to what they should be rehearsing than any ranking of the forms."
        />
        <Prose
          text="It is a Chicago invention and a fairly recent one. Short form had been running for decades before [Del Close](/del-close) built the first named long form out of the conviction that an improvised piece could hold together the way a written one does. The result was the [Harold](/practice/formats/harold), and almost every form below is either a descendant of it or an argument with it."
          currentUrl="/practice/formats"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="Most long form sets are built the same way underneath, whatever they are called. Something at the top generates raw material — a monologue, a group game, a few minutes of movement — and the scenes that follow mine it. Later scenes return to what earlier ones established, which is the move [reincorporation](/practice/techniques/reincorporation) names and the reason a long form set feels like it was about something. Nobody decided what it was about in advance; the piece accumulated a subject and then paid it off."
          currentUrl="/practice/formats"
          className="text-foreground/70 mb-4"
        />
        <p className="text-foreground/70 mb-4">
          The families worth knowing, all of which have a page here:
        </p>
        <ul className="text-foreground/70 mb-4 space-y-2">
          <Prose
            as="li"
            text="**[Montage](/practice/formats/montage)** — scenes connected by theme rather than by structure. The honest first long form, and the one most groups are actually doing when they say they are doing a Harold."
            currentUrl="/practice/formats"
          />
          <Prose
            as="li"
            text="**[Harold](/practice/formats/harold)** — an opening, three sets of scenes, and the returns between them. Taught early almost everywhere and considerably harder than what it is taught alongside."
            currentUrl="/practice/formats"
          />
          <Prose
            as="li"
            text="**[Narrative long form](/practice/formats/narrative-longform)** — one story, told forward, with characters who persist. Rarer in Chicago-descended training and the default in much of Europe."
            currentUrl="/practice/formats"
          />
          <Prose
            as="li"
            text="**[Monoscene](/practice/formats/monoscene)** — a single scene, one location, for the whole set. Removes every escape route, which is why it is a diagnostic as much as a form."
            currentUrl="/practice/formats"
          />
          <Prose
            as="li"
            text="**[Two-person long form](/practice/formats/two-person-longform)** — no backline, no edits to hide behind. The small cast makes it look like a beginner form and it is the opposite."
            currentUrl="/practice/formats"
          />
        </ul>
        <Prose
          text="A group starting out should run montages for longer than feels impressive. The structure in a Harold is not what makes a Harold good, and a cast that cannot yet sustain a two-handed scene for four minutes will not be rescued by having somewhere to be at minute twelve."
          currentUrl="/practice/formats"
          className="text-foreground/70 mb-4"
        />
      </section>

      <section className="mt-12" data-track="short-form">
        <h2 id="what-is-short-form-improv" className="mb-3 text-xl font-semibold">
          What Is Short Form Improv?
        </h2>
        <Prose
          text="A sequence of separate games, each with a rule announced before it starts and each finished before the next begins. Nothing carries over: the scene about the locksmith does not come back, and is not meant to."
          currentUrl="/practice/formats"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="The announced rule is the part people underrate. Telling an audience the constraint before the game starts makes them a party to it — they know what is difficult, so they are watching for whether it gets done, and a good deal of what reads as comedy is really the visible cost of the constraint. Long form asks an audience to work out what a piece is about; short form tells them what the problem is and lets them keep score."
          currentUrl="/practice/formats"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="It also has a role long form mostly does not: a host. Somebody frames each game, collects the suggestion and decides when a game has finished, which is a real skill and the reason a short form set can survive an uneven cast. The lineage runs through Johnstone’s [Theatresports](/practice/formats/theatresports), which made it competitive on purpose, and reached most people through the television version of the same idea."
          currentUrl="/practice/formats"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="What it is good at: rooms new to improv, short slots, and casts of mixed experience, since a weaker player can be carried inside a game in a way a thirty-minute piece does not allow. What it cannot do is accumulate. Nothing established in game three is available in game seven, so the depth an audience feels at the end of a good long form set is not on offer — which is a fair trade and worth making deliberately rather than by default."
          currentUrl="/practice/formats"
          className="text-foreground/70 mb-4"
        />

        <h2 id="choosing-one-for-a-group" className="mb-3 text-xl font-semibold">
          Choosing One for a Group
        </h2>
        <p className="text-foreground/70 mb-4">
          Four constraints decide this, and none of them is taste.
        </p>
        <ul className="text-foreground/70 mb-4 space-y-2">
          <Prose
            as="li"
            text="**Cast size.** Harold wants six to nine. A duo form with nine people on the back line leaves seven of them watching, which is a rehearsal problem before it is a show problem."
            currentUrl="/practice/formats"
          />
          <Prose
            as="li"
            text="**How long they have been playing.** Formats with an announced structure give newer players something to hold. Organic forms give them nothing, and a group that cannot yet edit will simply not end scenes."
            currentUrl="/practice/formats"
          />
          <Prose
            as="li"
            text="**Show length.** Twenty minutes is not a short Harold; it is a montage. Compressing a form is how casts end up rushing the part that needed the time."
            currentUrl="/practice/formats"
          />
          <Prose
            as="li"
            text="**What the group is currently bad at.** The most useful reason to pick a format is that it forces the thing being avoided — competitive formats force commitment, narrative formats force consequence."
            currentUrl="/practice/formats"
          />
        </ul>
        <Diagram
          src="/images/picking-a-format-for-nine.svg"
          alt="A cast of nine marked against two formats: Harold's span reaches it, while a duo form's bar stops at two and leaves a seven-player gap."
          caption="Only the first constraint can be checked before anybody plays; the other three need a rehearsal to answer."
        />
      </section>

      <section className="mt-12" data-track="format-choice">
        <h2 id="format-choice-matters-less-than-it-looks" className="mb-3 text-xl font-semibold">
          Format Choice Matters Less Than It Looks
        </h2>
        <Prose
          text="Groups spend a great deal of time choosing between these and comparatively little on the thing that decides whether any of them works. A cast that listens will produce a good show in a format that suits them badly. A cast that does not will produce the same show in every format, and switching is how a team avoids noticing that for a year."
          currentUrl="/practice/formats"
          className="text-foreground/70 mb-4"
        />
        <Diagram
          src="/images/what-decides-the-show.svg"
          alt="Two casts across the same five formats: each row varies only slightly, while the bracketed gap between the rows is much larger."
          caption="Switching format moves a cast along its own row. Nothing on this axis moves it to the other one."
        />
        <Prose
          text="The structures are here because they are genuinely different instruments, not because the choice is the important part. For the games inside them, see [improv games](/improv-games)."
          currentUrl="/practice/formats"
          className="text-foreground/70"
        />
      </section>
    </main>
  );
}
