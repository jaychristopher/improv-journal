import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { Diagram } from "@/components/Diagram";
import { Prose } from "@/components/Prose";
import { TableOfContents } from "@/components/TableOfContents";
import { TagFilter } from "@/components/TagFilter";
import { FEEDS_LABEL, PREPARE_WITH_LABEL } from "@/lib/format-drills";
import { focusFilterTags, GAME_GROUPS, loadImprovGames } from "@/lib/games";
import { GAMES_HUB_COPY } from "@/lib/games-hub-copy";
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

const LEVEL_FILTER = {
  label: "Level",
  tags: [
    { label: "Beginner", tag: "beginner" },
    { label: "Intermediate", tag: "intermediate" },
    { label: "Advanced", tag: "advanced" },
  ],
};

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

  // The Focus chips are the picker's six focuses plus, when any format
  // carries it, "Show formats" — the facet a format lands in when nothing
  // says what it trains (see FORMATS_FOCUS in lib/games).
  const filterGroups = [LEVEL_FILTER, { label: "Focus", tags: focusFilterTags(games) }];

  /**
   * The preview is how the game is played, not what it trains.
   *
   * Both were available and this page was showing the wrong one. An exercise
   * atom opens with the skills it develops — "Deep attention, body awareness,
   * ensemble connection" — which is the right summary for /practice/exercises,
   * whose title promises what each one trains. Somebody on a page called
   * Improv Games wants to know what happens in the room.
   *
   * It was also the same string. /practice/exercises renders that identical
   * opening for every exercise the two pages share, and on eight-word shingles
   * 84% of that page sat inside this one — two hubs the site aims at different
   * terms, describing the same items in the same words. All 41 games carry
   * how_to_play, so nothing falls back in practice.
   */
  const items = games.map((game) => {
    // The join the graph does not make: a format's card names the drills
    // that prepare for it, a drill's card names the formats it feeds, both
    // derived from shared targets (format-drills.ts, tracker entry 283).
    const related = game.kind === "format" ? game.prepareWith : game.feeds;
    return {
      id: game.id,
      title: game.title,
      href: game.href,
      // The Focus facet filters on tags, and the raw tags reached 20 of 41 games;
      // the derived focuses (see ImprovGame.focuses) reach all of them.
      tags: [...new Set([...game.tags, ...game.focuses])],
      rules: game.howToPlay,
      preview: game.howToPlay ?? game.description,
      // The list is one inventory to filter and two kinds to read: formats
      // are played, exercises are trained (GAME_GROUPS).
      group: game.kind,
      note: {
        label: game.kind === "format" ? PREPARE_WITH_LABEL : FEEDS_LABEL,
        links: related.map((r) => ({ key: r.id, href: r.href, label: r.title })),
        track: game.kind === "format" ? "prepare-with" : "feeds",
      },
    };
  });

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
        // Matches the visible card, and keeps this ItemList from repeating the
        // one /practice/exercises emits for the same exercises.
        description: game.howToPlay ?? game.description,
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
        <Prose
          text="Every game on the site, each with how to run it, what it trains and how it fails. Filter by level and focus below, or read on for how to choose one, how to run it, and why a game teaches faster than an instruction does."
          currentUrl="/improv-games"
          className="text-foreground/60 mt-2"
        />
      </header>

      <Link
        href="/tools/exercise-picker"
        className="border-foreground/10 bg-foreground/[0.03] hover:border-foreground/30 mb-8 block rounded-xl border p-5 transition-colors"
        data-track="exercise-picker-cta"
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
      <div data-track="game-list">
        <TagFilter items={items} filterGroups={filterGroups} groups={[...GAME_GROUPS]} />
      </div>

      <section className="border-foreground/10 mt-16 border-t pt-12" data-track="choose-a-game">
        <h2 id="how-to-choose-one" className="mb-3 text-xl font-semibold">
          How to Choose One
        </h2>
        <Prose
          text="The usual way to pick a game is to find one that sounds fun. The better way is to name what is going wrong and pick the game that isolates it. Almost every game here exists because some specific thing was failing and somebody built a constraint that made it impossible."
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />
        <ul className="text-foreground/70 mb-4 space-y-2">
          <Prose
            as="li"
            text="**Nobody is listening.** Games where you cannot succeed alone: [Mirroring](/practice/exercises/mirroring), [Pass the Clap](/practice/exercises/pass-the-clap)."
            currentUrl="/improv-games"
          />
          <Prose
            as="li"
            text="**Everyone is planning.** Games that load attention until deliberation stops being possible: [Zip Zap Zop](/practice/exercises/zip-zap-zop), [Big Booty](/practice/exercises/big-booty)."
            currentUrl="/improv-games"
          />
          <Prose
            as="li"
            text="**Scenes are clever but cold.** [Emotional Honesty Scene](/practice/exercises/emotional-honesty-scene), [Gift Giving](/practice/exercises/gift-giving)."
            currentUrl="/improv-games"
          />
          <Prose
            as="li"
            text="**Nobody will start.** [First Line Drill](/practice/exercises/first-line-drill), [Blind Offer](/practice/exercises/blind-offer)."
            currentUrl="/improv-games"
          />
          <Prose
            as="li"
            text="**Scenes come apart halfway through.** [Fracture Repair Drill](/practice/exercises/fracture-repair-drill)."
            currentUrl="/improv-games"
          />
          <Prose
            as="li"
            text="**Everyone talks at once.** [Group Mind Cultivation](/practice/exercises/group-mind-cultivation)."
            currentUrl="/improv-games"
          />
        </ul>
        <Prose
          text="If you cannot name what is wrong yet, that is its own problem and worth solving first — see [what it looks like when a scene breaks](/how-it-works/diagnosis)."
          currentUrl="/improv-games"
          className="text-foreground/70"
        />
      </section>

      <section className="mt-12">
        <h2 id="warm-up-exercise-or-performance-game" className="mb-3 text-xl font-semibold">
          Warm-Up, Exercise, or Performance Game
        </h2>
        <Prose
          text="These get lumped together as “improv games” and they do three different jobs. Reaching for the wrong kind is the most common way a session goes flat."
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />
        <Diagram
          src="/images/choosing-a-game.svg"
          alt="Three kinds of improv game: a warm-up runs two minutes with no notes, an exercise is run while nobody is watching, a performance game is built to be watched — and confusing the last two is the classic mistake."
          caption="The moment players sense an audience they start playing for the laugh, and whatever the exercise was isolating is gone."
        />
        <ul className="text-foreground/70 mb-4 space-y-2">
          <Prose
            as="li"
            text="**A warm-up** is cheap, fast, and has no wrong answers. Its only job is to move attention out of people's heads and into the room. Two minutes, no notes."
            currentUrl="/improv-games"
          />
          <Prose
            as="li"
            text="**An exercise** isolates one skill and has a failure mode you can coach. It is run slowly, interrupted often, and is usually not much fun to watch — which is fine, because nobody is watching."
            currentUrl="/improv-games"
          />
          <Prose
            as="li"
            text="**A performance game** has rules an audience can follow and a comic engine of its own. It is built to be watched."
            currentUrl="/improv-games"
          />
        </ul>
        <Prose
          text="The classic mistake is running an exercise as though it were a performance game. The moment players sense an audience they start playing for the laugh, and whatever the exercise was isolating is gone."
          currentUrl="/improv-games"
          className="text-foreground/70"
        />
      </section>

      {shortForm.length > 0 && (
        <section className="mt-12" data-track="short-form-games">
          <h2 id="short-form-games" className="mb-3 text-xl font-semibold">
            Short-Form Games
          </h2>
          <Prose
            text="The performance kind: rules, a structure, and usually an audience — as opposed to the drills used in rehearsal."
            currentUrl="/improv-games"
            className="text-foreground/70 mb-4"
          />
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

      <section className="mt-12" data-track="games-by-group">
        <h2 id="which-games-for-which-group" className="mb-3 text-xl font-semibold">
          Which Games for Which Group
        </h2>
        <Prose
          text={GAMES_HUB_COPY.whoIsInTheRoom}
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text={GAMES_HUB_COPY.beginners}
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text={GAMES_HUB_COPY.children}
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text={GAMES_HUB_COPY.workshop}
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text={GAMES_HUB_COPY.workTeam}
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text={GAMES_HUB_COPY.remote}
          currentUrl="/improv-games"
          className="text-foreground/70"
        />
      </section>

      <section className="mt-12" data-track="beginner-games">
        <h2 id="easy-improv-games-for-beginners" className="mb-3 text-xl font-semibold">
          Easy Improv Games for Beginners
        </h2>
        <Prose
          text="What makes a game easy is not that the rule is short. It is that the game removes the two things beginners actually find hard, which are inventing something and being looked at on their own. A game that does both is easy no matter how fast it moves, and a game that does neither is difficult no matter how simple it sounds."
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="Four properties do it. There is a rule to obey, so nobody has to decide what to do. Everybody plays at once, so no one person is on display. Nothing depends on being funny. And it is over in a few minutes, before anybody has time to start dreading their turn."
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="The reliable starting set: [Pass the Clap](/practice/exercises/pass-the-clap), [Zip Zap Zop](/practice/exercises/zip-zap-zop), [Sound Ball](/practice/exercises/sound-ball) and [Yes, Let’s](/practice/exercises/yes-lets). None asks for an idea, all four fail cheerfully, and a room that has played them is considerably easier to teach a scene to than a room that has not."
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="What to keep away from on a first session: two-person scenes, anything with a winner, and anything requiring a character. Each one asks somebody to be interesting while people watch, which is the exact thing the games above are designed to postpone. Fun and easy tend to coincide here for that reason rather than by accident — the games people remember enjoying are usually the ones where they were never at risk of being the problem."
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />

        <h2 id="how-to-run-one" className="mb-3 text-xl font-semibold">
          How to Run One
        </h2>
        <Prose
          text="**Coach during, not after.** [Side-coaching](/practice/techniques/side-coaching) is Viola Spolin's method and the defining rule is that the note is acted on at the moment it is needed. A short redirect called into a running game is worth more than five minutes of notes afterwards, when the moment is unrecoverable."
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="**Say what it trains before you start.** A game explained afterwards is a game people played blind. Thirty seconds of framing changes what players pay attention to for the whole round."
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="**Stop it while it is still working.** Games have a ceiling, and the second half of a round that has peaked teaches nothing except that the game is tiring."
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="**Think twice about elimination.** Being out is a small public failure, and in a room that has not built any trust yet it is the wrong first experience — see [safety in the room](/practice/techniques/safety-in-the-room). Most elimination games work perfectly well without it."
          currentUrl="/improv-games"
          className="text-foreground/70"
        />
      </section>

      <section className="mt-12" data-track="why-games-teach">
        <h2
          id="why-a-game-teaches-faster-than-an-instruction"
          className="mb-3 text-xl font-semibold"
        >
          Why a Game Teaches Faster Than an Instruction
        </h2>
        <Prose
          text="Telling somebody to stop planning does not work, because the planning is not a decision. A game that occupies the conscious mind removes the option, and the habit stops on its own — which is the whole design of [Big Booty](/practice/exercises/big-booty), where your own number keeps changing so the answer you rehearsed is wrong by the time your turn arrives."
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text="Games also make invisible things visible. Hesitation inside a scene reads as the scene going badly. Hesitation in a circle passing three syllables reads as exactly what it is, to everyone including the person doing it. That is most of what a game is for: not to practise a skill, but to let a room watch a habit happen."
          currentUrl="/improv-games"
          className="text-foreground/70"
        />
      </section>

      {/*
        The hub carries the site's largest improv-specific term and had no
        question-shaped heading on it. Three of these also answer intents the
        content plan had down as separate pages — warm-up games, two-person
        games, and the age question — which are better served from the page
        that already ranks than by three thin pages competing with it.
      */}
      <section className="mt-12" data-track="games-faq">
        <h2 id="questions-people-ask-about-improv-games" className="mb-3 text-xl font-semibold">
          Questions People Ask About Improv Games
        </h2>

        <h3 id="what-are-improv-games" className="mt-6 mb-2 font-semibold">
          What are improv games?
        </h3>
        <Prose
          text={GAMES_HUB_COPY.faqWhatTheyAre}
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text={GAMES_HUB_COPY.faqThreeKinds}
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />

        <h3 id="what-are-the-best-improv-warm-up-games" className="mt-6 mb-2 font-semibold">
          What are the best improv warm-up games?
        </h3>
        <Prose
          text={GAMES_HUB_COPY.faqBestWarmUps}
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text={GAMES_HUB_COPY.faqWarmUpWithAnIdea}
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />

        <h3 id="can-you-play-improv-games-with-only-two-people" className="mt-6 mb-2 font-semibold">
          Can you play improv games with only two people?
        </h3>
        <Prose
          text={GAMES_HUB_COPY.faqPairGames}
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text={GAMES_HUB_COPY.faqPairLimits}
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />

        <h3 id="which-improv-games-work-on-a-video-call" className="mt-6 mb-2 font-semibold">
          Which improv games work on a video call?
        </h3>
        <Prose
          text={GAMES_HUB_COPY.faqVideoConstraint}
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />
        <Prose
          text={GAMES_HUB_COPY.faqVideoSurvivors}
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />

        <h3 id="what-age-can-children-start-improv-games" className="mt-6 mb-2 font-semibold">
          What age can children start improv games?
        </h3>
        <Prose
          text={GAMES_HUB_COPY.faqChildrenAge}
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />

        <h3 id="what-if-there-are-only-two-of-you" className="mt-6 mb-2 font-semibold">
          What if there are only two of you?
        </h3>
        <Prose
          text={GAMES_HUB_COPY.faqOnlyTwoOfYou}
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />

        <h3
          id="which-improv-game-should-you-start-a-session-with"
          className="mt-6 mb-2 font-semibold"
        >
          Which improv game should you start a session with?
        </h3>
        <Prose
          text={GAMES_HUB_COPY.faqOpeningGame}
          currentUrl="/improv-games"
          className="text-foreground/70 mb-4"
        />
      </section>

      <section className="mt-12" data-track="related">
        <h2 id="related" className="mb-3 text-xl font-semibold">
          Related
        </h2>
        <Prose
          text="Many of these descend from Viola Spolin's [theatre games](/theatre-games), which were built to train skills rather than get laughs. If you need something to start a scene with rather than a game to play, there are [110 improv prompts](/improv-prompts). And for the model underneath all of it, see [how it works](/how-it-works)."
          currentUrl="/improv-games"
          className="text-foreground/70"
        />
      </section>
    </main>
  );
}
