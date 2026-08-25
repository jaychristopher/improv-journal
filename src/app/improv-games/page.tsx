import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { TableOfContents } from "@/components/TableOfContents";
import { TagFilter } from "@/components/TagFilter";
import { loadImprovGames } from "@/lib/games";
import { ogImages, pageTitle, SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: pageTitle("Improv Games: Warm-Ups, Exercises and Scene Games"),
  description:
    "Every game on the site, with what each one trains and when to reach for it — plus how to pick one by what is going wrong rather than by what sounds fun.",
  alternates: { canonical: "/improv-games" },
  openGraph: {
    siteName: SITE_NAME,
    locale: "en_US",
    title: "Improv Games: Warm-Ups, Exercises and Scene Games",
    description:
      "Every game on the site, with what each one trains and when to reach for it — plus how to pick one by what is going wrong rather than by what sounds fun.",
    url: "/improv-games",
    type: "website",
    images: ogImages("Improv Games: Warm-Ups, Exercises and Scene Games"),
  },
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
    label: "Focus",
    tags: [
      { label: "Presence", tag: "presence" },
      { label: "Ensemble", tag: "ensemble" },
      { label: "Emotion", tag: "emotion" },
      { label: "Physicality", tag: "physicality" },
      { label: "Courage", tag: "courage" },
      { label: "Recovery", tag: "recovery" },
    ],
  },
];

/**
 * The page's own sections, offered as navigation.
 *
 * Hubs build their headings in JSX rather than from markdown, so contentsFor
 * has no html to read and the list is written out. anchor-targets checks every
 * same-page href against the ids the page actually has, so a heading renamed
 * without updating this fails the build rather than shipping a dead link.
 */
const SECTIONS = [
  { id: "how-to-choose-one", text: "How to Choose One", level: 2 as const },
  {
    id: "warm-up-exercise-or-performance-game",
    text: "Warm-Up, Exercise, or Performance Game",
    level: 2 as const,
  },
  { id: "short-form-games", text: "Short-Form Games", level: 2 as const },
  { id: "which-games-for-which-group", text: "Which Games for Which Group", level: 2 as const },
  {
    id: "easy-improv-games-for-beginners",
    text: "Easy Improv Games for Beginners",
    level: 2 as const,
  },
  { id: "how-to-run-one", text: "How to Run One", level: 2 as const },
  {
    id: "why-a-game-teaches-faster-than-an-instruction",
    text: "Why a Game Teaches Faster Than an Instruction",
    level: 2 as const,
  },
  {
    id: "questions-people-ask-about-improv-games",
    text: "Questions People Ask About Improv Games",
    level: 2 as const,
  },
  { id: "what-are-improv-games", text: "What are improv games?", level: 3 as const },
  {
    id: "what-are-the-best-improv-warm-up-games",
    text: "What are the best improv warm-up games?",
    level: 3 as const,
  },
  {
    id: "can-you-play-improv-games-with-only-two-people",
    text: "Can you play improv games with only two people?",
    level: 3 as const,
  },
  {
    id: "which-improv-games-work-on-a-video-call",
    text: "Which improv games work on a video call?",
    level: 3 as const,
  },
  {
    id: "what-age-can-children-start-improv-games",
    text: "What age can children start improv games?",
    level: 3 as const,
  },
  {
    id: "what-if-there-are-only-two-of-you",
    text: "What if there are only two of you?",
    level: 3 as const,
  },
  {
    id: "which-improv-game-should-you-start-a-session-with",
    text: "Which improv game should you start a session with?",
    level: 3 as const,
  },
];

