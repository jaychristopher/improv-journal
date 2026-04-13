import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/Breadcrumb";
import { RecommendedBadge } from "@/components/RecommendedBadge";
import { loadPaths } from "@/lib/content";
import type { Audience } from "@/lib/schema";

const AUDIENCE_META: Record<string, { title: string; description: string }> = {
  beginner: {
    title: "Improv for Beginners: Where to Start",
    description:
      "The fundamentals of connection — why conversations work, what makes them break, and how to practice. No stage experience required.",
  },
  intermediate: {
    title: "Breaking Through a Plateau",
    description:
      "You know the basics but something isn't clicking. These paths help you name what's stuck and work through it.",
  },
  teacher: {
    title: "Learning to Teach",
    description:
      "Teaching improv is its own skill. Curriculum design, feedback, progression — how to help others grow.",
  },
  performer: {
    title: "Pushing Toward Mastery",
    description:
      "Advanced game, character, ensemble dynamics, and show architecture for experienced performers.",
  },
  advanced: {
    title: "Research & Reference",
    description:
      "The full system map — laws, principles, patterns, and connections. For deep study and reference.",
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

  const meta = AUDIENCE_META[audience];
  const allPaths = await loadPaths();
  const paths = allPaths.filter((p) => p.frontmatter.audience?.includes(audience as Audience));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: meta.title }]} />

      <header className="mb-12">
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{meta.title}</h1>
        <p className="text-foreground/60 mt-2">{meta.description}</p>
      </header>

      <div className="space-y-4">
        {paths.map((p) => (
          <Link
            key={p.frontmatter.id}
            href={`/paths/${p.frontmatter.id}`}
            className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-5 transition-colors"
          >
            <h2 className="flex items-center font-semibold">
              {p.frontmatter.title}
              <RecommendedBadge pathId={p.frontmatter.id} />
            </h2>
            <p className="text-foreground/50 mt-1 text-sm">{p.frontmatter.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
