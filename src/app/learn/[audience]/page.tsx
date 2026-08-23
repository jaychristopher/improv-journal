import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/Breadcrumb";
import { loadPaths } from "@/lib/content";
import { getRecommendedPath, isRecommendedPath } from "@/lib/path-recommendations";
import type { Audience } from "@/lib/schema";
import { ogImages, pageTitle } from "@/lib/seo";

/**
 * Each audience hub gets orientation prose, the way the topic hubs already do.
 *
 * Four of these five rendered under 110 words — a heading, a one-line
 * description and two or three cards. The topic hubs next door run 611 to 1,228
 * because guide-categories gives each of them authored paragraphs about what
 * the category has in common and how to choose inside it. Nothing about that
 * argument is specific to topics; these pages ask the reader to make a bigger
 * decision than a topic hub does, on less.
 */
const AUDIENCE_META: Record<string, { title: string; description: string; orientation: string[] }> =
  {
    beginner: {
      title: "Improv for Beginners: Where to Start",
      description:
        "The fundamentals of connection - why conversations work, what makes them break, and how to practice. No stage experience required.",
      orientation: [
        "Nothing here assumes you want to perform. The material is about what happens when two people build something together in real time, and improv is simply where that got worked out in the most detail, by people who had to do it nightly in front of strangers. If you came looking for a way to be less stuck in conversations, you are in the right place and you will never need a stage.",
        "Take one path rather than browsing several. The fundamentals compound, and they compound in an order — reception before building, building before shaping — so a path read through is worth considerably more than the same pages read out of sequence. Reading three articles about listening is also worth less than running one exercise twice, which is the part most people skip.",
        "What this is not is a comedy course. Funny is a by-product here rather than a goal, and the guides say so. If your interest genuinely is performance, the improv-first paths are the ones to take; if it is the rest of life, the applied ones will get you there faster without pretending the two are the same thing.",
      ],
    },
    intermediate: {
      title: "Breaking Through a Plateau",
      description:
        "You know the basics but something isn't clicking. These paths help you name what's stuck and work through it.",
      orientation: [
        "A plateau at this stage is usually a vocabulary problem rather than a skill problem. You can feel that a scene died and cannot say why, so every note you give yourself is some version of try harder, which is not an instruction anyone can follow. Naming the failure is most of the repair, because each named failure has a different fix and guessing between them wastes the reps.",
        "The paths here are diagnostic before they are prescriptive. Latency, fracture and decay look similar from the inside and want opposite responses — one wants you to move faster, one wants you to go back, one wants you to add detail to a world that has thinned out. Applying the wrong one is why the same scene keeps dying in the same way.",
        "The temptation worth resisting is stacking more technique on top of an unnamed problem. Most intermediate plateaus are not solved by learning another form; they are solved by subtraction and by precision about what actually went wrong on Tuesday.",
      ],
    },
    teacher: {
      title: "Learning to Teach",
      description:
        "Teaching improv is its own skill. Curriculum design, feedback, progression - how to help others grow.",
      orientation: [
        "Being good at improv does not make you able to teach it. Explaining is a separate skill from doing, and the gap shows up immediately: a student asks why yes-and matters and the honest answer, if all you have is your own practice, turns out to be because it works, which teaches nobody anything.",
        "Three things do most of the work. Safety comes first because nothing else functions without it — a room where being wrong is expensive produces careful, boring scenes no matter how good the exercises are. Sequencing comes second, because skills have prerequisites and most curricula quietly assume ones they never taught. Feedback comes third, and the test of a note is whether the student can do something different next time, not whether it demonstrated that you saw the problem.",
        "The trap is teaching your own teacher's class from memory. Improv teachers should teach differently; what they share is the ability to explain, to make a room safe, and to design an exercise where the student discovers the principle instead of being told it.",
      ],
    },
    performer: {
      title: "Pushing Toward Mastery",
      description:
        "Advanced game, character, ensemble dynamics, and show architecture for experienced performers.",
      orientation: [
        "Advanced work is mostly about what you stop doing. The moves at this level — letting a pattern invert, building a character out of body and status rather than biography, holding a silence that a less experienced performer would fill — are subtractions, and they only become available once the basics cost you no attention.",
        "The unit of attention also changes. Up to here the question has been whether a scene works; from here it is whether a show coheres, which is a different problem with different tools: editing, heat and weight, the run, and the connective tissue that turns a set of scenes into something an audience experiences as one thing.",
        "The caution is that advanced framing can become one more thing to monitor mid-scene. Game-awareness is a lens for looking back at what happened, and it paralyses people the moment it turns into a mandate to be executed live. Everything here is worth knowing and none of it is worth thinking about while a scene is running.",
      ],
    },
    advanced: {
      title: "Research & Reference",
      description:
        "The full system map - laws, principles, patterns, and connections. For deep study and reference.",
      orientation: [
        "This is the map rather than a route through it. The laws, principles, patterns and failure modes are set out with what connects to what, for readers who want the system itself rather than a lesson plan built out of it.",
        "The traditions disagree, and the disagreements are recorded rather than smoothed over. Johnstone and the Chicago lineage do not want the same things from a scene, Napier argues against the rule most schools teach first, and where a claim is contested the counter-position is stated next to it with its source. That is deliberate: a reference that only reports the consensus is hiding the most useful part.",
        "It is not written to be read front to back. Follow a concept into the atoms it links to, or start from a book in the library and work outward through the ideas that came from it.",
      ],
    },
  };

