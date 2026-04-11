import { notFound } from "next/navigation";

import { AtomDetail } from "@/components/AtomDetail";
import { getAtomBySlug, loadAtoms } from "@/lib/content";

// Law + insight atoms live at /how-it-works/{slug}
const VALID_TYPES = ["law", "insight"];

export async function generateStaticParams() {
  const atoms = await loadAtoms();
  return atoms
    .filter((a) => VALID_TYPES.includes(a.frontmatter.type))
    .map((a) => ({ slug: a.frontmatter.id }));
}

export default async function SystemAtomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const atom = await getAtomBySlug(slug);
  if (!atom || !VALID_TYPES.includes(atom.frontmatter.type)) notFound();

  return (
    <AtomDetail
      atom={atom}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "How It Works", href: "/how-it-works" },
        { label: atom.frontmatter.title },
      ]}
    />
  );
}
