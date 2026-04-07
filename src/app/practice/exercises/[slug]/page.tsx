import { notFound } from "next/navigation";
import { loadAtoms, getAtomBySlug } from "@/lib/content";
import { AtomDetail } from "@/components/AtomDetail";

export async function generateStaticParams() {
  const atoms = await loadAtoms();
  return atoms.filter((a) => a.frontmatter.type === "exercise").map((a) => ({ slug: a.frontmatter.id }));
}

export default async function ExerciseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const atom = await getAtomBySlug(slug);
  if (!atom || atom.frontmatter.type !== "exercise") notFound();

  return (
    <AtomDetail atom={atom} breadcrumbs={[
      { label: "Home", href: "/" },
      { label: "Practice", href: "/practice" },
      { label: "Exercises", href: "/practice/exercises" },
      { label: atom.frontmatter.title },
    ]} />
  );
}
