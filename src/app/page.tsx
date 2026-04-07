import Link from "next/link";
import { loadPaths, loadBridges, getAudioUrl } from "@/lib/content";

export default async function Home() {
  const [paths, bridges] = await Promise.all([loadPaths(), loadBridges()]);

  // Curate the featured episode — pick "how-to-stop-overthinking" (highest search volume)
  const featuredBridge =
    bridges.find((b) => b.slug === "how-to-stop-overthinking") ?? bridges[0];
  const featuredAudio = featuredBridge
    ? getAudioUrl("bridges", featuredBridge.slug)
    : null;

  // Group paths by audience for cleaner display
  const beginnerPaths = paths.filter((p) =>
    p.frontmatter.audience?.includes("beginner")
  );
  const advancedPaths = paths.filter(
    (p) =>
      !p.frontmatter.audience?.includes("beginner") ||
      p.frontmatter.audience?.some((a) =>
        ["intermediate", "teacher", "performer", "advanced"].includes(a)
      )
  );

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <header className="mb-16">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Every conversation you've ever had runs on the same physics.
        </h1>
        <p className="text-lg text-foreground/60">
          Six constraints. Eight principles. Discovered on the improv stage.
          Applicable everywhere.
        </p>
      </header>

      {/* ── Three Doors (equal weight) ────────────────────────────── */}
      <section className="mb-16 space-y-4">
        <Link
          href="/system"
          className="block border border-foreground/10 rounded-lg p-6 hover:border-foreground/30 transition-colors"
        >
          <h2 className="text-xl font-semibold">Understand the system</h2>
          <p className="text-sm text-foreground/50 mt-1">
            The physics underneath — axioms, principles, and what happens when
            it breaks.
          </p>
        </Link>

        <Link
          href="/practice"
          className="block border border-foreground/10 rounded-lg p-6 hover:border-foreground/30 transition-colors"
        >
          <h2 className="text-xl font-semibold">Practice the craft</h2>
          <p className="text-sm text-foreground/50 mt-1">
            Exercises, techniques, formats, and vocabulary — everything you can
            do.
          </p>
        </Link>

        <Link
          href="#guides"
          className="block border border-foreground/10 rounded-lg p-6 hover:border-foreground/30 transition-colors"
        >
          <h2 className="text-xl font-semibold">Apply it to your life</h2>
          <p className="text-sm text-foreground/50 mt-1">
            Guides for real problems — overthinking, stage fright, team
            dynamics, giving feedback. No stage required.
          </p>
        </Link>
      </section>

      {/* ── Guides (separate section, not nested in a door) ───────── */}
      <section id="guides" className="mb-16">
        <h2 className="text-lg font-semibold mb-4">Guides</h2>
        <div className="space-y-3">
          {bridges.map((b) => (
            <Link
              key={b.slug}
              href={`/${b.slug}`}
              className="block border border-foreground/10 rounded-lg p-4 hover:border-foreground/30 transition-colors"
            >
              <h3 className="font-medium text-sm">
                {b.frontmatter.title}
              </h3>
              <p className="text-xs text-foreground/40 mt-1 line-clamp-1">
                {b.frontmatter.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Listen ────────────────────────────────────────────────── */}
      {featuredBridge && featuredAudio && (
        <section className="mb-16">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="text-lg font-semibold">Listen</h2>
            <Link
              href="/listen"
              className="text-sm text-foreground/40 hover:text-foreground/60"
            >
              All episodes &rarr;
            </Link>
          </div>
          <div className="border border-foreground/10 rounded-lg p-5">
            <Link
              href={`/${featuredBridge.slug}`}
              className="font-medium text-sm hover:underline"
            >
              {featuredBridge.frontmatter.title}
            </Link>
            <p className="text-xs text-foreground/40 mt-1">
              {featuredBridge.frontmatter.description}
            </p>
            <audio controls preload="none" className="w-full mt-3">
              <source src={featuredAudio} type="audio/mpeg" />
            </audio>
          </div>
        </section>
      )}

      {/* ── Paths (grouped, not flat) ─────────────────────────────── */}
      <section className="mb-16">
        <div className="flex justify-between items-baseline mb-4">
          <h2 className="text-lg font-semibold">Learning Paths</h2>
          <Link
            href="/paths"
            className="text-sm text-foreground/40 hover:text-foreground/60"
          >
            All paths &rarr;
          </Link>
        </div>
        <div className="space-y-3">
          {beginnerPaths.slice(0, 3).map((p) => (
            <Link
              key={p.frontmatter.id}
              href={`/paths/${p.frontmatter.id}`}
              className="block border border-foreground/10 rounded-lg p-4 hover:border-foreground/30 transition-colors"
            >
              <h3 className="font-medium text-sm">
                {p.frontmatter.title}
              </h3>
              <p className="text-xs text-foreground/40 mt-1 line-clamp-1">
                {p.frontmatter.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Traditions (with actual value prop) ────────────────────── */}
      <section>
        <div className="flex justify-between items-baseline mb-4">
          <h2 className="text-lg font-semibold">Five Traditions</h2>
          <Link
            href="/traditions"
            className="text-sm text-foreground/40 hover:text-foreground/60"
          >
            Compare &rarr;
          </Link>
        </div>
        <p className="text-sm text-foreground/50 mb-3">
          Johnstone, Spolin, Close, UCB, and Annoyance disagree on fundamental
          questions. Understanding where — and why — is what separates citation
          from knowledge.
        </p>
        <div className="flex gap-2 flex-wrap">
          {["johnstone", "spolin", "close", "ucb", "annoyance"].map((t) => (
            <Link
              key={t}
              href={`/traditions/${t}`}
              className="text-xs px-3 py-1 rounded-full border border-foreground/10 hover:border-foreground/30 transition-colors capitalize"
            >
              {t}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
