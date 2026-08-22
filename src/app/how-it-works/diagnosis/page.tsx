import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { CollectionJsonLd } from "@/components/CollectionJsonLd";
import { getAtomUrl, loadAtoms } from "@/lib/content";
import { leadParagraph, pageTitle, stripLeadLabel } from "@/lib/seo";

export const metadata: Metadata = {
  title: pageTitle("When It Breaks: Improv Failure Modes and Recovery"),
  description:
    "Collapse modes, failure patterns, and recovery — the diagnostic vocabulary for naming what went wrong and finding the way back.",
  alternates: { canonical: "/how-it-works/diagnosis" },
};

export default async function DiagnosisPage() {
  const atoms = await loadAtoms();
  const antipatterns = atoms.filter((a) => a.frontmatter.type === "antipattern");
  const patterns = atoms.filter((a) => a.frontmatter.type === "pattern");
  const frameworks = atoms.filter((a) => a.frontmatter.type === "framework");

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <CollectionJsonLd
        name="When It Breaks: Improv Failure Modes and Recovery"
        description="Collapse modes, failure patterns, and recovery — the diagnostic vocabulary for naming what went wrong and finding the way back."
        url="/how-it-works/diagnosis"
        partOf="/how-it-works"
        items={[...frameworks, ...antipatterns, ...patterns].map((a) => ({
          name: a.frontmatter.title,
          url: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
          description: leadParagraph(stripLeadLabel(a.content), 180),
        }))}
      />
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "How It Works", href: "/how-it-works" },
          { label: "Diagnosis" },
        ]}
      />
      <header className="mb-12">
        <span className="text-foreground/40 text-xs tracking-wider uppercase">
          system · diagnosis
        </span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">When It Breaks</h1>
        <p className="text-foreground/60 mt-2">
          Collapse modes, failure patterns, and recovery — the diagnostic vocabulary for naming what
          went wrong and finding the way back.
        </p>
      </header>

      {frameworks.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold">Frameworks</h2>
          <div className="space-y-3">
            {frameworks.map((a) => (
              <div
                key={a.frontmatter.id}
                className="border-foreground/10 bg-surface hover:border-foreground/30 relative rounded-lg border p-4 transition-colors"
              >
                <h3 className="font-medium">
                  <Link
                    href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })}
                    className="after:absolute after:inset-0"
                  >
                    {a.frontmatter.title}
                  </Link>
                </h3>
                <p className="text-foreground/60 mt-1 text-sm">
                  {leadParagraph(stripLeadLabel(a.content), 180)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">Antipatterns ({antipatterns.length})</h2>
        <p className="text-foreground/40 mb-4 text-sm">
          Named failure modes. You can&apos;t fix what you can&apos;t name.
        </p>
        <div className="space-y-3">
          {antipatterns.map((a) => (
            <Link
              key={a.frontmatter.id}
              href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })}
              className="border-foreground/10 bg-surface hover:border-foreground/30 rounded-lg border p-3 transition-colors"
            >
              <span className="block text-sm font-medium">{a.frontmatter.title}</span>
              <span className="text-foreground/60 mt-1 block text-xs">
                {leadParagraph(stripLeadLabel(a.content), 180)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Patterns ({patterns.length})</h2>
        <p className="text-foreground/40 mb-4 text-sm">
          Emergent dynamics — heightening, discovery, recovery.
        </p>
        <div className="space-y-3">
          {patterns.map((a) => (
            <Link
              key={a.frontmatter.id}
              href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })}
              className="border-foreground/10 bg-surface hover:border-foreground/30 rounded-lg border p-3 transition-colors"
            >
              <span className="block text-sm font-medium">{a.frontmatter.title}</span>
              <span className="text-foreground/60 mt-1 block text-xs">
                {leadParagraph(stripLeadLabel(a.content), 180)}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
