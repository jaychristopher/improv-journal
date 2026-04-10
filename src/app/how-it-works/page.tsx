import Link from "next/link";
import { loadAtoms, getAtomUrl } from "@/lib/content";
import { Breadcrumb } from "@/components/Breadcrumb";

export default async function SystemPage() {
  const atoms = await loadAtoms();
  const axioms = atoms.filter((a) => a.frontmatter.type === "axiom");
  const insights = atoms.filter((a) => a.frontmatter.type === "insight");
  const principles = atoms.filter((a) => a.frontmatter.type === "principle");

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <Breadcrumb
        crumbs={[{ label: "Home", href: "/" }, { label: "How It Works" }]}
      />

      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight">
          Why Conversations Work (or Don't)
        </h1>
        <p className="text-foreground/60 mt-2">
          There are six reasons every conversation is hard — and eight things
          you can do about it. Improv performers figured this out by doing it
          live, every night, with no script. Here's what they found.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-2">
          The six reasons it's hard
        </h2>
        <p className="text-sm text-foreground/40 mb-4">
          Every conversation you've ever had operates under these constraints —
          you just don't notice them until something goes wrong.
        </p>
        <div className="space-y-3">
          {axioms.map((a) => (
            <Link
              key={a.frontmatter.id}
              href={getAtomUrl({
                id: a.frontmatter.id,
                type: a.frontmatter.type,
              })}
              className="block border border-foreground/10 rounded-lg bg-surface p-4 hover:border-foreground/30 transition-colors"
            >
              <h3 className="font-medium">{a.frontmatter.title}</h3>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-2">
          <Link href="/how-it-works/principles" className="hover:underline">
            Eight things that help
          </Link>
        </h2>
        <p className="text-sm text-foreground/40 mb-4">
          Behavioral guidelines discovered through decades of improv practice.
          Not rules — things that consistently make connection work better.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {principles.map((a) => (
            <Link
              key={a.frontmatter.id}
              href={getAtomUrl({
                id: a.frontmatter.id,
                type: a.frontmatter.type,
              })}
              className="border border-foreground/10 rounded-lg bg-surface p-3 hover:border-foreground/30 transition-colors"
            >
              <span className="text-sm font-medium">
                {a.frontmatter.title}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-2">
          <Link href="/how-it-works/diagnosis" className="hover:underline">
            When it goes wrong
          </Link>
        </h2>
        <p className="text-sm text-foreground/40 mb-4">
          Conversations fail in predictable ways. Once you can name the
          pattern, you can fix it.
        </p>
        <Link
          href="/how-it-works/diagnosis"
          className="text-sm hover:underline text-foreground/60"
        >
          See the failure patterns &rarr;
        </Link>
      </section>

      {insights.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Bigger picture</h2>
          <p className="text-sm text-foreground/40 mb-4">
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
                className="block border border-foreground/10 rounded-lg bg-surface p-4 hover:border-foreground/30 transition-colors"
              >
                <h3 className="font-medium">{a.frontmatter.title}</h3>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
