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

export default async function ExercisesPage() {
  const atoms = await loadAtoms();
  const exercises = atoms.filter((a) => a.frontmatter.type === "exercise");

  const items = exercises.map((a) => ({
    id: a.frontmatter.id,
    title: a.frontmatter.title,
    href: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
    tags: a.frontmatter.tags ?? [],
    preview: a.content
      .replace(/^---[\s\S]*?---\n*/m, "")
      .replace(/^#{1,6}\s+.*$/gm, "")
      .replace(/\*\*[^*]+\*\*/g, "")
      .trim()
      .substring(0, 150),
  }));

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <header className="mb-8">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          practice · exercises
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">
          Exercises ({exercises.length})
        </h1>
        <p className="text-foreground/60 mt-2 mb-2">
          Structured activities that build specific skills through constraints.
        </p>
      </header>
      <TagFilter items={items} filterGroups={FILTER_GROUPS} />
    </main>
  );
}
