import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleJsonLd } from "@/components/ArticleJsonLd";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { JourneyProgressBar } from "@/components/JourneyProgressBar";
import { WhatsNext } from "@/components/WhatsNext";
import {
  getAtomBySlug,
  getAtomUrl,
  getAudioUrl,
  getParentPath,
  getThreadBySlug,
  loadThreads,
} from "@/lib/content";
import { getNextPath } from "@/lib/path-progression";
import { extractDescription } from "@/lib/seo";

export async function generateStaticParams() {
  const threads = await loadThreads();
  return threads.map((t) => ({ slug: t.frontmatter.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const thread = await getThreadBySlug(slug);
  if (!thread) return {};
  const desc = extractDescription(thread.content);
  return {
    title: thread.frontmatter.title,
    description: desc,
    alternates: { canonical: `/threads/${slug}` },
    openGraph: {
      title: thread.frontmatter.title,
      description: desc,
      url: `/threads/${slug}`,
      type: "article",
    },
  };
}

export default async function ThreadPage({ params }: { params: Promise<{ slug: string }> }) {
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
  let pathThreads: { id: string; title: string }[] = [];

  if (parentPath) {
    const siblingIds = parentPath.frontmatter.threads ?? [];
    const idx = siblingIds.indexOf(slug);

    // Resolve all thread titles for progress bar
    pathThreads = await Promise.all(
      siblingIds.map(async (id) => {
        const t = await getThreadBySlug(id);
        return { id, title: t?.frontmatter.title ?? id };
      }),
    );

    if (idx !== -1) {
      positionInPath = { current: idx + 1, total: siblingIds.length };
      if (idx > 0) {
        prevThread = pathThreads[idx - 1];
      }
      if (idx < siblingIds.length - 1) {
        nextThread = pathThreads[idx + 1];
      }
    }
  }

  // Resolve atom references with URLs
  const atoms = await Promise.all(
    (fm.atoms ?? []).map(async (id) => {
      const atom = await getAtomBySlug(id);
      return atom
        ? {
            id,
            title: atom.frontmatter.title,
            url: getAtomUrl({ id, type: atom.frontmatter.type }),
            found: true,
          }
        : { id, title: id, url: `/how-it-works/${id}`, found: false };
    }),
  );

  const crumbs: { label: string; href?: string }[] = [{ label: "Home", href: "/" }];
  if (parentPath) {
    crumbs.push({
      label: parentPath.frontmatter.title,
      href: `/paths/${parentPath.frontmatter.id}`,
    });
  }
  crumbs.push({ label: fm.title });

  // What's next after this thread?
  const isLastThread = parentPath && !nextThread;
  const nextPathInfo = isLastThread ? getNextPath(parentPath.frontmatter.id) : null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <ArticleJsonLd
        title={fm.title}
        description={extractDescription(thread.content)}
        url={`/threads/${slug}`}
        datePublished={fm.created}
        dateModified={fm.updated}
      />
      <Breadcrumb crumbs={crumbs} />

      {/* Journey progress bar */}
      {parentPath && positionInPath && (
        <JourneyProgressBar
          pathId={parentPath.frontmatter.id}
          pathTitle={parentPath.frontmatter.title}
          threads={pathThreads}
          currentThreadIndex={positionInPath.current - 1}
        />
      )}

      <header className="mb-8">
        <span className="text-foreground/40 text-xs tracking-wider uppercase">
          thread
          {positionInPath && (
            <>
              {" "}
              · {positionInPath.current} of {positionInPath.total}
            </>
          )}
        </span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{fm.title}</h1>
      </header>

      {audioUrl && <AudioPlayer src={audioUrl} />}

      <article
        className="prose prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: thread.html }}
      />

      <nav className="border-foreground/10 mt-12 border-t pt-8">
        <h2 className="text-foreground/40 mb-4 text-sm font-semibold tracking-wider uppercase">
          Composed from
        </h2>
        <ul className="space-y-2">
          {atoms.map((atom) => (
            <li key={atom.id}>
              <Link href={atom.url} className="text-sm hover:underline">
                {atom.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Prev/Next within path */}
      {(prevThread || nextThread) && (
        <nav className="border-foreground/10 mt-8 flex items-start justify-between border-t pt-8">
          <div>
            {prevThread && (
              <Link href={`/threads/${prevThread.id}`} className="group">
                <span className="text-foreground/40 group-hover:text-foreground/60 text-xs">
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
              <Link href={`/threads/${nextThread.id}`} className="group">
                <span className="text-foreground/40 group-hover:text-foreground/60 text-xs">
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

      {/* What's Next — after the nav */}
      {nextThread && (
        <WhatsNext
          variant="next-thread"
          title={nextThread.title}
          href={`/threads/${nextThread.id}`}
        />
      )}
      {isLastThread && nextPathInfo && (
        <WhatsNext
          variant="path-complete"
          nextPathTitle={nextPathInfo.title}
          nextPathHref={`/paths/${nextPathInfo.id}`}
        />
      )}
    </main>
  );
}
