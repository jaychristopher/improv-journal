import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AtomDetail } from "@/components/AtomDetail";
import { getAtomBySlug, getAtomDisplayTitle, getAtomUrl, loadAtoms } from "@/lib/content";
import { atomPageDescription, conceptTitle, ogImages, pageTitle, SITE_NAME } from "@/lib/seo";

// Law + insight atoms live at /how-it-works/{slug}
const VALID_TYPES = ["law", "insight"];

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
  const displayTitle = await getAtomDisplayTitle(atom);
  const desc = atomPageDescription(atom);
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
      images: ogImages(displayTitle, "How It Works"),
    },
  };
}

export default async function SystemAtomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const atom = await getAtomBySlug(slug);
  if (!atom || !VALID_TYPES.includes(atom.frontmatter.type)) notFound();

  return (
    <AtomDetail
      atom={atom}
      description={atomPageDescription(atom)}
      eyebrow="How It Works"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "How It Works", href: "/how-it-works" },
        { label: atom.frontmatter.title },
      ]}
    />
  );
}
