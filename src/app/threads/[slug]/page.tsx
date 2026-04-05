import { notFound } from "next/navigation";
import Link from "next/link";
import { loadThreads, getThreadBySlug, getAtomBySlug, getAudioUrl } from "@/lib/content";
import { AudioPlayer } from "@/components/AudioPlayer";

export async function generateStaticParams() {
  const threads = await loadThreads();
  return threads.map((t) => ({ slug: t.frontmatter.id }));
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const thread = await getThreadBySlug(slug);
  if (!thread) notFound();

  const fm = thread.frontmatter;
  const audioUrl = getAudioUrl("threads", slug);

  // Resolve atom references
  const atoms = await Promise.all(
    (fm.atoms ?? []).map(async (id) => {
      const atom = await getAtomBySlug(id);
      return atom ? { id, title: atom.frontmatter.title, found: true } : { id, title: id, found: false };
    })
  );

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <Link
        href="/"
        className="text-sm text-foreground/40 hover:text-foreground/60 mb-8 block"
      >
        &larr; Back
      </Link>

      <header className="mb-8">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          thread
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">{fm.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {fm.tags?.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-foreground/5 text-foreground/50"
            >
              {tag}
            </span>
          ))}
        </div>
        <span className="text-xs text-foreground/30 mt-2 block">
          Status: {fm.status}
        </span>
      </header>

      {audioUrl && <AudioPlayer src={audioUrl} />}

      <article
        className="prose prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: thread.html }}
      />

      <nav className="mt-12 pt-8 border-t border-foreground/10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/40 mb-4">
          Composed from
        </h2>
        <ul className="space-y-2">
          {atoms.map((atom) => (
            <li key={atom.id}>
              <Link
                href={`/atoms/${atom.id}`}
                className="text-sm hover:underline"
              >
                {atom.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
