import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AtomDetail } from "@/components/AtomDetail";
import { DefinedTermJsonLd } from "@/components/DefinedTermJsonLd";
import { getAtomBySlug, getAtomUrl, loadAtoms } from "@/lib/content";
import { GLOSSARY_URL, leadParagraph } from "@/lib/glossary";
import { atomDescription, extractDescription, pageTitle } from "@/lib/seo";

export async function generateStaticParams() {
  const atoms = await loadAtoms();
  return atoms
    .filter((a) => a.frontmatter.type === "definition")
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
    title: pageTitle(atom.frontmatter.title),
    description: desc,
    alternates: { canonical: url },
    openGraph: { title: atom.frontmatter.title, description: desc, url, type: "article" },
  };
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
    <>
      <DefinedTermJsonLd
        term={{
          id: atom.frontmatter.id,
          term: atom.frontmatter.title,
          url: getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type }),
          definition: leadParagraph(atom.content),
        }}
      />
      <AtomDetail
        atom={atom}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Practice", href: "/practice" },
          { label: "Vocabulary", href: GLOSSARY_URL },
          { label: atom.frontmatter.title },
        ]}
      />
    </>
  );
}
