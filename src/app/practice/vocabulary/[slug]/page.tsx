import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AtomDetail } from "@/components/AtomDetail";
import { getAtomBySlug, getAtomDisplayTitle, getAtomUrl, loadAtoms } from "@/lib/content";
import { GLOSSARY_URL } from "@/lib/glossary";
import {
  atomDescription,
  conceptTitle,
  extractDescription,
  ogImages,
  pageTitle,
  SITE_NAME,
} from "@/lib/seo";

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
  const displayTitle = await getAtomDisplayTitle(atom);
  const desc = atomDescription(
    atom.frontmatter.title,
    atom.frontmatter.type,
    extractDescription(atom.content),
  );
  const url = getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type });
  return {
    title: pageTitle(conceptTitle(displayTitle, atom.frontmatter.type)),
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      siteName: SITE_NAME,
      locale: "en_US",
      title: displayTitle,
      description: desc,
      url,
      type: "article",
      images: ogImages(displayTitle, "Glossary"),
    },
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
