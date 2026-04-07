import { notFound } from "next/navigation";
import { loadAtoms, getAtomBySlug } from "@/lib/content";
import { AtomDetail } from "@/components/AtomDetail";

export async function generateStaticParams() {
  const atoms = await loadAtoms();
  return atoms.filter((a) => a.frontmatter.type === "format").map((a) => ({ slug: a.frontmatter.id }));
}

export default async function FormatDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const atom = await getAtomBySlug(slug);
  if (!atom || atom.frontmatter.type !== "format") notFound();

  return (
    <AtomDetail atom={atom} breadcrumbs={[
      { label: "Home", href: "/" },
      { label: "Practice", href: "/practice" },
      { label: "Formats", href: "/practice/formats" },
      { label: atom.frontmatter.title },
    ]} />
  );
}
