import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/Breadcrumb";
import { loadPaths } from "@/lib/content";
import { getRecommendedPath, isRecommendedPath } from "@/lib/path-recommendations";
import type { Audience } from "@/lib/schema";

const AUDIENCE_META: Record<string, { title: string; description: string }> = {
  beginner: {
    title: "Improv for Beginners: Where to Start",
    description:
      "The fundamentals of connection - why conversations work, what makes them break, and how to practice. No stage experience required.",
  },
  intermediate: {
    title: "Breaking Through a Plateau",
    description:
      "You know the basics but something isn't clicking. These paths help you name what's stuck and work through it.",
  },
  teacher: {
    title: "Learning to Teach",
    description:
      "Teaching improv is its own skill. Curriculum design, feedback, progression - how to help others grow.",
  },
  performer: {
    title: "Pushing Toward Mastery",
    description:
      "Advanced game, character, ensemble dynamics, and show architecture for experienced performers.",
  },
  advanced: {
    title: "Research & Reference",
    description:
      "The full system map - laws, principles, patterns, and connections. For deep study and reference.",
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
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/learn/${audience}` },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `/learn/${audience}`,
      type: "article",
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
                  <Link
                    key={path.frontmatter.id}
                    href={`/paths/${path.frontmatter.id}`}
                    className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-5 transition-colors"
                  >
                    <h3 className="font-semibold">{path.frontmatter.title}</h3>
                    <p className="text-foreground/50 mt-1 text-sm">
                      {path.frontmatter.description}
                    </p>
                  </Link>
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
                  <Link
                    key={path.frontmatter.id}
                    href={`/paths/${path.frontmatter.id}`}
                    className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-5 transition-colors"
                  >
                    <h3 className="font-semibold">{path.frontmatter.title}</h3>
                    <p className="text-foreground/50 mt-1 text-sm">
                      {path.frontmatter.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {beginnerOtherPaths.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">More paths</h2>
              <div className="space-y-3">
                {beginnerOtherPaths.map((path) => (
                  <Link
                    key={path.frontmatter.id}
                    href={`/paths/${path.frontmatter.id}`}
                    className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-5 transition-colors"
                  >
                    <h3 className="font-semibold">{path.frontmatter.title}</h3>
                    <p className="text-foreground/50 mt-1 text-sm">
                      {path.frontmatter.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          <div className="space-y-4">
            {orderedPaths.map((path) => (
              <Link
                key={path.frontmatter.id}
                href={`/paths/${path.frontmatter.id}`}
                className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-5 transition-colors"
              >
                <h2 className="flex items-center gap-2 font-semibold">
                  {path.frontmatter.title}
                  {isRecommendedPath(path.frontmatter.id, typedAudience) && (
                    <span className="bg-foreground/10 text-foreground/50 rounded-full px-2 py-0.5 text-xs">
                      {recommendation.label}
                    </span>
                  )}
                </h2>
                <p className="text-foreground/50 mt-1 text-sm">{path.frontmatter.description}</p>
              </Link>
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
