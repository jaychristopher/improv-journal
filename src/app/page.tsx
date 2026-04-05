import Link from "next/link";
import {
  loadPaths,
  loadAtoms,
  loadThreads,
  loadSources,
  loadBridges,
} from "@/lib/content";

const AUDIENCE_LABELS: Record<string, { label: string; desc: string }> = {
  beginner: { label: "I'm just starting", desc: "Foundations, first principles, and the physics of connection" },
  intermediate: { label: "I'm stuck at a plateau", desc: "Self-coaching, diagnostics, and how to break through" },
  teacher: { label: "I teach or want to teach", desc: "Curriculum, feedback, side-coaching, and the WHY layer" },
  performer: { label: "I want to level up", desc: "Formats, advanced game, character mastery, and ensemble craft" },
  advanced: { label: "I research or write about improv", desc: "Cross-referenced, multi-tradition analysis" },
};

export default async function Home() {
  const [sources, paths, atoms, threads, bridges] = await Promise.all([
    loadSources(),
    loadPaths(),
    loadAtoms(),
    loadThreads(),
    loadBridges(),
  ]);

  // Group paths by audience
  const pathsByAudience: Record<string, typeof paths> = {};
  for (const p of paths) {
    for (const aud of p.frontmatter.audience ?? []) {
      if (!pathsByAudience[aud]) pathsByAudience[aud] = [];
      pathsByAudience[aud].push(p);
    }
  }

  // Group atoms by type
  const atomTypes = new Map<string, number>();
  for (const a of atoms) {
    const t = a.frontmatter.type;
    atomTypes.set(t, (atomTypes.get(t) ?? 0) + 1);
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <header className="mb-16">
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          The Physics of Improvisation
        </h1>
        <p className="text-lg text-foreground/60">
          A knowledge graph for the art of human connection — discovered on the
          improv stage, applicable everywhere.
        </p>
        <p className="text-sm text-foreground/40 mt-2">
          {atoms.length} concepts · {threads.length} threads ·{" "}
          {paths.length} paths · {bridges.length} guides
        </p>
      </header>

      {/* ── Guides: The Front Doors ─────────────────────────────── */}
      {bridges.length > 0 && (
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-2">
            Not sure where to start?
          </h2>
          <p className="text-foreground/60 mb-6 text-sm">
            These guides apply improv's discoveries to problems you already
            have. No stage required.
          </p>
          <div className="space-y-3">
            {bridges.map((b) => (
              <Link
                key={b.slug}
                href={`/guides/${b.slug}`}
                className="block border border-foreground/10 rounded-lg p-5 hover:border-foreground/30 transition-colors"
              >
                <h3 className="font-semibold mb-1">
                  {b.frontmatter.title}
                </h3>
                <p className="text-sm text-foreground/60">
                  {b.frontmatter.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Audience Selector ───────────────────────────────────── */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-2">I do improv</h2>
        <p className="text-foreground/60 mb-6 text-sm">
          Pick your level. Each path is a curated journey through the knowledge
          graph.
        </p>
        <div className="space-y-4">
          {Object.entries(AUDIENCE_LABELS).map(([aud, { label, desc }]) => {
            const audiencePaths = pathsByAudience[aud] ?? [];
            if (audiencePaths.length === 0) return null;
            return (
              <div
                key={aud}
                className="border border-foreground/10 rounded-lg p-5"
              >
                <h3 className="font-semibold">{label}</h3>
                <p className="text-xs text-foreground/40 mb-3">{desc}</p>
                <div className="space-y-2">
                  {audiencePaths.map((p) => (
                    <Link
                      key={p.frontmatter.id}
                      href={`/paths/${p.frontmatter.id}`}
                      className="block text-sm hover:underline"
                    >
                      {p.frontmatter.title}
                      <span className="text-foreground/40 ml-2">
                        {p.frontmatter.threads?.length ?? 0} threads
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Explore by Concept Type ─────────────────────────────── */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-2">Explore by concept</h2>
        <p className="text-foreground/60 mb-6 text-sm">
          {atoms.length} concepts across {atomTypes.size} types.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from(atomTypes.entries())
            .sort((a, b) => b[1] - a[1])
            .filter(([type]) => type !== "reference")
            .map(([type, count]) => (
              <div
                key={type}
                className="border border-foreground/10 rounded-lg p-4 text-center"
              >
                <span className="text-2xl font-bold">{count}</span>
                <span className="block text-xs text-foreground/40 mt-1 capitalize">
                  {type}s
                </span>
              </div>
            ))}
        </div>
      </section>

      {/* ── Threads ─────────────────────────────────────────────── */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-2">Threads</h2>
        <p className="text-foreground/60 mb-6 text-sm">
          Concepts woven into full thoughts.
        </p>
        <div className="space-y-3">
          {threads.map((t) => (
            <Link
              key={t.frontmatter.id}
              href={`/threads/${t.frontmatter.id}`}
              className="block border border-foreground/10 rounded-lg p-4 hover:border-foreground/30 transition-colors"
            >
              <h3 className="font-medium">{t.frontmatter.title}</h3>
              <span className="text-xs text-foreground/40">
                {t.frontmatter.atoms?.length ?? 0} atoms
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── All Atoms ───────────────────────────────────────────── */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-2">All concepts</h2>
        <p className="text-foreground/60 mb-6 text-sm">
          The primitives — smallest meaningful units of improv knowledge.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {atoms
            .filter((a) => a.frontmatter.type !== "reference")
            .map((a) => (
              <Link
                key={a.frontmatter.id}
                href={`/atoms/${a.frontmatter.id}`}
                className="border border-foreground/10 rounded-lg p-4 hover:border-foreground/30 transition-colors"
              >
                <h3 className="font-medium text-sm">
                  {a.frontmatter.title}
                </h3>
                <span className="text-xs text-foreground/40">
                  {a.frontmatter.type}
                </span>
              </Link>
            ))}
        </div>
      </section>

      {/* ── Sources ─────────────────────────────────────────────── */}
      {sources.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-2">Sources</h2>
          <p className="text-foreground/60 mb-6 text-sm">
            Raw material from which knowledge was extracted.
          </p>
          <div className="space-y-3">
            {sources.map((s) => (
              <Link
                key={s.frontmatter.id}
                href={`/sources/${s.frontmatter.id}`}
                className="block border border-foreground/10 rounded-lg p-4 hover:border-foreground/30 transition-colors"
              >
                <h3 className="font-medium">{s.frontmatter.title}</h3>
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-foreground/40">
                    {s.frontmatter.type}
                  </span>
                  <span className="text-xs text-foreground/40">
                    {s.frontmatter.atoms_extracted?.length ?? 0} atoms
                    extracted
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
