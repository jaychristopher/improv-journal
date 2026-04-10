import Link from "next/link";
import { loadAtoms } from "@/lib/content";
import { Breadcrumb } from "@/components/Breadcrumb";

export default async function PracticePage() {
  const atoms = await loadAtoms();
  const counts = {
    exercises: atoms.filter((a) => a.frontmatter.type === "exercise").length,
    techniques: atoms.filter((a) => a.frontmatter.type === "technique" || a.frontmatter.type === "pedagogy").length,
    formats: atoms.filter((a) => a.frontmatter.type === "format").length,
    vocabulary: atoms.filter((a) => a.frontmatter.type === "definition").length,
  };

  const sections = [
    { href: "/practice/exercises", label: "Exercises", count: counts.exercises, desc: "Structured activities that build specific skills through constraints." },
    { href: "/practice/techniques", label: "Techniques", count: counts.techniques, desc: "The specific moves — how to listen, initiate, edit, support, heighten, and recover." },
    { href: "/practice/formats", label: "Formats", count: counts.formats, desc: "Performance structures — Harold, Montage, Armando, and beyond." },
    { href: "/practice/vocabulary", label: "Vocabulary", count: counts.vocabulary, desc: "The foundational concepts that name what's happening in scenes and conversations." },
  ];

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <Breadcrumb
        crumbs={[{ label: "Home", href: "/" }, { label: "Practice" }]}
      />
      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight mt-1">Practice</h1>
        <p className="text-foreground/60 mt-2">
          The tools improvisers use — exercises you can try with a partner,
          techniques for better conversations and scenes, show formats, and
          the vocabulary to name what's happening.
        </p>
      </header>

      <div className="space-y-4">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="block border border-foreground/10 rounded-lg bg-surface p-5 hover:border-foreground/30 transition-colors"
          >
            <div className="flex justify-between items-baseline">
              <h2 className="text-lg font-semibold">{s.label}</h2>
              <span className="text-sm text-foreground/40">{s.count}</span>
            </div>
            <p className="text-sm text-foreground/50 mt-1">{s.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
