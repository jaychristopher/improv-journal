import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { PromptGenerator } from "@/components/PromptGenerator";
import { TableOfContents } from "@/components/TableOfContents";
import {
  categoryAnchor,
  PROMPT_BANK,
  PROMPT_CATEGORIES,
  PROMPT_USE_CASES,
  RUBRIC_AXES,
  RUBRIC_WEIGHTS,
} from "@/lib/prompt-bank";
import { resolvePromptConcepts } from "@/lib/prompt-concepts";
import { poolFor } from "@/lib/prompt-generator";
import { ogImages, pageTitle, SITE_NAME } from "@/lib/seo";

/**
 * The full-page home of the prompt generator.
 *
 * The same component is the hero of /improv-prompts. It lives here as well
 * because "improv prompt generator" is its own search, not a variant of
 * "improv prompts": Ahrefs (2026-09-19, US) gives it 150 a month at KD 2 with
 * a traffic potential of 150, under the parent topic "improv generator" (150 a
 * month, KD 2). That parent is different from the guide's, so by the collision
 * rule in CLAUDE.md a second page may own it. "improv suggestions" (10) and
 * "improv scenario generator" (20) sit under the same parent and are covered
 * here rather than anywhere else.
 *
 * The category-level terms were checked and have nothing behind them —
 * "improv first lines", "improv location ideas", "improv relationship prompts"
 * all report zero — so the six kinds stay as sections of the guide and are not
 * pages of their own.
 *
 * Like /improv-games this is a hand-built route, so the SEO audit scripts
 * cannot see the verdict above; it lives here because there is nowhere
 * structured to put it.
 */

const TITLE = "Improv Prompt Generator: Ranked Scene Starters for Any Room";
const DESCRIPTION = `A free improv prompt generator with ${PROMPT_BANK.length} scene starters, ranked for your room — class, show, school or team — and never the same prompt twice.`;

export const metadata: Metadata = {
  title: pageTitle(TITLE),
  description: DESCRIPTION,
  alternates: { canonical: "/tools/improv-prompt-generator" },
  openGraph: {
    siteName: SITE_NAME,
    locale: "en_US",
    title: TITLE,
    description: DESCRIPTION,
    url: "/tools/improv-prompt-generator",
    type: "website",
    images: ogImages(TITLE),
  },
};

/**
 * The page's own sections, offered as navigation. Hand-built routes have no
 * markdown for contentsFor to read, so the list is written out; anchor-targets
 * checks each href against the ids the built page actually carries.
 */
const SECTIONS = [
  { id: "what-it-draws-from", text: "What It Draws From", level: 2 as const },
  { id: "how-it-ranks-them", text: "How It Ranks Them", level: 2 as const },
  { id: "what-the-room-changes", text: "What the Room Changes", level: 2 as const },
  { id: "why-it-never-repeats", text: "Why It Never Repeats", level: 2 as const },
  { id: "questions", text: "Questions About Improv Generators", level: 2 as const },
];

