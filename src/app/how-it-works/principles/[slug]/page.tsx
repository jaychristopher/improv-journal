import { notFound } from "next/navigation";

import { AtomDetail } from "@/components/AtomDetail";
import { getAtomBySlug, loadAtoms } from "@/lib/content";

export async function generateStaticParams() {
  const atoms = await loadAtoms();
  return atoms
    .filter((a) => a.frontmatter.type === "principle")
    .map((a) => ({ slug: a.frontmatter.id }));
}

export default async function PrincipleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const atom = await getAtomBySlug(slug);
  if (!atom || atom.frontmatter.type !== "principle") notFound();

  return (
    <AtomDetail
      atom={atom}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "How It Works", href: "/how-it-works" },
        { label: "Principles", href: "/how-it-works/principles" },
        { label: atom.frontmatter.title },
      ]}
    />
  );
}
