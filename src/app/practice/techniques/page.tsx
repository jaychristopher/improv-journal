import type { Metadata } from "next";

import { Breadcrumb } from "@/components/Breadcrumb";
import { CollectionJsonLd } from "@/components/CollectionJsonLd";
import { Prose } from "@/components/Prose";
import { TagFilter } from "@/components/TagFilter";
import { getAtomUrl } from "@/lib/content";
import { orderedTechniques } from "@/lib/hub-order";
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
  // Most leaned-on first: by how much the graph leans on each for its age —
  // declared in-degree per month since it was written — then title, so the
  // moves the rest of the graph leans on lead, not load order (entry 208)
  // and not birthday order (entry 307).
  const techniques = await orderedTechniques();

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
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Improv Techniques{" "}
          <span className="text-foreground/40 font-normal">({techniques.length})</span>
        </h1>
        <Prose
          text="The specific moves — how to listen, initiate, edit, support, heighten, and recover."
          currentUrl="/practice/techniques"
          className="text-foreground/60 mt-2 mb-2"
        />
      </header>
      {/* This hub was one sentence over a list of every technique on the site,
          while its siblings carry real treatments — /practice/formats and
          /improv-games both run to thousands of words. Techniques is the
          largest concept category here and had the thinnest category page, so
          the term had nothing on the site arguing for it. */}
      <section className="mb-10" data-track="what-is-a-technique">
        <h2 className="mb-3 text-xl font-semibold">What counts as a technique</h2>
        <Prose
          text="A technique is a move you make. That distinguishes it from the other things this site catalogues, and the distinction is worth holding because they fail in different ways. A [principle](/how-it-works/principles) is a disposition — something you are doing continuously, which cannot be executed at a particular moment. An [exercise](/practice/exercises) is a drill that trains one, run outside a scene and usually with a constraint that would look strange inside one. A [format](/practice/formats) is the container the whole show sits in."
          currentUrl="/practice/techniques"
          className="text-foreground/70 mb-3 text-sm leading-relaxed"
        />
        <Prose
          text="Techniques sit between them: small enough to perform deliberately, specific enough to coach, and useful mid-scene rather than only in a workshop. When a note lands and nothing changes, it is often because a principle was given where a technique was needed — being told to listen more is not something a person can do on the next line, whereas naming the last thing your partner said is."
          currentUrl="/practice/techniques"
          className="text-foreground/70 text-sm leading-relaxed"
        />
      </section>

      <section className="mb-10" data-track="technique-jobs">
        <h2 className="mb-3 text-xl font-semibold">The jobs they do</h2>
        <Prose
          text="Almost everything here is doing one of six jobs: receiving what your partner gave you, initiating so the scene has somewhere to go, editing so it ends before it sags, supporting so somebody else's idea works, heightening so it escalates rather than repeats, and recovering when it has already gone wrong."
          currentUrl="/practice/techniques"
          className="text-foreground/70 mb-3 text-sm leading-relaxed"
        />
        <Prose
          text="That last group is worth knowing exists before you need it. What to do about a scene that has already stalled is a separate body of work from what to do to make one go well, and it lives under [failure modes and recovery](/how-it-works/diagnosis)."
          currentUrl="/practice/techniques"
          className="text-foreground/70 text-sm leading-relaxed"
        />
      </section>

      <section className="mb-10" data-track="techniques-faq">
        <h2 className="mb-3 text-xl font-semibold">Questions People Ask About Improv Techniques</h2>

        <h3 className="mt-4 mb-1 font-semibold">How many techniques do you actually need?</h3>
        <Prose
          text="Far fewer than are listed here, and the list is a reference rather than a syllabus. Working improvisers run on a small set they can reach without thinking, and the reason to have a catalogue at all is diagnostic — when something keeps going wrong in the same way, it helps to be able to look up the move that addresses it."
          currentUrl="/practice/techniques"
          className="text-foreground/70 text-sm leading-relaxed"
        />

        <h3 className="mt-4 mb-1 font-semibold">Which ones should a beginner learn first?</h3>
        <Prose
          text="The receiving ones, before anything that generates material. Most early scene problems get diagnosed as a shortage of ideas and are actually a failure to take in what was already offered, which is why adding more invention makes them worse rather than better."
          currentUrl="/practice/techniques"
          className="text-foreground/70 text-sm leading-relaxed"
        />

        <h3 className="mt-4 mb-1 font-semibold">Do techniques make improv formulaic?</h3>
        <Prose
          text="They can, and the traditions disagree about how much. A named, teachable move is easy to assess and easy to over-apply, and scenes built by assembling them do come out looking alike. The counter-argument is that the alternative is not freedom but a smaller vocabulary — a performer who cannot name what they did cannot repeat it deliberately."
          currentUrl="/practice/techniques"
          className="text-foreground/70 text-sm leading-relaxed"
        />

        <h3 className="mt-4 mb-1 font-semibold">
          What is the difference between a technique and a game?
        </h3>
        <Prose
          text="A technique is something one performer does; a game is a pattern the scene is running. They get confused because the word game also names a warm-up activity, which is a third thing again and lives with the [improv games](/improv-games)."
          currentUrl="/practice/techniques"
          className="text-foreground/70 text-sm leading-relaxed"
        />
      </section>

      {/* The list carries an h2 of its own so the entries below it do not jump
          the outline straight from h1 to h3 — the same fix /improv-games has. */}
      <h2 className="mb-4 text-xl font-semibold">Every Technique</h2>
      <div data-track="technique-list">
        <TagFilter items={items} filterGroups={FILTER_GROUPS} />
      </div>
    </main>
  );
}
