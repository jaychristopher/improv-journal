import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { getAtomUrl, loadAtoms } from "@/lib/content";

export const metadata: Metadata = {
  title: "Why Conversations Work (or Don't)",
  description:
    "Six reasons every conversation is hard — and eight things you can do about it. Discovered by improv performers doing it live, every night, with no script.",
  alternates: { canonical: "/how-it-works" },
};

export default async function SystemPage() {
  const atoms = await loadAtoms();
  const laws = atoms.filter((a) => a.frontmatter.type === "law");
  const insights = atoms.filter((a) => a.frontmatter.type === "insight");
  const principles = atoms.filter((a) => a.frontmatter.type === "principle");

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "How It Works" }]} />

      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight">
          Why Conversations Work (or Don&apos;t)
        </h1>
        <p className="text-foreground/60 mt-2">
          There are six reasons every conversation is hard — and eight things you can do about it.
          Improv performers figured this out by doing it live, every night, with no script.
          Here&apos;s what they found.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="mb-2 text-lg font-semibold">The six reasons it&apos;s hard</h2>
        <p className="text-foreground/40 mb-4 text-sm">
          Every conversation you&apos;ve ever had operates under these constraints — you just
          don&apos;t notice them until something goes wrong.
        </p>
        <div className="space-y-3">
          {laws.map((a) => (
            <Link
              key={a.frontmatter.id}
              href={getAtomUrl({
                id: a.frontmatter.id,
                type: a.frontmatter.type,
              })}
              className="group border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-4 transition-colors"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{a.frontmatter.title}</h3>
                <span className="text-foreground/30 transition-transform group-hover:translate-x-0.5">
                  &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-2 text-lg font-semibold">
          <Link href="/how-it-works/principles" className="hover:underline">
            Eight things that help
          </Link>
        </h2>
        <p className="text-foreground/40 mb-4 text-sm">
          Behavioral guidelines discovered through decades of improv practice. Not rules — things
          that consistently make connection work better.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {principles.map((a) => (
            <Link
              key={a.frontmatter.id}
              href={getAtomUrl({
                id: a.frontmatter.id,
                type: a.frontmatter.type,
              })}
              className="group border-foreground/10 bg-surface hover:border-foreground/30 rounded-lg border p-3 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{a.frontmatter.title}</span>
                <span className="text-foreground/30 transition-transform group-hover:translate-x-0.5">
                  &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-2 text-lg font-semibold">
          <Link href="/how-it-works/diagnosis" className="hover:underline">
            When it goes wrong
          </Link>
        </h2>
        <p className="text-foreground/40 mb-4 text-sm">
          Conversations fail in predictable ways. Once you can name the pattern, you can fix it.
        </p>
        <Link href="/how-it-works/diagnosis" className="text-foreground/60 text-sm hover:underline">
          See the failure patterns &rarr;
        </Link>
      </section>

      {insights.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Bigger picture</h2>
          <p className="text-foreground/40 mb-4 text-sm">
            Where these ideas lead beyond the stage.
          </p>
          <div className="space-y-3">
            {insights.map((a) => (
              <Link
                key={a.frontmatter.id}
                href={getAtomUrl({
                  id: a.frontmatter.id,
                  type: a.frontmatter.type,
                })}
                className="group border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-4 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{a.frontmatter.title}</h3>
                  <span className="text-foreground/30 transition-transform group-hover:translate-x-0.5">
                    &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
