import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { TagFilter } from "@/components/TagFilter";
import { loadImprovGames } from "@/lib/games";
import { ogImages, pageTitle, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: pageTitle("Improv Games: The Complete Collection"),
  description:
    "Every improv game and exercise, organized by level and skill. From warm-ups for beginners to advanced ensemble work.",
  alternates: { canonical: "/improv-games" },
  openGraph: {
    title: "Improv Games: The Complete Collection",
    description:
      "Every improv game and exercise, organized by level and skill. From warm-ups for beginners to advanced ensemble work.",
    url: "/improv-games",
    type: "website",
    images: ogImages("Improv Games: The Complete Collection"),
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

export default async function ImprovGamesPage() {
  const games = await loadImprovGames();

  const items = games.map((game) => ({
    id: game.id,
    title: game.title,
    href: game.href,
    tags: game.tags,
    preview: game.description,
  }));

  // ItemList makes the collection readable as a list of named games, rather
  // than a page that happens to link to some.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}/improv-games`,
    name: "Improv Games: The Complete Collection",
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
          Improv Games: The Complete Collection
        </h1>
        <p className="text-foreground/60 mt-2">
          Every improv game and exercise, organized by level and skill. Each one includes how to run
          it, what it builds, and why it works. Whether you&apos;re warming up before a show,
          teaching a class, or looking for team building games — start here.
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

      <TagFilter items={items} filterGroups={FILTER_GROUPS} />

      {/* SEO sections targeting long-tail keywords */}
      <section className="border-foreground/10 mt-16 border-t pt-12">
        <h2 className="mb-4 text-lg font-semibold">Improv Games for Beginners</h2>
        <p className="text-foreground/60 mb-4 text-sm">
          New to improv? These games require no experience and teach the fundamentals — saying yes,
          listening, and building on what your partner gives you.
        </p>
        <div className="flex flex-wrap gap-2">
          {items
            .filter((i) => i.tags.includes("beginner"))
            .map((i) => (
              <Link
                key={i.id}
                href={i.href}
                className="border-foreground/10 hover:border-foreground/30 rounded-full border px-3 py-1 text-sm transition-colors"
              >
                {i.title}
              </Link>
            ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Improv Warm-Up Games</h2>
        <p className="text-foreground/60 mb-4 text-sm">
          Quick games to get a group connected, present, and ready to play. Use these before
          rehearsals, shows, or workshops.
        </p>
        <div className="flex flex-wrap gap-2">
          {items
            .filter(
              (i) =>
                i.tags.includes("presence") ||
                i.tags.includes("ensemble") ||
                i.tags.includes("beginner"),
            )
            .slice(0, 8)
            .map((i) => (
              <Link
                key={i.id}
                href={i.href}
                className="border-foreground/10 hover:border-foreground/30 rounded-full border px-3 py-1 text-sm transition-colors"
              >
                {i.title}
              </Link>
            ))}
        </div>
      </section>

      {shortForm.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">Short-Form Improv Games</h2>
          <p className="text-foreground/60 mb-4 text-sm">
            Games with rules, a structure, and usually an audience — the short-form formats played
            at shows and jams, as opposed to the drills used in rehearsal.
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

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Want to understand why these games work?</h2>
        <p className="text-foreground/60 text-sm">
          Every improv game trains a specific skill rooted in how human connection works.{" "}
          <Link href="/how-it-works" className="text-foreground underline">
            See the system underneath
          </Link>
          , or{" "}
          <Link href="/paths" className="text-foreground underline">
            start a learning path
          </Link>{" "}
          to go deeper.
        </p>
      </section>
    </main>
  );
}
