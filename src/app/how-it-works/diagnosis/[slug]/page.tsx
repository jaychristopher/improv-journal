import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AtomDetail } from "@/components/AtomDetail";
import { getAtomBySlug, getAtomUrl, loadAtoms } from "@/lib/content";
import { atomDescription, extractDescription } from "@/lib/seo";

const VALID_TYPES = ["antipattern", "pattern", "framework"];

export async function generateStaticParams() {
  const atoms = await loadAtoms();
  return atoms
    .filter((a) => VALID_TYPES.includes(a.frontmatter.type))
    .map((a) => ({ slug: a.frontmatter.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const atom = await getAtomBySlug(slug);
  if (!atom) return {};
  const desc = atomDescription(
    atom.frontmatter.title,
    atom.frontmatter.type,
    extractDescription(atom.content),
  );
  const url = getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type });
  return {
    title: atom.frontmatter.title,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title: atom.frontmatter.title, description: desc, url, type: "article" },
  };
}

export default async function DiagnosisDetailPage({
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
        { label: "How It Works", href: "/how-it-works" },
        { label: "Diagnosis", href: "/how-it-works/diagnosis" },
        { label: atom.frontmatter.title },
      ]}
    />
  );
}
