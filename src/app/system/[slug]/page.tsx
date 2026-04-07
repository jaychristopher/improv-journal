import { notFound } from "next/navigation";
import { loadAtoms, getAtomBySlug } from "@/lib/content";
import { AtomDetail } from "@/components/AtomDetail";

// Axiom + insight atoms live at /system/{slug}
const VALID_TYPES = ["axiom", "insight"];

export async function generateStaticParams() {
  const atoms = await loadAtoms();
  return atoms
    .filter((a) => VALID_TYPES.includes(a.frontmatter.type))
    .map((a) => ({ slug: a.frontmatter.id }));
}

export default async function SystemAtomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const atom = await getAtomBySlug(slug);
  if (!atom || !VALID_TYPES.includes(atom.frontmatter.type)) notFound();

  return (
    <AtomDetail
      atom={atom}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "System", href: "/system" },
        { label: atom.frontmatter.title },
      ]}
    />
  );
}
