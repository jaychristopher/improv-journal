import { loadAtoms, getAtomUrl } from "@/lib/content";
import { TagFilter } from "@/components/TagFilter";

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
    (a) => a.frontmatter.type === "technique" || a.frontmatter.type === "pedagogy"
  );

  const items = techniques.map((a) => ({
    id: a.frontmatter.id,
    title: a.frontmatter.title,
    href: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
    tags: a.frontmatter.tags ?? [],
  }));

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <header className="mb-8">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          practice · techniques
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">
          Techniques ({techniques.length})
        </h1>
        <p className="text-foreground/60 mt-2 mb-2">
          The specific moves — how to listen, initiate, edit, support,
          heighten, and recover.
        </p>
      </header>
      <TagFilter items={items} filterGroups={FILTER_GROUPS} showPreview={false} />
    </main>
  );
}
