import { notFound } from "next/navigation";
import Link from "next/link";
import { loadThreads, getThreadBySlug, getAtomBySlug, getAtomUrl, getAudioUrl, getParentPath } from "@/lib/content";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Breadcrumb } from "@/components/Breadcrumb";

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

  // Find parent path for breadcrumb + prev/next
  const parentPath = await getParentPath(slug);

  // Compute prev/next threads within the parent path
  let prevThread: { id: string; title: string } | null = null;
  let nextThread: { id: string; title: string } | null = null;
  let positionInPath: { current: number; total: number } | null = null;

  if (parentPath) {
    const siblingIds = parentPath.frontmatter.threads ?? [];
    const idx = siblingIds.indexOf(slug);
    if (idx !== -1) {
      positionInPath = { current: idx + 1, total: siblingIds.length };
      if (idx > 0) {
        const prev = await getThreadBySlug(siblingIds[idx - 1]);
        if (prev) prevThread = { id: prev.frontmatter.id, title: prev.frontmatter.title };
      }
      if (idx < siblingIds.length - 1) {
        const next = await getThreadBySlug(siblingIds[idx + 1]);
        if (next) nextThread = { id: next.frontmatter.id, title: next.frontmatter.title };
      }
    }
  }

  // Resolve atom references with URLs
  const atoms = await Promise.all(
    (fm.atoms ?? []).map(async (id) => {
      const atom = await getAtomBySlug(id);
      return atom
        ? { id, title: atom.frontmatter.title, url: getAtomUrl({ id, type: atom.frontmatter.type }), found: true }
        : { id, title: id, url: `/how-it-works/${id}`, found: false };
    })
  );

  const crumbs: { label: string; href?: string }[] = [{ label: "Home", href: "/" }];
  if (parentPath) {
    crumbs.push({
      label: parentPath.frontmatter.title,
      href: `/paths/${parentPath.frontmatter.id}`,
    });
  }
  crumbs.push({ label: fm.title });

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <Breadcrumb crumbs={crumbs} />

      <header className="mb-8">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          thread
          {positionInPath && (
            <> · {positionInPath.current} of {positionInPath.total}</>
          )}
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">{fm.title}</h1>
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
                href={atom.url}
                className="text-sm hover:underline"
              >
                {atom.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Prev/Next within path */}
      {(prevThread || nextThread) && (
        <nav className="mt-8 pt-8 border-t border-foreground/10 flex justify-between items-start">
          <div>
            {prevThread && (
              <Link
                href={`/threads/${prevThread.id}`}
                className="group"
              >
                <span className="text-xs text-foreground/40 group-hover:text-foreground/60">
                  &larr; Previous
                </span>
                <span className="block text-sm font-medium group-hover:underline">
                  {prevThread.title}
                </span>
              </Link>
            )}
          </div>
          <div className="text-right">
            {nextThread && (
              <Link
                href={`/threads/${nextThread.id}`}
                className="group"
              >
                <span className="text-xs text-foreground/40 group-hover:text-foreground/60">
                  Next &rarr;
                </span>
                <span className="block text-sm font-medium group-hover:underline">
                  {nextThread.title}
                </span>
              </Link>
            )}
          </div>
        </nav>
      )}
    </main>
  );
}
