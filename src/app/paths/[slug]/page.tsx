import Link from "next/link";
import { notFound } from "next/navigation";

import { AudioPlayer } from "@/components/AudioPlayer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { SyllabusCheckmark, SyllabusProgress } from "@/components/SyllabusProgress";
import { WhatsNext } from "@/components/WhatsNext";
import {
  getAudioUrl,
  getPathBySlug,
  getPathTotalDuration,
  getThreadBySlug,
  getThreadDuration,
  loadPaths,
} from "@/lib/content";
import { getNextPath } from "@/lib/path-progression";

export async function generateStaticParams() {
  const paths = await loadPaths();
  return paths.map((p) => ({ slug: p.frontmatter.id }));
}

export default async function PathPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pathData = await getPathBySlug(slug);
  if (!pathData) notFound();

  const fm = pathData.frontmatter;
  const audioUrl = getAudioUrl("paths", slug);
  const threadIds = fm.threads ?? [];

  // Resolve thread references with durations
  const threads = await Promise.all(
    threadIds.map(async (id) => {
      const thread = await getThreadBySlug(id);
      const duration = getThreadDuration(id);
      // Extract first paragraph for description
      const desc = thread
        ? (thread.content
            .replace(/^---[\s\S]*?---\n*/m, "")
            .replace(/^#{1,6}\s+.*$/gm, "")
            .replace(/\*\*[^*]+\*\*/g, "")
            .trim()
            .split(/\n\n/)[0]
            ?.substring(0, 200) ?? "")
        : "";
      return thread
        ? { id, title: thread.frontmatter.title, desc, duration, found: true }
        : { id, title: id, desc: "", duration: null, found: false };
    }),
  );

  const totalDuration = getPathTotalDuration(threadIds);
  const firstAudience = fm.audience?.[0] ?? "beginner";
  const nextPath = getNextPath(slug);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Learn", href: `/learn/${firstAudience}` },
          { label: fm.title },
        ]}
      />

      <header className="mb-8">
        <span className="text-foreground/40 text-xs tracking-wider uppercase">path</span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{fm.title}</h1>
        <p className="text-foreground/60 mt-2">{fm.description}</p>
        <div className="mt-3 flex items-center gap-3">
          {fm.audience?.map((a) => (
            <span
              key={a}
              className="bg-foreground/5 text-foreground/50 rounded-full px-2 py-0.5 text-xs"
            >
              {a}
            </span>
          ))}
          {totalDuration && (
            <span className="text-foreground/30 text-xs">
              · {threads.length} threads · {totalDuration}
            </span>
          )}
        </div>
      </header>

      {audioUrl && <AudioPlayer src={audioUrl} />}

      {/* Start / Continue button */}
      <SyllabusProgress pathId={slug} threadIds={threadIds} />

      {/* Syllabus */}
      <div className="space-y-4">
        {threads.map((thread, i) => (
          <Link
            key={thread.id}
            href={`/threads/${thread.id}`}
            className="border-foreground/10 bg-surface hover:border-foreground/30 group block rounded-lg border p-5 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-foreground/30 text-xs font-medium">{i + 1}</span>
                  <SyllabusCheckmark threadId={thread.id} />
                </div>
                <h2 className="mt-0.5 font-semibold group-hover:underline">{thread.title}</h2>
                {thread.desc && (
                  <p className="text-foreground/50 mt-1 line-clamp-2 text-sm">{thread.desc}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {thread.duration && (
                  <span className="text-foreground/30 text-xs">{thread.duration}</span>
                )}
                <span className="text-foreground/30 transition-transform group-hover:translate-x-0.5">
                  &rarr;
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Next path */}
      {nextPath && (
        <WhatsNext
          variant="path-complete"
          nextPathTitle={nextPath.title}
          nextPathHref={`/paths/${nextPath.id}`}
        />
      )}
    </main>
  );
}
