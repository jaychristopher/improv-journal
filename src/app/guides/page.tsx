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

export default async function GuidesPage() {
  const bridges = await loadBridges();

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

      <div className="space-y-4">
        {bridges.map((b) => (
          <Link
            key={b.slug}
            href={`/${b.slug}`}
            className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-5 transition-colors"
          >
            <h2 className="font-semibold">{b.frontmatter.title}</h2>
            <p className="text-foreground/50 mt-1 text-sm">{b.frontmatter.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