const VALID_AUDIENCES = new Set(Object.keys(AUDIENCE_META));

export function generateStaticParams() {
  return Object.keys(AUDIENCE_META).map((audience) => ({ audience }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ audience: string }>;
}): Promise<Metadata> {
  const { audience } = await params;
  const meta = AUDIENCE_META[audience];
  if (!meta) return {};
  return {
    title: pageTitle(meta.title),
    description: meta.description,
    alternates: { canonical: `/learn/${audience}` },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `/learn/${audience}`,
      type: "article",
      images: ogImages(meta.title, "Learn"),
    },
  };
}

export default async function AudiencePage({ params }: { params: Promise<{ audience: string }> }) {
  const { audience } = await params;
  if (!VALID_AUDIENCES.has(audience)) notFound();

  const typedAudience = audience as Audience;
  const meta = AUDIENCE_META[audience];
  const allPaths = await loadPaths();
  const paths = allPaths.filter((path) => path.frontmatter.audience?.includes(typedAudience));
  const recommendation = getRecommendedPath(typedAudience);
  const recommendedPath = paths.find((path) => path.frontmatter.id === recommendation.id) ?? null;
  const orderedPaths = [
    ...paths.filter((path) => isRecommendedPath(path.frontmatter.id, typedAudience)),
    ...paths.filter((path) => !isRecommendedPath(path.frontmatter.id, typedAudience)),
  ];
  const alternatePaths = orderedPaths.filter((path) => path.frontmatter.id !== recommendation.id);
  const isBeginner = typedAudience === "beginner";

  // Group beginner alternates by focus
  const IMPROV_PATH_IDS = new Set(["physics-of-connection", "systems-of-improv"]);
  const LIFE_PATH_IDS = new Set(["improv-for-life", "improv-for-teams"]);
  const beginnerImprovPaths = alternatePaths.filter((p) => IMPROV_PATH_IDS.has(p.frontmatter.id));
  const beginnerLifePaths = alternatePaths.filter((p) => LIFE_PATH_IDS.has(p.frontmatter.id));
  const beginnerOtherPaths = alternatePaths.filter(
    (p) => !IMPROV_PATH_IDS.has(p.frontmatter.id) && !LIFE_PATH_IDS.has(p.frontmatter.id),
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: meta.title }]} />

      <header className="mb-12">
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{meta.title}</h1>
        <p className="text-foreground/60 mt-2">{meta.description}</p>
      </header>

      <section className="mb-12">
        {meta.orientation.map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="text-foreground/70 mb-4">
            {paragraph}
          </p>
        ))}
      </section>

      {isBeginner && recommendedPath ? (
        <>
          <section className="border-foreground/10 bg-foreground/[0.03] mb-6 rounded-xl border p-6">
            <span className="text-foreground/40 text-xs tracking-wider uppercase">
              {recommendation.label}
            </span>
            <h2 className="mt-1 text-xl font-semibold">{recommendedPath.frontmatter.title}</h2>
            <p className="text-foreground/60 mt-2 text-sm">
              {recommendedPath.frontmatter.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/paths/${recommendedPath.frontmatter.id}`}
                className="bg-foreground text-background hover:bg-foreground/90 inline-flex rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
              >
                Start with Foundations
              </Link>
              <Link
                href="/paths"
                className="border-foreground/10 hover:border-foreground/30 inline-flex rounded-lg border px-4 py-2 text-sm transition-colors"
              >
                Compare all paths
              </Link>
            </div>
          </section>

          <section className="border-foreground/10 bg-surface mb-10 rounded-xl border p-6">
            <h2 className="text-lg font-semibold">Why this path first?</h2>
            <p className="text-foreground/60 mt-2 text-sm leading-relaxed">
              {recommendation.rationale}
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              {recommendedPath.frontmatter.learning_objectives.map((objective) => (
                <li key={objective} className="text-foreground/70 text-sm">
                  {objective}
                </li>
              ))}
            </ul>
          </section>

          {beginnerLifePaths.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-1 text-lg font-semibold">Not an improviser?</h2>
              <p className="text-foreground/40 mb-4 text-sm">
                These paths apply improv principles to everyday life — no stage required.
              </p>
              <div className="space-y-3">
                {beginnerLifePaths.map((path) => (
                  <div
                    key={path.frontmatter.id}
                    className="border-foreground/10 bg-surface hover:border-foreground/30 relative rounded-lg border p-5 transition-colors"
                  >
                    <h3 className="font-semibold">
                      <Link
                        href={`/paths/${path.frontmatter.id}`}
                        className="after:absolute after:inset-0"
                      >
                        {path.frontmatter.title}
                      </Link>
                    </h3>
                    <p className="text-foreground/50 mt-1 text-sm">
                      {path.frontmatter.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {beginnerImprovPaths.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-1 text-lg font-semibold">Go deeper into the system</h2>
              <p className="text-foreground/40 mb-4 text-sm">
                For analytical minds who want to understand why improv works before practicing it.
              </p>
              <div className="space-y-3">
                {beginnerImprovPaths.map((path) => (
                  <div
                    key={path.frontmatter.id}
                    className="border-foreground/10 bg-surface hover:border-foreground/30 relative rounded-lg border p-5 transition-colors"
                  >
                    <h3 className="font-semibold">
                      <Link
                        href={`/paths/${path.frontmatter.id}`}
                        className="after:absolute after:inset-0"
                      >
                        {path.frontmatter.title}
                      </Link>
                    </h3>
                    <p className="text-foreground/50 mt-1 text-sm">
                      {path.frontmatter.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {beginnerOtherPaths.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">More paths</h2>
              <div className="space-y-3">
                {beginnerOtherPaths.map((path) => (
                  <div
                    key={path.frontmatter.id}
                    className="border-foreground/10 bg-surface hover:border-foreground/30 relative rounded-lg border p-5 transition-colors"
                  >
                    <h3 className="font-semibold">
                      <Link
                        href={`/paths/${path.frontmatter.id}`}
                        className="after:absolute after:inset-0"
                      >
                        {path.frontmatter.title}
                      </Link>
                    </h3>
                    <p className="text-foreground/50 mt-1 text-sm">
                      {path.frontmatter.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          <div className="space-y-4">
            {orderedPaths.map((path) => (
              <div
                key={path.frontmatter.id}
                className="border-foreground/10 bg-surface hover:border-foreground/30 relative rounded-lg border p-5 transition-colors"
              >
                <h2 className="flex items-center gap-2 font-semibold">
                  <Link
                    href={`/paths/${path.frontmatter.id}`}
                    className="after:absolute after:inset-0"
                  >
                    {path.frontmatter.title}
                  </Link>
                  {isRecommendedPath(path.frontmatter.id, typedAudience) && (
                    <span className="bg-foreground/10 text-foreground/50 rounded-full px-2 py-0.5 text-xs">
                      {recommendation.label}
                    </span>
                  )}
                </h2>
                <p className="text-foreground/50 mt-1 text-sm">{path.frontmatter.description}</p>
              </div>
            ))}
          </div>

          {typedAudience === "teacher" && (
            <section className="mt-10">
              <h2 className="mb-1 text-lg font-semibold">Also explore</h2>
              <p className="text-foreground/40 mb-4 text-sm">
                Supplementary resources for improv teachers.
              </p>
              <div className="text-foreground/50 space-y-2 text-sm">
                <Link href="/how-to-give-feedback" className="block hover:underline">
                  Guide: How to Give Feedback That Actually Changes Behavior
                </Link>
                <Link href="/practice/exercises" className="block hover:underline">
                  Exercise Library — browse exercises for class planning
                </Link>
                <Link href="/traditions" className="block hover:underline">
                  Traditions — compare Johnstone, Spolin, Close, UCB, and Annoyance
                </Link>
                <Link href="/library" className="block hover:underline">
                  Reading List — source texts organized by depth
                </Link>
              </div>
            </section>
          )}

          {typedAudience === "advanced" && (
            <section className="mt-10">
              <h2 className="mb-1 text-lg font-semibold">Also explore</h2>
              <p className="text-foreground/40 mb-4 text-sm">
                Deep-dive resources for serious study.
              </p>
              <div className="text-foreground/50 space-y-2 text-sm">
                <Link href="/improv-theory" className="block hover:underline">
                  Guide: The Five Traditions That Shaped Modern Improvisation
                </Link>
                <Link href="/traditions" className="block hover:underline">
                  Traditions — counter-positions and lineage maps
                </Link>
                <Link href="/library" className="block hover:underline">
                  Reading List — every source text cited in the graph
                </Link>
                <Link href="/how-it-works" className="block hover:underline">
                  How It Works — laws, principles, and the system underneath
                </Link>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
