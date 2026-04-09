import Link from "next/link";
import { loadAtoms, getAtomUrl } from "@/lib/content";

export default async function FormatsPage() {
  const atoms = await loadAtoms();
  const formats = atoms.filter((a) => a.frontmatter.type === "format");

  const longform = formats.filter(
    (a) => a.frontmatter.tags?.includes("longform") && !a.frontmatter.tags?.includes("shortform")
  );
  const shortform = formats.filter(
    (a) => a.frontmatter.tags?.includes("shortform") && !a.frontmatter.tags?.includes("longform")
  );
  const both = formats.filter(
    (a) => a.frontmatter.tags?.includes("shortform") && a.frontmatter.tags?.includes("longform")
  );

  const sections = [
    { label: "Longform", desc: "25-60 minute structures for sustained ensemble work.", items: longform },
    { label: "Shortform", desc: "Quick games and competitive formats — 2-10 minutes each.", items: shortform },
    ...(both.length > 0 ? [{ label: "Both", desc: "Formats that work at any length.", items: both }] : []),
  ];

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <header className="mb-12">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          practice · formats
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">
          Formats ({formats.length})
        </h1>
        <p className="text-foreground/60 mt-2">
          Performance structures — from 2-minute games to 60-minute shows.
          Each demands different skills and reveals different truths about
          what improvisation can be.
        </p>
      </header>

      {sections.map((section) =>
        section.items.length > 0 ? (
          <section key={section.label} className="mb-10">
            <h2 className="text-lg font-semibold mb-1">{section.label}</h2>
            <p className="text-sm text-foreground/40 mb-4">{section.desc}</p>
            <div className="space-y-3">
              {section.items.map((a) => (
                <Link
                  key={a.frontmatter.id}
                  href={getAtomUrl({
                    id: a.frontmatter.id,
                    type: a.frontmatter.type,
                  })}
                  className="block border border-foreground/10 rounded-lg p-4 hover:border-foreground/30 transition-colors"
                >
                  <h3 className="font-medium">{a.frontmatter.title}</h3>
                  <p className="text-xs text-foreground/40 mt-1 line-clamp-2">
                    {a.content
                      .replace(/^---[\s\S]*?---\n*/m, "")
                      .replace(/^#{1,6}\s+.*$/gm, "")
                      .replace(/\*\*[^*]+\*\*/g, "")
                      .trim()
                      .substring(0, 150)}
                    ...
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null
      )}
    </main>
  );
}
