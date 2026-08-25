import type { Metadata } from "next";

import { Breadcrumb } from "@/components/Breadcrumb";
import { CollectionJsonLd } from "@/components/CollectionJsonLd";
import { TagFilter } from "@/components/TagFilter";
import { getAtomUrl, loadAtoms } from "@/lib/content";
import { leadParagraph, pageTitle, stripLeadLabel } from "@/lib/seo";

export const metadata: Metadata = {
  // Same correction as the exercises hub: the term alone was the entire title.
  title: pageTitle("Improv Techniques: The Moves and When to Use Them"),
  description:
    "The specific moves — how to listen, initiate, edit, support, heighten and recover — and which one a scene actually needs when it stalls.",
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
    preview: leadParagraph(stripLeadLabel(a.content), 180),
    aliases: a.frontmatter.aliases,
  }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <CollectionJsonLd
        name="Improv Techniques"
        description="The specific moves — how to listen, initiate, edit, support, heighten, and recover in improv scenes."
        url="/practice/techniques"
        partOf="/practice"
        items={items.map((i) => ({ name: i.title, url: i.href, description: i.preview }))}
      />
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
      <TagFilter items={items} filterGroups={FILTER_GROUPS} />
    </main>
  );
}
