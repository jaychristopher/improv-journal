import { notFound } from "next/navigation";

import { AtomDetail } from "@/components/AtomDetail";
import { getAtomBySlug, loadAtoms } from "@/lib/content";

export async function generateStaticParams() {
  const atoms = await loadAtoms();
  return atoms
    .filter((a) => a.frontmatter.type === "definition")
    .map((a) => ({ slug: a.frontmatter.id }));
}

export default async function VocabularyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const atom = await getAtomBySlug(slug);
  if (!atom || atom.frontmatter.type !== "definition") notFound();

  return (
    <AtomDetail
      atom={atom}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Practice", href: "/practice" },
        { label: "Vocabulary", href: "/practice/vocabulary" },
        { label: atom.frontmatter.title },
      ]}
    />
  );
}
