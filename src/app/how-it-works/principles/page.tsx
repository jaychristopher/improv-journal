import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { CollectionJsonLd } from "@/components/CollectionJsonLd";
import { getAtomUrl, loadAtoms } from "@/lib/content";
import { leadParagraph, pageTitle, stripLeadLabel } from "@/lib/seo";
import { getSystemCounts } from "@/lib/system-counts";

export async function generateMetadata(): Promise<Metadata> {
  const { principles } = await getSystemCounts();
  return {
    title: pageTitle(`Rules of Improv: ${principles} Principles That Make Connection Work`),
    description:
      "Behavioral guidelines derived from the physics of connection. Not moral rules — structural commands that prevent shared reality from collapsing.",
    alternates: { canonical: "/how-it-works/principles" },
  };
}

export default async function PrinciplesPage() {
  const atoms = await loadAtoms();
  const principles = atoms.filter((a) => a.frontmatter.type === "principle");

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <CollectionJsonLd
        name={`The ${principles.length} Principles of Improv`}
        description="Behavioral guidelines derived from the physics of connection — structural commands that prevent shared reality from collapsing."
        url="/how-it-works/principles"
        partOf="/how-it-works"
        items={principles.map((a) => ({
          name: a.frontmatter.title,
          url: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
          description: leadParagraph(stripLeadLabel(a.content), 180),
        }))}
      />
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "How It Works", href: "/how-it-works" },
          { label: "Principles" },
        ]}
      />
      <header className="mb-12">
        <span className="text-foreground/40 text-xs tracking-wider uppercase">
          system · principles
        </span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          The {principles.length} Principles
        </h1>
        <p className="text-foreground/60 mt-2">
          Behavioral guidelines derived from the physics. Not moral rules — structural commands that
          prevent shared reality from collapsing.
        </p>
      </header>

      <div className="space-y-4">
        {principles.map((a) => (
          <Link
            key={a.frontmatter.id}
            href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })}
            className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-5 transition-colors"
          >
            <h3 className="font-semibold">{a.frontmatter.title}</h3>
            <p className="text-foreground/50 mt-1 line-clamp-2 text-sm">
              {leadParagraph(stripLeadLabel(a.content), 180)}
              ...
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
