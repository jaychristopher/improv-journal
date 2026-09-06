import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { getEpisodesForShow, loadShows } from "@/lib/content";
import { pageTitle } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const shows = await loadShows();

  return {
    /**
     * "Listen" was the whole title — six characters, no subject in it — on a
     * page linked from the nav and the footer of all 376 pages. Nothing on
     * this site targets "improv podcast" and this hub holds three of them, so
     * the term was uncontested and simply unclaimed. The description had the
     * same problem: it said "through the lens of improvisation" and never the
     * word somebody searching would type.
     */
    title: pageTitle("Improv Podcasts: Three Shows and What Each Is For"),
    description:
      "Three improv podcasts built from one set of ideas — a problem worked through in conversation, three-minute concept drills, and long-form arguments.",
    // Every show's feed, so a reader landing on the hub can find them all.
    alternates: {
      canonical: "/listen",
      types: {
        "application/rss+xml": shows.map((s) => ({
          url: `/listen/${s.frontmatter.id}/feed.xml`,
          title: `${s.frontmatter.title} Podcast`,
        })),
      },
    },
  };
}

/**
 * Orienting paragraphs for this hub, held in a const the way guide-categories
 * holds them for the topic hubs. Kept out of JSX so the prose stays plain
 * strings rather than escaped markup, and so prose-overlap reads it as text.
 */
/**
 * What separates the three shows, in the terms someone choosing between them
 * would use. Held as data rather than prose because the cards below already
 * carry each show's own description, and this is the comparison the cards
 * cannot make — a card can say what a show is, only a list can say why you
 * would pick it over the other two.
 */
const WHICH_SHOW: { id: string; title: string; when: string; body: string }[] = [
  {
    id: "physics-of-connection",
    title: "The Physics of Connection",
    when: "You have a problem and want it worked through",
    body: "Each episode starts from something that goes wrong away from a stage — overthinking a conversation, freezing when it matters, a team that will not say the real thing — and works out what improv found out about it. It is the longest show and the one that assumes least: no stage, no class, no vocabulary. If you found this site by searching for something that was bothering you, the episode about it is here.",
  },
  {
    id: "improv-lab",
    title: "The Improv Lab",
    when: "You want one idea and something to do with it tonight",
    body: "One concept or one exercise per episode, in about three minutes, ending with a way to try it. These are drills rather than discussions, and they are the ones worth queueing on the walk to a rehearsal. The trade is depth: an episode names a thing precisely and does not argue with itself about it.",
  },
  {
    id: "deep-cuts",
    title: "Deep Cuts",
    when: "You want the argument, not the summary",
    body: "The longest-form show, built from the lessons rather than the single concepts. These take a question that has more than one defensible answer — what a scene is actually made of, where the schools disagree, what teaching does to the thing being taught — and stay with it. It is the show to start with if you already know the vocabulary and want to be disagreed with.",
  },
];

/**
 * Questions grounded in what is actually true of these three shows.
 *
 * The generic podcast-hub questions — how often do you publish, where can I
 * subscribe — are either answered by the cards below or not worth a heading.
 * These are the three a reader of this site would really have, and the answers
 * are the honest ones rather than the flattering ones: the second says the
 * episodes are not a substitute for the pages, and the third says that if you
 * have already read the page, the episode is mostly not worth your time.
 */
const QUESTIONS: { q: string; a: string[] }[] = [
  {
    q: "Do the episodes just read the pages out loud?",
    a: [
      "No, and that is the main thing worth knowing before you start one. Each episode is a two-host conversation written from the page rather than a narration of it — the same argument, rebuilt as something two people would say to each other, with the examples kept and the citations dropped.",
      "That makes them shorter than the pages they come from. An episode is closer to the strongest twenty minutes of a written piece than to the whole of it.",
    ],
  },
  {
    q: "Where do I start with this many episodes?",
    a: [
      "By what you came for rather than by episode one. None of the three shows builds on itself, so there is no order to fall behind in and no back catalogue to catch up on — every episode is written to stand alone, because most of them are reached from a search result rather than from the show.",
      "If you want a route anyway: pick the problem you actually have from The Physics of Connection, and if you like the way it thinks, go to Deep Cuts for the long version of the same ideas.",
    ],
  },
  {
    q: "Is there any point listening if I have already read the page?",
    a: [
      "Usually not, and it would be strange to pretend otherwise on a page trying to get you to listen. The written version is the fuller one — it has the sources, the counter-arguments and the diagrams, and the episode has none of those.",
      "The case for the audio is the case for having it in a different place: on a walk, in a car, in the twenty minutes before a rehearsal when reading is not available. It is the same material in a form you can take somewhere else, which is worth something, and it is not worth reading the page twice.",
    ],
  },
];

