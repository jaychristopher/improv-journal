import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { loadBridges } from "@/lib/content";

export const metadata: Metadata = {
  title: "Practical Guides",
  description:
    "Guides for overthinking, stage fright, team dynamics, feedback, and more — connecting improv principles to everyday challenges.",
  alternates: { canonical: "/guides" },
};

interface GuideCategory {
  title: string;
  description: string;
  slugs: Set<string>;
}

const CATEGORIES: GuideCategory[] = [
  {
    title: "Personal Growth",
    description: "Overthinking, confidence, creativity, fear, and presence.",
    slugs: new Set([
      "how-to-stop-overthinking",
      "how-to-be-more-confident",
      "how-to-be-more-creative",
      "how-to-be-witty",
      "how-to-be-less-awkward",
      "how-to-let-go-of-control",
      "how-to-be-vulnerable",
      "how-to-be-present",
      "how-to-overcome-fear-of-failure",
      "fear-of-public-speaking",
      "stage-fright",
      "how-to-stop-caring-what-people-think",
      "how-to-be-more-assertive",
      "how-to-deal-with-rejection",
      "how-to-stop-people-pleasing",
      "how-to-be-more-charismatic",
    ]),
  },
  {
    title: "Relationships & Communication",
    description: "Listening, conversation, conflict, and connection.",
    slugs: new Set([
      "active-listening",
      "how-to-be-a-better-conversationalist",
      "how-to-be-a-good-listener",
      "interpersonal-communication-skills",
      "how-to-stop-overthinking-in-a-relationship",
      "how-to-deal-with-conflict",
      "how-to-read-body-language",
      "how-to-make-small-talk",
      "how-to-have-difficult-conversations",
      "types-of-listening",
    ]),
  },
  {
    title: "Teams & Leadership",
    description: "Team building, trust, collaboration, feedback, and group dynamics.",
    slugs: new Set([
      "team-building-activities",
      "team-bonding-activities",
      "team-building-questions",
      "5-minute-team-building",
      "psychological-safety",
      "collaboration-skills",
      "group-dynamics",
      "how-to-read-the-room",
      "how-to-give-feedback",
      "emotional-safety",
    ]),
  },
  {
    title: "Improv Skills",
    description: "For improvisers — fundamentals, practice, and getting unstuck.",
    slugs: new Set([
      "what-is-improv",
      "rules-of-improv",
      "how-to-be-funny",
      "how-to-get-better-at-improv",
      "improv-theory",
    ]),
  },
];

export default async function GuidesPage() {
  const bridges = await loadBridges();
  const bridgeBySlug = new Map(bridges.map((b) => [b.slug, b]));

  const categorized = CATEGORIES.map((cat) => ({
    ...cat,
    bridges: [...cat.slugs].map((slug) => bridgeBySlug.get(slug)).filter(Boolean),
  }));

  // Catch any bridges not in a category
  const categorizedSlugs = new Set(CATEGORIES.flatMap((c) => [...c.slugs]));
  const uncategorized = bridges.filter((b) => !categorizedSlugs.has(b.slug));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "Guides" }]} />

      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight">Guides</h1>
        <p className="text-foreground/60 mt-2">
          Practical guides that connect improv principles to everyday challenges — overthinking,
          stage fright, team dynamics, giving feedback, and more. No stage required.
        </p>
      </header>

      {categorized.map((cat) => (
        <section key={cat.title} className="mb-12">
          <h2 className="text-foreground/80 text-lg font-semibold">{cat.title}</h2>
          <p className="text-foreground/40 mb-4 text-sm">{cat.description}</p>
          <div className="space-y-3">
            {cat.bridges.map((b) => (
              <Link
                key={b!.slug}
                href={`/${b!.slug}`}
                className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-5 transition-colors"
              >
                <h3 className="font-semibold">{b!.frontmatter.title}</h3>
                <p className="text-foreground/50 mt-1 text-sm">{b!.frontmatter.description}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {uncategorized.length > 0 && (
        <section className="mb-12">
          <h2 className="text-foreground/80 text-lg font-semibold">More Guides</h2>
          <div className="mt-4 space-y-3">
            {uncategorized.map((b) => (
              <Link
                key={b.slug}
                href={`/${b.slug}`}
                className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-5 transition-colors"
              >
                <h3 className="font-semibold">{b.frontmatter.title}</h3>
                <p className="text-foreground/50 mt-1 text-sm">{b.frontmatter.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
