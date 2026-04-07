import Link from "next/link";
import { loadBridges, loadPaths, loadThreads, loadAtoms, getAudioUrl, getAtomUrl } from "@/lib/content";

interface Episode {
  title: string;
  href: string;
  audioUrl: string;
  category: string;
}

export default async function ListenPage() {
  const [bridges, paths, threads, atoms] = await Promise.all([
    loadBridges(),
    loadPaths(),
    loadThreads(),
    loadAtoms(),
  ]);

  const episodes: Episode[] = [];

  // Bridge episodes
  for (const b of bridges) {
    const audio = getAudioUrl("bridges", b.slug);
    if (audio) {
      episodes.push({ title: b.frontmatter.title, href: `/${b.slug}`, audioUrl: audio, category: "Guides" });
    }
  }

  // Path episodes
  for (const p of paths) {
    const audio = getAudioUrl("paths", p.frontmatter.id);
    if (audio) {
      episodes.push({ title: p.frontmatter.title, href: `/paths/${p.frontmatter.id}`, audioUrl: audio, category: "Paths" });
    }
  }

  // Thread episodes
  for (const t of threads) {
    const audio = getAudioUrl("threads", t.frontmatter.id);
    if (audio) {
      episodes.push({ title: t.frontmatter.title, href: `/threads/${t.frontmatter.id}`, audioUrl: audio, category: "Threads" });
    }
  }

  // Atom episodes (principles + exercises)
  for (const a of atoms) {
    const audio = getAudioUrl("atoms", a.frontmatter.id);
    if (audio) {
      episodes.push({
        title: a.frontmatter.title,
        href: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
        audioUrl: audio,
        category: a.frontmatter.type === "principle" ? "Principles" : "Exercises",
      });
    }
  }

  // Group by category
  const categories = ["Guides", "Paths", "Threads", "Principles", "Exercises"];
  const grouped = new Map<string, Episode[]>();
  for (const cat of categories) {
    const catEpisodes = episodes.filter((e) => e.category === cat);
    if (catEpisodes.length > 0) grouped.set(cat, catEpisodes);
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <header className="mb-12">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          podcast
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Listen</h1>
        <p className="text-foreground/60 mt-2">
          {episodes.length} two-host conversations exploring the physics of
          human connection. Chris asks the questions; Sarah has the framework.
        </p>
      </header>

      {Array.from(grouped.entries()).map(([category, eps]) => (
        <section key={category} className="mb-12">
          <h2 className="text-lg font-semibold mb-4">
            {category}{" "}
            <span className="text-foreground/40 font-normal">
              ({eps.length})
            </span>
          </h2>
          <div className="space-y-4">
            {eps.map((ep) => (
              <div
                key={ep.href}
                className="border border-foreground/10 rounded-lg p-4"
              >
                <Link
                  href={ep.href}
                  className="font-medium text-sm hover:underline"
                >
                  {ep.title}
                </Link>
                <audio
                  controls
                  preload="none"
                  className="w-full mt-2"
                >
                  <source src={ep.audioUrl} type="audio/mpeg" />
                </audio>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
