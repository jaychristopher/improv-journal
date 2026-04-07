import { notFound } from "next/navigation";
import { loadAtoms, getAtomBySlug } from "@/lib/content";
import { AtomDetail } from "@/components/AtomDetail";

const VALID_TYPES = ["technique", "pedagogy"];

export async function generateStaticParams() {
  const atoms = await loadAtoms();
  return atoms.filter((a) => VALID_TYPES.includes(a.frontmatter.type)).map((a) => ({ slug: a.frontmatter.id }));
}

export default async function TechniqueDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const atom = await getAtomBySlug(slug);
  if (!atom || !VALID_TYPES.includes(atom.frontmatter.type)) notFound();

  return (
    <AtomDetail atom={atom} breadcrumbs={[
      { label: "Home", href: "/" },
      { label: "Practice", href: "/practice" },
      { label: "Techniques", href: "/practice/techniques" },
      { label: atom.frontmatter.title },
    ]} />
  );
}
