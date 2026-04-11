import Link from "next/link";
import { notFound } from "next/navigation";

import { AtomDetail } from "@/components/AtomDetail";
import { getAtomBySlug, loadAtoms } from "@/lib/content";

/** Canonical order of the 8 principles — loops back to the start */
const PRINCIPLE_ORDER = [
  "be-positive",
  "be-present",
  "be-thankful",
  "be-honest",
  "be-simple",
  "be-brave",
  "be-changeable",
  "be-supportive",
];

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

  const currentIdx = PRINCIPLE_ORDER.indexOf(slug);
  const nextSlug = PRINCIPLE_ORDER[(currentIdx + 1) % PRINCIPLE_ORDER.length];
  const nextAtom = await getAtomBySlug(nextSlug);
  const nextTitle = nextAtom?.frontmatter.title ?? nextSlug;

  const isLast = currentIdx === PRINCIPLE_ORDER.length - 1;

  return (
    <>
      <AtomDetail
        atom={atom}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "How It Works", href: "/how-it-works" },
          { label: "Principles", href: "/how-it-works/principles" },
          { label: atom.frontmatter.title },
        ]}
      />

      {/* Next principle */}
      <div className="mx-auto max-w-5xl px-6 pb-16">
        <Link
          href={`/how-it-works/principles/${nextSlug}`}
          className="group border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-6 transition-colors"
        >
          <span className="text-foreground/40 text-xs tracking-wider uppercase">
            {isLast ? "Back to the beginning" : `Next principle — ${currentIdx + 2} of 8`}
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