export default async function ImprovGamesPage() {
  const games = await loadImprovGames();

  const items = games.map((game) => ({
    id: game.id,
    title: game.title,
    href: game.href,
    tags: game.tags,
    rules: game.howToPlay,
    preview: game.description,
  }));

  // ItemList makes the collection readable as a list of named games, rather
  // than a page that happens to link to some.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}/improv-games`,
    name: "Improv Games: Warm-Ups, Exercises and Scene Games",
    url: `${SITE_URL}/improv-games`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: games.length,
      itemListElement: games.map((game, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: game.title,
        description: game.description,
        url: `${SITE_URL}${game.href}`,
      })),
    },
  };

  const shortForm = games.filter((game) => game.kind === "format");

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "Improv Games" }]} />

      <header className="mb-8">
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Improv Games: Warm-Ups, Exercises and Scene Games
        </h1>
        <p className="text-foreground/60 mt-2">
          Every game on the site, each with how to run it, what it trains and how it fails. Filter
          by level and focus below, or read on for how to choose one, how to run it, and why a game
          teaches faster than an instruction does.
        </p>
      </header>

      <Link
        href="/tools/exercise-picker"
        className="border-foreground/10 bg-foreground/[0.03] hover:border-foreground/30 mb-8 block rounded-xl border p-5 transition-colors"
      >
        <span className="text-foreground/40 text-xs tracking-wider uppercase">Free tool</span>
        <span className="mt-1 block font-semibold">
          Not sure where to start? Try the Exercise Picker &rarr;
        </span>
        <span className="text-foreground/50 mt-1 block text-sm">
          Answer 2 questions, get 3 exercises matched to your group.
        </span>
      </Link>

      {/* The list carries an h2 of its own so the game entries below it do not
          jump the outline straight from h1 to h3. */}
      <TableOfContents headings={SECTIONS} />

      <h2 className="mb-4 text-xl font-semibold">Every Game ({games.length})</h2>
      <TagFilter items={items} filterGroups={FILTER_GROUPS} />

      <section className="border-foreground/10 mt-16 border-t pt-12">
        <h2 id="how-to-choose-one" className="mb-3 text-xl font-semibold">
          How to Choose One
        </h2>
        <p className="text-foreground/70 mb-4">
          The usual way to pick a game is to find one that sounds fun. The better way is to name
          what is going wrong and pick the game that isolates it. Almost every game here exists
          because some specific thing was failing and somebody built a constraint that made it
          impossible.
        </p>
        <ul className="text-foreground/70 mb-4 space-y-2">
          <li>
            <strong>Nobody is listening.</strong> Games where you cannot succeed alone:{" "}
            <Link href="/practice/exercises/mirroring" className="underline">
              Mirroring
            </Link>
            ,{" "}
            <Link href="/practice/exercises/pass-the-clap" className="underline">
              Pass the Clap
            </Link>
            .
          </li>
          <li>
            <strong>Everyone is planning.</strong> Games that load attention until deliberation
            stops being possible:{" "}
            <Link href="/practice/exercises/zip-zap-zop" className="underline">
              Zip Zap Zop
            </Link>
            ,{" "}
            <Link href="/practice/exercises/big-booty" className="underline">
              Big Booty
            </Link>
            .
          </li>
          <li>
            <strong>Scenes are clever but cold.</strong>{" "}
            <Link href="/practice/exercises/emotional-honesty-scene" className="underline">
              Emotional Honesty Scene
            </Link>
            ,{" "}
            <Link href="/practice/exercises/gift-giving" className="underline">
              Gift Giving
            </Link>
            .
          </li>
          <li>
            <strong>Nobody will start.</strong>{" "}
            <Link href="/practice/exercises/first-line-drill" className="underline">
              First Line Drill
            </Link>
            ,{" "}
            <Link href="/practice/exercises/blind-offer" className="underline">
              Blind Offer
            </Link>
            .
          </li>
          <li>
            <strong>Scenes come apart halfway through.</strong>{" "}
            <Link href="/practice/exercises/fracture-repair-drill" className="underline">
              Fracture Repair Drill
            </Link>
            .
          </li>
          <li>
            <strong>Everyone talks at once.</strong>{" "}
            <Link href="/practice/exercises/group-mind-cultivation" className="underline">
              Group Mind Cultivation
            </Link>
            .
          </li>
        </ul>
        <p className="text-foreground/70">
          If you cannot name what is wrong yet, that is its own problem and worth solving first
          &mdash; see{" "}
          <Link href="/how-it-works/diagnosis" className="underline">
            what it looks like when a scene breaks
          </Link>
          .
        </p>
      </section>

      <section className="mt-12">
        <h2 id="warm-up-exercise-or-performance-game" className="mb-3 text-xl font-semibold">
          Warm-Up, Exercise, or Performance Game
        </h2>
        <p className="text-foreground/70 mb-4">
          These get lumped together as &ldquo;improv games&rdquo; and they do three different jobs.
          Reaching for the wrong kind is the most common way a session goes flat.
        </p>
        <ul className="text-foreground/70 mb-4 space-y-2">
          <li>
            <strong>A warm-up</strong> is cheap, fast, and has no wrong answers. Its only job is to
            move attention out of people&apos;s heads and into the room. Two minutes, no notes.
          </li>
          <li>
            <strong>An exercise</strong> isolates one skill and has a failure mode you can coach. It
            is run slowly, interrupted often, and is usually not much fun to watch &mdash; which is
            fine, because nobody is watching.
          </li>
          <li>
            <strong>A performance game</strong> has rules an audience can follow and a comic engine
            of its own. It is built to be watched.
          </li>
        </ul>
        <p className="text-foreground/70">
          The classic mistake is running an exercise as though it were a performance game. The
          moment players sense an audience they start playing for the laugh, and whatever the
          exercise was isolating is gone.
        </p>
      </section>

      {shortForm.length > 0 && (
        <section className="mt-12">
          <h2 id="short-form-games" className="mb-3 text-xl font-semibold">
            Short-Form Games
          </h2>
          <p className="text-foreground/70 mb-4">
            The performance kind: rules, a structure, and usually an audience &mdash; as opposed to
            the drills used in rehearsal.
          </p>
          <div className="flex flex-wrap gap-2">
            {shortForm.map((game) => (
              <Link
                key={game.id}
                href={game.href}
                className="border-foreground/10 hover:border-foreground/30 rounded-full border px-3 py-1 text-sm transition-colors"
              >
                {game.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 id="which-games-for-which-group" className="mb-3 text-xl font-semibold">
          Which Games for Which Group
        </h2>
        <p className="text-foreground/70 mb-4">
          The list above is sorted by what each game trains, which is the right way round once you
          know what you are fixing. If you are standing in front of a room and do not, the more
          useful question is who is in it.
        </p>
        <p className="text-foreground/70 mb-4">
          <strong>Complete beginners.</strong> Start with something where nobody can be visibly bad
          at it, which rules out most scene work.{" "}
          <Link href="/practice/exercises/one-word-story" className="underline">
            One-word story
          </Link>{" "}
          is the usual answer: a single word each, no way to steer it, and the failure mode is a
          funny story rather than an exposed person.
        </p>
        <p className="text-foreground/70 mb-4">
          <strong>Children and school groups.</strong> Physical, loud, and short. Attention is the
          constraint rather than confidence &mdash; children have plenty of the second and very
          little of the first &mdash; so games with a clear rule and constant movement work far
          better than anything requiring a scene to be sustained. Keep rounds under five minutes and
          expect to run three games in the time an adult group spends on one.
        </p>
        <p className="text-foreground/70 mb-4">
          <strong>A workshop or class.</strong> The only setting where you can build across a
          session: a warm-up that costs nothing, an exercise that isolates one skill, then a
          performance game that needs it. That progression is what the level and focus filters above
          are for.
        </p>
        <p className="text-foreground/70 mb-4">
          <strong>A work team.</strong> Different problem entirely, and the games are not the hard
          part &mdash; the power gap is. Anything that risks somebody looking foolish in front of
          the person who writes their appraisal is a bad idea however good the game is. Whole-group
          formats where everybody acts at once cost far less than anything with turns, and{" "}
          <Link href="/5-minute-team-building" className="underline">
            5-minute team building
          </Link>{" "}
          is built for exactly that constraint.
        </p>
        <p className="text-foreground/70">
          <strong>Remote and video calls.</strong> Most improv games assume a shared physical space
          and quietly break without one &mdash; anything relying on eye contact, simultaneous
          speech, or knowing whose turn it is will not survive the latency. What works is verbal,
          strictly sequential, and named-turn:{" "}
          <Link href="/virtual-team-building-activities" className="underline">
            virtual team building activities
          </Link>{" "}
          covers why the grid changes the rules.
        </p>
      </section>

      <section className="mt-12">
        <h2 id="easy-improv-games-for-beginners" className="mb-3 text-xl font-semibold">
          Easy Improv Games for Beginners
        </h2>
        <p className="text-foreground/70 mb-4">
          What makes a game easy is not that the rule is short. It is that the game removes the two
          things beginners actually find hard, which are inventing something and being looked at on
          their own. A game that does both is easy no matter how fast it moves, and a game that does
          neither is difficult no matter how simple it sounds.
        </p>
        <p className="text-foreground/70 mb-4">
          Four properties do it. There is a rule to obey, so nobody has to decide what to do.
          Everybody plays at once, so no one person is on display. Nothing depends on being funny.
          And it is over in a few minutes, before anybody has time to start dreading their turn.
        </p>
        <p className="text-foreground/70 mb-4">
          The reliable starting set:{" "}
          <Link href="/practice/exercises/pass-the-clap" className="underline">
            Pass the Clap
          </Link>
          ,{" "}
          <Link href="/practice/exercises/zip-zap-zop" className="underline">
            Zip Zap Zop
          </Link>
          ,{" "}
          <Link href="/practice/exercises/sound-ball" className="underline">
            Sound Ball
          </Link>{" "}
          and{" "}
          <Link href="/practice/exercises/yes-lets" className="underline">
            Yes, Let&rsquo;s
          </Link>
          . None asks for an idea, all four fail cheerfully, and a room that has played them is
          considerably easier to teach a scene to than a room that has not.
        </p>
        <p className="text-foreground/70 mb-4">
          What to keep away from on a first session: two-person scenes, anything with a winner, and
          anything requiring a character. Each one asks somebody to be interesting while people
          watch, which is the exact thing the games above are designed to postpone. Fun and easy
          tend to coincide here for that reason rather than by accident &mdash; the games people
          remember enjoying are usually the ones where they were never at risk of being the problem.
        </p>

        <h2 id="how-to-run-one" className="mb-3 text-xl font-semibold">
          How to Run One
        </h2>
        <p className="text-foreground/70 mb-4">
          <strong>Coach during, not after.</strong>{" "}
          <Link href="/practice/techniques/side-coaching" className="underline">
            Side-coaching
          </Link>{" "}
          is Viola Spolin&apos;s method and the defining rule is that the note is acted on at the
          moment it is needed. A short redirect called into a running game is worth more than five
          minutes of notes afterwards, when the moment is unrecoverable.
        </p>
        <p className="text-foreground/70 mb-4">
          <strong>Say what it trains before you start.</strong> A game explained afterwards is a
          game people played blind. Thirty seconds of framing changes what players pay attention to
          for the whole round.
        </p>
        <p className="text-foreground/70 mb-4">
          <strong>Stop it while it is still working.</strong> Games have a ceiling, and the second
          half of a round that has peaked teaches nothing except that the game is tiring.
        </p>
        <p className="text-foreground/70">
          <strong>Think twice about elimination.</strong> Being out is a small public failure, and
          in a room that has not built any trust yet it is the wrong first experience &mdash; see{" "}
          <Link href="/practice/techniques/safety-in-the-room" className="underline">
            safety in the room
          </Link>
          . Most elimination games work perfectly well without it.
        </p>
      </section>

      <section className="mt-12">
        <h2
          id="why-a-game-teaches-faster-than-an-instruction"
          className="mb-3 text-xl font-semibold"
        >
          Why a Game Teaches Faster Than an Instruction
        </h2>
        <p className="text-foreground/70 mb-4">
          Telling somebody to stop planning does not work, because the planning is not a decision. A
          game that occupies the conscious mind removes the option, and the habit stops on its own
          &mdash; which is the whole design of{" "}
          <Link href="/practice/exercises/big-booty" className="underline">
            Big Booty
          </Link>
          , where your own number keeps changing so the answer you rehearsed is wrong by the time
          your turn arrives.
        </p>
        <p className="text-foreground/70">
          Games also make invisible things visible. Hesitation inside a scene reads as the scene
          going badly. Hesitation in a circle passing three syllables reads as exactly what it is,
          to everyone including the person doing it. That is most of what a game is for: not to
          practise a skill, but to let a room watch a habit happen.
        </p>
      </section>

      {/*
        The hub carries the site's largest improv-specific term and had no
        question-shaped heading on it. Three of these also answer intents the
        content plan had down as separate pages — warm-up games, two-person
        games, and the age question — which are better served from the page
        that already ranks than by three thin pages competing with it.
      */}
      <section className="mt-12">
        <h2 id="questions-people-ask-about-improv-games" className="mb-3 text-xl font-semibold">
          Questions People Ask About Improv Games
        </h2>

        <h3 id="what-are-improv-games" className="mt-6 mb-2 font-semibold">
          What are improv games?
        </h3>
        <p className="text-foreground/70 mb-4">
          Structured activities with an explicit rule, played without a script, where the rule is
          chosen to make a particular skill unavoidable. That last part is what separates a game
          from a party activity: passing a clap round a circle is not fun because clapping is fun,
          it is there because you cannot do it without watching one specific person.
        </p>
        <p className="text-foreground/70 mb-4">
          They divide three ways &mdash; warm-ups that prepare a group, exercises that isolate a
          skill, and short-form games built to be watched. Most lists mix all three together, which
          is why so many sessions run a performance game on a cold room and conclude the room is no
          good.
        </p>

        <h3 id="what-are-the-best-improv-warm-up-games" className="mt-6 mb-2 font-semibold">
          What are the best improv warm-up games?
        </h3>
        <p className="text-foreground/70 mb-4">
          The ones with no ideas in them.{" "}
          <Link href="/practice/exercises/pass-the-clap" className="underline">
            Pass the Clap
          </Link>
          ,{" "}
          <Link href="/practice/exercises/zip-zap-zop" className="underline">
            Zip Zap Zop
          </Link>{" "}
          and{" "}
          <Link href="/practice/exercises/sound-ball" className="underline">
            Sound Ball
          </Link>{" "}
          all work because nobody has to invent anything to take part, so the nervous half of the
          room is in before it has had time to decide it cannot do this.
        </p>
        <p className="text-foreground/70 mb-4">
          A warm-up that requires a good idea is not a warm-up. It is the first exercise, and
          running it first is the most common way to lose a group in the opening ten minutes.
        </p>

        <h3 id="can-you-play-improv-games-with-only-two-people" className="mt-6 mb-2 font-semibold">
          Can you play improv games with only two people?
        </h3>
        <p className="text-foreground/70 mb-4">
          Plenty of them, and the two-person versions are often the better practice, because there
          is nowhere to hide and you get several times the repetitions.{" "}
          <Link href="/practice/exercises/mirroring" className="underline">
            Mirroring
          </Link>
          ,{" "}
          <Link href="/practice/exercises/last-word-response" className="underline">
            Last Word Response
          </Link>
          ,{" "}
          <Link href="/practice/exercises/one-word-story" className="underline">
            One-Word Story
          </Link>{" "}
          and{" "}
          <Link href="/practice/exercises/gift-giving" className="underline">
            Gift Giving
          </Link>{" "}
          all run with a pair.
        </p>
        <p className="text-foreground/70 mb-4">
          What a pair cannot do is anything requiring a back line &mdash; tag-outs, group games,
          most short-form formats. Those need five or more, and attempting them with two produces a
          worse version of a scene you could have simply played.
        </p>

        <h3 id="which-improv-games-work-on-a-video-call" className="mt-6 mb-2 font-semibold">
          Which improv games work on a video call?
        </h3>
        <p className="text-foreground/70 mb-4">
          Anything that does not depend on simultaneous speech or on knowing whose turn it is from
          the room. Video kills both: overlapping audio is unintelligible and there is no shared
          spatial sense to read a turn from.
        </p>
        <p className="text-foreground/70 mb-4">
          So circle games that pass by name survive, and{" "}
          <Link href="/practice/exercises/one-word-story" className="underline">
            One-Word Story
          </Link>{" "}
          works better on video than in person because the order is fixed and the gaps stop
          mattering. Anything physical, anything requiring a group to move as one, and anything
          where players jump in unprompted will not survive the lag.
        </p>

        <h3 id="what-age-can-children-start-improv-games" className="mt-6 mb-2 font-semibold">
          What age can children start improv games?
        </h3>
        <p className="text-foreground/70 mb-4">
          Around five for circle games with one rule, and roughly nine before scenes are worth
          attempting &mdash; not because younger children cannot act, but because a scene has no
          rule to fall back on, so a child who does not know what to do has nowhere to stand.{" "}
          <Link href="/improv-games-for-kids" className="underline">
            Improv games for kids
          </Link>{" "}
          sets out which games suit which age and what changes with teenagers.
        </p>

        <h3 id="what-if-there-are-only-two-of-you" className="mt-6 mb-2 font-semibold">
          What if there are only two of you?
        </h3>
        <p className="text-foreground/70 mb-4">
          Most of the list above needs a circle, and the rules usually do not say so until you are
          halfway through them. Rotation, tagging out and hiding briefly in a round all require
          bodies.{" "}
          <Link href="/2-person-improv-games" className="underline">
            2 person improv games
          </Link>{" "}
          covers what survives the shrink, and why a pair gets more repetitions in an hour than a
          class of twelve does in a term.
        </p>

        <h3
          id="which-improv-game-should-you-start-a-session-with"
          className="mt-6 mb-2 font-semibold"
        >
          Which improv game should you start a session with?
        </h3>
        <p className="text-foreground/70 mb-4">
          One that is impossible to be bad at and needs no words &mdash; a clap passed round a
          circle rather than anything requiring an idea. The opening game is about state, not
          content, and only the last game before the work should point at what you are teaching.{" "}
          <Link href="/improv-warm-up-games" className="underline">
            Improv warm-up games
          </Link>{" "}
          sets out the three-stage order and how long to spend in each.
        </p>
      </section>

      <section className="mt-12">
        <h2 id="related" className="mb-3 text-xl font-semibold">
          Related
        </h2>
        <p className="text-foreground/70">
          Many of these descend from Viola Spolin&apos;s{" "}
          <Link href="/theatre-games" className="underline">
            theatre games
          </Link>
          , which were built to train skills rather than get laughs. If you need something to start
          a scene with rather than a game to play, there are{" "}
          <Link href="/improv-prompts" className="underline">
            110 improv prompts
          </Link>
          . And for the model underneath all of it, see{" "}
          <Link href="/how-it-works" className="underline">
            how it works
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