export default async function ImprovPromptGeneratorPage() {
  // The categories' concepts, resolved here because the generator is a
  // client component and cannot read the graph (tracker entry 332).
  const concepts = await resolvePromptConcepts();
  const counts = PROMPT_CATEGORIES.map((category) => ({
    category,
    count: PROMPT_BANK.filter((p) => p.category === category.id).length,
  }));
  // The pool sizes the reader will actually meet, so the prose cannot drift
  // from the bank the way a typed number would.
  const poolSizes = PROMPT_USE_CASES.flatMap((room) =>
    PROMPT_CATEGORIES.map((category) => poolFor(PROMPT_BANK, category.id, room.id).length),
  );
  const smallestPool = Math.min(...poolSizes);
  const largestPool = Math.max(...poolSizes);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Practice", href: "/practice" },
          { label: "Improv Prompt Generator" },
        ]}
      />

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{TITLE}</h1>
        <p className="text-foreground/60 mt-2 text-sm">{DESCRIPTION}</p>
      </header>

      <PromptGenerator surface="tool-page" concepts={concepts} />

      <TableOfContents headings={SECTIONS} />

      <article className="prose prose-neutral dark:prose-invert max-w-none" data-track="body">
        <p>
          Most improv generators are a random word. This one is not, because a random word is the
          weakest prompt there is: it arrives with no texture, no relationship and nothing at stake,
          and the players spend the first thirty seconds inventing what the word should have given
          them. The generator above draws instead from a bank written to the criteria in the{" "}
          <Link href="/improv-prompts">improv prompts guide</Link> &mdash; specific beats general,
          personal beats clever, a prompt is not a punchline &mdash; and ranks the bank for the room
          you say you are in.
        </p>

        <h2 id="what-it-draws-from">What It Draws From</h2>
        <p>
          {PROMPT_BANK.length} prompts in six kinds. Every one of the 140 the guide lists is in the
          bank, and the rest were written to the same standard. Each kind enters through one section
          of the guide, and is an idea from{" "}
          <Link href="/threads/anatomy-of-a-scene">The Anatomy of a Scene</Link>, the lesson these
          categories come from:
        </p>
        <ul>
          {counts.map(({ category, count }) => (
            <li key={category.id}>
              <strong>{category.label}</strong> ({count}) &mdash;{" "}
              <Link href={`/improv-prompts#${categoryAnchor(category)}`}>{category.heading}</Link>.{" "}
              {category.howToUse}
            </li>
          ))}
        </ul>

        <h2 id="how-it-ranks-them">How It Ranks Them</h2>
        <p>
          Every prompt is scored by hand on five questions, each from one to five. The questions are
          the guide&apos;s argument turned into a rubric:
        </p>
        <ul>
          {RUBRIC_AXES.map((axis) => (
            <li key={axis.id}>
              <strong>{axis.label}.</strong> {axis.question}
            </li>
          ))}
        </ul>
        <p>
          The scores are weighted for your room, the pool is sorted best first and cut into three
          bands, and the generator draws at random inside the top band until you have seen all of
          it. So the first prompts you meet are the strongest the bank has for your situation, two
          people opening it do not get the same first prompt, and the order still feels chosen
          rather than shuffled.
        </p>

        <h2 id="what-the-room-changes">What the Room Changes</h2>
        <p>
          The same prompt is not equally useful everywhere, and the four rooms weight the five
          questions differently. Playability counts for{" "}
          {Math.round(RUBRIC_WEIGHTS.school.doable * 100)} per cent of the score in a school room
          and {Math.round(RUBRIC_WEIGHTS.show.doable * 100)} per cent in a show, because a
          fourteen-year-old freezes when asked to invent and an audience wants proof the scene came
          from the word. Specificity is worth the most in a show for the same reason.
        </p>
        <ul>
          {PROMPT_USE_CASES.map((room) => (
            <li key={room.id}>
              <strong>{room.label}.</strong> {room.description}
            </li>
          ))}
        </ul>
        <p>
          A school room also applies the guide&apos;s three filters mechanically: nothing that lands
          on somebody&apos;s actual life, nothing that needs adult knowledge, nothing with a
          built-in performer role. A work session gets adult knowledge back and keeps the other two
          out. That is why the pools are different sizes &mdash; the number under each kind is what
          is left after the filters, not a count of the whole bank.
        </p>

        <h2 id="why-it-never-repeats">Why It Never Repeats</h2>
        <p>
          The browser keeps a list of the prompts it has shown you, and the generator will not show
          one again until you have seen everything in that pool and asked to start again. The list
          lives in your browser and nowhere else, so it survives a reload and a week away but not a
          different device. A class that runs the generator from one laptop gets a new prompt every
          round for a long time: the smallest pool has {smallestPool}
          prompts in it and the largest {largestPool}.
        </p>

        <h2 id="questions">Questions About Improv Generators</h2>

        <h3>Is it random?</h3>
        <p>
          Within a band, yes. Across bands, no. The strongest third of a pool is exhausted before
          the middle third appears, and the order inside each third is shuffled. That is the
          difference between a generator that feels curated and one that hands you
          &ldquo;banana&rdquo; on the first tap.
        </p>

        <h3>Can I use it in a show?</h3>
        <p>
          Yes, and the show setting is built for it. Ask the audience one of the questions it gives
          you rather than reading a prompt off a screen; the{" "}
          <Link href="/improv-prompts#questions-to-ask-an-audience">audience questions</Link> are
          there so the scene still visibly comes from the room. A prompt read from a phone proves
          nothing to a crowd.
        </p>

        <h3>Why are there no funny or absurd ones?</h3>
        <p>
          Because they play badly. A talking fridge is a premise, and a premise is a joke that has
          already happened; the scene that follows is a recital. The guide explains{" "}
          <Link href="/improv-prompts#why-the-absurd-ones-backfire">
            why the absurd ones backfire
          </Link>{" "}
          and what to do with one when an audience insists.
        </p>

        <h3>What do I do once I have a prompt?</h3>
        <p>
          Say the first line and find out what it means, or touch the first object and let it tell
          you where you are. The hardest part is the first three seconds, and{" "}
          <Link href="/practice/exercises/first-line-drill">first-line drill</Link> isolates exactly
          that. For what to play once the scene has started,{" "}
          <Link href="/improv-games">improv games</Link> covers the exercises and the{" "}
          <Link href="/tools/exercise-picker">exercise picker</Link> finds one by level and focus.
        </p>
      </article>
    </main>
  );
}
