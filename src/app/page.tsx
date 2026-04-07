import Link from "next/link";
import { loadPaths, loadAtoms, loadBridges, getAudioUrl } from "@/lib/content";

export default async function Home() {
  const [paths, atoms, bridges] = await Promise.all([
    loadPaths(),
    loadAtoms(),
    loadBridges(),
  ]);

  const nonRefAtoms = atoms.filter((a) => a.frontmatter.type !== "reference");

  // Find a featured episode with audio
  const featuredBridge = bridges.find((b) => getAudioUrl("bridges", b.slug));
  const featuredAudio = featuredBridge
    ? getAudioUrl("bridges", featuredBridge.slug)
    : null;

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <header className="mb-20">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Every conversation you've ever had runs on the same physics.
        </h1>
        <p className="text-lg text-foreground/60">
          Six constraints. Eight principles. Discovered on the improv stage.
          Applicable everywhere. This is the knowledge graph.
        </p>
        <p className="text-sm text-foreground/40 mt-3">
          {nonRefAtoms.length} concepts &middot; {paths.length} learning paths
          &middot; {bridges.length} guides &middot; 65 audio episodes
        </p>
      </header>

      {/* ── Three Doors ───────────────────────────────────────────── */}
      <section className="mb-20 space-y-4">
        <Link
          href="/system"
          className="block border border-foreground/10 rounded-lg p-6 hover:border-foreground/30 transition-colors"
        >
          <h2 className="text-xl font-semibold">Understand the system</h2>
          <p className="text-sm text-foreground/50 mt-1">
            The physics underneath — axioms, principles, and what happens when
            the system breaks. Start here if you want to know WHY.
          </p>
        </Link>

        <Link
          href="/practice"
          className="block border border-foreground/10 rounded-lg p-6 hover:border-foreground/30 transition-colors"
        >
          <h2 className="text-xl font-semibold">Practice the craft</h2>
          <p className="text-sm text-foreground/50 mt-1">
            Exercises, techniques, formats, and vocabulary. Everything you can
            DO — from mirroring to the Harold.
          </p>
        </Link>

        <div className="border border-foreground/10 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-3">
            Apply it to your life
          </h2>
          <p className="text-sm text-foreground/50 mb-4">
            These guides apply improv's discoveries to problems you already
            have. No stage required.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {bridges.map((b) => (
              <Link
                key={b.slug}
                href={`/${b.slug}`}
                className="border border-foreground/10 rounded-lg p-3 hover:border-foreground/30 transition-colors"
              >
                <span className="text-sm font-medium">
                  {b.frontmatter.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Listen ────────────────────────────────────────────────── */}
      {featuredBridge && featuredAudio && (
        <section className="mb-20">
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

      {/* ── Paths ─────────────────────────────────────────────────── */}
      <section className="mb-20">
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
          {paths.map((p) => (
            <Link
              key={p.frontmatter.id}
              href={`/paths/${p.frontmatter.id}`}
              className="block border border-foreground/10 rounded-lg p-4 hover:border-foreground/30 transition-colors"
            >
              <h3 className="font-medium text-sm">
                {p.frontmatter.title}
              </h3>
              <div className="flex gap-2 mt-1">
                {p.frontmatter.audience?.map((a) => (
                  <span
                    key={a}
                    className="text-xs px-2 py-0.5 rounded-full bg-foreground/5 text-foreground/40"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Traditions ────────────────────────────────────────────── */}
      <section>
        <div className="flex justify-between items-baseline mb-4">
          <h2 className="text-lg font-semibold">Five Traditions</h2>
          <Link
            href="/traditions"
            className="text-sm text-foreground/40 hover:text-foreground/60"
          >
            Compare traditions &rarr;
          </Link>
        </div>
        <p className="text-sm text-foreground/50">
          Johnstone &middot; Spolin &middot; Close &middot; UCB &middot;
          Annoyance — where they agree, where they disagree, and why it matters.
        </p>
      </section>
    </main>
  );
}
