import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AtomDetail } from "@/components/AtomDetail";
import { getAtomBySlug, getAtomDisplayTitle, getAtomUrl, loadAtoms } from "@/lib/content";
import { principleSequence } from "@/lib/principle-order";
import { atomPageDescription, conceptTitle, ogImages, pageTitle, SITE_NAME } from "@/lib/seo";

/**
 * The next/previous loop walks the same dependency order the principles hub
 * lists — be present first, framing apart. This file used to carry its own
 * hand-written teaching order beginning at be-positive, so a reader who took
 * the hub's advice and pressed "Next principle" from be-present was sent to
 * the hub's sixth (tracker entry 207). One module, `principle-order.ts`,
 * now serves the hub, this pager and the podcast season; a principle it
 * does not name is still appended before framing, so the loop reaches every
 * principle and the "N of 9" label counts the corpus rather than the list.
 */
async function getPrincipleOrder(): Promise<string[]> {
  return principleSequence(await loadAtoms());
}

export async function generateStaticParams() {
  const atoms = await loadAtoms();
  return atoms
    .filter((a) => a.frontmatter.type === "principle")
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
  // One qualified title for the title tag and the share card alike. The card
  // used to carry the bare H1 ("Commitment"), so a share dropped the one word
  // that says what kind of thing it is (tracker entry 235).
  const title = conceptTitle(displayTitle, atom.frontmatter.type);
  const desc = atomPageDescription(atom);
  const url = getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type });
  return {
    title: pageTitle(title),
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      siteName: SITE_NAME,
      locale: "en_US",
      title,
      description: desc,
      url,
      type: "article",
      images: ogImages(displayTitle, "Principle"),
    },
  };
}

export default async function PrincipleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const atom = await getAtomBySlug(slug);
  if (!atom || atom.frontmatter.type !== "principle") notFound();

  const order = await getPrincipleOrder();
  const currentIdx = order.indexOf(slug);
  const nextSlug = order[(currentIdx + 1) % order.length];
  const nextAtom = await getAtomBySlug(nextSlug);
  const nextTitle = nextAtom?.frontmatter.title ?? nextSlug;

  const isLast = currentIdx === order.length - 1;

  return (
    <>
      <AtomDetail
        atom={atom}
        description={atomPageDescription(atom)}
        eyebrow="Principle"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "How It Works", href: "/how-it-works" },
          { label: "Principles", href: "/how-it-works/principles" },
          { label: atom.frontmatter.title },
        ]}
      />

      {/* Next principle */}
      <div className="mx-auto max-w-5xl px-6 pb-16" data-track="next-principle" data-derived="true">
        <Link
          href={`/how-it-works/principles/${nextSlug}`}
          className="group border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-6 transition-colors"
        >
          <span className="text-foreground/40 text-xs tracking-wider uppercase">
            {isLast
              ? "Back to the beginning"
              : `Next principle — ${currentIdx + 2} of ${order.length}`}
          </span>
          <div className="mt-1 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{nextTitle}</h2>
            <span className="text-foreground/30 transition-transform group-hover:translate-x-1">
              &rarr;
            </span>
          </div>
        </Link>
      </div>
    </>
  );
}
