import type { Metadata } from "next";

import { Breadcrumb } from "@/components/Breadcrumb";
import { TagFilter } from "@/components/TagFilter";
import { getAtomUrl, loadAtoms } from "@/lib/content";

export const metadata: Metadata = {
  title: "Improv Techniques",
  description:
    "The specific moves — how to listen, initiate, edit, support, heighten, and recover in improv scenes.",
  alternates: { canonical: "/practice/techniques" },
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
    label: "Area",
    tags: [
      { label: "Game", tag: "game" },
      { label: "Show craft", tag: "show-craft" },
      { label: "Character", tag: "character" },
      { label: "Ensemble", tag: "ensemble" },
      { label: "Performance", tag: "performance" },
      { label: "Teaching", tag: "pedagogy" },
      { label: "Harold", tag: "harold" },
    ],
  },
];

export default async function TechniquesPage() {
  const atoms = await loadAtoms();
  const techniques = atoms.filter(
    (a) => a.frontmatter.type === "technique" || a.frontmatter.type === "pedagogy",
  );

  const items = techniques.map((a) => ({
    id: a.frontmatter.id,
    title: a.frontmatter.title,
    href: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
    tags: a.frontmatter.tags ?? [],
  }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Practice", href: "/practice" },
          { label: "Techniques" },
        ]}
      />
      <header className="mb-8">
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Techniques ({techniques.length})</h1>
        <p className="text-foreground/60 mt-2 mb-2">
          The specific moves — how to listen, initiate, edit, support, heighten, and recover.
        </p>
      </header>
      <TagFilter items={items} filterGroups={FILTER_GROUPS} showPreview={false} />
    </main>
  );
}
