import { Breadcrumb } from "@/components/Breadcrumb";
import { TagFilter } from "@/components/TagFilter";
import { getAtomUrl, loadAtoms } from "@/lib/content";

const FILTER_GROUPS = [
  {
    label: "Form",
    tags: [
      { label: "Longform", tag: "longform" },
      { label: "Shortform", tag: "shortform" },
    ],
  },
  {
    label: "Level",
    tags: [
      { label: "Beginner-friendly", tag: "accessible" },
      { label: "Advanced", tag: "advanced" },
    ],
  },
  {
    label: "Style",
    tags: [
      { label: "Competition", tag: "competition" },
      { label: "Narrative", tag: "narrative" },
      { label: "Audience interaction", tag: "audience-interaction" },
      { label: "Duo", tag: "duo" },
      { label: "Music", tag: "music" },
    ],
  },
];

export default async function FormatsPage() {
  const atoms = await loadAtoms();
  const formats = atoms.filter((a) => a.frontmatter.type === "format");

  const items = formats.map((a) => ({
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
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Practice", href: "/practice" },
          { label: "Formats" },
        ]}
      />
      <header className="mb-8">
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Formats ({formats.length})</h1>
        <p className="text-foreground/60 mt-2 mb-2">
          Performance structures — from 2-minute games to 60-minute shows.
        </p>
      </header>
      <TagFilter items={items} filterGroups={FILTER_GROUPS} />
    </main>
  );
}