const HUB_ORIENTATION = [
  "The three shows are not three seasons of the same thing. One takes an ordinary problem and works it through in conversation, one gives a single idea about three minutes and a way to try it that night, and one goes long on the ideas underneath the practice. Which you want depends on whether you are looking for company, a drill, or an argument.",
  "Every episode has a written page behind it, and the audio is an alternative to reading rather than an extra on top. If you would rather have the text — to skim it, to search it, or because listening is slower — the episode links through to the page it was made from, and nothing is audio-only.",
  "Each show publishes a feed, so any podcast app that accepts a URL will take it. The site is not a substitute for a player, and the archive here exists so the episodes stay findable and readable rather than living only in an app that decides what you see.",
];

export default async function ListenPage() {
  const shows = await loadShows();

  // Resolve episode counts and find a featured episode
  const showsWithCounts = await Promise.all(
    shows.map(async (s) => {
      const seasons = await getEpisodesForShow(s.frontmatter.id);
      const totalEpisodes = seasons.reduce((sum, season) => sum + season.episodes.length, 0);
      const firstEpisode = seasons[0]?.episodes[0] ?? null;
      return {
        id: s.frontmatter.id,
        title: s.frontmatter.title,
        description: s.frontmatter.description,
        episodeCount: totalEpisodes,
        firstEpisode,
      };
    }),
  );

  const totalEpisodes = showsWithCounts.reduce((sum, s) => sum + s.episodeCount, 0);

  // Feature the flagship show's first episode
  const flagship = showsWithCounts.find((s) => s.id === "physics-of-connection");
  const featured = flagship?.firstEpisode ?? null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "Listen" }]} />

      <header className="mb-12">
        <span className="text-foreground/40 text-xs tracking-wider uppercase">podcast</span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Listen</h1>
        <p className="text-foreground/60 mt-2">
          {totalEpisodes} conversations exploring the physics of human connection through the lens
          of improvisation.
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
        <h2 className="mb-3 text-xl font-semibold">Which of the three you want</h2>
        <p className="text-foreground/70 mb-4">
          They divide by what you are in the mood to do, not by subject — all three draw on the same
          set of ideas, and a concept covered in three minutes on one show is an hour of argument on
          another.
        </p>
        <div className="space-y-5">
          {WHICH_SHOW.map((show) => (
            <div key={show.id}>
              <h3 className="font-semibold">
                <Link href={`/listen/${show.id}`} className="hover:underline">
                  {show.title}
                </Link>
                <span className="text-foreground/40 font-normal"> — {show.when}</span>
              </h3>
              <p className="text-foreground/70 mt-1">{show.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured episode */}
      {featured && (
        <section className="mb-12">
          <h2 className="text-foreground/40 mb-3 text-sm font-semibold tracking-wider uppercase">
            Featured
          </h2>
          <div className="border-foreground/10 bg-surface rounded-lg border p-5">
            <Link href={featured.href} className="font-medium hover:underline">
              {featured.title}
            </Link>
            {featured.description && (
              <p className="text-foreground/50 mt-1 text-sm">{featured.description}</p>
            )}
            <audio controls preload="none" className="mt-3 w-full">
              <source src={featured.audioUrl} type="audio/mpeg" />
            </audio>
          </div>
        </section>
      )}

      {/* Show cards */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Three Shows</h2>
        <div className="space-y-4">
          {showsWithCounts.map((s) => (
            <div
              key={s.id}
              className="border-foreground/10 bg-surface hover:border-foreground/30 relative rounded-lg border p-5 transition-colors"
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold">
                  <Link href={`/listen/${s.id}`} className="after:absolute after:inset-0">
                    {s.title}
                  </Link>
                </h3>
                <span className="text-foreground/40 text-sm">{s.episodeCount} episodes</span>
              </div>
              <p className="text-foreground/50 mt-1 text-sm">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-3 text-xl font-semibold">Questions People Ask About These Shows</h2>
        {QUESTIONS.map((item) => (
          <div key={item.q} className="mb-6">
            <h3 className="mb-2 font-semibold">{item.q}</h3>
            {item.a.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="text-foreground/70 mb-3">
                {paragraph}
              </p>
            ))}
          </div>
        ))}
      </section>
    </main>
  );
}
