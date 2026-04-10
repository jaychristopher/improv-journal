import Link from "next/link";
import { loadPaths, loadBridges, getAudioUrl } from "@/lib/content";

export default async function Home() {
  const [paths, bridges] = await Promise.all([loadPaths(), loadBridges()]);

  const featuredBridge =
    bridges.find((b) => b.slug === "how-to-stop-overthinking") ?? bridges[0];
  const featuredAudio = featuredBridge
    ? getAudioUrl("bridges", featuredBridge.slug)
    : null;

  const beginnerPaths = paths.filter((p) =>
    p.frontmatter.audience?.includes("beginner")
  );

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <header className="mb-16">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          What makes some conversations magic and others fall flat?
        </h1>
        <p className="text-lg text-foreground/60">
          There are real reasons — and they're learnable. Improv performers
          have been studying them on stage for 60 years. This is what they
          found.
        </p>
      </header>

      {/* ── Three Doors ───────────────────────────────────────────── */}
      <section className="mb-16 space-y-4">
        <Link
          href="/how-it-works"
          className="block border border-foreground/10 rounded-lg p-6 hover:border-foreground/30 transition-colors"
        >
          <h2 className="text-xl font-semibold">
            Why conversations work (or don't)
          </h2>
          <p className="text-sm text-foreground/50 mt-1">
            The hidden forces behind every interaction — why some click and
            others die, and what you can do about it.
          </p>
        </Link>

        <Link
          href="/practice"
          className="block border border-foreground/10 rounded-lg p-6 hover:border-foreground/30 transition-colors"
        >
          <h2 className="text-xl font-semibold">Try something tonight</h2>
          <p className="text-sm text-foreground/50 mt-1">
            Exercises you can do with a partner, techniques for better scenes,
            and formats for shows.
          </p>
        </Link>

        <Link
          href="#guides"
          className="block border border-foreground/10 rounded-lg p-6 hover:border-foreground/30 transition-colors"
        >
          <h2 className="text-xl font-semibold">
            Solve a specific problem
          </h2>
          <p className="text-sm text-foreground/50 mt-1">
            Guides for overthinking, stage fright, team dynamics, giving
            feedback, and more. No stage required.
          </p>
        </Link>
      </section>

      {/* ── Guides ────────────────────────────────────────────────── */}
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

      {/* ── Paths ─────────────────────────────────────────────────── */}
      <section className="mb-16">
        <div className="flex justify-between items-baseline mb-4">
          <h2 className="text-lg font-semibold">Start learning</h2>
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

      {/* ── Traditions ────────────────────────────────────────────── */}
      <section>
        <div className="flex justify-between items-baseline mb-4">
          <h2 className="text-lg font-semibold">Five schools of thought</h2>
          <Link
            href="/traditions"
            className="text-sm text-foreground/40 hover:text-foreground/60"
          >
            Compare &rarr;
          </Link>
        </div>
        <p className="text-sm text-foreground/50 mb-3">
          Improv isn't one thing. Johnstone, Spolin, Close, UCB, and Annoyance
          each have their own philosophy — and they disagree on fundamental
          questions.
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
