import { notFound } from "next/navigation";
import Link from "next/link";
import { loadAtoms } from "@/lib/content";

const CONCEPT_TYPES: Record<
  string,
  { title: string; singular: string; description: string }
> = {
  principles: {
    title: "The 8 Principles of Improv",
    singular: "principle",
    description:
      "The behavioral guidelines — the \"North Stars\" that prevent shared reality from collapsing. Not moral rules. Structural commands derived from the physics of real-time human interaction.",
  },
  techniques: {
    title: "Techniques",
    singular: "technique",
    description:
      "The specific moves — how to listen, initiate, edit, support, heighten, and recover. Each technique is a learnable behavior that serves the principles.",
  },
  exercises: {
    title: "Exercises",
    singular: "exercise",
    description:
      "The training vehicles — structured activities that build specific skills. Each exercise trains one or more techniques through constraints that make the skill unavoidable.",
  },
  formats: {
    title: "Longform Formats",
    singular: "format",
    description:
      "The performance structures — Harold, Montage, Armando, La Ronde, and beyond. Each format demands different skills and reveals different truths about what improvisation can be.",
  },
  axioms: {
    title: "The 6 Axioms",
    singular: "axiom",
    description:
      "The physics underneath — the constraints that govern every real-time human interaction. Irreversibility, bandwidth, fragility, signaling, relational meaning, and interdependence.",
  },
  definitions: {
    title: "Definitions",
    singular: "definition",
    description:
      "The vocabulary — the foundational concepts that name what's happening in scenes, shows, and conversations. The shared language that makes diagnosis possible.",
  },
  antipatterns: {
    title: "Antipatterns",
    singular: "antipattern",
    description:
      "The failure modes — named patterns of behavior that break scenes. Not moral judgments but diagnostic labels. You can't fix what you can't name.",
  },
  patterns: {
    title: "Patterns",
    singular: "pattern",
    description:
      "The emergent dynamics — heightening, discovery, callback, and the system-level indicators that tell you whether the shared reality is healthy or collapsing.",
  },
};

const VALID_TYPES = Object.keys(CONCEPT_TYPES);

export async function generateStaticParams() {
  return VALID_TYPES.map((type) => ({ type }));
}

export default async function ConceptTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  if (!VALID_TYPES.includes(type)) notFound();

  const config = CONCEPT_TYPES[type];
  const atoms = await loadAtoms();

  // Filter atoms by type (singular form matches the atom's type field)
  const typeAtoms = atoms.filter(
    (a) => a.frontmatter.type === config.singular
  );

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <Link
        href="/"
        className="text-sm text-foreground/40 hover:text-foreground/60 mb-8 block"
      >
        &larr; Home
      </Link>

      <header className="mb-12">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          concepts · {type}
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">
          {config.title}
        </h1>
        <p className="text-foreground/60 mt-2 text-sm">
          {config.description}
        </p>
        <p className="text-xs text-foreground/40 mt-2">
          {typeAtoms.length} concepts
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {typeAtoms.map((a) => (
          <Link
            key={a.frontmatter.id}
            href={`/atoms/${a.frontmatter.id}`}
            className="border border-foreground/10 rounded-lg p-4 hover:border-foreground/30 transition-colors"
          >
            <h3 className="font-medium text-sm">{a.frontmatter.title}</h3>
            <p className="text-xs text-foreground/40 mt-1 line-clamp-2">
              {a.content
                .replace(/^---[\s\S]*?---\n*/m, "")
                .replace(/^#{1,6}\s+.*$/gm, "")
                .replace(/\*\*[^*]+\*\*/g, "")
                .replace(/\[[^\]]+\]/g, "")
                .trim()
                .substring(0, 120)}
              ...
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
